import { create } from 'zustand';
import { api, sendMessageStream } from '../utils/api';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConvId: null,
  messages: {},
  streaming: false,
  streamingText: '',
  streamingProvider: null,
  loadingConvs: false,
  // Model selection — persisted in localStorage
  selectedModel: localStorage.getItem('nova_model') || 'openrouter/free',
  activeProvider: localStorage.getItem('nova_provider') || 'openrouter_free',

  setSelectedModel: (model) => {
    localStorage.setItem('nova_model', model);
    set({ selectedModel: model });
  },

  setActiveProvider: (provider) => {
    localStorage.setItem('nova_provider', provider);
    set({ activeProvider: provider });
  },

  loadConversations: async () => {
    set({ loadingConvs: true });
    try {
      const convs = await api.getConversations();
      set({ conversations: convs, loadingConvs: false });
    } catch { set({ loadingConvs: false }); }
  },

  loadConversation: async (id) => {
    const { conversation, messages } = await api.getConversation(id);
    set(s => ({
      activeConvId: id,
      messages: { ...s.messages, [id]: messages },
      conversations: s.conversations.map(c => c.id === id ? { ...c, ...conversation } : c)
    }));
  },

  createConversation: async () => {
    const conv = await api.createConversation({});
    set(s => ({
      conversations: [conv, ...s.conversations],
      activeConvId: conv.id,
      messages: { ...s.messages, [conv.id]: [] }
    }));
    return conv;
  },

  deleteConversation: async (id) => {
    await api.deleteConversation(id);
    set(s => {
      const convs = s.conversations.filter(c => c.id !== id);
      const msgs = { ...s.messages };
      delete msgs[id];
      return {
        conversations: convs,
        activeConvId: s.activeConvId === id ? (convs[0]?.id || null) : s.activeConvId,
        messages: msgs
      };
    });
  },

  sendMessage: async (content, images = []) => {
    const state = get();
    let convId = state.activeConvId;

    if (!convId) {
      const conv = await get().createConversation();
      convId = conv.id;
    }

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg = { id: tempId, role: 'user', content, created_at: Date.now() / 1000 };
    set(s => ({
      messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), userMsg] },
      streaming: true,
      streamingText: '',
      streamingProvider: null,
    }));

    let fullText = '';

    await sendMessageStream(
      convId,
      content,
      images,
      get().selectedModel,
      // onChunk
      (chunk) => {
        fullText += chunk;
        set({ streamingText: fullText });
      },
      // onDone
      (messageId, provider) => {
        const asstMsg = {
          id: messageId,
          role: 'assistant',
          content: fullText,
          provider,
          created_at: Date.now() / 1000
        };
        set(s => ({
          messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), asstMsg] },
          streaming: false,
          streamingText: '',
          streamingProvider: null,
        }));
        get().loadConversations();
      },
      // onError
      (error) => {
        console.error('[Nova] Stream error:', error);
        set({ streaming: false, streamingText: '', streamingProvider: null });
        toast.error(error || 'No response received. Check your API key in Settings → AI Providers.', { duration: 6000 });
        const errMsg = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${error || 'No response received.'}\n\nPlease check:\n1. Go to **Settings → AI Providers**\n2. Ensure a provider is active\n3. For paid models, verify your API key is saved and valid`,
          created_at: Date.now() / 1000
        };
        set(s => ({ messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), errMsg] } }));
      },
      // onProviderSwitch
      (providerId, label) => {
        set({ streamingProvider: label });
        toast(`Switched to ${label}`, { icon: '🔄', duration: 2000 });
      }
    );
  },

  setActiveConv: (id) => set({ activeConvId: id }),

  addImageMessage: (convId, imageData) => {
    set(s => ({
      messages: {
        ...s.messages,
        [convId]: [...(s.messages[convId] || []), {
          id: `img-${Date.now()}`,
          role: 'assistant',
          content: '',
          type: 'image',
          metadata: imageData,
          created_at: Date.now() / 1000
        }]
      }
    }));
  }
}));
