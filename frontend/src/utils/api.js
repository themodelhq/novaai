// VITE_API_URL must be set in Netlify environment variables
// e.g. https://your-app.onrender.com/api
const BASE_URL = import.meta.env.VITE_API_URL || '';

if (!BASE_URL) {
  console.error(
    '[Nova] VITE_API_URL is not set. ' +
    'Add it in Netlify: Site Settings → Environment Variables → VITE_API_URL=https://your-backend.onrender.com/api'
  );
}

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
  if (!BASE_URL) {
    throw new Error(
      'API URL not configured. Please set VITE_API_URL in your Netlify environment variables to your Render backend URL (e.g. https://nova-ai-backend.onrender.com/api)'
    );
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: headers(options.headers),
    });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Check your internet connection or backend URL.');
  }

  // Guard: if we got HTML back instead of JSON, the URL is wrong
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('[Nova] Expected JSON but got:', text.slice(0, 200));
    throw new Error(
      'The API URL is pointing to the wrong server (got HTML instead of JSON). ' +
      'Set VITE_API_URL=https://your-backend.onrender.com/api in Netlify environment variables, then redeploy.'
    );
  }

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
    if (!BASE_URL) throw new Error('API URL not configured.');
    const res = await fetch(`${BASE_URL}/chat/tts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ text, voice })
    });
    if (!res.ok) throw new Error('TTS failed');
    return res.blob();
  },
};

export async function sendMessageStream(convId, content, images = [], onChunk, onDone, onError) {
  if (!BASE_URL) {
    onError('API URL not configured. Set VITE_API_URL in Netlify environment variables.');
    return;
  }

  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, images })
    });
  } catch (e) {
    onError('Cannot reach server. Check VITE_API_URL in Netlify.');
    return;
  }

  if (!res.ok) {
    // Check for HTML response (wrong URL)
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      onError('Wrong API URL — got HTML instead of JSON. Set VITE_API_URL in Netlify environment variables.');
      return;
    }
    const err = await res.json();
    onError(err.error || 'Request failed');
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
        } catch (_) {}
      }
    }
  }
}
