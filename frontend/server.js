import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Must come before the SPA catch-all, otherwise /health returns index.html
// with a 200 and an uptime monitor can never tell healthy from broken.
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'JobSniff Frontend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/' + path.split('.').pop());
    }
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
}); 