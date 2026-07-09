import { create } from 'zustand';
import * as jobApi from '../api/job.api';

export const useJobStore = create((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,

  loadJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const { jobs } = await jobApi.fetchJobs();
      set({ jobs, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load applications', isLoading: false });
    }
  },

  addJob: async (payload) => {
    const { job } = await jobApi.createJob(payload);
    set((state) => ({ jobs: [job, ...state.jobs] }));
    return job;
  },

  editJob: async (id, payload) => {
    const { job } = await jobApi.updateJob(id, payload);
    set((state) => ({ jobs: state.jobs.map((j) => (j.id === id ? job : j)) }));
    return job;
  },

  // Optimistic move for Kanban drag-drop: update the UI immediately, then
  // reconcile with the server. If the server rejects, reload to get truth back.
  moveJob: async (id, status) => {
    const prev = get().jobs;
    set((state) => ({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, status } : j)) }));
    try {
      await jobApi.updateJobStatus(id, status);
    } catch (err) {
      set({ jobs: prev, error: err.response?.data?.message || 'Could not move application' });
    }
  },

  removeJob: async (id) => {
    await jobApi.deleteJob(id);
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
  },
}));
