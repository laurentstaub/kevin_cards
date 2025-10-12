import express from 'express';
import config from './config/index.js';
import middleware from './middleware/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { gracefulShutdown } from './utils/shutdown.js';

class Application {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    await config.load();

    // Apply middleware
    middleware.apply(this.app);

    // Mount routes
    routes.mount(this.app);

    // Error handling
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);

    return this;
  }

  async start() {
    const port = config.get('server.port');

    this.server = this.app.listen(port, () => {
      console.log(`FlashPharma API Server`);
      console.log(`Port: ${port}`);
      console.log(`Environment: ${config.get('app.environment')}`);
      console.log(`Health: http://localhost:${port}/health`);
      console.log(`Docs: http://localhost:${port}/api`);
    });

    // Setup graceful shutdown
    gracefulShutdown(this.server);

    return this.server;
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

export default Application;