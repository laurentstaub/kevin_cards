import questionsRouter from './questions.js';
import tagsRouter from './tags.js';
import { apiDocumentation } from './documentation.js';

class Routes {
  mount(app) {
    app.get('/api', apiDocumentation);

    // Resource routes
    app.use('/api/questions', questionsRouter);
    app.use('/api/tags', tagsRouter);
  }

  // Method to get route information (useful for debugging/documentation)
  getRoutes() {
    return {
      documentation: 'GET /api',
      questions: {
        base: '/api/questions',
        routes: [
          'GET /',
          'GET /pending',
          'GET /published',
          'GET /:id',
          'GET /:id/preview',
          'GET /:id/history',
          'POST /',
          'POST /preview',
          'PUT /:id',
          'PATCH /:id/status',
          'DELETE /:id'
        ]
      },
      tags: {
        base: '/api/tags',
        routes: [
          'GET /',
          'GET /categories',
          'GET /popular',
          'GET /stats',
          'GET /:id',
          'GET /:id/questions',
          'POST /',
          'PUT /:id',
          'PATCH /:id/deactivate',
          'DELETE /:id',
          'POST /:id/merge',
          'POST /bulk-create'
        ]
      }
    };
  }
}

export default new Routes();