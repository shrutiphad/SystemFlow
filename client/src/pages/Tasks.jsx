import { useEffect, useState } from 'react';
import FilterSortBar from '../components/FilterSortBar';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTaskStore } from '../store/taskStore';

export default function Tasks() {
  const { tasks, isLoading, error, filters, setFilters, loadTasks, addTask, editTask, removeTask } =
    useTaskStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewTaskForm = () => {
    setEditingTask(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (task) => {
    setEditingTask(task);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (values) => {
    setFormError('');
    try {
      if (editingTask) {
        await editTask(editingTask.id, values);
      } else {
        await addTask(values);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save task');
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    await removeTask(deletingTask.id);
    setDeletingTask(null);
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} matching your filters.
        </p>
      </header>

      <FilterSortBar filters={filters} onChange={setFilters} onNewTask={openNewTaskForm} />

      {error && <p className="mb-4 text-sm text-priority-high">{error}</p>}
      {formError && <p className="mb-4 text-sm text-priority-high">{formError}</p>}

      {isLoading ? (
        <p className="text-sm text-ink/50 dark:text-ink-dark/50 font-mono">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface2/40 p-10 text-center dark:border-line-dark dark:bg-surface2-dark/30">
          <p className="text-sm text-ink/60 dark:text-ink-dark/60">No tasks match these filters yet.</p>
          <button onClick={openNewTaskForm} className="mt-3 rounded-lg bg-accent-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90">
            Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={openEditForm} onDelete={setDeletingTask} />
          ))}
        </div>
      )}

      <TaskFormModal open={formOpen} initialTask={editingTask} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title="Delete this task?"
        description={deletingTask ? `"${deletingTask.title}" will be permanently deleted. This can't be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </>
  );
}
