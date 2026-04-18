import { create } from 'zustand';
import { api } from '../utils/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  settings: null,
  loading: true,
  token: localStorage.getItem('nova_token'),

  init: async () => {
    const token = localStorage.getItem('nova_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { user, settings } = await api.me();
      set({ user, settings, loading: false });
    } catch {
      localStorage.removeItem('nova_token');
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('nova_token', token);
    set({ user, token });
    return user;
  },

  register: async (email, username, password) => {
    const { token, user } = await api.register({ email, username, password });
    localStorage.setItem('nova_token', token);
    set({ user, token });
    return user;
  },

  logout: () => {
    localStorage.removeItem('nova_token');
    set({ user: null, token: null });
  },

  updateUser: (user) => set({ user }),
}));
