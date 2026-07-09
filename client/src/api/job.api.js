import api from './axios';

export const fetchJobs = (params) => api.get('/jobs', { params }).then((r) => r.data);
export const createJob = (payload) => api.post('/jobs', payload).then((r) => r.data);
export const updateJob = (id, payload) => api.put(`/jobs/${id}`, payload).then((r) => r.data);
export const updateJobStatus = (id, status) =>
  api.patch(`/jobs/${id}/status`, { status }).then((r) => r.data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then((r) => r.data);
