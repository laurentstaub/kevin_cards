import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the src directory
app.use(express.static(path.join(__dirname, 'src')));

// Serve static files from the zz_questions directory
app.use('/zz_questions', express.static(path.join(__dirname, 'zz_questions')));

// Serve the index.html file for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving files from ${path.join(__dirname, 'src')}`);
});
