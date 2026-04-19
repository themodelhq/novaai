/**
 * Nova AI Backend - Self-bootstrapping server
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

// CORS — accept configured frontend URL, any netlify.app subdomain, or all origins
const FRONTEND_URL = process.env.FRONTEND_URL || '';
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow explicitly configured frontend URL
    if (FRONTEND_URL && origin === FRONTEND_URL) return callback(null, true);
    // Allow any netlify.app domain (covers all deploy previews too)
    if (origin.endsWith('.netlify.app')) return callback(null, true);
    // Allow localhost for dev
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true);
    // If no FRONTEND_URL configured yet, allow all (open during initial setup)
    if (!FRONTEND_URL) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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
  console.log(`[Nova] FRONTEND_URL: ${FRONTEND_URL || '(any — set FRONTEND_URL env var)'}`);
});

process.on('uncaughtException',  (e) => console.error('[Nova] uncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('[Nova] unhandledRejection:', e));
