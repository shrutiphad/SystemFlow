import { useEffect, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import Select from '../components/Select';
import ContactCard from '../components/ContactCard';
import ContactFormModal from '../components/ContactFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useContactStore } from '../store/contactStore';
import { useJobStore } from '../store/jobStore';

const STATUS_FILTERS = [
  ['', 'All statuses'],
  ['to_contact', 'To contact'],
  ['contacted', 'Contacted'],
  ['responded', 'Responded'],
  ['referred', 'Referred'],
  ['closed', 'Closed'],
];

export default function Network() {
  const { contacts, isLoading, error, filters, setFilters, loadContacts, addContact, editContact, removeContact } =
    useContactStore();
  const { jobs, loadJobs } = useJobStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formError, setFormError] = useState('');

  // Jobs power the "linked application" dropdown in the form.
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Reload from the server whenever the status/search filter changes. Search is
  // debounced so we're not firing a request on every keystroke.
  useEffect(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    const t = setTimeout(() => loadContacts(params), filters.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters.status, filters.search, loadContacts]);

  const openNew = () => { setEditing(null); setFormError(''); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormError(''); setFormOpen(true); };

  const handleSubmit = async (values) => {
    setFormError('');
    try {
      if (editing) await editContact(editing.id, values);
      else await addContact(values);
      setFormOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save contact');
    }
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Network</h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">
            {contacts.length} contact{contacts.length === 1 ? '' : 's'} in your job-hunt network.
          </p>
        </div>
        <button onClick={openNew} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 hover:opacity-95">
          <Plus size={16} /> Add contact
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Filter by status">
          {STATUS_FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 dark:text-ink-dark/40" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            aria-label="Search contacts"
            placeholder="Search name or company…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm dark:border-line-dark dark:bg-surface-dark"
          />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-priority-high">{error}</p>}
      {formError && <p className="mb-4 text-sm text-priority-high">{formError}</p>}

      {isLoading && contacts.length === 0 ? (
        <p className="text-sm font-mono text-ink/50 dark:text-ink-dark/50">Loading contacts…</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface2/40 p-10 text-center dark:border-line-dark dark:bg-surface2-dark/30">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent dark:bg-accent/15 dark:text-accent-dark">
            <Users size={20} />
          </span>
          <h2 className="font-display text-base font-semibold">Build your network</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink/60 dark:text-ink-dark/60">
            Referrals land jobs. Track recruiters, referrers and hiring managers, link them to
            applications, and never lose a follow-up.
          </p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90">
            <Plus size={16} /> Add your first contact
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <ContactFormModal
        open={formOpen}
        initialContact={editing}
        jobs={jobs}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this contact?"
        description={deleting ? `"${deleting.name}" will be permanently removed from your network.` : ''}
        confirmLabel="Delete"
        onConfirm={async () => { await removeContact(deleting.id); setDeleting(null); }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
