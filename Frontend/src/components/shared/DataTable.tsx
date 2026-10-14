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
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
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
  readonly columns: DataTableColumn<T>[];
  readonly data: T[];
  /**
   * `index` is declared because the implementation calls `data.map(rowKey)`, so the index
   * has always been passed at runtime -- it simply was not in the type. Report previews
   * need it as a fallback key for rows that have no `id`.
   */
  readonly rowKey: (row: T, index: number) => string | number;
  readonly selectable?: boolean;
  readonly selectedKeys?: Set<string | number>;
  readonly onSelectionChange?: (keys: Set<string | number>) => void;
  readonly showHeader?: boolean;
  readonly emptyState?: React.ReactNode;
  readonly emptyMessage?: string;
  readonly loading?: boolean;
  readonly loadingComponent?: React.ReactNode;
  readonly pagination?: React.ReactNode;
  readonly horizontalScroll?: boolean;
  readonly className?: string;
  readonly hoverActions?: boolean;
  readonly rowClassName?: (row: T) => string;
  readonly onRowClick?: (row: T) => void;
  readonly actions?: (row: T, isHovered: boolean) => React.ReactNode;
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

/** Which sticky edge a column pins to; `null` means the column does not pin at all. */
type PinEdge = 'start' | 'end' | null;

function pinOf<T>(col: DataTableColumn<T>): PinEdge {
  return col.pin ?? null;
}

/**
 * A sticky cell must paint an opaque background that matches whatever the row is
 * currently showing, otherwise the columns scrolling underneath are visible through
 * it. These classes mirror TableRow's hover and selected states exactly.
 */
const PINNED_CELL_BG =
  "bg-white dark:bg-slate-950 " +
  "group-hover:bg-bg dark:group-hover:bg-slate-900 " +
  "group-data-[state=selected]:bg-teal-50 dark:group-data-[state=selected]:bg-teal-950/40";

/** `aria-sort` value for a sortable column; callers gate this behind `col.sortable`. */
function sortIndicator<T>(col: DataTableColumn<T>): 'ascending' | 'descending' | 'none' {
  if (col.sortDirection === 'asc') return 'ascending';
  if (col.sortDirection === 'desc') return 'descending';
  return 'none';
}

interface ColumnHeadProps<T> {
  readonly col: DataTableColumn<T>;
  readonly selectable: boolean;
  readonly hasActions: boolean;
}

/** Kept out of `ColumnHead` so its `&&` chain does not count against that function's complexity. */
function headClassName<T>(col: DataTableColumn<T>, pin: 'start' | 'end' | null): string {
  return cn(
    col.align === 'numeric' && "text-left",
    col.align === 'center' && "text-center",
    pin === 'start' && "sticky left-0 z-30 bg-bg dark:bg-slate-900",
    pin === 'end' && "sticky right-0 z-30 bg-bg dark:bg-slate-900",
    col.hideOnMobile && "hidden md:table-cell",
    col.sortable && "cursor-pointer select-none hover:bg-bg dark:hover:bg-slate-800",
  );
}

function headStyle<T>(
  col: DataTableColumn<T>,
  pin: 'start' | 'end' | null,
  selectable: boolean,
  hasActions: boolean,
): React.CSSProperties {
  return {
    minWidth: col.minWidth,
    width: col.width,
    ...(pin === 'start' ? { left: selectable ? '40px' : '0' } : {}),
    ...(pin === 'end' ? { right: hasActions ? '64px' : '0' } : {}),
  };
}

function ColumnHead<T>({ col, selectable, hasActions }: ColumnHeadProps<T>) {
  const pin = pinOf(col);
  const sortable = Boolean(col.sortable && col.onSort);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      col.onSort?.();
    }
  };
  return (
    <TableHead
      key={col.key}
      scope="col"
      aria-sort={col.sortable ? sortIndicator(col) : undefined}
      tabIndex={col.sortable ? 0 : undefined}
      role={col.sortable ? 'button' : undefined}
      onKeyDown={sortable ? handleKeyDown : undefined}
      onClick={sortable ? col.onSort : undefined}
      className={headClassName(col, pin)}
      style={headStyle(col, pin, selectable, hasActions)}
    >
      {col.header}
    </TableHead>
  );
}

interface DataCellProps<T> {
  readonly col: DataTableColumn<T>;
  readonly row: T;
  readonly selectable: boolean;
  readonly hasActions: boolean;
}

/**
 * Renders an unrendered cell value as text. The old `String(cellValue ?? '—')` could
 * reach an object or array and stringify it as `[object Object]`; anything non-primitive
 * is JSON-encoded instead so the cell stays readable.
 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }
  // Symbols and functions have no readable cell rendering.
  return '[object]';
}

/** Kept out of `DataCell` so its `&&` chain does not count against that function's complexity. */
function cellClassName<T>(col: DataTableColumn<T>, pin: 'start' | 'end' | null): string {
  return cn(
    (col.align === 'numeric' || col.numeric) && "text-left tabular-nums",
    col.align === 'center' && "text-center",
    pin === 'start' && cn("sticky left-0 z-10", PINNED_CELL_BG),
    pin === 'end' && cn("sticky right-0 z-10", PINNED_CELL_BG),
    col.numeric && "tabular-nums",
    col.hideOnMobile && "hidden md:table-cell",
  );
}

function cellStyle(
  pin: 'start' | 'end' | null,
  selectable: boolean,
  hasActions: boolean,
): React.CSSProperties {
  return {
    ...(pin === 'start' ? { left: selectable ? '40px' : '0' } : {}),
    ...(pin === 'end' ? { right: hasActions ? '64px' : '0' } : {}),
  };
}

function cellBody<T>(col: DataTableColumn<T>, row: T, cellValue: unknown): React.ReactNode {
  if (col.render) return col.render(row, cellValue);
  const text = cellText(cellValue);
  if (col.truncate) return <TruncatedCell>{text}</TruncatedCell>;
  return <span className={cn(col.numeric && "tabular-nums")}>{text}</span>;
}

function DataCell<T>({ col, row, selectable, hasActions }: DataCellProps<T>) {
  const pin = pinOf(col);
  // The row type has no index signature, so the dynamic column key needs a
  // cast. `DataTableColumn.render` takes the value as `unknown`, so nothing
  // downstream is trusting this to be a particular type.
  const cellValue = (row as Record<string, unknown>)[col.key];
  return (
    <TableCell
      key={col.key}
      className={cellClassName(col, pin)}
      style={cellStyle(pin, selectable, hasActions)}
    >
      {cellBody(col, row, cellValue)}
    </TableCell>
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

  const allKeys = (data ?? []).map((row, index) => rowKey(row, index));
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

  const hasPinnedCol = columns.some(c => pinOf(c) !== null);

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
                  <TableHead className="w-10 text-center" scope="col">
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
                {columns.map(col => (
                  <ColumnHead key={col.key} col={col} selectable={selectable} hasActions={Boolean(actions)} />
                ))}
                {actions && (
                  <TableHead className="w-28 min-w-28 text-right" scope="col">
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
                      ((row as any).status === 'Discontinued' || (row as any).status === 'Expired' || (row as any).status === 'critical') && 'status-bar status-bar--critical',
                      ((row as any).status === 'Active' || (row as any).status === 'ok' || (row as any).status === 'healthy') && 'status-bar status-bar--ok',
                      ((row as any).status === 'Low Stock' || (row as any).status === 'warning') && 'status-bar status-bar--warning',
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
                    {columns.map(col => (
                      <DataCell key={col.key} col={col} row={row} selectable={selectable} hasActions={Boolean(actions)} />
                    ))}
                    {actions && (
                      <TableCell className="w-28 min-w-28 text-right">
                        <div className={cn(
                          "flex min-h-8 items-center justify-end gap-1 transition-opacity duration-150",
                          hoverActions && "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
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
          <div aria-live="polite" className="sr-only">
            {`Showing ${data.length} row${data.length !== 1 ? 's' : ''}`}
          </div>
          {pagination}
        </div>
      )}
    </div>
  );
}
