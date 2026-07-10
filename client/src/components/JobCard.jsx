import { format } from 'date-fns';
import { Pencil, Trash2, Mail, CalendarClock, MapPin, ExternalLink } from 'lucide-react';
import { ExcitementStars } from './JobFormModal';

const STATUSES = [
  ['wishlist', 'Wishlist'],
  ['applied', 'Applied'],
  ['oa', 'Online Assessment'],
  ['interviewing', 'Interviewing'],
  ['offer', 'Offer'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
];

// A single application card on the Kanban board. Draggable via native HTML5
// drag events - no external drag library, keeping the dependency footprint
// identical to the rest of the app.
//
// Quick-edit: stage, follow-up date, and excitement change inline without
// opening the modal - onMove goes through the same PATCH /status path as
// drag-drop, onQuickUpdate is a partial PUT. The board's onDragStart guard
// ignores drags that begin on these controls.
export default function JobCard({ job, onEdit, onDelete, onDragStart, onMove, onQuickUpdate }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      className="group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elevated active:cursor-grabbing dark:border-line-dark dark:bg-surface-dark"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-display text-sm font-semibold truncate">
            {job.company_name}
            {job.job_url && (
              <a
                href={/^https?:\/\//i.test(job.job_url) ? job.job_url : `https://${job.job_url}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open posting for ${job.company_name}`}
                className="ml-1.5 inline-block align-middle text-ink/40 hover:text-accent dark:text-ink-dark/40"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </h4>
          {job.role_title && (
            <p className="text-xs text-ink/60 dark:text-ink-dark/60 truncate">{job.role_title}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEdit(job)} aria-label={`Edit ${job.company_name}`} className="rounded p-1 text-ink/50 hover:text-accent dark:text-ink-dark/50">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(job)} aria-label={`Delete ${job.company_name}`} className="rounded p-1 text-ink/50 hover:text-priority-high dark:text-ink-dark/50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink/50 dark:text-ink-dark/50">
        {job.portal && <span>{job.portal}</span>}
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {job.location}
          </span>
        )}
        {job.salary_range && <span>{job.salary_range}</span>}
        {job.outreach_sent && (
          <span className="inline-flex items-center gap-1 text-status-done">
            <Mail size={11} /> outreach
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/60 pt-2 dark:border-line-dark/60">
        <select
          value={job.status}
          onChange={(e) => onMove(job.id, e.target.value)}
          aria-label={`Stage for ${job.company_name}`}
          className="max-w-[48%] cursor-pointer rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-ink/70 transition-colors hover:border-line hover:bg-canvas focus:border-accent focus:outline-none dark:text-ink-dark/70 dark:hover:border-line-dark dark:hover:bg-canvas-dark"
        >
          {STATUSES.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-mono text-ink/50 dark:text-ink-dark/50">
          <CalendarClock size={11} />
          <input
            type="date"
            value={job.next_follow_up || ''}
            onChange={(e) => onQuickUpdate(job.id, { next_follow_up: e.target.value || null })}
            aria-label={`Follow-up date for ${job.company_name}`}
            className="w-[92px] bg-transparent text-[11px] outline-none [&::-webkit-calendar-picker-indicator]:opacity-40"
          />
        </label>
      </div>

      <div className="mt-1.5">
        <ExcitementStars
          value={job.excitement ?? null}
          onChange={(v) => onQuickUpdate(job.id, { excitement: v })}
          size={13}
        />
      </div>
    </div>
  );
}
