import express from 'express';
import Joi from 'joi';
import Tag from '../models/Tag.js';

const router = express.Router();

// Validation schemas
const createTagSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  category: Joi.string().min(2).max(50).optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: Joi.string().max(500).optional()
});

const updateTagSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  category: Joi.string().min(2).max(50).optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: Joi.string().max(500).optional()
});

// GET /api/tags - List all tags with enhanced options
router.get('/', async (req, res) => {
  try {
    const { category, search, activeOnly = 'true', priorityOrder = 'false' } = req.query;
    
    if (search) {
      const tags = await Tag.search(search);
      return res.json({ tags: tags.map(t => t.toJSON()) });
    }

    const tags = await Tag.findAll({ 
      category, 
      activeOnly: activeOnly === 'true',
      priorityOrder: priorityOrder === 'true'
    });
    
    res.json({ tags: tags.map(t => t.toJSON()) });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tags',
      message: error.message 
    });
  }
});

// GET /api/tags/categories - Get tags grouped by category
router.get('/categories', async (req, res) => {
  try {
    const tagsByCategory = await Tag.findByCategory();
    
    // Convert to JSON and add category metadata
    const result = {};
    for (const [category, tags] of Object.entries(tagsByCategory)) {
      result[category] = {
        name: category,
        tags: tags.map(t => t.toJSON()),
        count: tags.length,
        totalUsage: tags.reduce((sum, tag) => sum + tag.usageCount, 0)
      };
    }
    
    res.json({ categories: result });
  } catch (error) {
    console.error('Error fetching tags by category:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tags by category',
      message: error.message 
    });
  }
});

// GET /api/tags/popular - Get most used tags
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await Tag.getMostUsed(parseInt(limit));
    
    res.json({ tags: tags.map(t => t.toJSON()) });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ 
      error: 'Failed to fetch popular tags',
      message: error.message 
    });
  }
});

// GET /api/tags/stats - Get tag statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Tag.getStatistics();
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tag statistics',
      message: error.message 
    });
  }
});

// GET /api/tags/:id - Get single tag
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag.toJSON());
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tag',
      message: error.message 
    });
  }
});

// GET /api/tags/:id/questions - Get questions using this tag
router.get('/:id/questions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const questions = await tag.getQuestions(parseInt(limit), offset);
    
    res.json({ 
      tag: tag.toJSON(),
      questions,
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching questions for tag:', error);
    res.status(500).json({ 
      error: 'Failed to fetch questions for tag',
      message: error.message 
    });
  }
});

// POST /api/tags - Create new tag
router.post('/', async (req, res) => {
  try {
    const { error, value } = createTagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // TODO: Get user ID from authentication middleware
    const createdBy = 1; // Temporary hardcode

    const tag = await Tag.create({
      ...value,
      createdBy
    });

    res.status(201).json(tag.toJSON());
  } catch (error) {
    console.error('Error creating tag:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        error: 'Tag already exists',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create tag',
      message: error.message 
    });
  }
});

// PUT /api/tags/:id - Update tag
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateTagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // TODO: Check user permissions
    
    await tag.update(value);
    res.json(tag.toJSON());
  } catch (error) {
    console.error('Error updating tag:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        error: 'Tag name already exists',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update tag',
      message: error.message 
    });
  }
});

// PATCH /api/tags/:id/deactivate - Deactivate tag (soft delete)
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // TODO: Check user permissions
    
    await tag.deactivate();
    res.json({ 
      message: 'Tag deactivated successfully',
      tag: tag.toJSON()
    });
  } catch (error) {
    console.error('Error deactivating tag:', error);
    res.status(500).json({ 
      error: 'Failed to deactivate tag',
      message: error.message 
    });
  }
});

// DELETE /api/tags/:id - Delete tag permanently
router.delete('/:id', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // TODO: Check user permissions (admin only)
    
    await tag.delete();
    res.json({ message: 'Tag deleted permanently' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    
    if (error.message.includes('currently in use')) {
      return res.status(409).json({ 
        error: 'Cannot delete tag',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete tag',
      message: error.message 
    });
  }
});

// POST /api/tags/:id/merge - Merge tag with another tag
router.post('/:id/merge', async (req, res) => {
  try {
    const { targetTagId } = req.body;
    
    if (!targetTagId || isNaN(parseInt(targetTagId))) {
      return res.status(400).json({ 
        error: 'Invalid target tag ID' 
      });
    }

    const sourceTag = await Tag.findById(req.params.id);
    if (!sourceTag) {
      return res.status(404).json({ error: 'Source tag not found' });
    }

    const targetTag = await Tag.findById(targetTagId);
    if (!targetTag) {
      return res.status(404).json({ error: 'Target tag not found' });
    }

    if (sourceTag.id === targetTag.id) {
      return res.status(400).json({ error: 'Cannot merge tag with itself' });
    }

    // TODO: Get user ID from authentication middleware
    const userId = 1; // Temporary hardcode

    await sourceTag.mergeWith(targetTagId, userId);
    
    res.json({ 
      message: `Tag "${sourceTag.name}" merged into "${targetTag.name}"`,
      sourceTag: sourceTag.toJSON(),
      targetTag: targetTag.toJSON()
    });
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({ 
      error: 'Failed to merge tags',
      message: error.message 
    });
  }
});

// POST /api/tags/bulk-create - Create multiple tags
router.post('/bulk-create', async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags must be a non-empty array' });
    }

    const createdBy = 1; // Temporary hardcode
    const results = {
      created: [],
      errors: []
    };

    for (const tagData of tags) {
      try {
        const { error, value } = createTagSchema.validate(tagData);
        if (error) {
          results.errors.push({
            tag: tagData,
            error: 'Validation error',
            details: error.details
          });
          continue;
        }

        const tag = await Tag.create({ ...value, createdBy });
        results.created.push(tag.toJSON());
      } catch (err) {
        results.errors.push({
          tag: tagData,
          error: err.message
        });
      }
    }

    res.status(207).json(results); // Multi-status response
  } catch (error) {
    console.error('Error bulk creating tags:', error);
    res.status(500).json({ 
      error: 'Failed to bulk create tags',
      message: error.message 
    });
  }
});

// GET /api/tags/priorities - Get tags organized by priority levels
router.get('/priorities', async (req, res) => {
  try {
    const tagsByPriority = await Tag.getTagsByPriority();
    res.json({ priorities: tagsByPriority });
  } catch (error) {
    console.error('Error fetching tags by priority:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tags by priority',
      message: error.message 
    });
  }
});

// GET /api/tags/health - Get tag health metrics
router.get('/health', async (req, res) => {
  try {
    const metrics = await Tag.getTagHealthMetrics();
    res.json({ 
      metrics,
      recommendations: generateTagRecommendations(metrics)
    });
  } catch (error) {
    console.error('Error fetching tag health metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tag health metrics',
      message: error.message 
    });
  }
});

// GET /api/tags/similar - Find similar tags for consolidation
router.get('/similar', async (req, res) => {
  try {
    const { threshold = 0.6 } = req.query;
    const similarTags = await Tag.findSimilarTags(parseFloat(threshold));
    res.json({ 
      similarTags,
      consolidationSuggestions: similarTags.length
    });
  } catch (error) {
    console.error('Error finding similar tags:', error);
    res.status(500).json({ 
      error: 'Failed to find similar tags',
      message: error.message 
    });
  }
});

// Helper function to generate recommendations
function generateTagRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.orphan_tags > 0) {
    recommendations.push({
      type: 'cleanup',
      priority: 'high',
      message: `${metrics.orphan_tags} tags with no questions should be reviewed for deletion`,
      action: 'review_orphan_tags'
    });
  }
  
  if (metrics.rare_tags > metrics.primary_tags * 3) {
    recommendations.push({
      type: 'consolidation',
      priority: 'medium',
      message: 'High number of rarely-used tags. Consider consolidating similar ones.',
      action: 'review_similar_tags'
    });
  }
  
  if (metrics.average_usage < 5) {
    recommendations.push({
      type: 'efficiency',
      priority: 'medium',
      message: 'Low average tag usage suggests over-tagging. Focus on main categories.',
      action: 'promote_primary_tags'
    });
  }
  
  return recommendations;
}

export default router;