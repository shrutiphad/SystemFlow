// A horizontal bar breakdown, hand-rolled with divs (no chart lib, matching the
// app's no-dependency bar). One measure (a count) per row, so bars use a single
// hue by default; callers pass `barClass`/`dot` for status breakdowns where the
// colour carries meaning - and every row is directly labelled with its value, so
// identity/magnitude is never conveyed by colour alone.
//
// items: [{ label, value, dot?, barClass? }]
export default function BarBreakdown({ items, barClass = 'bg-accent dark:bg-accent-dark', emptyLabel = 'No data yet' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const hasAny = items.some((i) => i.value > 0);

  if (!hasAny) {
    return <p className="py-6 text-center text-xs text-ink/40 dark:text-ink-dark/40">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((it) => {
        const pct = it.value === 0 ? 0 : Math.max((it.value / max) * 100, 3);
        return (
          <li key={it.label} title={`${it.label}: ${it.value}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink/70 dark:text-ink-dark/70">
                {it.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${it.dot}`} aria-hidden="true" />}
                {it.label}
              </span>
              <span className="font-mono tabular-nums text-ink/60 dark:text-ink-dark/60">{it.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface2 dark:bg-surface2-dark">
              <div
                className={`h-full rounded-full ${it.barClass || barClass} transition-[width] duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
