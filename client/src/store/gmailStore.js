import { create } from 'zustand';
import * as gmailApi from '../api/gmail.api';

export const useGmailStore = create((set) => ({
  connected: false,
  emailAddress: null,
  loading: false,
  error: null,

  loadStatus: async () => {
    set({ loading: true });
    try {
      const status = await gmailApi.fetchGmailStatus();
      set({ connected: status.connected, emailAddress: status.email_address || null, loading: false });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to check Gmail status' });
    }
  },

  // Kicks off OAuth: fetch the consent URL from our backend, then send the
  // whole browser to Google. Google redirects back to our callback, which
  // redirects to /dashboard?gmail=connected - handled in App.
  connect: async () => {
    try {
      const { url } = await gmailApi.getGmailConnectUrl();
      window.location.href = url;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to start Gmail connection' });
    }
  },

  disconnect: async () => {
    try {
      await gmailApi.disconnectGmail();
      set({ connected: false, emailAddress: null });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to disconnect Gmail' });
    }
  },
}));
