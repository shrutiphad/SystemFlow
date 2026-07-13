import api from './axios';

export const fetchAgenda = (params) => api.get('/dashboard/agenda', { params }).then((r) => r.data);
