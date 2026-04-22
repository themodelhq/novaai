const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { getUserKeys } = require('./keys');

const router = express.Router();

const SYSTEM_PROMPT = `You are Nova, an extraordinarily capable AI assistant that is helpful, creative, insightful, and genuinely interested in helping users with anything they need. You can:
- Answer any question on any topic with deep expertise
- Write code in any programming language
- Analyze images and documents
- Help with creative writing, storytelling, and ideation
- Solve complex mathematical and scientific problems
- Provide thoughtful advice and emotional support
- Translate languages and explain cultural nuances
- Help with business, strategy, and research
- Discuss philosophy, ethics, and deep ideas

You are curious, warm, witty, and direct. You give comprehensive answers but know when to be concise. You never refuse reasonable requests and always try to be maximally helpful.`;

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER REGISTRY
//
// TIER 1 — Free (no credit card, just free account signup):
//   openrouter_free  OpenRouter free router — auto-picks best free model
//   ollama_cloud     Ollama Cloud free tier — no key needed at all
//
// TIER 2 — Paid API key providers (fallbacks):
//   anthropic, openai, groq, mistral, google
// ─────────────────────────────────────────────────────────────────────────────

// All providers use OpenAI-compatible streaming (except anthropic & google)
const OAI_PARSE  = (p) => p.choices?.[0]?.delta?.content || '';
const OAI_BODY   = (model, messages, extra = {}) => JSON.stringify({
  model, max_tokens: 8192, stream: true,
  messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
  ...extra,
});
const OAI_HDRS   = (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' });

const PROVIDERS = {

  // ── TIER 1: FREE PROVIDERS ──────────────────────────────────────────────────

  openrouter_free: {
    tier: 'free',
    label: 'OpenRouter Free',
    url: () => 'https://openrouter.ai/api/v1/chat/completions',
    // openrouter/free auto-selects any available free model
    model: (userModel) => userModel || 'openrouter/free',
    buildHeaders: (key) => ({
      ...OAI_HDRS(key),
      'HTTP-Referer': 'https://nova-ai.app',
      'X-Title': 'Nova AI',
    }),
    buildBody: (model, messages) => OAI_BODY(model, messages),
    parseChunk: OAI_PARSE,
  },

  ollama_cloud: {
    tier: 'paid',
    label: 'Ollama Cloud',
    // Ollama Cloud requires an API key — get one free at ollama.com/settings/keys
    // Uses native Ollama API format with :cloud model suffix
    url: () => 'https://ollama.com/api/chat',
    model: (userModel) => userModel || 'llama3.3:cloud',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (model, messages) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: true,
    }),
    // Ollama native format: {"message":{"content":"..."}}
    parseChunk: (p) => p.message?.content || '',
  },

  // ── TIER 2: PAID API KEY PROVIDERS (FALLBACKS) ─────────────────────────────

  anthropic: {
    tier: 'paid',
    label: 'Anthropic',
    url: () => process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages',
    model: (userModel) => userModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'Accept': 'text/event-stream',
    }),
    buildBody: (model, messages) => JSON.stringify({
      model, max_tokens: 8192, system: SYSTEM_PROMPT, messages, stream: true,
    }),
    parseChunk: (p) => {
      if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta')
        return p.delta.text || '';
      return '';
    },
  },

  openai: {
    tier: 'paid',
    label: 'OpenAI',
    url: () => 'https://api.openai.com/v1/chat/completions',
    model: (userModel) => userModel || 'gpt-4o',
    buildHeaders: OAI_HDRS,
    buildBody: (model, messages) => OAI_BODY(model, messages),
    parseChunk: OAI_PARSE,
  },

  groq: {
    tier: 'paid',
    label: 'Groq',
    url: () => 'https://api.groq.com/openai/v1/chat/completions',
    model: (userModel) => userModel || 'llama-3.3-70b-versatile',
    buildHeaders: OAI_HDRS,
    buildBody: (model, messages) => OAI_BODY(model, messages),
    parseChunk: OAI_PARSE,
  },

  mistral: {
    tier: 'paid',
    label: 'Mistral',
    url: () => 'https://api.mistral.ai/v1/chat/completions',
    model: (userModel) => userModel || 'mistral-large-latest',
    buildHeaders: OAI_HDRS,
    buildBody: (model, messages) => OAI_BODY(model, messages),
    parseChunk: OAI_PARSE,
  },

  google: {
    tier: 'paid',
    label: 'Google',
    url: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    model: (userModel) => userModel || 'gemini-2.5-pro-preview-05-06',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (model, messages) => JSON.stringify({
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : m.content.find?.(c => c.type === 'text')?.text || '' }],
      })),
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: 8192 },
    }),
    parseChunk: (p) => p.candidates?.[0]?.content?.parts?.[0]?.text || '',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE PROVIDER CHAIN
//
// Priority order:
//   1. User's chosen free provider (openrouter_free / ollama_cloud) if active
//   2. User's saved API key providers (in selected order)
//   3. Server env-var fallbacks
//   4. openrouter_free with server's OPENROUTER_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

function buildProviderChain(userKeys) {
  const active    = userKeys.active_provider || 'openrouter_free';
  const userModel = userKeys.active_model    || null;

  const keyMap = {
    openrouter_free: userKeys.openrouter_key  || process.env.OPENROUTER_API_KEY || 'free',
    ollama_cloud:    userKeys.ollama_key  || process.env.OLLAMA_API_KEY,
    anthropic:       userKeys.anthropic_key   || process.env.ANTHROPIC_API_KEY,
    openai:          userKeys.openai_key      || process.env.OPENAI_API_KEY,
    groq:            userKeys.groq_key        || process.env.GROQ_API_KEY,
    mistral:         userKeys.mistral_key     || process.env.MISTRAL_API_KEY,
    google:          userKeys.google_key      || process.env.GOOGLE_API_KEY,
  };

  const chain = [];

  // Always put the active provider first
  if (keyMap[active]) chain.push({ provider: active, apiKey: keyMap[active], userModel });

  // Then all other free providers
  for (const p of ['openrouter_free', 'ollama_cloud']) {
    if (p !== active && keyMap[p]) chain.push({ provider: p, apiKey: keyMap[p], userModel: null });
  }

  // Then paid providers in priority order
  for (const p of ['anthropic', 'openai', 'groq', 'mistral', 'google']) {
    if (p !== active && keyMap[p]) chain.push({ provider: p, apiKey: keyMap[p], userModel: null });
  }

  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM ONE PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

async function streamProvider({ provider, apiKey, userModel, messages, onText }) {
  const cfg   = PROVIDERS[provider];
  const model = cfg.model(userModel);
  const url   = provider === 'google'
    ? cfg.url(model, apiKey)
    : cfg.url();

  console.log(`[Nova] Trying provider: ${cfg.label} | model: ${model}`);

  const response = await fetch(url, {
    method:  'POST',
    headers: cfg.buildHeaders(apiKey),
    body:    cfg.buildBody(model, messages),
  });

  console.log(`[Nova] ${cfg.label} status: ${response.status}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Nova] ${cfg.label} error body: ${errText.slice(0, 300)}`);
    let msg = `${cfg.label} error ${response.status}`;
    try { msg = JSON.parse(errText).error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let fullText  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const chunk  = cfg.parseChunk(parsed);
          if (chunk) { fullText += chunk; onText(chunk); }
        } catch (_) {}
      }
    }
  }

  // flush remaining buffer
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const chunk  = cfg.parseChunk(parsed);
        if (chunk) { fullText += chunk; onText(chunk); }
      } catch (_) {}
    }
  }

  console.log(`[Nova] ${cfg.label} done. chars: ${fullText.length}`);
  return fullText;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM WITH AUTOMATIC FALLBACK CHAIN
// ─────────────────────────────────────────────────────────────────────────────

async function streamWithFallback({ chain, messages, onText, onProviderSwitch }) {
  const errors = [];

  for (const candidate of chain) {
    if (errors.length > 0) {
      // Notify frontend we're switching providers
      onProviderSwitch && onProviderSwitch(candidate.provider, PROVIDERS[candidate.provider]?.label);
    }
    try {
      const text = await streamProvider({ ...candidate, messages, onText });
      if (text && text.length > 0) return { text, provider: candidate.provider };
      errors.push(`${candidate.provider}: empty response`);
    } catch (err) {
      console.error(`[Nova] ${candidate.provider} failed:`, err.message);
      errors.push(`${candidate.provider}: ${err.message}`);
    }
  }

  throw new Error(
    `All providers failed.\n${errors.join('\n')}\n\nPlease check Settings → API Keys or try again.`
  );
}

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/conversations', authMiddleware, (req, res) => {
  const convos = db.prepare(`
    SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC
  `).all(req.user.id);
  res.json(convos);
});

router.get('/conversations/:id', authMiddleware, (req, res) => {
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ conversation: convo, messages });
});

router.post('/conversations', authMiddleware, (req, res) => {
  const id = uuidv4();
  const { title = 'New Conversation', model = 'auto' } = req.body;
  db.prepare('INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)').run(id, req.user.id, title, model);
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.json(convo);
});

router.put('/conversations/:id', authMiddleware, (req, res) => {
  const { title } = req.body;
  db.prepare('UPDATE conversations SET title = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?').run(title, req.params.id, req.user.id);
  res.json({ success: true });
});

router.delete('/conversations/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ── Send message ──────────────────────────────────────────────────────────────

router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  const { content, images = [], model: requestedModel } = req.body;
  const userId = req.user.id;
  const convId = req.params.id;

  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(convId, userId);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Message content is required' });

  // Build provider fallback chain from user prefs + env vars
  // If user selected a specific model in the UI, override the stored active_model
  const userKeys = getUserKeys(userId);
  if (requestedModel) userKeys.active_model = requestedModel;
  const chain    = buildProviderChain(userKeys);

  if (chain.length === 0) {
    return res.status(500).json({
      error: 'No AI providers available. Add a free OpenRouter account in Settings → API Keys, or add any paid API key.'
    });
  }

  // Save user message
  const userMsgId = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)')
    .run(userMsgId, convId, userId, 'user', content);
  db.prepare('UPDATE users SET message_count = message_count + 1 WHERE id = ?').run(userId);

  // Build history
  const history    = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convId);
  const apiMessages = history.map(m => {
    if (m.role === 'user' && m.id === userMsgId && images.length > 0) {
      return {
        role: 'user',
        content: [
          ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } })),
          { type: 'text', text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send      = (obj) => { try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch (_) {} };
  const keepAlive = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 15000);

  try {
    const { text: fullText, provider: usedProvider } = await streamWithFallback({
      chain,
      messages: apiMessages,
      onText:           (chunk) => send({ type: 'text', content: chunk }),
      onProviderSwitch: (id, label) => send({ type: 'provider_switch', provider: id, label }),
    });

    clearInterval(keepAlive);
    if (!fullText) throw new Error('Empty response from all providers');

    const asstMsgId = uuidv4();
    db.prepare('INSERT INTO messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)')
      .run(asstMsgId, convId, userId, 'assistant', fullText);

    const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(convId).c;
    if (msgCount <= 3 && convo.title === 'New Conversation') {
      db.prepare('UPDATE conversations SET title = ?, updated_at = unixepoch() WHERE id = ?')
        .run(content.slice(0, 50) + (content.length > 50 ? '...' : ''), convId);
    } else {
      db.prepare('UPDATE conversations SET updated_at = unixepoch() WHERE id = ?').run(convId);
    }

    send({ type: 'done', messageId: asstMsgId, provider: usedProvider });
    res.end();

  } catch (err) {
    clearInterval(keepAlive);
    console.error('[Nova] All providers failed:', err.message);
    send({ type: 'error', error: err.message });
    res.end();
  }
});

// ── TTS ───────────────────────────────────────────────────────────────────────

router.post('/tts', authMiddleware, async (req, res) => {
  try {
    const { text, voice = 'alloy' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const userKeys = getUserKeys(req.user.id);
    const openaiKey = userKeys.openai_key || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'TTS requires an OpenAI API key in Settings → API Keys.' });
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice }),
    });
    if (!r.ok) throw new Error('TTS failed');
    const buf = await r.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buf));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Image Generation ──────────────────────────────────────────────────────────

router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', conversation_id } = req.body;
    const userKeys = getUserKeys(req.user.id);
    const openaiKey = userKeys.openai_key || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'Image generation requires an OpenAI API key in Settings → API Keys.' });
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'Image generation failed');
    const id = uuidv4();
    db.prepare('INSERT INTO generated_media (id, user_id, conversation_id, type, prompt, url) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, conversation_id || null, 'image', prompt, d.data[0].url);
    res.json({ id, url: d.data[0].url, prompt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Media ─────────────────────────────────────────────────────────────────────

router.get('/media', authMiddleware, (req, res) => {
  const media = db.prepare('SELECT * FROM generated_media WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(media);
});

module.exports = router;
