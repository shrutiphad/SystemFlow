import { useEffect, useState } from 'react';
import DashboardStats from '../components/DashboardStats';
import TaskCard from '../components/TaskCard';
import FollowUpsWidget from '../components/FollowUpsWidget';
import { useTaskStore } from '../store/taskStore';
import { useGmailStore } from '../store/gmailStore';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { summary, tasks, loadSummary, loadTasks, error } = useTaskStore();
  const loadGmailStatus = useGmailStore((s) => s.loadStatus);
  const [gmailNotice, setGmailNotice] = useState(null);

  useEffect(() => {
    loadSummary();
    loadTasks();
  }, [loadSummary, loadTasks]);

  // Handle the OAuth redirect result. Google -> our callback -> here with
  // ?gmail=connected|denied|error. Show a short banner, refresh the sidebar
  // status, then strip the param so a refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('gmail');
    if (!g) return;
    if (g === 'connected') {
      setGmailNotice({ ok: true, text: 'Gmail connected. You can now ask the assistant about your email.' });
      loadGmailStatus();
    } else if (g === 'denied') {
      setGmailNotice({ ok: false, text: 'Gmail connection was cancelled.' });
    } else {
      setGmailNotice({ ok: false, text: 'Gmail connection failed. Please try again.' });
    }
    params.delete('gmail');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', clean);
  }, [loadGmailStatus]);

  const upcoming = [...tasks]
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 5);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">Here's where things stand today.</p>
      </header>

      {gmailNotice && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            gmailNotice.ok
              ? 'border-status-done/30 bg-status-done/10 text-status-done'
              : 'border-priority-high/30 bg-priority-high/10 text-priority-high'
          }`}
        >
          {gmailNotice.text}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-priority-high">{error}</p>}

      <DashboardStats summary={summary} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink/60 dark:text-ink-dark/60">
            Up next
          </h2>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-ink/50 dark:text-ink-dark/50">Nothing pending — you're all caught up.</p>
            )}
            {upcoming.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        <FollowUpsWidget />
      </div>
    </>
  );
}
