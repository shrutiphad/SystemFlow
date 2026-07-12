import { format } from 'date-fns';
import { Pencil, Trash2, Mail, Phone, Linkedin, CalendarClock, Briefcase } from 'lucide-react';

// Outreach pipeline colours, mapped to the same status tokens the rest of the
// app uses so the whole product reads as one palette.
const STATUS_STYLE = {
  to_contact: 'bg-status-todo/10 text-status-todo',
  contacted: 'bg-status-progress/10 text-status-progress',
  responded: 'bg-accent2/10 text-accent2',
  referred: 'bg-status-done/10 text-status-done',
  closed: 'bg-ink/10 text-ink/50 dark:bg-ink-dark/10 dark:text-ink-dark/50',
};
const STATUS_LABEL = {
  to_contact: 'To contact', contacted: 'Contacted', responded: 'Responded',
  referred: 'Referred', closed: 'Closed',
};
const RELATIONSHIP_LABEL = {
  recruiter: 'Recruiter', referral: 'Referral', hiring_manager: 'Hiring manager',
  colleague: 'Colleague', alumni: 'Alumni', mentor: 'Mentor', other: 'Other',
};

const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function ContactCard({ contact, onEdit, onDelete }) {
  const initials = (contact.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="group rounded-xl border border-line bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-elevated dark:border-line-dark dark:bg-surface-dark">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-gradient font-display text-sm font-semibold text-white shadow-glow">
          {initials || '?'}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold truncate">{contact.name}</h3>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[contact.status] || ''}`}>
              {STATUS_LABEL[contact.status] || contact.status}
            </span>
            {contact.relationship && (
              <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[11px] font-medium font-mono text-ink/60 dark:border-line-dark dark:text-ink-dark/60">
                {RELATIONSHIP_LABEL[contact.relationship] || contact.relationship}
              </span>
            )}
          </div>

          {(contact.role_title || contact.company_name) && (
            <p className="mt-0.5 text-xs text-ink/60 dark:text-ink-dark/60 truncate">
              {[contact.role_title, contact.company_name].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink/50 dark:text-ink-dark/50">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-accent">
                <Mail size={11} /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <span className="inline-flex items-center gap-1"><Phone size={11} /> {contact.phone}</span>
            )}
            {contact.linkedin_url && (
              <a href={normalizeUrl(contact.linkedin_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
                <Linkedin size={11} /> LinkedIn
              </a>
            )}
            {contact.next_follow_up && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={11} /> Follow up {format(new Date(contact.next_follow_up + 'T00:00:00'), 'd MMM')}
              </span>
            )}
          </div>

          {contact.job && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-surface2 px-2 py-1 text-[11px] text-ink/60 dark:bg-surface2-dark dark:text-ink-dark/60">
              <Briefcase size={11} />
              <span className="truncate">{[contact.job.company_name, contact.job.role_title].filter(Boolean).join(' · ')}</span>
            </div>
          )}

          {contact.notes && (
            <p className="mt-2 text-xs text-ink/70 dark:text-ink-dark/70 line-clamp-2">{contact.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEdit(contact)} aria-label={`Edit ${contact.name}`} className="rounded-md p-1.5 text-ink/50 hover:bg-surface2 hover:text-accent dark:text-ink-dark/50 dark:hover:bg-surface2-dark">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(contact)} aria-label={`Delete ${contact.name}`} className="rounded-md p-1.5 text-ink/50 hover:bg-surface2 hover:text-priority-high dark:text-ink-dark/50 dark:hover:bg-surface2-dark">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
