import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Briefcase, Users, CalendarClock, CheckCircle2 } from 'lucide-react';
import { fetchAgenda } from '../api/dashboard.api';

// A row in the agenda: an icon, a label, and a date badge that turns into a red
// "Overdue" pill when the follow-up date has passed. The whole row links to the
// section where you'd act on it.
function AgendaRow({ to, Icon, primary, secondary, date, overdue }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2 dark:hover:bg-surface2-dark"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent dark:bg-accent/15 dark:text-accent-dark">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{primary}</p>
        {secondary && <p className="truncate text-xs text-ink/50 dark:text-ink-dark/50">{secondary}</p>}
      </div>
      {overdue ? (
        <span className="shrink-0 rounded-md bg-priority-high/10 px-2 py-1 text-[11px] font-semibold text-priority-high">Overdue</span>
      ) : (
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono text-ink/50 dark:text-ink-dark/50">
          <CalendarClock size={11} />
          {date ? format(new Date(date + 'T00:00:00'), 'd MMM') : ''}
        </span>
      )}
    </Link>
  );
}

export default function FollowUpsWidget() {
  const [agenda, setAgenda] = useState(null);

  useEffect(() => {
    let alive = true;
    // Non-blocking: if this fails, the rest of the dashboard is unaffected.
    fetchAgenda().then((d) => { if (alive) setAgenda(d); }).catch(() => { if (alive) setAgenda({ jobs: [], contacts: [] }); });
    return () => { alive = false; };
  }, []);

  if (!agenda) return null;

  const jobs = agenda.jobs || [];
  const contacts = agenda.contacts || [];
  const isClear = jobs.length === 0 && contacts.length === 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card dark:border-line-dark dark:bg-surface-dark">
      <div className="mb-3">
        <h2 className="font-display text-sm font-semibold">Follow-ups this week</h2>
        <p className="mt-0.5 text-xs text-ink/50 dark:text-ink-dark/50">Applications and contacts due for a nudge.</p>
      </div>

      {isClear ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-status-done/10 text-status-done">
            <CheckCircle2 size={20} />
          </span>
          <p className="text-sm text-ink/60 dark:text-ink-dark/60">You're all caught up — no follow-ups due this week.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {jobs.map((j) => (
            <AgendaRow
              key={`j-${j.id}`}
              to="/jobs"
              Icon={Briefcase}
              primary={j.company_name}
              secondary={j.role_title || 'Application follow-up'}
              date={j.next_follow_up}
              overdue={j.overdue}
            />
          ))}
          {contacts.map((c) => (
            <AgendaRow
              key={`c-${c.id}`}
              to="/network"
              Icon={Users}
              primary={c.name}
              secondary={c.company_name || 'Network follow-up'}
              date={c.next_follow_up}
              overdue={c.overdue}
            />
          ))}
        </div>
      )}
    </section>
  );
}
