import { query } from '../config/database-sqlite.js';

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
  static async create({ name, category, color, description, createdBy = null }) {
    try {
      const result = await query(`
        INSERT INTO tags (name, category, color, description, created_by)
        VALUES (?, ?, ?, ?, ?)
      `, [name, category, color || '#6c757d', description, createdBy]);

      return new Tag({
        id: result.insertId,
        name,
        category,
        color: color || '#6c757d',
        description,
        created_by: createdBy,
        is_active: 1,
        created_at: new Date().toISOString(),
        usage_count: 0
      });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Tag "${name}" already exists`);
      }
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }

  // Get all tags with usage counts and priority classification
  static async findAll({ category, activeOnly = true, priorityOrder = false } = {}) {
    try {
      let whereConditions = [];
      let queryParams = [];

      if (activeOnly) {
        whereConditions.push('t.is_active = 1');
      }

      if (category) {
        whereConditions.push(`t.category = ?`);
        queryParams.push(category);
      }

      const whereClause = whereConditions.length > 0 ?
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Order by priority if requested, otherwise by category and name
      const orderClause = priorityOrder ?
        'ORDER BY usage_count DESC, t.name ASC' :
        'ORDER BY t.category, t.name';

      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        ${whereClause}
        GROUP BY t.id
        ${orderClause}
      `, queryParams);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        tag.priority = this.classifyTagPriority(tag.usageCount);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }
  }

  // Classify tag priority based on usage count
  static classifyTagPriority(usageCount) {
    if (usageCount >= 20) return 'primary';
    if (usageCount >= 10) return 'secondary';
    if (usageCount >= 5) return 'minor';
    if (usageCount >= 1) return 'rare';
    return 'orphan';
  }

  // Get tag by ID
  static async findById(id) {
    try {
      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.id = ?
        GROUP BY t.id
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const tag = new Tag(result.rows[0]);
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
        WHERE t.is_active = 1
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

  // Search tags by name (simplified for SQLite)
  static async search(searchTerm, limit = 20) {
    try {
      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.is_active = 1
          AND t.name LIKE ?
        GROUP BY t.id
        ORDER BY usage_count DESC, t.name
        LIMIT ?
      `, [`%${searchTerm}%`, limit]);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to search tags: ${error.message}`);
    }
  }

  // Update tag
  async update({ name, category, color, description }) {
    try {
      const updateFields = {};
      const queryParams = [];

      if (name !== undefined) {
        updateFields.name = name;
        queryParams.push(name);
      }
      if (category !== undefined) {
        updateFields.category = category;
        queryParams.push(category);
      }
      if (color !== undefined) {
        updateFields.color = color;
        queryParams.push(color);
      }
      if (description !== undefined) {
        updateFields.description = description;
        queryParams.push(description);
      }

      if (Object.keys(updateFields).length === 0) {
        return this;
      }

      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      queryParams.push(this.id);

      const result = await query(`
        UPDATE tags
        SET ${setClause}
        WHERE id = ?
      `, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Tag not found');
      }

      Object.assign(this, updateFields);
      return this;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
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
        SET is_active = 0
        WHERE id = ?
      `, [this.id]);

      this.isActive = 0;
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
        WHERE tag_id = ?
      `, [this.id]);

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error('Cannot delete tag that is currently in use. Deactivate it instead.');
      }

      await query('DELETE FROM tags WHERE id = ?', [this.id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }

  // Get questions that use this tag
  async getQuestions(limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT q.id, q.question_text, q.answer_text, q.is_active, q.created_at
        FROM questions q
        JOIN question_tags qt ON q.id = qt.question_id
        WHERE qt.tag_id = ?
        ORDER BY q.updated_at DESC
        LIMIT ? OFFSET ?
      `, [this.id, limit, offset]);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get questions for tag: ${error.message}`);
    }
  }

  // Merge this tag with another tag (moves all questions to target tag)
  async mergeWith(targetTagId) {
    try {
      // Move all question associations to target tag
      await query(`
        UPDATE question_tags
        SET tag_id = ?
        WHERE tag_id = ?
      `, [targetTagId, this.id]);

      // Deactivate this tag
      await this.deactivate();

      return true;
    } catch (error) {
      throw new Error(`Failed to merge tags: ${error.message}`);
    }
  }

  // Get tag statistics
  static async getStatistics() {
    try {
      const result = await query(`
        SELECT
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_tags,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_tags,
          COUNT(DISTINCT category) as categories,
          (
            SELECT COUNT(DISTINCT qt.question_id)
            FROM question_tags qt
            JOIN tags t ON qt.tag_id = t.id
            WHERE t.is_active = 1
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
        WHERE t.is_active = 1
        GROUP BY t.id
        ORDER BY usage_count DESC, t.name
        LIMIT ?
      `, [limit]);

      return result.rows.map(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        tag.priority = this.classifyTagPriority(tag.usageCount);
        return tag;
      });
    } catch (error) {
      throw new Error(`Failed to get most used tags: ${error.message}`);
    }
  }

  // Get tags by priority level
  static async getTagsByPriority() {
    try {
      const result = await query(`
        SELECT t.*,
               COUNT(qt.question_id) as usage_count
        FROM tags t
        LEFT JOIN question_tags qt ON t.id = qt.tag_id
        WHERE t.is_active = 1
        GROUP BY t.id
        ORDER BY usage_count DESC, t.name
      `);

      const tagsByPriority = {
        primary: [],
        secondary: [],
        minor: [],
        rare: [],
        orphan: []
      };

      result.rows.forEach(row => {
        const tag = new Tag(row);
        tag.usageCount = parseInt(row.usage_count);
        tag.priority = this.classifyTagPriority(tag.usageCount);
        tagsByPriority[tag.priority].push(tag);
      });

      return tagsByPriority;
    } catch (error) {
      throw new Error(`Failed to get tags by priority: ${error.message}`);
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
      usageCount: this.usageCount
    };
  }
}

export default Tag;