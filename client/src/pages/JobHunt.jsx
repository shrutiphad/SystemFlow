import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import JobCard from '../components/JobCard';
import JobFormModal from '../components/JobFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useJobStore } from '../store/jobStore';

// The pipeline stages, in board order. Column colour accents mirror the
// status meaning (neutral -> in-progress blue -> success green -> closed grey).
const COLUMNS = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'applied', label: 'Applied' },
  { key: 'oa', label: 'Online Assessment' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

export default function JobHunt() {
  const { jobs, isLoading, error, loadJobs, addJob, editJob, moveJob, removeJob } = useJobStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const openNew = () => { setEditingJob(null); setFormOpen(true); };
  const openEdit = (job) => { setEditingJob(job); setFormOpen(true); };

  const handleSubmit = async (values) => {
    if (editingJob) await editJob(editingJob.id, values);
    else await addJob(values);
    setFormOpen(false);
  };

  const onDragStart = (e, jobId) => {
    // Don't start a card drag from the inline quick-edit controls - a drag
    // that begins on a select/input/button is the user reaching for the
    // control, not moving the card.
    if (e.target.closest('select, input, button, a')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Inline quick-edits from the card: partial PUT through the same store
  // action the modal uses, so board state stays consistent either way.
  const quickUpdate = (id, partial) => editJob(id, partial);

  const onDrop = (e, status) => {
    e.preventDefault();
    setDragOverCol(null);
    const jobId = e.dataTransfer.getData('text/plain');
    const job = jobs.find((j) => j.id === jobId);
    if (job && job.status !== status) moveJob(jobId, status);
  };

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Job hunt</h1>
            <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">
              {jobs.length} application{jobs.length === 1 ? '' : 's'} in your pipeline.
            </p>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-accent-gradient px-3.5 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90">
            <Plus size={16} /> Add application
          </button>
        </header>

        {error && <p className="mb-4 text-sm text-priority-high">{error}</p>}
        {isLoading && jobs.length === 0 && (
          <p className="text-sm font-mono text-ink/50 dark:text-ink-dark/50">Loading pipeline…</p>
        )}

        {!isLoading && jobs.length === 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-line p-8 text-center dark:border-line-dark">
            <h2 className="font-display text-base font-semibold">Start your pipeline</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink/60 dark:text-ink-dark/60">
              Track every application from wishlist to offer. Add the role you're eyeing,
              set a follow-up date, and drag cards between stages as things move.
            </p>
            <button
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90"
            >
              <Plus size={16} /> Add your first application
            </button>
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                onDrop={(e) => onDrop(e, col.key)}
                className={`flex w-64 shrink-0 flex-col rounded-2xl border p-2 transition-colors ${
                  dragOverCol === col.key
                    ? 'border-accent bg-accent-soft/50 shadow-glow dark:bg-accent/10'
                    : 'border-line bg-surface2/70 dark:border-line-dark dark:bg-surface2-dark/50'
                }`}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-display text-xs font-semibold uppercase tracking-wide text-ink/60 dark:text-ink-dark/60">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-mono text-ink/50 dark:bg-surface-dark dark:text-ink-dark/50">
                    {colJobs.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {colJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={openEdit}
                      onDelete={setDeletingJob}
                      onDragStart={onDragStart}
                      onMove={moveJob}
                      onQuickUpdate={quickUpdate}
                    />
                  ))}
                  {colJobs.length === 0 && (
                    <p className="px-1 py-3 text-center text-[11px] text-ink/30 dark:text-ink-dark/30">Drop here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      <JobFormModal open={formOpen} initialJob={editingJob} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={Boolean(deletingJob)}
        title="Delete this application?"
        description={deletingJob ? `"${deletingJob.company_name}" will be permanently removed from your pipeline.` : ''}
        confirmLabel="Delete"
        onConfirm={async () => { await removeJob(deletingJob.id); setDeletingJob(null); }}
        onCancel={() => setDeletingJob(null)}
      />
    </>
  );
}
