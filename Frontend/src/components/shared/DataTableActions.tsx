import React from 'react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  /**
   * `'danger'` is the only value that changes anything -- everything else falls through to
   * the neutral branch in `ActionButton`. `ReturnsRefunds` passed `variant="primary"`,
   * which is not in this union and rendered identically to the default; it is now spelled
   * out rather than adding a third variant that would behave the same.
   */
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function ActionButton({ icon, label, onClick, variant = 'default', disabled }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(e); }}
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors",
            variant === 'danger'
              ? "text-muted-fg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              : "text-muted-fg hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200",
            disabled && "opacity-30 cursor-not-allowed",
          )}
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      {/* `TooltipContent` has no `side` prop -- it always places the bubble above the
          trigger and flips below only when there is no room (see tooltip.tsx). `side` was
          spreading into `...props` and landing on the portalled <div> as an invalid
          `side="top"` attribute, so it is removed rather than implemented: honouring it
          would move the tooltip. */}
      <TooltipContent className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface OverflowMenuProps {
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
  }>;
}

export function OverflowMenu({ items }: OverflowMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="touch-target inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-fg hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="More actions"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-bg-elevated border border-border dark:border-white/10 rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                item.variant === 'danger'
                  ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  : "text-slate-700 hover:bg-bg dark:text-slate-300 dark:hover:bg-slate-800",
                item.disabled && "opacity-30 cursor-not-allowed",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
