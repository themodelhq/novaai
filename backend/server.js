// Load .env only in development — Render injects env vars directly
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Bind port immediately so Render's port scanner sees it
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nova AI server running on port ${PORT}`);
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

process.on('unhandledRejection', (err) => console.error('Unhandled:', err));
process.on('uncaughtException', (err) => console.error('Uncaught:', err));
