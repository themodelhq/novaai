const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Auto-install dependencies if node_modules is missing
const nodeModules = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModules) || !fs.existsSync(path.join(nodeModules, 'express'))) {
  console.log('📦 Installing dependencies...');
  execSync('npm install --production=false', { cwd: __dirname, stdio: 'inherit' });
  console.log('✅ Dependencies installed');
}

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path2 = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

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
  app.use(express.static(path2.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path2.join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Nova AI server running on port ${PORT}`);
});
