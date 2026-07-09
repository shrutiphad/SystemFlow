export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-5 shadow-xl">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-ink/70 dark:text-ink-dark/70">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-canvas dark:hover:bg-canvas-dark">
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
