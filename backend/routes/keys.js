const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user's saved API keys (masked)
router.get('/', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(req.user.id);
  if (!row) return res.json({ keys: {}, active_provider: 'anthropic' });

  // Mask keys — show only last 6 chars
  const mask = (k) => k ? '••••••••••••••••••••' + k.slice(-6) : '';
  res.json({
    active_provider: row.active_provider || 'anthropic',
    keys: {
      anthropic: mask(row.anthropic_key),
      openai:    mask(row.openai_key),
      groq:      mask(row.groq_key),
      mistral:   mask(row.mistral_key),
      google:    mask(row.google_key),
    },
    has: {
      anthropic: !!row.anthropic_key,
      openai:    !!row.openai_key,
      groq:      !!row.groq_key,
      mistral:   !!row.mistral_key,
      google:    !!row.google_key,
    }
  });
});

// Save / update API keys
router.post('/', authMiddleware, (req, res) => {
  const { anthropic, openai, groq, mistral, google, active_provider } = req.body;

  const existing = db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(req.user.id);

  if (!existing) {
    db.prepare(`
      INSERT INTO api_keys (user_id, anthropic_key, openai_key, groq_key, mistral_key, google_key, active_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      anthropic || null, openai || null, groq || null, mistral || null, google || null,
      active_provider || 'anthropic'
    );
  } else {
    // Only update fields that were sent (empty string = clear, undefined = keep existing)
    const fields = [];
    const vals = [];
    if (anthropic !== undefined) { fields.push('anthropic_key = ?'); vals.push(anthropic || null); }
    if (openai    !== undefined) { fields.push('openai_key = ?');    vals.push(openai    || null); }
    if (groq      !== undefined) { fields.push('groq_key = ?');      vals.push(groq      || null); }
    if (mistral   !== undefined) { fields.push('mistral_key = ?');   vals.push(mistral   || null); }
    if (google    !== undefined) { fields.push('google_key = ?');    vals.push(google    || null); }
    if (active_provider !== undefined) { fields.push('active_provider = ?'); vals.push(active_provider); }
    fields.push('updated_at = unixepoch()');
    vals.push(req.user.id);
    db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE user_id = ?`).run(...vals);
  }

  res.json({ success: true });
});

// Helper used by chat route — get the real (unmasked) key for a user
function getUserKeys(userId) {
  return db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(userId) || {};
}

module.exports = { router, getUserKeys };
