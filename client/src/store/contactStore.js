import { create } from 'zustand';
import * as contactApi from '../api/contact.api';

export const useContactStore = create((set) => ({
  contacts: [],
  isLoading: false,
  error: null,
  filters: { status: '', search: '' },

  setFilters: (partial) => {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
  },

  loadContacts: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { contacts } = await contactApi.fetchContacts(params);
      set({ contacts, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load contacts', isLoading: false });
    }
  },

  addContact: async (payload) => {
    const { contact } = await contactApi.createContact(payload);
    set((state) => ({ contacts: [contact, ...state.contacts] }));
    return contact;
  },

  editContact: async (id, payload) => {
    const { contact } = await contactApi.updateContact(id, payload);
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? contact : c)) }));
    return contact;
  },

  removeContact: async (id) => {
    await contactApi.deleteContact(id);
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) }));
  },
}));
