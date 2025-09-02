import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Proxy API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8084/api',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''  // Remove /api prefix as target already includes it
  },
  logLevel: 'warn',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ 
      error: 'API server is not available. Please ensure the API server is running on port 8084.' 
    });
  }
}));

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
