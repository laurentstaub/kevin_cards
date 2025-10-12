import config from '../config/index.js';
import routes from './index.js';

export const apiDocumentation = (req, res) => {
  res.json({
    name: config.get('app.name'),
    version: config.get('app.version'),
    description: 'API for managing pharmacy flashcard questions with markdown support',
    environment: config.get('app.environment'),
    endpoints: {
      questions: {
        'GET /api/questions': 'List questions with filters and pagination',
        'GET /api/questions/pending': 'Get questions pending review',
        'GET /api/questions/published': 'Get published questions for flashcard app',
        'GET /api/questions/:id': 'Get single question',
        'GET /api/questions/:id/preview': 'Get rendered HTML preview',
        'GET /api/questions/:id/history': 'Get question version history',
        'POST /api/questions': 'Create new question',
        'POST /api/questions/preview': 'Preview markdown rendering',
        'PUT /api/questions/:id': 'Update question',
        'PATCH /api/questions/:id/status': 'Update question status',
        'DELETE /api/questions/:id': 'Archive question'
      },
      tags: {
        'GET /api/tags': 'List all tags',
        'GET /api/tags/categories': 'Get tags grouped by category',
        'GET /api/tags/popular': 'Get most used tags',
        'GET /api/tags/stats': 'Get tag statistics',
        'GET /api/tags/:id': 'Get single tag',
        'GET /api/tags/:id/questions': 'Get questions using this tag',
        'POST /api/tags': 'Create new tag',
        'PUT /api/tags/:id': 'Update tag',
        'PATCH /api/tags/:id/deactivate': 'Deactivate tag',
        'DELETE /api/tags/:id': 'Delete tag permanently',
        'POST /api/tags/:id/merge': 'Merge tag with another tag',
        'POST /api/tags/bulk-create': 'Create multiple tags'
      }
    },
    links: {
      health: `/health`,
      documentation: 'See CLAUDE.md for full API documentation'
    }
  });
};