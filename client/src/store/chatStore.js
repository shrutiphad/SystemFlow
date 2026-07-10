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
    // Capture history from PRIOR turns only. The backend appends the current
    // message itself, so including it here would send it twice - wasted tokens
    // (which pushes us toward Groq's daily limit) and a confusing double turn.
    // Cap to the last 8 messages so a long chat doesn't balloon each request.
    const history = get()
      .messages.slice(-8)
      .map(({ role, content }) => ({ role, content }));

    const userMessage = { role: 'user', content: text };
    set((state) => ({ messages: [...state.messages, userMessage], isSending: true, error: null }));

    try {
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
