const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Get user's saved API keys (masked) ────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(req.user.id);
  if (!row) return res.json({ keys: {}, active_provider: 'openrouter_free', active_model: null, has: {} });

  const mask = (k) => k ? '••••••••••••••••••••' + k.slice(-6) : '';
  res.json({
    active_provider: row.active_provider || 'openrouter_free',
    active_model:    row.active_model    || null,
    keys: {
      openrouter: mask(row.openrouter_key),
      ollama:     mask(row.ollama_key),
      anthropic:  mask(row.anthropic_key),
      openai:     mask(row.openai_key),
      groq:       mask(row.groq_key),
      mistral:    mask(row.mistral_key),
      google:     mask(row.google_key),
    },
    has: {
      openrouter: !!row.openrouter_key,
      ollama:     !!row.ollama_key,
      anthropic:  !!row.anthropic_key,
      openai:     !!row.openai_key,
      groq:       !!row.groq_key,
      mistral:    !!row.mistral_key,
      google:     !!row.google_key,
    },
  });
});

// ── Save / update API keys ────────────────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const { openrouter, ollama, anthropic, openai, groq, mistral, google, active_provider, active_model } = req.body;
  const existing = db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(req.user.id);

  if (!existing) {
    db.prepare(`
      INSERT INTO api_keys (user_id, openrouter_key, ollama_key, anthropic_key, openai_key, groq_key, mistral_key, google_key, active_provider, active_model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      openrouter || null, ollama || null, anthropic || null, openai || null,
      groq || null, mistral || null, google || null,
      active_provider || 'openrouter_free', active_model || null
    );
  } else {
    const fields = [], vals = [];
    if (openrouter    !== undefined) { fields.push('openrouter_key = ?'); vals.push(openrouter || null); }
    if (ollama        !== undefined) { fields.push('ollama_key = ?');     vals.push(ollama     || null); }
    if (anthropic     !== undefined) { fields.push('anthropic_key = ?');  vals.push(anthropic  || null); }
    if (openai        !== undefined) { fields.push('openai_key = ?');     vals.push(openai     || null); }
    if (groq          !== undefined) { fields.push('groq_key = ?');       vals.push(groq       || null); }
    if (mistral       !== undefined) { fields.push('mistral_key = ?');    vals.push(mistral    || null); }
    if (google        !== undefined) { fields.push('google_key = ?');     vals.push(google     || null); }
    if (active_provider !== undefined) { fields.push('active_provider = ?'); vals.push(active_provider); }
    if (active_model    !== undefined) { fields.push('active_model = ?');    vals.push(active_model || null); }
    fields.push('updated_at = unixepoch()');
    vals.push(req.user.id);
    db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE user_id = ?`).run(...vals);
  }
  res.json({ success: true });
});

// ── Test API key ──────────────────────────────────────────────────────────────
router.post('/test', authMiddleware, async (req, res) => {
  const { provider, model, message = 'Say exactly: "API key is working correctly!"' } = req.body;
  if (!provider || !model) return res.status(400).json({ error: 'provider and model required' });

  const userKeys = getUserKeys(req.user.id);
  const keyMap = {
    openrouter_free: userKeys.openrouter_key || process.env.OPENROUTER_API_KEY || 'free',
    ollama_cloud:    userKeys.ollama_key || process.env.OLLAMA_API_KEY,
    anthropic:  userKeys.anthropic_key || process.env.ANTHROPIC_API_KEY,
    openai:     userKeys.openai_key    || process.env.OPENAI_API_KEY,
    groq:       userKeys.groq_key      || process.env.GROQ_API_KEY,
    mistral:    userKeys.mistral_key   || process.env.MISTRAL_API_KEY,
    google:     userKeys.google_key    || process.env.GOOGLE_API_KEY,
  };

  const apiKey = keyMap[provider];
  if (!apiKey) {
    return res.json({ ok: false, error: `No API key saved for ${provider}. Add one in Settings → AI Providers.` });
  }

  try {
    let result;

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: 'user', content: message }] }),
      });
      const d = await r.json();
      if (!r.ok) return res.json({ ok: false, error: d.error?.message || `Error ${r.status}` });
      result = { ok: true, response: d.content?.[0]?.text || '', tokens: { prompt: d.usage?.input_tokens, completion: d.usage?.output_tokens, total: (d.usage?.input_tokens||0)+(d.usage?.output_tokens||0) }, rawJson: d };

    } else if (provider === 'google') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: message }] }], generationConfig: { maxOutputTokens: 200 } }),
      });
      const d = await r.json();
      if (!r.ok) return res.json({ ok: false, error: d.error?.message || `Error ${r.status}` });
      const pu = d.usageMetadata?.promptTokenCount||0, cu = d.usageMetadata?.candidatesTokenCount||0;
      result = { ok: true, response: d.candidates?.[0]?.content?.parts?.[0]?.text || '', tokens: { prompt: pu, completion: cu, total: pu+cu }, rawJson: d };

    } else if (provider === 'ollama_cloud') {
      const r = await fetch('https://ollama.com/api/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: message }], stream: false }),
      });
      const text = await r.text();
      let d;
      try { d = JSON.parse(text); } catch(_) { return res.json({ ok: false, error: `Invalid response: ${text.slice(0,100)}` }); }
      if (!r.ok) return res.json({ ok: false, error: d.error?.message || d.error || `Error ${r.status}` });
      result = { ok: true, response: d.message?.content || '', tokens: { prompt: d.prompt_eval_count||0, completion: d.eval_count||0, total: (d.prompt_eval_count||0)+(d.eval_count||0) }, rawJson: d };

    } else {
      // OpenAI-compatible: openrouter_free, openai, groq, mistral
      const urls = {
        openrouter_free: 'https://openrouter.ai/api/v1/chat/completions',
        openai:          'https://api.openai.com/v1/chat/completions',
        groq:            'https://api.groq.com/openai/v1/chat/completions',
        mistral:         'https://api.mistral.ai/v1/chat/completions',
      };
      const hdrs = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
      if (provider === 'openrouter_free') { hdrs['HTTP-Referer'] = 'https://nova-ai.app'; hdrs['X-Title'] = 'Nova AI'; }
      const r = await fetch(urls[provider], {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: 'user', content: message }] }),
      });
      const d = await r.json();
      if (!r.ok) return res.json({ ok: false, error: d.error?.message || `Error ${r.status}` });
      const pu = d.usage?.prompt_tokens||0, cu = d.usage?.completion_tokens||0;
      result = { ok: true, response: d.choices?.[0]?.message?.content || '', tokens: { prompt: pu, completion: cu, total: pu+cu }, rawJson: d };
    }

    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

function getUserKeys(userId) {
  return db.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(userId) || {};
}

module.exports = { router, getUserKeys };
