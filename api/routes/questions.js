import express from 'express';
import Joi from 'joi';
import Question from '../models/Question.js';
import { markdownToHtml } from '../utils/markdown.js';

const router = express.Router();

// Validation schemas
const createQuestionSchema = Joi.object({
  questionText: Joi.string().min(10).max(5000).required(),
  answerText: Joi.string().min(5).max(10000).required(),
  sources: Joi.array().items(Joi.object({
    type: Joi.string().valid('textbook', 'guideline', 'journal', 'website', 'internal').required(),
    title: Joi.string().required(),
    authors: Joi.array().items(Joi.string()).optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    pages: Joi.string().optional(),
    url: Joi.string().uri().optional(),
    isbn: Joi.string().optional(),
    doi: Joi.string().optional(),
    edition: Joi.string().optional(),
    authority: Joi.string().optional(),
    date_accessed: Joi.date().iso().optional()
  })).default([]),
  tagIds: Joi.array().items(Joi.number().integer().positive()).default([])
});

const updateQuestionSchema = Joi.object({
  questionText: Joi.string().min(10).max(5000).optional(),
  answerText: Joi.string().min(5).max(10000).optional(),
  sources: Joi.array().items(Joi.object({
    type: Joi.string().valid('textbook', 'guideline', 'journal', 'website', 'internal').required(),
    title: Joi.string().required(),
    authors: Joi.array().items(Joi.string()).optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    pages: Joi.string().optional(),
    url: Joi.string().uri().optional(),
    isbn: Joi.string().optional(),
    doi: Joi.string().optional(),
    edition: Joi.string().optional(),
    authority: Joi.string().optional(),
    date_accessed: Joi.date().iso().optional()
  })).optional(),
  tagIds: Joi.array().items(Joi.number().integer().positive()).optional()
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('draft', 'pending_review', 'validated', 'published', 'disabled', 'archived').required(),
  comment: Joi.string().max(1000).default('')
});

// GET /api/questions - List questions with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      tags, 
      search, 
      author,
      page = 1, 
      limit = 20,
      orderBy = 'updated_at',
      orderDirection = 'DESC'
    } = req.query;

    // Parse tag IDs
    let tagIds = [];
    if (tags) {
      tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    const offset = (page - 1) * limit;
    
    const questions = await Question.findMany({
      status,
      tagIds: tagIds.length > 0 ? tagIds : null,
      search,
      createdBy: author,
      limit: parseInt(limit),
      offset,
      orderBy,
      orderDirection
    });

    // Get total count for pagination
    const totalCount = await Question.count({
      status,
      tagIds: tagIds.length > 0 ? tagIds : null,
      search,
      createdBy: author
    });

    res.json({
      questions: questions.map(q => q.toJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
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

// GET /api/questions/pending - Questions pending review (for reviewers)
router.get('/pending', async (req, res) => {
  try {
    const questions = await Question.findMany({
      status: 'pending_review',
      limit: 50,
      offset: 0
    });

    res.json({
      questions: questions.map(q => q.toJSON()),
      count: questions.length
    });
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending questions',
      message: error.message 
    });
  }
});

// GET /api/questions/published - Published questions for flashcard app
router.get('/published', async (req, res) => {
  try {
    const { tags, limit = 100 } = req.query;
    
    let tagIds = [];
    if (tags) {
      tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    const questions = await Question.findMany({
      status: 'published',
      tagIds: tagIds.length > 0 ? tagIds : null,
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
        title: "Questions de Pharmacie",
        total_cards: renderedQuestions.length,
        available_tags: [...new Set(renderedQuestions.flatMap(q => q.tags.map(t => t.name)))],
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching published questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch published questions',
      message: error.message 
    });
  }
});

// GET /api/questions/:id - Get single question
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
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

// GET /api/questions/:id/preview - Get rendered HTML preview
router.get('/:id/preview', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const rendered = question.getRenderedContent();
    res.json(rendered);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview',
      message: error.message 
    });
  }
});

// GET /api/questions/:id/history - Get question version history
router.get('/:id/history', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const versions = await question.getVersions();
    res.json({ versions });
  } catch (error) {
    console.error('Error fetching question history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch question history',
      message: error.message 
    });
  }
});

// POST /api/questions - Create new question
router.post('/', async (req, res) => {
  try {
    const { error, value } = createQuestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // TODO: Get user ID from authentication middleware
    const createdBy = 1; // Temporary hardcode

    const question = await Question.create({
      ...value,
      createdBy
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

// PUT /api/questions/:id - Update question
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateQuestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // TODO: Check user permissions
    const updatedBy = 1; // Temporary hardcode

    await question.update({
      ...value,
      updatedBy
    });

    // Update tags if provided
    if (value.tagIds) {
      await question.updateTags(value.tagIds, updatedBy);
    }

    // Return updated question with tags
    const updatedQuestion = await Question.findById(req.params.id);
    res.json(updatedQuestion.toJSON());
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ 
      error: 'Failed to update question',
      message: error.message 
    });
  }
});

// PATCH /api/questions/:id/status - Update question status
router.patch('/:id/status', async (req, res) => {
  try {
    const { error, value } = statusUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // TODO: Check user permissions for status transitions
    const userId = 1; // Temporary hardcode

    await question.updateStatus(value.status, userId, value.comment);
    res.json(question.toJSON());
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(400).json({ 
      error: 'Failed to update question status',
      message: error.message 
    });
  }
});

// DELETE /api/questions/:id - Delete (archive) question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // TODO: Check user permissions
    const userId = 1; // Temporary hardcode

    await question.delete(userId);
    res.json({ message: 'Question archived successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ 
      error: 'Failed to delete question',
      message: error.message 
    });
  }
});

// POST /api/questions/preview - Preview markdown rendering
router.post('/preview', async (req, res) => {
  try {
    const { questionText, answerText } = req.body;

    if (!questionText && !answerText) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const preview = {
      questionHtml: questionText ? markdownToHtml(questionText) : '',
      answerHtml: answerText ? markdownToHtml(answerText) : ''
    };

    res.json(preview);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview',
      message: error.message 
    });
  }
});

// POST /api/questions/bulk-import - Import questions from JSON
router.post('/bulk-import', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }

    // TODO: Implement bulk import with validation
    res.status(501).json({ error: 'Bulk import not yet implemented' });
  } catch (error) {
    console.error('Error importing questions:', error);
    res.status(500).json({ 
      error: 'Failed to import questions',
      message: error.message 
    });
  }
});


export default router;