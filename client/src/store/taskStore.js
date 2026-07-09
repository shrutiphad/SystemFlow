import { create } from 'zustand';
import * as taskApi from '../api/task.api';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  summary: null,
  isLoading: false,
  error: null,
  filters: { status: '', priority: '', sortBy: 'created_at', order: 'desc' },

  setFilters: (partial) => {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
    get().loadTasks();
  },

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { status, priority, sortBy, order } = get().filters;
      const params = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (sortBy) params.sortBy = sortBy;
      if (order) params.order = order;

      const { tasks } = await taskApi.fetchTasks(params);
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load tasks', isLoading: false });
    }
  },

  loadSummary: async () => {
    try {
      const summary = await taskApi.fetchDashboardSummary();
      set({ summary });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load dashboard summary' });
    }
  },

  addTask: async (payload) => {
    const { task } = await taskApi.createTask(payload);
    set((state) => ({ tasks: [task, ...state.tasks] }));
    get().loadSummary();
    return task;
  },

  editTask: async (id, payload) => {
    const { task } = await taskApi.updateTask(id, payload);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? task : t)) }));
    get().loadSummary();
    return task;
  },

  removeTask: async (id) => {
    await taskApi.deleteTask(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    get().loadSummary();
  },
}));
