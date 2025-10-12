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
    res.json({ tagsByCategory });
  } catch (error) {
    console.error('Error fetching tags by category:', error);
    res.status(500).json({
      error: 'Failed to fetch tags by category',
      message: error.message
    });
  }
});

// GET /api/tags/stats - Get tag statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Tag.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch tag statistics',
      message: error.message
    });
  }
});

// GET /api/tags/most-used - Get most used tags
router.get('/most-used', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await Tag.getMostUsed(parseInt(limit));
    res.json({ tags: tags.map(t => t.toJSON()) });
  } catch (error) {
    console.error('Error fetching most used tags:', error);
    res.status(500).json({
      error: 'Failed to fetch most used tags',
      message: error.message
    });
  }
});

// GET /api/tags/priority - Get tags grouped by priority
router.get('/priority', async (req, res) => {
  try {
    const tagsByPriority = await Tag.getTagsByPriority();
    res.json({ tagsByPriority });
  } catch (error) {
    console.error('Error fetching tags by priority:', error);
    res.status(500).json({
      error: 'Failed to fetch tags by priority',
      message: error.message
    });
  }
});

// GET /api/tags/:id - Get a specific tag by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(parseInt(id));

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

// POST /api/tags - Create a new tag
router.post('/', async (req, res) => {
  try {
    const { error, value } = createTagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const tag = await Tag.create({
      ...value,
      createdBy: req.user?.id || null
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

// PUT /api/tags/:id - Update a tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateTagSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const tag = await Tag.findById(parseInt(id));
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

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

// DELETE /api/tags/:id - Deactivate (soft delete) a tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const tag = await Tag.findById(parseInt(id));
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (permanent === 'true') {
      await tag.delete();
      res.json({ message: 'Tag permanently deleted' });
    } else {
      await tag.deactivate();
      res.json({ message: 'Tag deactivated' });
    }
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

// GET /api/tags/:id/questions - Get questions that use this tag
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const tag = await Tag.findById(parseInt(id));
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const questions = await tag.getQuestions(parseInt(limit), parseInt(offset));
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching questions for tag:', error);
    res.status(500).json({
      error: 'Failed to fetch questions for tag',
      message: error.message
    });
  }
});

// POST /api/tags/:id/merge - Merge this tag with another tag
router.post('/:id/merge', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetTagId } = req.body;

    if (!targetTagId) {
      return res.status(400).json({ error: 'Target tag ID is required' });
    }

    const tag = await Tag.findById(parseInt(id));
    if (!tag) {
      return res.status(404).json({ error: 'Source tag not found' });
    }

    const targetTag = await Tag.findById(parseInt(targetTagId));
    if (!targetTag) {
      return res.status(404).json({ error: 'Target tag not found' });
    }

    await tag.mergeWith(parseInt(targetTagId));
    res.json({ message: `Tag "${tag.name}" merged into "${targetTag.name}"` });
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({
      error: 'Failed to merge tags',
      message: error.message
    });
  }
});

export default router;