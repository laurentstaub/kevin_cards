import express from 'express';
import Joi from 'joi';
import Question from '../models/Question-sqlite.js';

const router = express.Router();

// Validation schemas
const createQuestionSchema = Joi.object({
  questionText: Joi.string().min(10).required(),
  answerText: Joi.string().min(10).required(),
  sources: Joi.array().items(Joi.object({
    title: Joi.string().required(),
    url: Joi.string().uri().optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    type: Joi.string().valid('textbook', 'guideline', 'journal', 'website', 'internal').optional()
  })).optional(),
  tagIds: Joi.array().items(Joi.number().integer()).optional()
});

const updateQuestionSchema = Joi.object({
  questionText: Joi.string().min(10).optional(),
  answerText: Joi.string().min(10).optional(),
  sources: Joi.array().items(Joi.object({
    title: Joi.string().required(),
    url: Joi.string().uri().optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    type: Joi.string().valid('textbook', 'guideline', 'journal', 'website', 'internal').optional()
  })).optional()
});

// GET /api/questions/active - Get active questions for the flashcard app
router.get('/active', async (req, res) => {
  try {
    const { tags, limit = 100 } = req.query;

    let tagIds = [];
    if (tags) {
      tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    const questions = await Question.findMany({
      active: true,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      limit: parseInt(limit),
      offset: 0
    });

    // Return rendered HTML for flashcard app
    const renderedQuestions = questions.map(q => {
      const rendered = q.getRenderedContent();
      return {
        id: q.id,
        question: rendered.questionHtml,
        answer: rendered.answerHtml,
        tags: q.tags,
        metadata: rendered.metadata
      };
    });

    res.json({
      flashcards: renderedQuestions,
      metadata: {
        total_cards: renderedQuestions.length,
        available_tags: [...new Set(renderedQuestions.flatMap(q => q.tags.map(t => t.name)))],
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching active questions:', error);
    res.status(500).json({
      error: 'Failed to fetch active questions',
      message: error.message
    });
  }
});

// Maintain backward compatibility - redirect /published to /active
router.get('/published', (req, res) => {
  res.redirect(307, req.originalUrl.replace('/published', '/active'));
});

// GET /api/questions - List questions with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      active,
      tagIds,
      search,
      orderBy = 'updated_at',
      orderDirection = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const questions = await Question.findMany({
      active: active !== undefined ? active === 'true' : undefined,
      tagIds: tagIds ? tagIds.split(',').map(id => parseInt(id)) : undefined,
      search,
      limit: parseInt(limit),
      offset,
      orderBy,
      orderDirection
    });

    const total = await Question.count({
      active: active !== undefined ? active === 'true' : undefined,
      tagIds: tagIds ? tagIds.split(',').map(id => parseInt(id)) : undefined,
      search
    });

    res.json({
      questions: questions.map(q => q.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      error: 'Failed to fetch questions',
      message: error.message
    });
  }
});

// GET /api/questions/:id - Get a specific question by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(parseInt(id));

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question.toJSON());
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      error: 'Failed to fetch question',
      message: error.message
    });
  }
});

// POST /api/questions - Create a new question
router.post('/', async (req, res) => {
  try {
    const { error, value } = createQuestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const question = await Question.create({
      ...value,
      createdBy: req.user?.id || 1 // Default to admin user for now
    });

    res.status(201).json(question.toJSON());
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      error: 'Failed to create question',
      message: error.message
    });
  }
});

// PUT /api/questions/:id - Update a question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateQuestionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update(value);
    res.json(question.toJSON());
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      error: 'Failed to update question',
      message: error.message
    });
  }
});

// PUT /api/questions/:id/tags - Update question tags
router.put('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds must be an array' });
    }

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.updateTags(tagIds.map(id => parseInt(id)));

    // Fetch updated question with tags
    const updatedQuestion = await Question.findById(parseInt(id));
    res.json(updatedQuestion.toJSON());
  } catch (error) {
    console.error('Error updating question tags:', error);
    res.status(500).json({
      error: 'Failed to update question tags',
      message: error.message
    });
  }
});

// PATCH /api/questions/:id/toggle-active - Toggle question active status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.toggleActive(adminNote);
    res.json({
      message: `Question ${question.isActive ? 'activated' : 'deactivated'}`,
      question: question.toJSON()
    });
  } catch (error) {
    console.error('Error toggling question status:', error);
    res.status(500).json({
      error: 'Failed to toggle question status',
      message: error.message
    });
  }
});

// DELETE /api/questions/:id - Soft delete a question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.softDelete(reason);
    res.json({
      message: 'Question deleted successfully',
      question: question.toJSON()
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      error: 'Failed to delete question',
      message: error.message
    });
  }
});

// PATCH /api/questions/:id/restore - Restore a deleted question
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.restore();
    res.json({
      message: 'Question restored successfully',
      question: question.toJSON()
    });
  } catch (error) {
    console.error('Error restoring question:', error);
    res.status(500).json({
      error: 'Failed to restore question',
      message: error.message
    });
  }
});

// POST /api/questions/:id/regenerate-html - Regenerate HTML from markdown
router.post('/:id/regenerate-html', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.regenerateHtml();
    res.json({
      message: 'HTML regenerated successfully',
      question: question.toJSON()
    });
  } catch (error) {
    console.error('Error regenerating HTML:', error);
    res.status(500).json({
      error: 'Failed to regenerate HTML',
      message: error.message
    });
  }
});

// GET /api/questions/:id/rendered - Get rendered HTML content
router.get('/:id/rendered', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(parseInt(id));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const renderedContent = question.getRenderedContent();
    res.json(renderedContent);
  } catch (error) {
    console.error('Error getting rendered content:', error);
    res.status(500).json({
      error: 'Failed to get rendered content',
      message: error.message
    });
  }
});

export default router;