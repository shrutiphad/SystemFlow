import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

// A single, consistently-themed dropdown used everywhere in the app.
//
// Why a wrapper: a native <select>'s arrow can't be styled and doesn't theme
// reliably across OSes, so we hide it (`appearance-none`) and draw our own
// ChevronDown. The global `color-scheme` (ThemeContext) makes the OPEN option
// list paint correctly in dark mode; the classes here make the CLOSED control
// look right in both themes with a proper focus ring and hover.
//
// forwardRef + {...props} so it works both as a controlled input (value +
// onChange, e.g. FilterSortBar) and with react-hook-form's register() spread
// (which needs ref/name/onChange/onBlur), e.g. the form modals.
const Select = forwardRef(function Select({ className = '', fullWidth = false, children, ...props }, ref) {
  return (
    <div className={`relative ${fullWidth ? 'block w-full' : 'inline-block'}`}>
      <select
        ref={ref}
        {...props}
        className={
          'w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface px-3 py-2 pr-9 text-sm text-ink ' +
          'transition-colors hover:border-ink/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ' +
          'dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-ink-dark/30 ' +
          className
        }
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-ink-dark/40"
      />
    </div>
  );
});

export default Select;
