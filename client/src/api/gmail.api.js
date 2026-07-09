import api from './axios';

export const fetchGmailStatus = () => api.get('/integrations/gmail/status').then((r) => r.data);
export const getGmailConnectUrl = () => api.get('/integrations/gmail/connect').then((r) => r.data);
export const disconnectGmail = () => api.delete('/integrations/gmail').then((r) => r.data);
