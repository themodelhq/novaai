import { create } from 'zustand';
import { api, sendMessageStream } from '../utils/api';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConvId: null,
  messages: {},
  streaming: false,
  streamingText: '',
  loadingConvs: false,

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

    // Create new convo if needed
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
      streamingText: ''
    }));

    let fullText = '';
    await sendMessageStream(
      convId,
      content,
      images,
      (chunk) => {
        fullText += chunk;
        set({ streamingText: fullText });
      },
      (messageId) => {
        const asstMsg = { id: messageId, role: 'assistant', content: fullText, created_at: Date.now() / 1000 };
        set(s => ({
          messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), asstMsg] },
          streaming: false,
          streamingText: ''
        }));
        // Refresh conversation list to update title
        get().loadConversations();
      },
      (error) => {
        set({ streaming: false, streamingText: '' });
        console.error('Stream error:', error);
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
