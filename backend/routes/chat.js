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

You are curious, warm, witty, and direct. You give comprehensive answers but know when to be concise. You never refuse reasonable requests and always try to be maximally helpful. You acknowledge you can generate images, speak text aloud (via TTS), and assist with video generation when users request these features through the app's built-in tools.`;

// ── Provider configs ──────────────────────────────────────────────────────────

const PROVIDERS = {
  anthropic: {
    url: () => process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages',
    model: () => process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
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
    parseChunk: (parsed) => {
      if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta')
        return parsed.delta.text || '';
      return '';
    },
  },
  openai: {
    url: () => 'https://api.openai.com/v1/chat/completions',
    model: () => 'gpt-4o',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (model, messages) => JSON.stringify({
      model, max_tokens: 8192, stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
    parseChunk: (parsed) => parsed.choices?.[0]?.delta?.content || '',
  },
  groq: {
    url: () => 'https://api.groq.com/openai/v1/chat/completions',
    model: () => 'llama-3.3-70b-versatile',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (model, messages) => JSON.stringify({
      model, max_tokens: 8192, stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
    parseChunk: (parsed) => parsed.choices?.[0]?.delta?.content || '',
  },
  mistral: {
    url: () => 'https://api.mistral.ai/v1/chat/completions',
    model: () => 'mistral-large-latest',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (model, messages) => JSON.stringify({
      model, max_tokens: 8192, stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
    parseChunk: (parsed) => parsed.choices?.[0]?.delta?.content || '',
  },
  google: {
    url: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    model: () => 'gemini-1.5-pro',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (model, messages) => JSON.stringify({
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : m.content.find(c => c.type === 'text')?.text || '' }]
      })),
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: 8192 },
    }),
    parseChunk: (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text || '',
  },
};

// ── Resolve which key + provider to use ───────────────────────────────────────

function resolveProvider(userKeys) {
  const active = userKeys.active_provider || 'anthropic';
  const keyMap = {
    anthropic: userKeys.anthropic_key || process.env.ANTHROPIC_API_KEY,
    openai:    userKeys.openai_key    || process.env.OPENAI_API_KEY,
    groq:      userKeys.groq_key      || process.env.GROQ_API_KEY,
    mistral:   userKeys.mistral_key   || process.env.MISTRAL_API_KEY,
    google:    userKeys.google_key    || process.env.GOOGLE_API_KEY,
  };

  // Use selected provider if it has a key, else fall back in order
  const order = [active, 'anthropic', 'openai', 'groq', 'mistral', 'google'];
  for (const p of order) {
    if (keyMap[p]) return { provider: p, apiKey: keyMap[p] };
  }
  return null;
}

// ── Generic SSE streaming ─────────────────────────────────────────────────────

async function streamProviderMessage({ provider, apiKey, messages, onText }) {
  const cfg = PROVIDERS[provider];
  const model = cfg.model();
  const url = provider === 'google' ? cfg.url(model, apiKey) : cfg.url();

  console.log(`[Nova] Provider: ${provider} | Model: ${model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: cfg.buildHeaders(apiKey),
    body: cfg.buildBody(model, messages),
  });

  console.log(`[Nova] Response status: ${response.status}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Nova] API error: ${errText}`);
    let errMsg = `${provider} API error ${response.status}`;
    try { errMsg = JSON.parse(errText).error?.message || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const chunk = cfg.parseChunk(parsed);
          if (chunk) { fullText += chunk; onText(chunk); }
        } catch (_) {}
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const chunk = cfg.parseChunk(parsed);
        if (chunk) { fullText += chunk; onText(chunk); }
      } catch (_) {}
    }
  }

  console.log(`[Nova] Done. Length: ${fullText.length} chars`);
  return fullText;
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
  const { content, images = [] } = req.body;
  const userId = req.user.id;
  const convId = req.params.id;

  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(convId, userId);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Message content is required' });

  // Resolve provider + key (user keys override server env vars)
  const userKeys = getUserKeys(userId);
  const resolved = resolveProvider(userKeys);

  if (!resolved) {
    return res.status(500).json({
      error: 'No AI API key configured. Please add at least one API key in Settings → API Keys.'
    });
  }

  // Save user message
  const userMsgId = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)')
    .run(userMsgId, convId, userId, 'user', content);
  db.prepare('UPDATE users SET message_count = message_count + 1 WHERE id = ?').run(userId);

  // Build message history
  const history = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convId);
  const apiMessages = history.map(m => {
    if (m.role === 'user' && m.id === userMsgId && images.length > 0) {
      return {
        role: 'user',
        content: [
          ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } })),
          { type: 'text', text: m.content }
        ]
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

  const sendEvent = (obj) => { try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch (_) {} };
  const keepAlive = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 15000);

  try {
    const fullText = await streamProviderMessage({
      provider: resolved.provider,
      apiKey: resolved.apiKey,
      messages: apiMessages,
      onText: (chunk) => sendEvent({ type: 'text', content: chunk }),
    });

    clearInterval(keepAlive);

    if (!fullText) throw new Error('Empty response — check your API key is valid and has credits');

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

    sendEvent({ type: 'done', messageId: asstMsgId, provider: resolved.provider });
    res.end();

  } catch (err) {
    clearInterval(keepAlive);
    console.error('[Nova] Stream error:', err.message);
    sendEvent({ type: 'error', error: err.message });
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
    if (!openaiKey) return res.status(400).json({ error: 'TTS requires an OpenAI API key. Add one in Settings → API Keys.' });

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice })
    });
    if (!response.ok) throw new Error('TTS failed');
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Image Generation ──────────────────────────────────────────────────────────

router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', conversation_id } = req.body;
    const userKeys = getUserKeys(req.user.id);
    const openaiKey = userKeys.openai_key || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'Image generation requires an OpenAI API key. Add one in Settings → API Keys.' });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Image generation failed');

    const url = data.data[0].url;
    const id = uuidv4();
    db.prepare('INSERT INTO generated_media (id, user_id, conversation_id, type, prompt, url) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, conversation_id || null, 'image', prompt, url);
    res.json({ id, url, prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Media ─────────────────────────────────────────────────────────────────────

router.get('/media', authMiddleware, (req, res) => {
  const media = db.prepare('SELECT * FROM generated_media WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(media);
});

module.exports = router;
