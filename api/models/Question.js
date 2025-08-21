import { query } from '../config/database.js';
import { processMarkdown } from '../utils/markdown.js';

class Question {
  constructor(data) {
    this.id = data.id;
    this.questionText = data.question_text;
    this.answerText = data.answer_text;
    this.status = data.status;
    this.sources = data.sources || [];
    this.metadata = data.metadata || {};
    this.reviewHistory = data.review_history || [];
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.createdBy = data.created_by;
    this.validatedBy = data.validated_by;
    this.validatedAt = data.validated_at;
  }

  // Create a new question
  static async create({ questionText, answerText, createdBy, sources = [], tagIds = [] }) {
    try {
      // Process markdown to extract metadata
      const questionProcessed = processMarkdown(questionText);
      const answerProcessed = processMarkdown(answerText);
      
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

      const result = await query(`
        INSERT INTO questions (question_text, answer_text, sources, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [questionText, answerText, JSON.stringify(sources), JSON.stringify(metadata), createdBy]);

      const question = new Question(result.rows[0]);

      // Add tags if provided
      if (tagIds.length > 0) {
        await question.updateTags(tagIds, createdBy);
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
               u.name as author_name,
               v.name as validator_name,
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
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN users v ON q.validated_by = v.id
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN tags t ON qt.tag_id = t.id
        WHERE q.id = $1
        GROUP BY q.id, u.name, v.name
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const questionData = result.rows[0];
      const question = new Question(questionData);
      question.tags = questionData.tags;
      question.authorName = questionData.author_name;
      question.validatorName = questionData.validator_name;

      return question;
    } catch (error) {
      throw new Error(`Failed to find question: ${error.message}`);
    }
  }

  // Get questions with filters and pagination
  static async findMany({ status, tagIds, search, createdBy, limit = 20, offset = 0, orderBy = 'updated_at', orderDirection = 'DESC' }) {
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (status) {
        whereConditions.push(`q.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (createdBy) {
        whereConditions.push(`q.created_by = $${paramIndex++}`);
        queryParams.push(createdBy);
      }

      if (search) {
        whereConditions.push(`q.search_vector @@ plainto_tsquery('french', $${paramIndex++})`);
        queryParams.push(search);
      }

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
      const allowedOrderColumns = ['id', 'created_at', 'updated_at', 'status'];
      const safeOrderBy = allowedOrderColumns.includes(orderBy) ? orderBy : 'updated_at';
      const safeOrderDirection = ['ASC', 'DESC'].includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';

      // Add pagination params
      queryParams.push(limit, offset);
      const limitOffset = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

      const result = await query(`
        SELECT q.*, 
               u.name as author_name,
               v.name as validator_name,
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
               ${search ? `ts_rank(q.search_vector, plainto_tsquery('french', '${search}')) as rank` : '1 as rank'}
        FROM questions q
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN users v ON q.validated_by = v.id
        LEFT JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN tags t ON qt.tag_id = t.id
        ${whereClause}
        GROUP BY q.id, u.name, v.name
        ORDER BY ${search ? 'rank DESC,' : ''} q.${safeOrderBy} ${safeOrderDirection}
        ${limitOffset}
      `, queryParams);

      return result.rows.map(row => {
        const question = new Question(row);
        question.tags = row.tags;
        question.authorName = row.author_name;
        question.validatorName = row.validator_name;
        if (search) question.rank = row.rank;
        return question;
      });
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  // Update question content
  async update({ questionText, answerText, sources, updatedBy }) {
    try {
      // Process markdown if content changed
      let metadata = this.metadata;
      if (questionText !== this.questionText || answerText !== this.answerText) {
        const questionProcessed = processMarkdown(questionText || this.questionText);
        const answerProcessed = processMarkdown(answerText || this.answerText);
        
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
      }

      const result = await query(`
        UPDATE questions 
        SET question_text = COALESCE($1, question_text),
            answer_text = COALESCE($2, answer_text),
            sources = COALESCE($3, sources),
            metadata = $4,
            created_by = $5
        WHERE id = $6
        RETURNING *
      `, [
        questionText, 
        answerText, 
        sources ? JSON.stringify(sources) : null,
        JSON.stringify(metadata),
        updatedBy,
        this.id
      ]);

      if (result.rows.length === 0) {
        throw new Error('Question not found');
      }

      // Update instance properties
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  // Update question status (draft -> pending_review -> validated -> published)
  async updateStatus(newStatus, userId, comment = '') {
    try {
      const validTransitions = {
        'draft': ['pending_review', 'archived'],
        'pending_review': ['validated', 'draft', 'archived'],
        'validated': ['published', 'pending_review', 'archived'],
        'published': ['disabled', 'archived'],
        'disabled': ['published', 'archived'],
        'archived': ['draft']
      };

      if (!validTransitions[this.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
      }

      // Add to review history
      const reviewEntry = {
        user_id: userId,
        from_status: this.status,
        to_status: newStatus,
        comment: comment,
        timestamp: new Date().toISOString()
      };

      const newReviewHistory = [...this.reviewHistory, reviewEntry];

      const updateFields = {
        status: newStatus,
        review_history: JSON.stringify(newReviewHistory)
      };

      // Set validation fields for validated/published status
      if (newStatus === 'validated' || newStatus === 'published') {
        updateFields.validated_by = userId;
        updateFields.validated_at = 'CURRENT_TIMESTAMP';
      }

      const setClause = Object.keys(updateFields).map((key, index) => 
        `${key} = $${index + 1}`
      ).join(', ');

      const result = await query(`
        UPDATE questions 
        SET ${setClause}
        WHERE id = $${Object.keys(updateFields).length + 1}
        RETURNING *
      `, [...Object.values(updateFields), this.id]);

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      throw new Error(`Failed to update question status: ${error.message}`);
    }
  }

  // Update question tags
  async updateTags(tagIds, userId) {
    try {
      // Remove existing tags
      await query('DELETE FROM question_tags WHERE question_id = $1', [this.id]);

      // Add new tags
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId, index) => 
          `($1, $${index + 2}, $${tagIds.length + 2})`
        ).join(', ');

        await query(`
          INSERT INTO question_tags (question_id, tag_id, assigned_by)
          VALUES ${values}
        `, [this.id, ...tagIds, userId]);
      }

      return this;
    } catch (error) {
      throw new Error(`Failed to update tags: ${error.message}`);
    }
  }

  // Delete question (soft delete by archiving)
  async delete(userId) {
    try {
      await this.updateStatus('archived', userId, 'Question deleted');
      return this;
    } catch (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  }

  // Get question history/versions
  async getVersions() {
    try {
      const result = await query(`
        SELECT qv.*, u.name as author_name
        FROM question_versions qv
        LEFT JOIN users u ON qv.created_by = u.id
        WHERE qv.question_id = $1
        ORDER BY qv.version_number DESC
      `, [this.id]);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get question versions: ${error.message}`);
    }
  }

  // Count questions with filters (for pagination)
  static async count({ status, tagIds, search, createdBy }) {
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Build WHERE clause (same as findMany)
      if (status) {
        whereConditions.push(`q.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (createdBy) {
        whereConditions.push(`q.created_by = $${paramIndex++}`);
        queryParams.push(createdBy);
      }

      if (search) {
        whereConditions.push(`q.search_vector @@ plainto_tsquery('french', $${paramIndex++})`);
        queryParams.push(search);
      }

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

  // Get rendered HTML for display
  getRenderedContent() {
    const questionProcessed = processMarkdown(this.questionText);
    const answerProcessed = processMarkdown(this.answerText);
    
    return {
      questionHtml: questionProcessed.html,
      answerHtml: answerProcessed.html,
      metadata: this.metadata
    };
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      questionText: this.questionText,
      answerText: this.answerText,
      status: this.status,
      sources: this.sources,
      metadata: this.metadata,
      reviewHistory: this.reviewHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      validatedBy: this.validatedBy,
      validatedAt: this.validatedAt,
      tags: this.tags || [],
      authorName: this.authorName,
      validatorName: this.validatorName
    };
  }
}

export default Question;