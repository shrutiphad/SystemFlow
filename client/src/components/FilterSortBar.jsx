import { ArrowUpDown, Plus } from 'lucide-react';

export default function FilterSortBar({ filters, onChange, onNewTask }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select value={filters.status} onChange={(e) => onChange({ status: e.target.value })} className="rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select value={filters.priority} onChange={(e) => onChange({ priority: e.target.value })} className="rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" aria-label="Filter by priority">
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <div className="flex items-center gap-1">
        <select value={filters.sortBy} onChange={(e) => onChange({ sortBy: e.target.value })} className="rounded-lg border border-line dark:border-line-dark bg-transparent px-3 py-2 text-sm" aria-label="Sort field">
          <option value="created_at">Sort: Created date</option>
          <option value="due_date">Sort: Due date</option>
        </select>
        <button onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })} className="rounded-lg border border-line dark:border-line-dark p-2 hover:bg-canvas dark:hover:bg-canvas-dark" aria-label="Toggle sort order" title={filters.order === 'asc' ? 'Ascending' : 'Descending'}>
          <ArrowUpDown size={15} />
        </button>
      </div>

      <button onClick={onNewTask} className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90">
        <Plus size={16} /> New task
      </button>
    </div>
  );
}
