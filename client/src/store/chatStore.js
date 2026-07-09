import { create } from 'zustand';
import { sendChatMessage } from '../api/chat.api';

// Deliberately separate from taskStore.js - this store only ever reads,
// never writes, task data (via the backend's tool-calling loop), so there's
// no risk of chat interactions ever mutating tasks unexpectedly.
export const useChatStore = create((set, get) => ({
  isOpen: false,
  messages: [], // { role: 'user' | 'assistant', content: string }
  isSending: false,
  error: null,

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  send: async (text) => {
    const userMessage = { role: 'user', content: text };
    set((state) => ({ messages: [...state.messages, userMessage], isSending: true, error: null }));

    try {
      // Only role/content pairs are sent as history - matches what the
      // backend's chat.controller.js expects and echoes to Groq.
      const history = get().messages.map(({ role, content }) => ({ role, content }));
      const { reply } = await sendChatMessage(text, history);
      set((state) => ({
        messages: [...state.messages, { role: 'assistant', content: reply }],
        isSending: false,
      }));
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Something went wrong reaching the assistant',
        isSending: false,
      });
    }
  },

  clear: () => set({ messages: [], error: null, isOpen: false }),
}));
