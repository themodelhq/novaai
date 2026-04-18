/**
 * Nova AI Backend - Self-bootstrapping server
 * Installs its own dependencies before loading them
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Step 1: Install dependencies if missing ──────────────────────────────────
const nm = path.join(__dirname, 'node_modules');
const hasExpress = fs.existsSync(path.join(nm, 'express', 'index.js'));

if (!hasExpress) {
  console.log('[Nova] node_modules missing – running npm install...');
  try {
    execSync('npm install', {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    console.log('[Nova] npm install complete');
  } catch (e) {
    console.error('[Nova] npm install failed:', e.message);
    process.exit(1);
  }
}

// ── Step 2: Load env (dev only) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

// ── Step 3: Start the server ─────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Nova] Server listening on 0.0.0.0:${PORT}`);
});

process.on('uncaughtException',  (e) => console.error('[Nova] uncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('[Nova] unhandledRejection:', e));
