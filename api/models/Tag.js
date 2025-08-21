import { query } from '../config/database.js';

class Tag {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.color = data.color;
    this.description = data.description;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.createdBy = data.created_by;
    this.usageCount = data.usage_count || 0;
  }

  // Create a new tag
  static async create({ name, category, color, description, createdBy }) {
    try {
      const result = await query(`
        INSERT INTO tags (name, category, color, description, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, category, color || '#6c757d', description, createdBy]);

      return new Tag(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Tag "${name}" already exists`);
      }
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }

  // Get all tags with usage counts
  static async findAll({ category, activeOnly = true } = {}) {
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (activeOnly) {
        whereConditions.push('t.is_active = true');
      }

      if (category) {
        whereConditions.push(`t.category = $${paramIndex++}`);
        queryParams.push(category);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const result = await query(`
        SELECT t.*, 
               u.name as creator_name,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        ${whereClause}
        GROUP BY t.id, u.name
        ORDER BY t.category, t.name
      `, queryParams);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.creatorName = row.creator_name;
        tag.usageCount = parseInt(row.usage_count);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }
  }

  // Get tag by ID
  static async findById(id) {
    try {
      const result = await query(`
        SELECT t.*, 
               u.name as creator_name,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.id = $1
        GROUP BY t.id, u.name
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const tag = new Tag(result.rows[0]);
      tag.creatorName = result.rows[0].creator_name;
      tag.usageCount = parseInt(result.rows[0].usage_count);
      return tag;
    } catch (error) {
      throw new Error(`Failed to find tag: ${error.message}`);
    }
  }

  // Get tags by category with hierarchical structure
  static async findByCategory() {
    try {
      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.is_active = true
        GROUP BY t.id
        ORDER BY t.category, t.name
      `);

      // Group tags by category
      const tagsByCategory = {};
      result.rows.forEach(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        
        const category = tag.category || 'uncategorized';
        if (!tagsByCategory[category]) {
          tagsByCategory[category] = [];
        }
        tagsByCategory[category].push(tag);
      });

      return tagsByCategory;
    } catch (error) {
      throw new Error(`Failed to fetch tags by category: ${error.message}`);
    }
  }

  // Search tags by name
  static async search(searchTerm, limit = 20) {
    try {
      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count,
               similarity(t.name, $1) as similarity
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.is_active = true 
          AND (t.name ILIKE $2 OR similarity(t.name, $1) > 0.3)
        GROUP BY t.id
        ORDER BY similarity DESC, usage_count DESC, t.name
        LIMIT $3
      `, [searchTerm, `%${searchTerm}%`, limit]);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        tag.similarity = parseFloat(row.similarity);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to search tags: ${error.message}`);
    }
  }

  // Update tag
  async update({ name, category, color, description }) {
    try {
      const result = await query(`
        UPDATE tags 
        SET name = COALESCE($1, name),
            category = COALESCE($2, category),
            color = COALESCE($3, color),
            description = COALESCE($4, description)
        WHERE id = $5
        RETURNING *
      `, [name, category, color, description, this.id]);

      if (result.rows.length === 0) {
        throw new Error('Tag not found');
      }

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Tag "${name}" already exists`);
      }
      throw new Error(`Failed to update tag: ${error.message}`);
    }
  }

  // Deactivate tag (soft delete)
  async deactivate() {
    try {
      const result = await query(`
        UPDATE tags 
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `, [this.id]);

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      throw new Error(`Failed to deactivate tag: ${error.message}`);
    }
  }

  // Permanently delete tag (only if not used)
  async delete() {
    try {
      // Check if tag is used
      const usageResult = await query(`
        SELECT COUNT(*) as count 
        FROM question_tags 
        WHERE tag_id = $1
      `, [this.id]);

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error('Cannot delete tag that is currently in use. Deactivate it instead.');
      }

      await query('DELETE FROM tags WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }

  // Get questions that use this tag
  async getQuestions(limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT q.id, q.question_text, q.answer_text, q.status, q.created_at,
               u.name as author_name
        FROM questions q
        JOIN question_tags qt ON q.id = qt.question_id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE qt.tag_id = $1
        ORDER BY q.updated_at DESC
        LIMIT $2 OFFSET $3
      `, [this.id, limit, offset]);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get questions for tag: ${error.message}`);
    }
  }

  // Merge this tag with another tag (moves all questions to target tag)
  async mergeWith(targetTagId, userId) {
    try {
      // Start transaction
      await query('BEGIN');

      // Move all question associations to target tag
      await query(`
        UPDATE question_tags 
        SET tag_id = $1, assigned_by = $2, assigned_at = CURRENT_TIMESTAMP
        WHERE tag_id = $3
      `, [targetTagId, userId, this.id]);

      // Deactivate this tag
      await this.deactivate();

      await query('COMMIT');
      return true;
    } catch (error) {
      await query('ROLLBACK');
      throw new Error(`Failed to merge tags: ${error.message}`);
    }
  }

  // Get tag statistics
  static async getStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as active_tags,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_tags,
          COUNT(DISTINCT category) FILTER (WHERE is_active = true) as categories,
          (
            SELECT COUNT(DISTINCT qt.question_id) 
            FROM question_tags qt 
            JOIN tags t ON qt.tag_id = t.id 
            WHERE t.is_active = true
          ) as tagged_questions,
          (
            SELECT COUNT(*) 
            FROM questions q 
            WHERE NOT EXISTS (
              SELECT 1 FROM question_tags qt WHERE qt.question_id = q.id
            )
          ) as untagged_questions
        FROM tags
      `);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get tag statistics: ${error.message}`);
    }
  }

  // Get most used tags
  static async getMostUsed(limit = 10) {
    try {
      const result = await query(`
        SELECT t.*, COUNT(qt.question_id) as usage_count
        FROM tags t
        JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.is_active = true
        GROUP BY t.id
        ORDER BY usage_count DESC, t.name
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to get most used tags: ${error.message}`);
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      color: this.color,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      creatorName: this.creatorName,
      usageCount: this.usageCount
    };
  }
}

export default Tag;