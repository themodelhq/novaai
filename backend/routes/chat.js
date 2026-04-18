const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Get all conversations
router.get('/conversations', authMiddleware, (req, res) => {
  const convos = db.prepare(`
    SELECT c.*, 
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC
  `).all(req.user.id);
  res.json(convos);
});

// Get single conversation with messages
router.get('/conversations/:id', authMiddleware, (req, res) => {
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ conversation: convo, messages });
});

// Create conversation
router.post('/conversations', authMiddleware, (req, res) => {
  const id = uuidv4();
  const { title = 'New Conversation', model = 'claude-sonnet-4-20250514' } = req.body;
  db.prepare('INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)').run(id, req.user.id, title, model);
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.json(convo);
});

// Update conversation title
router.put('/conversations/:id', authMiddleware, (req, res) => {
  const { title } = req.body;
  db.prepare('UPDATE conversations SET title = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?').run(title, req.params.id, req.user.id);
  res.json({ success: true });
});

// Delete conversation
router.delete('/conversations/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Send message with streaming
router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  const { content, images = [] } = req.body;
  const userId = req.user.id;
  const convId = req.params.id;

  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(convId, userId);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  // Save user message
  const userMsgId = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(userMsgId, convId, userId, 'user', content);
  db.prepare('UPDATE users SET message_count = message_count + 1 WHERE id = ?').run(userId);

  // Build message history
  const history = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convId);
  const apiMessages = history.map(m => {
    if (m.role === 'user' && images.length > 0 && m.id === userMsgId) {
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

  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullText = '';
  try {
    const stream = anthropic.messages.stream({
      model: convo.model || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: apiMessages
    });

    stream.on('text', (text) => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    await stream.finalMessage();

    // Save assistant message
    const asstMsgId = uuidv4();
    db.prepare('INSERT INTO messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(asstMsgId, convId, userId, 'assistant', fullText);

    // Auto-title if first exchange
    const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(convId).c;
    if (msgCount <= 3 && convo.title === 'New Conversation') {
      const shortTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      db.prepare('UPDATE conversations SET title = ?, updated_at = unixepoch() WHERE id = ?').run(shortTitle, convId);
    } else {
      db.prepare('UPDATE conversations SET updated_at = unixepoch() WHERE id = ?').run(convId);
    }

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: asstMsgId })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// Text to speech
router.post('/tts', authMiddleware, async (req, res) => {
  try {
    const { text, voice = 'alloy' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'TTS not configured. Add OPENAI_API_KEY to environment.' });

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

// Image generation
router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', conversation_id } = req.body;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'Image generation not configured. Add OPENAI_API_KEY.' });

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

// Get media history
router.get('/media', authMiddleware, (req, res) => {
  const media = db.prepare('SELECT * FROM generated_media WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(media);
});

module.exports = router;
