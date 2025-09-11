import { query } from '../config/database.js';
import { processMarkdown } from '../utils/markdown.js';

class Question {
  constructor(data) {
    this.id = data.id;
    this.questionText = data.question_text;
    this.answerText = data.answer_text;
    this.questionHtml = data.question_html;
    this.answerHtml = data.answer_html;
    this.isActive = data.is_active;
    this.adminNotes = data.admin_notes;
    this.deletedAt = data.deleted_at;
    this.sources = data.sources || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new question (starts as inactive by default)
  static async create({ questionText, answerText, sources = [], tagIds = [] }) {
    try {
      // Process markdown to extract metadata
      const questionProcessed = processMarkdown(questionText, 'question');
      const answerProcessed = processMarkdown(answerText, 'answer');
      
      // Combine entities from both question and answer
      const combinedEntities = {
        drugs: [...new Set([...questionProcessed.entities.drugs, ...answerProcessed.entities.drugs])],
        drug_classes: [...new Set([...questionProcessed.entities.drug_classes, ...answerProcessed.entities.drug_classes])],
        conditions: [...new Set([...questionProcessed.entities.conditions, ...answerProcessed.entities.conditions])],
        dosages: [...new Set([...questionProcessed.entities.dosages, ...answerProcessed.entities.dosages])],
        routes: [...new Set([...questionProcessed.entities.routes, ...answerProcessed.entities.routes])]
      };

      const metadata = {
        entities: combinedEntities,
        question_stats: questionProcessed.stats,
        answer_stats: answerProcessed.stats,
        total_word_count: questionProcessed.stats.word_count + answerProcessed.stats.word_count,
        last_processed: new Date().toISOString()
      };

      // Generate HTML from markdown
      const questionHtml = questionProcessed.html;
      const answerHtml = answerProcessed.html;

      const result = await query(`
        INSERT INTO questions (question_text, answer_text, question_html, answer_html, sources, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [questionText, answerText, questionHtml, answerHtml, JSON.stringify(sources), JSON.stringify(metadata)]);

      const question = new Question(result.rows[0]);

      // Add tags if provided
      if (tagIds.length > 0) {
        await question.updateTags(tagIds);
      }

      return question;
    } catch (error) {
      throw new Error(`Failed to create question: ${error.message}`);
    }
  }

  // Get question by ID with tags
  static async findById(id) {
    try {
      const result = await query(`
        SELECT q.*, 
               COALESCE(
                 JSON_AGG(
                   JSON_BUILD_OBJECT(
                     'id', t.id,
                     'name', t.name,
                     'category', t.category,
                     'color', t.color
                   )
                 ) FILTER (WHERE t.id IS NOT NULL), 
                 '[]'::json
               ) as tags
        FROM questions q
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN tags t ON qt.tag_id = t.id
        WHERE q.id = $1
        GROUP BY q.id
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const questionData = result.rows[0];
      const question = new Question(questionData);
      question.tags = questionData.tags;

      return question;
    } catch (error) {
      throw new Error(`Failed to find question: ${error.message}`);
    }
  }

  // Get questions with filters and pagination
  static async findMany({ 
    active, 
    tagIds, 
    search, 
    limit = 20, 
    offset = 0, 
    orderBy = 'updated_at', 
    orderDirection = 'DESC' 
  }) {
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Filter by active status
      if (active !== undefined) {
        whereConditions.push(`q.is_active = $${paramIndex++}`);
        queryParams.push(active);
      }


      // Full-text search
      if (search) {
        const searchParam1 = paramIndex++;
        const searchParam2 = paramIndex++;
        const searchParam3 = paramIndex++;
        whereConditions.push(`(
          q.search_vector @@ plainto_tsquery('french', $${searchParam1}) OR
          q.question_text ILIKE $${searchParam2} OR
          q.answer_text ILIKE $${searchParam3}
        )`);
        queryParams.push(search, `%${search}%`, `%${search}%`);
      }

      // Filter by tags
      if (tagIds && tagIds.length > 0) {
        whereConditions.push(`q.id IN (
          SELECT DISTINCT qt.question_id 
          FROM question_tags qt 
          WHERE qt.tag_id = ANY($${paramIndex++})
        )`);
        queryParams.push(tagIds);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate orderBy column to prevent SQL injection
      const allowedOrderColumns = ['id', 'created_at', 'updated_at'];
      const safeOrderBy = allowedOrderColumns.includes(orderBy) ? orderBy : 'updated_at';
      const safeOrderDirection = ['ASC', 'DESC'].includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';

      // Add pagination params
      queryParams.push(limit, offset);
      const limitOffset = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

      // Build the rank column for search
      let rankColumn = '1 as rank';
      if (search) {
        queryParams.push(search);
        rankColumn = `ts_rank(q.search_vector, plainto_tsquery('french', $${paramIndex++})) as rank`;
      }

      const result = await query(`
        SELECT q.*, 
               COALESCE(
                 JSON_AGG(
                   JSON_BUILD_OBJECT(
                     'id', t.id,
                     'name', t.name,
                     'category', t.category,
                     'color', t.color
                   )
                 ) FILTER (WHERE t.id IS NOT NULL), 
                 '[]'::json
               ) as tags,
               ${rankColumn}
        FROM questions q
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN tags t ON qt.tag_id = t.id
        ${whereClause}
        GROUP BY q.id
        ORDER BY ${search ? 'rank DESC,' : ''} q.${safeOrderBy} ${safeOrderDirection}
        ${limitOffset}
      `, queryParams);

      return result.rows.map(row => {
        const question = new Question(row);
        question.tags = row.tags;
        if (search) question.rank = row.rank;
        return question;
      });
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  // Count questions with filters (for pagination)
  static async count({ active, tagIds, search }) {
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Filter by active status
      if (active !== undefined) {
        whereConditions.push(`q.is_active = $${paramIndex++}`);
        queryParams.push(active);
      }


      // Full-text search
      if (search) {
        const searchParam1 = paramIndex++;
        const searchParam2 = paramIndex++;
        const searchParam3 = paramIndex++;
        whereConditions.push(`(
          q.search_vector @@ plainto_tsquery('french', $${searchParam1}) OR
          q.question_text ILIKE $${searchParam2} OR
          q.answer_text ILIKE $${searchParam3}
        )`);
        queryParams.push(search, `%${search}%`, `%${search}%`);
      }

      // Filter by tags
      if (tagIds && tagIds.length > 0) {
        whereConditions.push(`q.id IN (
          SELECT DISTINCT qt.question_id 
          FROM question_tags qt 
          WHERE qt.tag_id = ANY($${paramIndex++})
        )`);
        queryParams.push(tagIds);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const result = await query(`
        SELECT COUNT(DISTINCT q.id) as count
        FROM questions q
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        ${whereClause}
      `, queryParams);

      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to count questions: ${error.message}`);
    }
  }

  // Update question content
  async update({ questionText, answerText, sources }) {
    try {
      const updateFields = {};
      const queryParams = [];
      let paramIndex = 1;

      let metadata = this.metadata;
      
      // Check if text content has changed to regenerate HTML
      const textChanged = (questionText !== undefined && questionText !== this.questionText) ||
                          (answerText !== undefined && answerText !== this.answerText);

      if (textChanged) {
        const questionToProcess = questionText !== undefined ? questionText : this.questionText;
        const answerToProcess = answerText !== undefined ? answerText : this.answerText;
        
        const questionProcessed = processMarkdown(questionToProcess, 'question');
        const answerProcessed = processMarkdown(answerToProcess, 'answer');
        
        // Add text and HTML to the update fields
        if (questionText !== undefined) {
          updateFields.question_text = questionText;
          updateFields.question_html = questionProcessed.html;
        }
        if (answerText !== undefined) {
          updateFields.answer_text = answerText;
          updateFields.answer_html = answerProcessed.html;
        }
        
        // Regenerate metadata
        const combinedEntities = {
          drugs: [...new Set([...questionProcessed.entities.drugs, ...answerProcessed.entities.drugs])],
          drug_classes: [...new Set([...questionProcessed.entities.drug_classes, ...answerProcessed.entities.drug_classes])],
          conditions: [...new Set([...questionProcessed.entities.conditions, ...answerProcessed.entities.conditions])],
          dosages: [...new Set([...questionProcessed.entities.dosages, ...answerProcessed.entities.dosages])],
          routes: [...new Set([...questionProcessed.entities.routes, ...answerProcessed.entities.routes])]
        };
        metadata = {
          ...this.metadata,
          entities: combinedEntities,
          question_stats: questionProcessed.stats,
          answer_stats: answerProcessed.stats,
          total_word_count: questionProcessed.stats.word_count + answerProcessed.stats.word_count,
          last_processed: new Date().toISOString()
        };
        updateFields.metadata = JSON.stringify(metadata);
      }

      // Add sources if provided
      if (sources !== undefined) updateFields.sources = JSON.stringify(sources);

      // If nothing to update, return the current instance
      if (Object.keys(updateFields).length === 0) {
        return this;
      }

      // Dynamically build the SET clause
      const setClause = Object.keys(updateFields).map(key => {
        queryParams.push(updateFields[key]);
        return `${key} = $${paramIndex++}`;
      }).join(', ');
      
      queryParams.push(this.id);

      const result = await query(`
        UPDATE questions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `, queryParams);

      if (result.rows.length === 0) {
        throw new Error('Question not found after update');
      }

      // Update instance properties
      const updatedData = result.rows[0];
      Object.assign(this, new Question(updatedData));

      return this;
    } catch (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  // Toggle active status (simple!)
  async toggleActive(adminNote = '') {
    try {
      const result = await query(`
        UPDATE questions 
        SET is_active = NOT is_active,
            admin_notes = COALESCE(admin_notes, '') ||
                         CASE 
                           WHEN admin_notes IS NOT NULL AND admin_notes != '' 
                           THEN ' | ' 
                           ELSE '' 
                         END ||
                         $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [this.id, adminNote || `Toggled ${this.isActive ? 'inactive' : 'active'} on ${new Date().toLocaleDateString()}`]);

      Object.assign(this, new Question(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to toggle question active status: ${error.message}`);
    }
  }

  // Soft delete question
  async softDelete(reason = '') {
    try {
      const result = await query(`
        UPDATE questions 
        SET deleted_at = CURRENT_TIMESTAMP,
            is_active = FALSE,
            admin_notes = COALESCE(admin_notes, '') ||
                         CASE 
                           WHEN admin_notes IS NOT NULL AND admin_notes != '' 
                           THEN ' | ' 
                           ELSE '' 
                         END ||
                         $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [this.id, `Deleted: ${reason || 'No reason provided'}`]);

      Object.assign(this, new Question(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  }

  // Restore deleted question
  async restore() {
    try {
      const result = await query(`
        UPDATE questions 
        SET deleted_at = NULL,
            admin_notes = COALESCE(admin_notes, '') ||
                         CASE 
                           WHEN admin_notes IS NOT NULL AND admin_notes != '' 
                           THEN ' | ' 
                           ELSE '' 
                         END ||
                         $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [this.id, `Restored on ${new Date().toLocaleDateString()}`]);

      Object.assign(this, new Question(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to restore question: ${error.message}`);
    }
  }

  // Update question tags
  async updateTags(tagIds) {
    try {
      // Remove existing tags
      await query('DELETE FROM question_tags WHERE question_id = $1', [this.id]);

      // Add new tags
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId, index) => 
          `($1, $${index + 2})`
        ).join(', ');

        await query(`
          INSERT INTO question_tags (question_id, tag_id)
          VALUES ${values}
        `, [this.id, ...tagIds]);
      }

      return this;
    } catch (error) {
      throw new Error(`Failed to update tags: ${error.message}`);
    }
  }

  // Get rendered HTML for display - always fresh from markdown
  getRenderedContent() {
    const questionProcessed = processMarkdown(this.questionText);
    const answerProcessed = processMarkdown(this.answerText);
    
    return {
      questionHtml: questionProcessed.html,
      answerHtml: answerProcessed.html,
      metadata: this.metadata
    };
  }

  // Force regenerate HTML from current markdown (for data integrity)
  async regenerateHtml() {
    try {
      const questionProcessed = processMarkdown(this.questionText, 'question');
      const answerProcessed = processMarkdown(this.answerText, 'answer');
      
      // Regenerate metadata too
      const combinedEntities = {
        drugs: [...new Set([...questionProcessed.entities.drugs, ...answerProcessed.entities.drugs])],
        drug_classes: [...new Set([...questionProcessed.entities.drug_classes, ...answerProcessed.entities.drug_classes])],
        conditions: [...new Set([...questionProcessed.entities.conditions, ...answerProcessed.entities.conditions])],
        dosages: [...new Set([...questionProcessed.entities.dosages, ...answerProcessed.entities.dosages])],
        routes: [...new Set([...questionProcessed.entities.routes, ...answerProcessed.entities.routes])]
      };

      const metadata = {
        ...this.metadata,
        entities: combinedEntities,
        question_stats: questionProcessed.stats,
        answer_stats: answerProcessed.stats,
        total_word_count: questionProcessed.stats.word_count + answerProcessed.stats.word_count,
        last_processed: new Date().toISOString()
      };

      const result = await query(`
        UPDATE questions 
        SET question_html = $1, answer_html = $2, metadata = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [questionProcessed.html, answerProcessed.html, JSON.stringify(metadata), this.id]);

      // Update instance
      Object.assign(this, new Question(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to regenerate HTML: ${error.message}`);
    }
  }

  // Get question versions (placeholder - versioning removed)
  async getVersions() {
    try {
      // Versioning system was removed, return empty array for backward compatibility
      return [];
    } catch (error) {
      throw new Error(`Failed to get question versions: ${error.message}`);
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      questionText: this.questionText,
      answerText: this.answerText,
      questionHtml: this.questionHtml,
      answerHtml: this.answerHtml,
      isActive: this.isActive,
      adminNotes: this.adminNotes,
      deletedAt: this.deletedAt,
      sources: this.sources,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tags: this.tags || []
    };
  }
}

export default Question;