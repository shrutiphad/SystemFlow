import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import Select from './Select';

export const RELATIONSHIPS = [
  ['recruiter', 'Recruiter'],
  ['referral', 'Referral'],
  ['hiring_manager', 'Hiring manager'],
  ['colleague', 'Colleague'],
  ['alumni', 'Alumni'],
  ['mentor', 'Mentor'],
  ['other', 'Other'],
];

export const STATUSES = [
  ['to_contact', 'To contact'],
  ['contacted', 'Contacted'],
  ['responded', 'Responded'],
  ['referred', 'Referred'],
  ['closed', 'Closed'],
];

const looseUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i;

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  role_title: z.string().max(150).optional().or(z.literal('')),
  company_name: z.string().max(150).optional().or(z.literal('')),
  email: z.string().max(200).refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Must be a valid email').optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  linkedin_url: z.string().max(500).refine((v) => v === '' || looseUrl.test(v), 'Must be a valid URL').optional().or(z.literal('')),
  relationship: z.enum(['recruiter', 'referral', 'hiring_manager', 'colleague', 'alumni', 'mentor', 'other']).optional().or(z.literal('')),
  status: z.enum(['to_contact', 'contacted', 'responded', 'referred', 'closed']),
  last_contacted: z.string().optional().or(z.literal('')),
  next_follow_up: z.string().optional().or(z.literal('')),
  job_id: z.string().optional().or(z.literal('')),
  notes: z.string().max(4000).optional().or(z.literal('')),
});

export default function ContactFormModal({ open, initialContact, jobs = [], onClose, onSubmit }) {
  const emptyValues = {
    name: '', role_title: '', company_name: '', email: '', phone: '', linkedin_url: '',
    relationship: '', status: 'to_contact', last_contacted: '', next_follow_up: '', job_id: '', notes: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        initialContact
          ? {
              name: initialContact.name,
              role_title: initialContact.role_title || '',
              company_name: initialContact.company_name || '',
              email: initialContact.email || '',
              phone: initialContact.phone || '',
              linkedin_url: initialContact.linkedin_url || '',
              relationship: initialContact.relationship || '',
              status: initialContact.status,
              last_contacted: initialContact.last_contacted || '',
              next_follow_up: initialContact.next_follow_up || '',
              job_id: initialContact.job_id || '',
              notes: initialContact.notes || '',
            }
          : emptyValues
      );
    }
  }, [open, initialContact, reset]);

  if (!open) return null;

  const submit = async (values) => {
    await onSubmit({
      ...values,
      role_title: values.role_title || null,
      company_name: values.company_name || null,
      email: values.email || null,
      phone: values.phone || null,
      linkedin_url: values.linkedin_url || null,
      relationship: values.relationship || null,
      last_contacted: values.last_contacted || null,
      next_follow_up: values.next_follow_up || null,
      job_id: values.job_id || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md animate-pop-in overflow-y-auto rounded-2xl border border-line/80 bg-surface p-5 shadow-elevated dark:border-line-dark/80 dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{initialContact ? 'Edit contact' : 'New contact'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-canvas dark:hover:bg-canvas-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div>
            <label htmlFor="c-name" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Name</label>
            <input id="c-name" {...register('name')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="e.g. Priya Sharma" />
            {errors.name && <p className="mt-1 text-xs text-priority-high">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-role" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Role / title</label>
              <input id="c-role" {...register('role_title')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="Recruiter" />
            </div>
            <div>
              <label htmlFor="c-company" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Company</label>
              <input id="c-company" {...register('company_name')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="Stripe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-email" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Email</label>
              <input id="c-email" {...register('email')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="name@company.com" />
              {errors.email && <p className="mt-1 text-xs text-priority-high">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="c-phone" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Phone</label>
              <input id="c-phone" {...register('phone')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="+91 …" />
            </div>
          </div>

          <div>
            <label htmlFor="c-linkedin" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">LinkedIn URL</label>
            <input id="c-linkedin" {...register('linkedin_url')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="linkedin.com/in/…" />
            {errors.linkedin_url && <p className="mt-1 text-xs text-priority-high">{errors.linkedin_url.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-rel" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Relationship</label>
              <Select id="c-rel" {...register('relationship')} fullWidth>
                <option value="">—</option>
                {RELATIONSHIPS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="c-status" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Status</label>
              <Select id="c-status" {...register('status')} fullWidth>
                {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-last" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Last contacted</label>
              <input id="c-last" type="date" {...register('last_contacted')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" />
            </div>
            <div>
              <label htmlFor="c-follow" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Follow-up date</label>
              <input id="c-follow" type="date" {...register('next_follow_up')} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" />
            </div>
          </div>

          <div>
            <label htmlFor="c-job" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Linked application <span className="text-ink/40 dark:text-ink-dark/40">(optional)</span></label>
            <Select id="c-job" {...register('job_id')} fullWidth>
              <option value="">— None —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {[j.company_name, j.role_title].filter(Boolean).join(' · ')}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="c-notes" className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Notes</label>
            <textarea id="c-notes" {...register('notes')} rows={2} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="How you met, what to follow up on…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-canvas dark:hover:bg-canvas-dark">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-accent-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none">
              {initialContact ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
