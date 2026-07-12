import { LayoutList, Circle, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

// Each stat tile carries an icon badge tinted to its meaning, so the row reads
// at a glance. TOTAL is the hero (gradient number + accent badge); the rest map
// to the status/priority colour tokens used everywhere else in the app.
const CELLS = (summary) => [
  { label: 'TOTAL TASKS', value: summary.total, tone: 'gradient-text', Icon: LayoutList, badge: 'bg-accent-soft text-accent dark:bg-accent/15 dark:text-accent-dark' },
  { label: 'TO DO', value: summary.byStatus.todo, tone: 'text-status-todo', Icon: Circle, badge: 'bg-status-todo/10 text-status-todo' },
  { label: 'IN PROGRESS', value: summary.byStatus.in_progress, tone: 'text-status-progress', Icon: LoaderCircle, badge: 'bg-status-progress/10 text-status-progress' },
  { label: 'DONE', value: summary.byStatus.done, tone: 'text-status-done', Icon: CheckCircle2, badge: 'bg-status-done/10 text-status-done' },
  { label: 'OVERDUE', value: summary.overdue, tone: 'text-priority-high', Icon: AlertTriangle, badge: 'bg-priority-high/10 text-priority-high' },
];

export default function DashboardStats({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {CELLS(summary).map(({ label, value, tone, Icon, badge }) => (
        <div
          key={label}
          className="group rounded-2xl border border-line bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-elevated dark:border-line-dark dark:bg-surface-dark"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-wide text-ink/50 dark:text-ink-dark/50">{label}</span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${badge}`}>
              <Icon size={15} />
            </span>
          </div>
          <div className={`mt-2 font-display text-3xl font-semibold ${tone}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
