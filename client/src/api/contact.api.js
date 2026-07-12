import api from './axios';

export const fetchContacts = (params) => api.get('/contacts', { params }).then((r) => r.data);
export const createContact = (payload) => api.post('/contacts', payload).then((r) => r.data);
export const updateContact = (id, payload) => api.put(`/contacts/${id}`, payload).then((r) => r.data);
export const deleteContact = (id) => api.delete(`/contacts/${id}`).then((r) => r.data);
