const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('nova_token');
}

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: headers(options.headers),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Conversations
  getConversations: () => request('/chat/conversations'),
  getConversation: (id) => request(`/chat/conversations/${id}`),
  createConversation: (body) => request('/chat/conversations', { method: 'POST', body: JSON.stringify(body) }),
  updateConversation: (id, body) => request(`/chat/conversations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteConversation: (id) => request(`/chat/conversations/${id}`, { method: 'DELETE' }),

  // Media
  generateImage: (body) => request('/chat/generate-image', { method: 'POST', body: JSON.stringify(body) }),
  getMedia: () => request('/chat/media'),

  // TTS - returns blob
  tts: async (text, voice = 'alloy') => {
    const res = await fetch(`${BASE_URL}/chat/tts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ text, voice })
    });
    if (!res.ok) throw new Error('TTS failed');
    return res.blob();
  },

  // Streaming chat
  streamMessage: (convId, content, images = []) => {
    return new EventSource(`${BASE_URL}/chat/conversations/${convId}/messages?token=${getToken()}`);
  }
};

export async function sendMessageStream(convId, content, images = [], onChunk, onDone, onError) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content, images })
  });

  if (!res.ok) {
    const err = await res.json();
    onError(err.error);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'text') onChunk(data.content);
          else if (data.type === 'done') onDone(data.messageId);
          else if (data.type === 'error') onError(data.error);
        } catch {}
      }
    }
  }
}
