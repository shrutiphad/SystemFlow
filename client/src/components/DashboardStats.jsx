const CELLS = (summary) => [
  { label: 'TOTAL TASKS', value: summary.total, tone: 'text-ink dark:text-ink-dark' },
  { label: 'TO DO', value: summary.byStatus.todo, tone: 'text-status-todo' },
  { label: 'IN PROGRESS', value: summary.byStatus.in_progress, tone: 'text-status-progress' },
  { label: 'DONE', value: summary.byStatus.done, tone: 'text-status-done' },
  { label: 'OVERDUE', value: summary.overdue, tone: 'text-priority-high' },
];

export default function DashboardStats({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line dark:border-line-dark dark:bg-line-dark sm:grid-cols-5">
      {CELLS(summary).map((cell) => (
        <div key={cell.label} className="bg-surface p-4 dark:bg-surface-dark">
          <div className="font-mono text-[11px] tracking-wide text-ink/50 dark:text-ink-dark/50">{cell.label}</div>
          <div className={`mt-1 font-display text-3xl font-semibold ${cell.tone}`}>{cell.value}</div>
        </div>
      ))}
    </div>
  );
}
