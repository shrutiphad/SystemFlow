import api from './axios';

export const fetchInsights = () => api.get('/insights').then((r) => r.data);
