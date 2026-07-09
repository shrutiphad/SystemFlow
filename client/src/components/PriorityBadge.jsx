const LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const DOT = { low: 'bg-priority-low', medium: 'bg-priority-medium', high: 'bg-priority-high' };

export default function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line dark:border-line-dark px-2.5 py-1 text-xs font-medium font-mono">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority]}`} aria-hidden="true" />
      {LABEL[priority] || priority}
    </span>
  );
}
