import Application from './app.js';

async function startServer() {
  try {
    const app = new Application();
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}