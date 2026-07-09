import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in_progress', 'done']),
  due_date: z.string().optional().or(z.literal('')),
});

export default function TaskFormModal({ open, initialTask, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', priority: 'medium', status: 'todo', due_date: '' },
  });

  useEffect(() => {
    if (open) {
      reset(
        initialTask
          ? {
              title: initialTask.title,
              description: initialTask.description || '',
              priority: initialTask.priority,
              status: initialTask.status,
              due_date: initialTask.due_date || '',
            }
          : { title: '', description: '', priority: 'medium', status: 'todo', due_date: '' }
      );
    }
  }, [open, initialTask, reset]);

  if (!open) return null;

  const submit = async (values) => {
    await onSubmit({ ...values, due_date: values.due_date || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{initialTask ? 'Edit task' : 'New task'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-canvas dark:hover:bg-canvas-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div>
            <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Title</label>
            <input {...register('title')} id="task-title" className="w-full rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" placeholder="e.g. Ship the onboarding flow" />
            {errors.title && <p className="mt-1 text-xs text-priority-high">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="task-description" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Description</label>
            <textarea {...register('description')} id="task-description" rows={3} className="w-full rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" placeholder="Optional details" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Priority</label>
              <select {...register('priority')} id="task-priority" className="w-full rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-status" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Status</label>
              <select {...register('status')} id="task-status" className="w-full rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due_date" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Due date</label>
            <input type="date" {...register('due_date')} id="task-due_date" className="w-full rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-canvas dark:hover:bg-canvas-dark">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {initialTask ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
