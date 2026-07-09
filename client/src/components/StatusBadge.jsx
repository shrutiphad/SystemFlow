const LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const STYLE = {
  todo: 'text-status-todo bg-status-todo/10',
  in_progress: 'text-status-progress bg-status-progress/10',
  done: 'text-status-done bg-status-done/10',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${STYLE[status]}`}>
      {LABEL[status] || status}
    </span>
  );
}
