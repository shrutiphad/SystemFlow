import { format, isPast } from 'date-fns';
import { Pencil, Trash2, CalendarDays } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

const SPINE = {
  low: 'border-l-priority-low',
  medium: 'border-l-priority-medium',
  high: 'border-l-priority-high',
};

export default function TaskCard({ task, onEdit, onDelete }) {
  const overdue = task.due_date && task.status !== 'done' && isPast(new Date(task.due_date + 'T23:59:59'));

  return (
    <div className={`group flex items-start justify-between gap-4 rounded-xl border border-line border-l-4 ${SPINE[task.priority]} bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-elevated dark:border-line-dark dark:bg-surface-dark`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-semibold truncate">{task.title}</h3>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {overdue && (
            <span className="rounded-md bg-priority-high/10 px-2 py-1 text-xs font-semibold text-priority-high">Overdue</span>
          )}
        </div>
        {task.description && (
          <p className="mt-1.5 text-sm text-ink/70 dark:text-ink-dark/70 line-clamp-2">{task.description}</p>
        )}
        {task.due_date && (
          <div className="mt-2 flex items-center gap-1 text-xs font-mono text-ink/50 dark:text-ink-dark/50">
            <CalendarDays size={13} />
            Due {format(new Date(task.due_date + 'T00:00:00'), 'd MMM yyyy')}
          </div>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-1">
          {onEdit && (
            <button onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} className="rounded-md p-2 text-ink/50 hover:bg-surface2 hover:text-accent dark:text-ink-dark/50 dark:hover:bg-surface2-dark">
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} className="rounded-md p-2 text-ink/50 hover:bg-surface2 hover:text-priority-high dark:text-ink-dark/50 dark:hover:bg-surface2-dark">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
