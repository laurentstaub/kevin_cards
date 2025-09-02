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

// Simple validation for toggle operations
const toggleSchema = Joi.object({
  adminNote: Joi.string().max(500).optional().default('')
});

const deleteSchema = Joi.object({
  reason: Joi.string().max(500).optional().default('')
});

// GET /api/questions - List questions with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      active,     // 'true'/'false' for active filter (or undefined for all)
      tags, 
      search, 
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
    
    // Convert string parameter to boolean
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    
    const questions = await Question.findMany({
      active: activeFilter,
      tagIds: tagIds.length > 0 ? tagIds : null,
      search,
      limit: parseInt(limit),
      offset,
      orderBy,
      orderDirection
    });

    // Get total count for pagination
    const totalCount = await Question.count({
      active: activeFilter,
      tagIds: tagIds.length > 0 ? tagIds : null,
      search
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

// GET /api/questions/active - Active questions for flashcard app
router.get('/active', async (req, res) => {
  try {
    const { tags, limit = 100 } = req.query;
    
    let tagIds = [];
    if (tags) {
      tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    const questions = await Question.findMany({
      active: true,
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
    console.log('PUT /questions/:id - Request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = updateQuestionSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
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
      await question.updateTags(value.tagIds);
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

// PATCH /api/questions/:id/toggle - Toggle active/inactive status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.toggleActive();
    res.json(question.toJSON());
  } catch (error) {
    console.error('Error toggling question status:', error);
    res.status(500).json({ 
      error: 'Failed to toggle question status',
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

// POST /api/questions/regenerate-html - Force regenerate HTML for all questions
router.post('/regenerate-html', async (req, res) => {
  try {
    const { questionIds } = req.body;
    
    let questions;
    if (questionIds && Array.isArray(questionIds)) {
      // Regenerate specific questions
      questions = await Promise.all(
        questionIds.map(id => Question.findById(id))
      );
      questions = questions.filter(q => q !== null);
    } else {
      // Regenerate all questions
      questions = await Question.findMany({ 
        active: undefined, // Get all questions regardless of status
        limit: 1000,
        offset: 0
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const question of questions) {
      try {
        await question.regenerateHtml();
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          id: question.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `HTML regeneration completed`,
      total: questions.length,
      success: successCount,
      errors: errorCount,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Error regenerating HTML:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate HTML',
      message: error.message 
    });
  }
});


export default router;