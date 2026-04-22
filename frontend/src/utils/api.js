const BASE_URL = import.meta.env.VITE_API_URL || '';

if (!BASE_URL) {
  console.error('[Nova] VITE_API_URL is not set. Add it in Netlify environment variables.');
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
    throw new Error('API URL not configured. Set VITE_API_URL in Netlify environment variables.');
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

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('[Nova] Expected JSON but got:', text.slice(0, 200));
    throw new Error('Wrong API URL — got HTML instead of JSON. Check VITE_API_URL in Netlify.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  getConversations: () => request('/chat/conversations'),
  getConversation: (id) => request(`/chat/conversations/${id}`),
  createConversation: (body) => request('/chat/conversations', { method: 'POST', body: JSON.stringify(body) }),
  updateConversation: (id, body) => request(`/chat/conversations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteConversation: (id) => request(`/chat/conversations/${id}`, { method: 'DELETE' }),

  generateImage: (body) => request('/chat/generate-image', { method: 'POST', body: JSON.stringify(body) }),
  getMedia: () => request('/chat/media'),

  getApiKeys: () => request('/keys'),
  saveApiKeys: (body) => request('/keys', { method: 'POST', body: JSON.stringify(body) }),
  testApiKey: (body) => request('/keys/test', { method: 'POST', body: JSON.stringify(body) }),

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

export async function sendMessageStream(convId, content, images = [], selectedModel, onChunk, onDone, onError, onProviderSwitch) {
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
      body: JSON.stringify({ content, images, model: selectedModel })
    });
  } catch (e) {
    onError('Cannot reach server. Check that your backend is running and VITE_API_URL is correct.');
    return;
  }

  // Non-200 before stream starts (e.g. 401, 404, 500 before flushHeaders)
  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        const err = await res.json();
        onError(err.error || `Server error ${res.status}`);
        return;
      } catch (_) {}
    }
    onError(`Server error ${res.status}. Check backend logs on Render.`);
    return;
  }

  if (!res.body) {
    onError('No response body received. This may be a browser compatibility issue.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let gotDone = false;
  let gotAnyText = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline (proper SSE boundary)
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        for (const line of event.split('\n')) {
          // Skip SSE comments (keep-alive pings like ": ping")
          if (line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const data = JSON.parse(raw);
            if (data.type === 'text' && data.content) {
              gotAnyText = true;
              onChunk(data.content);
            } else if (data.type === 'done') {
              gotDone = true;
              onDone(data.messageId, data.provider);
            } else if (data.type === 'error') {
              onError(data.error || 'AI provider returned an error');
              return;
            } else if (data.type === 'provider_switch') {
              onProviderSwitch && onProviderSwitch(data.provider, data.label);
            }
          } catch (_) {
            // Not JSON — ignore malformed lines
          }
        }
      }
    }

    // Stream ended — if we got text but no 'done' event, synthesize one
    if (gotAnyText && !gotDone) {
      onDone(`local-${Date.now()}`);
    } else if (!gotAnyText && !gotDone) {
      onError('No response received from AI. Check your API key is saved and valid in Settings → API Keys.');
    }

  } catch (streamErr) {
    onError(`Stream read error: ${streamErr.message}`);
  }
}
