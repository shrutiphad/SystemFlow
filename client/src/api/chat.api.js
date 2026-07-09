import api from './axios';

export const sendChatMessage = (message, history) =>
  api.post('/chat', { message, history }).then((r) => r.data);
