import config from '../config/index.js';

export const healthCheck = async (req, res) => {
  try {
    // Import database query function
    const { query } = await import('../config/database.js');
    await query('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.get('app.version'),
      environment: config.get('app.environment'),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
};