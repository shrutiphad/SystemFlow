export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm animate-pop-in rounded-2xl border border-line/80 bg-surface p-5 shadow-elevated dark:border-line-dark/80 dark:bg-surface-dark">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-ink/70 dark:text-ink-dark/70">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface2 dark:hover:bg-surface2-dark">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-priority-high px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
