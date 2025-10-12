export const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);

    server.close((err) => {
      if (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }

      console.log('Server closed');

      // Close database connections if needed
      // await database.close();

      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};