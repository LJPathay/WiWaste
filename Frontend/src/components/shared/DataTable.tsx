import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /**
   * `'numeric'` maps to `text-left tabular-nums` and `'center'` to `text-center`. There is
   * deliberately no `'right'`: three columns (GenerateReports' Download, StockReceiving's
   * Outstanding and Actions) declared `align: 'right'`, which matched neither branch and
   * therefore applied no class at all. Those cells right-align their own content with
   * `justify-end`, so the attribute was removed rather than wired up -- adding `text-right`
   * here would have been a rendering change, not a type fix.
   */
  align?: 'text' | 'numeric' | 'center';
  minWidth?: string;
  width?: string;
  /** Pins the column to the leading edge while the table scrolls horizontally. */
  pinned?: boolean;
  /**
   * Explicit sticky edge. `pinned: true` is shorthand for `pin: 'start'`.
   *
   * Two columns cannot both use `pinned`, because every pinned cell was given the same
   * `left: 0` and simply stacked on top of one another while scrolling. A trailing
   * actions column has to declare `pin: 'end'` instead.
   */
  pin?: 'start' | 'end';
  truncate?: boolean;
  render?: (row: T, value: unknown) => React.ReactNode;
  numeric?: boolean;
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /**
   * `index` is declared because the implementation calls `data.map(rowKey)`, so the index
   * has always been passed at runtime -- it simply was not in the type. Report previews
   * need it as a fallback key for rows that have no `id`.
   */
  rowKey: (row: T, index: number) => string | number;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  showHeader?: boolean;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  pagination?: React.ReactNode;
  horizontalScroll?: boolean;
  className?: string;
  hoverActions?: boolean;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T, isHovered: boolean) => React.ReactNode;
}

function TruncatedCell({ children, className }: { children: React.ReactNode; className?: string }) {
  const text = typeof children === 'string' ? children : String(children);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("truncate max-w-[200px]", className)}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// `T` is intentionally left unconstrained. The constraint used to be
// `Record<string, unknown>`, but an `interface` has no implicit index signature, so none of
// the API row shapes (`ApiProduct`, `ApiUser`, ...) satisfied it -- every page's table
// failed to compile with "Type 'ApiProduct' does not satisfy the constraint". The only
// thing that needed the index signature was the dynamic column-key lookup below, which is
// now narrowed at that one site instead.
export function DataTable<T>({
  columns,
  data,
  rowKey,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  showHeader = true,
  emptyState,
  emptyMessage = 'No data found.',
  loading = false,
  loadingComponent,
  pagination,
  horizontalScroll = true,
  className,
  hoverActions = true,
  rowClassName,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const allKeys = (data ?? []).map(rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys.has(k));
  const someSelected = allKeys.some(k => selectedKeys.has(k)) && !allSelected;

  const handleToggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  }, [allSelected, allKeys, onSelectionChange]);

  const handleToggleRow = useCallback((key: string | number) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }, [selectedKeys, onSelectionChange]);

  const pinOf = (col: DataTableColumn<T>): 'start' | 'end' | null =>
    col.pin ?? (col.pinned ? 'start' : null);

  const hasPinnedCol = columns.some(c => pinOf(c) !== null);

  /**
   * A sticky cell must paint an opaque background that matches whatever the row is
   * currently showing, otherwise the columns scrolling underneath are visible through
   * it. These classes mirror TableRow's hover and selected states exactly.
   */
  const pinnedCellBg =
    "bg-white dark:bg-slate-950 " +
    "group-hover:bg-bg dark:group-hover:bg-slate-900 " +
    "group-data-[state=selected]:bg-teal-50 dark:group-data-[state=selected]:bg-teal-950/40";

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-border dark:border-white/10 shadow-sm overflow-hidden">
        {loadingComponent ?? (
          <div className="flex items-center justify-center h-48">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full bg-white dark:bg-slate-950 rounded-xl border border-border dark:border-white/10 shadow-sm overflow-hidden", className)}>
      <div className={cn(horizontalScroll && "w-full overflow-x-auto")}>
        <Table ref={tableRef} className={cn("w-full", hasPinnedCol && "min-w-[800px]")}>
          {showHeader && (
            <TableHeader className="sticky top-0 z-20 bg-bg dark:bg-slate-900 border-b border-border dark:border-white/10">
              <TableRow className="hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={handleToggleAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map(col => {
                  const pin = pinOf(col);
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        col.align === 'numeric' && "text-left",
                        col.align === 'center' && "text-center",
                        pin === 'start' && "sticky left-0 z-30 bg-bg dark:bg-slate-900",
                        pin === 'end' && "sticky right-0 z-30 bg-bg dark:bg-slate-900",
                        col.hideOnMobile && "hidden md:table-cell",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        width: col.width,
                        ...(pin === 'start' ? { left: selectable ? '40px' : '0' } : {}),
                        ...(pin === 'end' ? { right: actions ? '64px' : '0' } : {}),
                      }}
                    >
                      {col.header}
                    </TableHead>
                  );
                })}
                {actions && (
                  <TableHead className="w-16 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {(!data?.length) ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={(columns?.length ?? 0) + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="text-center py-12"
                >
                  {emptyState ?? (
                    <p className="text-sm text-muted-fg dark:text-muted-fg">{emptyMessage}</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                // `rowKey` receives the index as its second argument, matching `data.map(rowKey)`
                // on the `allKeys` line above.
                const key = rowKey(row, index);
                const isHovered = hoveredRow === key;
                const isSelected = selectedKeys.has(key);

                return (
                  <TableRow
                    key={key}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      "group",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row),
                    )}
                    onMouseEnter={() => setHoveredRow(key)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(key)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                          aria-label={`Select row ${key}`}
                        />
                      </TableCell>
                    )}
                    {columns.map(col => {
                      // The row type has no index signature, so the dynamic column key needs a
                      // cast. `DataTableColumn.render` takes the value as `unknown`, so nothing
                      // downstream is trusting this to be a particular type.
                      const cellValue = (row as Record<string, unknown>)[col.key];
                      const pin = pinOf(col);
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            (col.align === 'numeric' || col.numeric) && "text-left tabular-nums",
                            col.align === 'center' && "text-center",
                            pin === 'start' && cn("sticky left-0 z-10", pinnedCellBg),
                            pin === 'end' && cn("sticky right-0 z-10", pinnedCellBg),
                            col.numeric && "tabular-nums",
                            col.hideOnMobile && "hidden md:table-cell",
                          )}
                          style={{
                            ...(pin === 'start' ? { left: selectable ? '40px' : '0' } : {}),
                            ...(pin === 'end' ? { right: actions ? '64px' : '0' } : {}),
                          }}
                        >
                          {col.render
                            ? col.render(row, cellValue)
                            : col.truncate
                              ? <TruncatedCell>{String(cellValue ?? '—')}</TruncatedCell>
                              : <span className={cn(col.numeric && "tabular-nums")}>{String(cellValue ?? '—')}</span>
                          }
                        </TableCell>
                      );
                    })}
                    {actions && (
                      <TableCell className="w-16 text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 transition-opacity duration-150",
                          hoverActions && !isHovered && "opacity-0",
                        )}>
                          {actions(row, isHovered)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="border-t border-border dark:border-white/10">
          {pagination}
        </div>
      )}
    </div>
  );
}
