import type { ReactNode } from 'react';

export type RankedBarItem = {
  id: string | number;
  label: string;
  value: number;
  meta?: string;
};

type RankedBarsProps = {
  items: RankedBarItem[];
  formatValue: (value: number) => string;
  /** Total used for the share column; defaults to the sum of `items`. */
  total?: number;
  barClassName?: string;
  emptyMessage?: string;
  showRank?: boolean;
  className?: string;
};

/**
 * Categorical rankings (loss by product, revenue by payment method) were rendered as
 * recharts bar charts with only two or three rows: the axes took up more room than the
 * data, product names wrapped over three lines and the value axis printed rounded
 * currency ticks. A labelled row list shows the same numbers with a readable name, an
 * exact amount and a proportional bar — and it degrades gracefully to one row.
 */
export function RankedBars({
  items,
  formatValue,
  total,
  barClassName = 'bg-gradient-to-r from-rose-400 to-rose-500',
  emptyMessage = 'No data for this period.',
  showRank = false,
  className = '',
}: RankedBarsProps) {
  if (items.length === 0) {
    return <div className="flex h-32 items-center justify-center px-4 text-center text-xs text-[#64748B] dark:text-muted-fg">{emptyMessage}</div>;
  }

  const sum = total ?? items.reduce((acc, item) => acc + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 0);

  return (
    <ol className={`space-y-3 ${className}`}>
      {items.map((item, index) => {
        const width = max > 0 ? Math.max((item.value / max) * 100, 2) : 0;
        const share = sum > 0 ? (item.value / sum) * 100 : 0;
        return (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                {showRank && (
                  <span className="w-4 shrink-0 text-[10px] font-bold tabular-nums text-[#CBD5E1] dark:text-slate-600">
                    {index + 1}
                  </span>
                )}
                <span className="truncate text-[11px] font-semibold text-[#0F172A] dark:text-slate-100" title={item.label}>
                  {item.label}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#0F172A] dark:text-slate-100">
                {formatValue(item.value)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${width}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right text-[9px] font-semibold tabular-nums text-[#64748B] dark:text-muted-fg">
                {share.toFixed(share >= 10 ? 0 : 1)}%
              </span>
            </div>
            {item.meta && <div className="mt-1 text-[9px] text-[#64748B] dark:text-muted-fg">{item.meta}</div>}
          </li>
        );
      })}
    </ol>
  );
}

export type RankedBarsLegendProps = { children: ReactNode };
