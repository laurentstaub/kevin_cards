import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Port resolution: PORT (injected by the hosting platform) wins,
// then FRONTEND_PORT from .env, then the local default.
const port = parseInt(process.env.PORT) || parseInt(process.env.FRONTEND_PORT) || 8080;

// Where the API server listens. Must match API_PORT in .env.
const apiTarget = process.env.API_URL
  || `http://localhost:${parseInt(process.env.API_PORT) || 3001}`;

// Proxy API requests to the backend server.
// Mounted on /api, so req.url arrives stripped of the prefix and we add it back.
app.use('/api', createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  pathRewrite: { '^/': '/api/' },
  // http-proxy-middleware v3 groups handlers under `on`.
  on: {
    error: (err, req, res) => {
      console.error(`[PROXY] ${err.message}`);
      if (res.writeHead && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `API server unreachable at ${apiTarget}. Start it with "npm run dev".`
        }));
      }
    }
  }
}));

// Static assets
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server running at http://localhost:${port}`);
  console.log(`Admin panel at            http://localhost:${port}/admin`);
  console.log(`Proxying /api -> ${apiTarget}`);
});
