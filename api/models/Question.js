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
    this.sources = data.sources ? JSON.parse(data.sources) : [];
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Private helper: Combine entities from question and answer
  static _combineEntities(questionProcessed, answerProcessed) {
    return {
      drugs: [...new Set([...questionProcessed.entities.drugs, ...answerProcessed.entities.drugs])],
      drug_classes: [...new Set([...questionProcessed.entities.drug_classes, ...answerProcessed.entities.drug_classes])],
      conditions: [...new Set([...questionProcessed.entities.conditions, ...answerProcessed.entities.conditions])],
      dosages: [...new Set([...questionProcessed.entities.dosages, ...answerProcessed.entities.dosages])],
      routes: [...new Set([...questionProcessed.entities.routes, ...answerProcessed.entities.routes])]
    };
  }

  // Private helper: Generate complete metadata object
  static _generateMetadata(questionProcessed, answerProcessed, existingMetadata = {}) {
    const combinedEntities = this._combineEntities(questionProcessed, answerProcessed);

    return {
      ...existingMetadata,
      entities: combinedEntities,
      question_stats: questionProcessed.stats,
      answer_stats: answerProcessed.stats,
      total_word_count: questionProcessed.stats.word_count + answerProcessed.stats.word_count,
      last_processed: new Date().toISOString()
    };
  }

  // Create a new question (starts as inactive by default)
  static async create({ questionText, answerText, sources = [], tagIds = [] }) {
    try {
      // Process markdown to extract metadata
      const questionProcessed = processMarkdown(questionText, 'question');
      const answerProcessed = processMarkdown(answerText, 'answer');

      // Generate metadata using helper method (DRY principle)
      const metadata = this._generateMetadata(questionProcessed, answerProcessed);

      // Generate HTML from markdown
      const questionHtml = questionProcessed.html;
      const answerHtml = answerProcessed.html;

      const result = await query(`
        INSERT INTO questions (question_text, answer_text, question_html, answer_html, sources, metadata, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [questionText, answerText, questionHtml, answerHtml, JSON.stringify(sources), JSON.stringify(metadata), 1]);

      const question = new Question({
        id: result.insertId,
        question_text: questionText,
        answer_text: answerText,
        question_html: questionHtml,
        answer_html: answerHtml,
        sources: JSON.stringify(sources),
        metadata: JSON.stringify(metadata),
        is_active: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

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
        SELECT q.*
        FROM questions q
        WHERE q.id = ?
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const questionData = result.rows[0];
      const question = new Question(questionData);

      // Get tags separately for SQLite
      const tagsResult = await query(`
        SELECT t.id, t.name, t.category, t.color
        FROM tags t
        JOIN question_tags qt ON t.id = qt.tag_id
        WHERE qt.question_id = ?
      `, [id]);

      question.tags = tagsResult.rows;

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

      // Filter by active status
      if (active !== undefined) {
        whereConditions.push(`q.is_active = ?`);
        queryParams.push(active ? 1 : 0);
      }

      // Full-text search (simplified for SQLite)
      if (search) {
        whereConditions.push(`(
          q.question_text LIKE ? OR
          q.answer_text LIKE ?
        )`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Filter by tags
      if (tagIds && tagIds.length > 0) {
        const placeholders = tagIds.map(() => '?').join(',');
        whereConditions.push(`q.id IN (
          SELECT DISTINCT qt.question_id
          FROM question_tags qt
          WHERE qt.tag_id IN (${placeholders})
        )`);
        queryParams.push(...tagIds);
      }

      const whereClause = whereConditions.length > 0 ?
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Strict mapping to prevent SQL injection - no direct interpolation
      const ORDER_BY_COLUMNS = {
        'id': 'q.id',
        'created_at': 'q.created_at',
        'updated_at': 'q.updated_at'
      };

      const ORDER_DIRECTIONS = {
        'ASC': 'ASC',
        'DESC': 'DESC'
      };

      const orderColumn = ORDER_BY_COLUMNS[orderBy] || ORDER_BY_COLUMNS['updated_at'];
      const direction = ORDER_DIRECTIONS[orderDirection?.toUpperCase()] || 'DESC';

      // Add pagination params
      queryParams.push(limit, offset);

      const result = await query(`
        SELECT DISTINCT q.*
        FROM questions q
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN tags t ON qt.tag_id = t.id
        ${whereClause}
        ORDER BY ${orderColumn} ${direction}
        LIMIT ? OFFSET ?
      `, queryParams);

      const questions = result.rows.map(row => {
        const question = new Question(row);
        return question;
      });

      // Fix N+1 query problem: Get all tags in a single query
      if (questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        const placeholders = questionIds.map(() => '?').join(',');

        const tagsResult = await query(`
          SELECT qt.question_id, t.id, t.name, t.category, t.color
          FROM tags t
          JOIN question_tags qt ON t.id = qt.tag_id
          WHERE qt.question_id IN (${placeholders})
          ORDER BY t.name
        `, questionIds);

        // Group tags by question_id
        const tagsByQuestionId = {};
        tagsResult.rows.forEach(row => {
          if (!tagsByQuestionId[row.question_id]) {
            tagsByQuestionId[row.question_id] = [];
          }
          tagsByQuestionId[row.question_id].push({
            id: row.id,
            name: row.name,
            category: row.category,
            color: row.color
          });
        });

        // Assign tags to questions
        questions.forEach(question => {
          question.tags = tagsByQuestionId[question.id] || [];
        });
      } else {
        // No questions, no need to fetch tags
        questions.forEach(question => {
          question.tags = [];
        });
      }

      return questions;
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  // Count questions with filters (for pagination)
  static async count({ active, tagIds, search }) {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Filter by active status
      if (active !== undefined) {
        whereConditions.push(`q.is_active = ?`);
        queryParams.push(active ? 1 : 0);
      }

      // Full-text search
      if (search) {
        whereConditions.push(`(
          q.question_text LIKE ? OR
          q.answer_text LIKE ?
        )`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Filter by tags
      if (tagIds && tagIds.length > 0) {
        const placeholders = tagIds.map(() => '?').join(',');
        whereConditions.push(`q.id IN (
          SELECT DISTINCT qt.question_id
          FROM question_tags qt
          WHERE qt.tag_id IN (${placeholders})
        )`);
        queryParams.push(...tagIds);
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

        // Regenerate metadata using helper method (DRY principle)
        metadata = Question._generateMetadata(questionProcessed, answerProcessed, this.metadata);
        updateFields.metadata = JSON.stringify(metadata);
      }

      // Add sources if provided
      if (sources !== undefined) updateFields.sources = JSON.stringify(sources);

      // If nothing to update, return the current instance
      if (Object.keys(updateFields).length === 0) {
        return this;
      }

      // Validate column names to prevent SQL injection
      const ALLOWED_UPDATE_FIELDS = ['question_text', 'answer_text', 'question_html', 'answer_html', 'metadata', 'sources'];
      const invalidFields = Object.keys(updateFields).filter(key => !ALLOWED_UPDATE_FIELDS.includes(key));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid update fields: ${invalidFields.join(', ')}`);
      }

      // Dynamically build the SET clause with validated fields
      const setClause = Object.keys(updateFields).map(key => {
        queryParams.push(updateFields[key]);
        return `${key} = ?`;
      }).join(', ');

      queryParams.push(this.id);

      const result = await query(`
        UPDATE questions
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Question not found after update');
      }

      // Update instance properties
      Object.assign(this, updateFields);
      this.updatedAt = new Date().toISOString();

      return this;
    } catch (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  // Toggle active status
  async toggleActive(adminNote = '') {
    try {
      const result = await query(`
        UPDATE questions
        SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
            admin_notes = COALESCE(admin_notes, '') ||
                         CASE
                           WHEN admin_notes IS NOT NULL AND admin_notes != ''
                           THEN ' | '
                           ELSE ''
                         END ||
                         ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [adminNote || `Toggled ${this.isActive ? 'inactive' : 'active'} on ${new Date().toLocaleDateString()}`, this.id]);

      this.isActive = this.isActive ? 0 : 1;
      this.adminNotes = (this.adminNotes || '') + (this.adminNotes ? ' | ' : '') + (adminNote || `Toggled ${this.isActive ? 'active' : 'inactive'} on ${new Date().toLocaleDateString()}`);
      this.updatedAt = new Date().toISOString();

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
        SET deleted_at = datetime('now'),
            is_active = 0,
            admin_notes = COALESCE(admin_notes, '') ||
                         CASE
                           WHEN admin_notes IS NOT NULL AND admin_notes != ''
                           THEN ' | '
                           ELSE ''
                         END ||
                         ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [`Deleted: ${reason || 'No reason provided'}`, this.id]);

      this.deletedAt = new Date().toISOString();
      this.isActive = 0;
      this.adminNotes = (this.adminNotes || '') + (this.adminNotes ? ' | ' : '') + `Deleted: ${reason || 'No reason provided'}`;
      this.updatedAt = new Date().toISOString();

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
                         ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [`Restored on ${new Date().toLocaleDateString()}`, this.id]);

      this.deletedAt = null;
      this.adminNotes = (this.adminNotes || '') + (this.adminNotes ? ' | ' : '') + `Restored on ${new Date().toLocaleDateString()}`;
      this.updatedAt = new Date().toISOString();

      return this;
    } catch (error) {
      throw new Error(`Failed to restore question: ${error.message}`);
    }
  }

  // Update question tags
  async updateTags(tagIds) {
    try {
      // Remove existing tags
      await query('DELETE FROM question_tags WHERE question_id = ?', [this.id]);

      // Add new tags
      if (tagIds.length > 0) {
        const values = tagIds.map(() => '(?, ?)').join(', ');
        const params = [];
        for (const tagId of tagIds) {
          params.push(this.id, tagId);
        }

        await query(`
          INSERT INTO question_tags (question_id, tag_id)
          VALUES ${values}
        `, params);
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

      // Regenerate metadata using helper method (DRY principle)
      const metadata = Question._generateMetadata(questionProcessed, answerProcessed, this.metadata);

      const result = await query(`
        UPDATE questions
        SET question_html = ?, answer_html = ?, metadata = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [questionProcessed.html, answerProcessed.html, JSON.stringify(metadata), this.id]);

      // Update instance
      this.questionHtml = questionProcessed.html;
      this.answerHtml = answerProcessed.html;
      this.metadata = metadata;
      this.updatedAt = new Date().toISOString();

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