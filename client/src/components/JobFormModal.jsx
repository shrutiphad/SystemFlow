import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Star } from 'lucide-react';

const STATUSES = [
  ['wishlist', 'Wishlist'],
  ['applied', 'Applied'],
  ['oa', 'Online Assessment'],
  ['interviewing', 'Interviewing'],
  ['offer', 'Offer'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
];

export const SOURCES = [
  ['linkedin', 'LinkedIn'],
  ['naukri', 'Naukri'],
  ['company_site', 'Company site'],
  ['referral', 'Referral'],
  ['other', 'Other'],
];

// Loose URL check: the server re-validates with isURL, this just catches typos
// early without demanding a protocol prefix the way z.string().url() does.
const looseUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i;

const jobSchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(150),
  role_title: z.string().max(150).optional().or(z.literal('')),
  portal: z.string().max(60).optional().or(z.literal('')),
  job_url: z
    .string()
    .max(500)
    .refine((v) => v === '' || looseUrl.test(v), 'Must be a valid URL')
    .optional()
    .or(z.literal('')),
  location: z.string().max(120).optional().or(z.literal('')),
  salary_range: z.string().max(80).optional().or(z.literal('')),
  source: z.enum(['linkedin', 'naukri', 'company_site', 'referral', 'other']).optional().or(z.literal('')),
  excitement: z.number().int().min(1).max(5).nullable(),
  status: z.enum(['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn']),
  outreach_sent: z.boolean(),
  applied_date: z.string().optional().or(z.literal('')),
  next_follow_up: z.string().optional().or(z.literal('')),
  notes: z.string().max(4000).optional().or(z.literal('')),
});

// 1-5 star rating; clicking the current value clears it back to unrated.
export function ExcitementStars({ value, onChange, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Excitement rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(value === n ? null : n)}
          className="rounded p-0.5 text-ink/30 transition-colors hover:text-amber-400 dark:text-ink-dark/30"
        >
          <Star
            size={size}
            className={value != null && n <= value ? 'fill-amber-400 text-amber-400' : ''}
          />
        </button>
      ))}
    </div>
  );
}

export default function JobFormModal({ open, initialJob, onClose, onSubmit }) {
  const emptyValues = {
    company_name: '', role_title: '', portal: '', job_url: '', location: '',
    salary_range: '', source: '', excitement: null, status: 'wishlist',
    outreach_sent: false, applied_date: '', next_follow_up: '', notes: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: emptyValues,
  });

  const excitement = watch('excitement');

  useEffect(() => {
    if (open) {
      reset(
        initialJob
          ? {
              company_name: initialJob.company_name,
              role_title: initialJob.role_title || '',
              portal: initialJob.portal || '',
              job_url: initialJob.job_url || '',
              location: initialJob.location || '',
              salary_range: initialJob.salary_range || '',
              source: initialJob.source || '',
              excitement: initialJob.excitement ?? null,
              status: initialJob.status,
              outreach_sent: initialJob.outreach_sent,
              applied_date: initialJob.applied_date || '',
              next_follow_up: initialJob.next_follow_up || '',
              notes: initialJob.notes || '',
            }
          : emptyValues
      );
    }
  }, [open, initialJob, reset]);

  if (!open) return null;

  const submit = async (values) => {
    await onSubmit({
      ...values,
      job_url: values.job_url || null,
      location: values.location || null,
      salary_range: values.salary_range || null,
      source: values.source || null,
      applied_date: values.applied_date || null,
      next_follow_up: values.next_follow_up || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl dark:border-line-dark dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{initialJob ? 'Edit application' : 'New application'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-canvas dark:hover:bg-canvas-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div>
            <label htmlFor="job-company" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Company</label>
            <input id="job-company" {...register('company_name')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="e.g. Stripe" />
            {errors.company_name && <p className="mt-1 text-xs text-priority-high">{errors.company_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-role" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Role</label>
              <input id="job-role" {...register('role_title')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="Backend Engineer" />
            </div>
            <div>
              <label htmlFor="job-portal" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Portal</label>
              <input id="job-portal" {...register('portal')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="LinkedIn" />
            </div>
          </div>

          <div>
            <label htmlFor="job-url" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Job posting URL</label>
            <input id="job-url" {...register('job_url')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="https://linkedin.com/jobs/…" />
            {errors.job_url && <p className="mt-1 text-xs text-priority-high">{errors.job_url.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-location" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Location</label>
              <input id="job-location" {...register('location')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="Remote / Bengaluru" />
            </div>
            <div>
              <label htmlFor="job-salary" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Salary range</label>
              <input id="job-salary" {...register('salary_range')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="e.g. 12–18 LPA" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-status" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Stage</label>
              <select id="job-status" {...register('status')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark">
                {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="job-source" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Source</label>
              <select id="job-source" {...register('source')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark">
                <option value="">—</option>
                {SOURCES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Excitement</span>
            <ExcitementStars value={excitement} onChange={(v) => setValue('excitement', v, { shouldDirty: true })} size={18} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-applied" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Applied date</label>
              <input id="job-applied" type="date" {...register('applied_date')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" />
            </div>
            <div>
              <label htmlFor="job-followup" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Follow-up date</label>
              <input id="job-followup" type="date" {...register('next_follow_up')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('outreach_sent')} className="h-4 w-4 rounded border-line" />
            Outreach / follow-up email sent
          </label>

          <div>
            <label htmlFor="job-notes" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Notes</label>
            <textarea id="job-notes" {...register('notes')} rows={2} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="Referral from X, recruiter contact, etc." />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-canvas dark:hover:bg-canvas-dark">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {initialJob ? 'Save changes' : 'Add application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
