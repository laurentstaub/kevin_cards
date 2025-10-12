import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`Frontend server: ${req.method} ${req.url}`);
  next();
});

// Proxy API requests to the backend server
const proxyOptions = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/'  // Add back the /api prefix
  },
  logger: console,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.originalUrl} -> http://localhost:3001/api${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'API server is not available. Please ensure the API server is running on port 3001.'
      });
    }
  }
};

app.use('/api', createProxyMiddleware(proxyOptions));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving files from ${path.join(__dirname, 'public')}`);
});
