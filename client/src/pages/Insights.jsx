import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Briefcase, TrendingUp, Zap, Trophy, Users } from 'lucide-react';
import { fetchInsights } from '../api/insights.api';
import BarBreakdown from '../components/BarBreakdown';
import TrendArea from '../components/TrendArea';

// Pipeline stages in funnel order, with the same stage dot colours the Job hunt
// board uses so the two views read as one system.
const STAGES = [
  ['wishlist', 'Wishlist', 'bg-status-todo'],
  ['applied', 'Applied', 'bg-status-progress'],
  ['oa', 'Online Assessment', 'bg-accent2'],
  ['interviewing', 'Interviewing', 'bg-accent'],
  ['offer', 'Offer', 'bg-status-done'],
  ['rejected', 'Rejected', 'bg-priority-high'],
  ['withdrawn', 'Withdrawn', 'bg-ink/30 dark:bg-ink-dark/30'],
];

const SOURCE_LABEL = {
  linkedin: 'LinkedIn', naukri: 'Naukri', company_site: 'Company site',
  referral: 'Referral', other: 'Other', unknown: 'Unknown',
};

const TASK_STATUS = [
  ['todo', 'To Do', 'bg-status-todo'],
  ['in_progress', 'In Progress', 'bg-status-progress'],
  ['done', 'Done', 'bg-status-done'],
];

const CONTACT_STATUS = [
  ['to_contact', 'To contact', 'bg-status-todo'],
  ['contacted', 'Contacted', 'bg-status-progress'],
  ['responded', 'Responded', 'bg-accent2'],
  ['referred', 'Referred', 'bg-status-done'],
  ['closed', 'Closed', 'bg-ink/30 dark:bg-ink-dark/30'],
];

function buildMonths(overTime) {
  const map = Object.fromEntries((overTime || []).map((o) => [o.month, o.count]));
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    out.push({ label: format(dt, 'MMM'), value: map[key] || 0 });
  }
  return out;
}

function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-card dark:border-line-dark dark:bg-surface-dark ${className}`}>
      <div className="mb-4">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink/50 dark:text-ink-dark/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, suffix, Icon, badge }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card dark:border-line-dark dark:bg-surface-dark">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-wide text-ink/50 dark:text-ink-dark/50">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${badge}`}>
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">
        {value}<span className="text-lg text-ink/40 dark:text-ink-dark/40">{suffix}</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchInsights()
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.response?.data?.message || 'Failed to load insights'); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <>
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Insights</h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">Analytics across your tasks, applications and network.</p>
        </header>
        <p className="text-sm font-mono text-ink/50 dark:text-ink-dark/50">Crunching your numbers…</p>
      </>
    );
  }

  if (error) return <p className="text-sm text-priority-high">{error}</p>;

  const { totals, jobsByStatus, jobsBySource, tasksByStatus, contactsByStatus } = data;
  const isEmpty = totals.applications === 0 && totals.contacts === 0 && totals.tasks === 0;

  const funnelItems = STAGES.map(([key, label, dot]) => ({ label, value: jobsByStatus[key] || 0, dot }));
  const sourceItems = Object.entries(jobsBySource)
    .map(([k, v]) => ({ label: SOURCE_LABEL[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
  const taskItems = TASK_STATUS.map(([key, label, dot]) => ({ label, value: tasksByStatus[key] || 0, dot, barClass: dot }));
  const contactItems = CONTACT_STATUS.map(([key, label, dot]) => ({ label, value: contactsByStatus[key] || 0, dot, barClass: dot }));
  const months = buildMonths(data.applicationsOverTime);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Insights</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">Analytics across your tasks, applications and network.</p>
      </header>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface2/40 p-10 text-center dark:border-line-dark dark:bg-surface2-dark/30">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent dark:bg-accent/15 dark:text-accent-dark">
            <TrendingUp size={20} />
          </span>
          <h2 className="font-display text-base font-semibold">No data to chart yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink/60 dark:text-ink-dark/60">
            Add a few applications, tasks and contacts — your funnel, trends and outreach
            breakdown will show up here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="APPLICATIONS" value={totals.applications} Icon={Briefcase} badge="bg-accent-soft text-accent dark:bg-accent/15 dark:text-accent-dark" />
            <StatTile label="RESPONSE RATE" value={totals.responseRate} suffix="%" Icon={TrendingUp} badge="bg-status-progress/10 text-status-progress" />
            <StatTile label="ACTIVE PIPELINE" value={totals.activePipeline} Icon={Zap} badge="bg-accent2/10 text-accent2" />
            <StatTile label="OFFERS" value={totals.offers} Icon={Trophy} badge="bg-status-done/10 text-status-done" />
            <StatTile label="CONTACTS" value={totals.contacts} Icon={Users} badge="bg-accent3/10 text-accent3" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Application funnel" subtitle="Where your applications sit across the pipeline">
              <BarBreakdown items={funnelItems} emptyLabel="No applications yet" />
            </Panel>

            <Panel title="Applications over time" subtitle="New applications added in the last 6 months">
              <TrendArea data={months} />
            </Panel>

            <Panel title="Where applications come from" subtitle="Grouped by source">
              <BarBreakdown items={sourceItems} emptyLabel="No source data yet" />
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Panel title="Tasks" subtitle="By status">
                <BarBreakdown items={taskItems} emptyLabel="No tasks yet" />
              </Panel>
              <Panel title="Network outreach" subtitle="Contacts by stage">
                <BarBreakdown items={contactItems} emptyLabel="No contacts yet" />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
