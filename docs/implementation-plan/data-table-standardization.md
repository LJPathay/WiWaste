# Standardize Data Table UI Across WiWaste — Implementation Plan

## Overview

Improve and standardize the data table component across the entire WiWaste application. Keep the existing WiWaste visual language, typography, colors, spacing, borders, and overall enterprise dashboard aesthetic. Do not redesign the surrounding pages or modules.

The goal is to create a clean, dense, highly scannable, professional data table suitable for inventory, products, suppliers, purchase orders, wastage, FEFO, reports, audit logs, and other management screens.

---

## Current State Analysis

### What Exists

| Finding | Detail |
|---------|--------|
| Tables found | 25+ inline `<table>` elements across 16 files |
| Shared table component | **None** — every table is hand-coded inline |
| `src/components/ui/table.tsx` | **Mislabeled** — exports a `Switch` component, not a Table |
| `src/components/ui/pagination.tsx` | **Exists but unused** — every page reimplements pagination inline |
| Tooltip usage in tables | **None** — tooltips only appear in page headers |
| Sticky headers | **Zero** — no table implements sticky `thead` |
| Horizontal scrolling | Most pages have `overflow-x-auto`, except `ManageProducts` (10 columns, no scroll) |
| Numeric alignment | **Inconsistent** — some pages right-align money, most don't |
| Row height | Padding-based (`py-4` most common), no explicit height |
| Hover styles | 4+ different hover color variants across pages |
| Action buttons | **Always visible** in every row, no hover-to-reveal |
| Text truncation | Only 1 instance (`VendorCredits` uses `truncate`) |
| Column sorting | Ad-hoc `<select>` dropdowns, no column-click sorting |
| Selection (checkboxes) | Only on ManageProducts, ManageSuppliers, ManageCategories |

### Files Containing Tables

**Admin** (8 files, 11 tables):
- `src/pages/admin/ManageProducts.tsx` — L580 (10 cols, checkbox selection)
- `src/pages/admin/ManageUsers.tsx` — L603 (6 cols)
- `src/pages/admin/ManageSuppliers.tsx` — L424 (7 cols, checkbox selection)
- `src/pages/admin/ManageCategories.tsx` — L516 (4 cols, checkbox selection)
- `src/pages/admin/PurchaseOrders.tsx` — L208 (7 cols) + L335 (inner modal table, 5 cols)
- `src/pages/admin/AuditLogs.tsx` — L108 (4 cols)
- `src/pages/admin/GenerateReports.tsx` — L323, L438, L469, L537 (4 tables)

**Inventory** (4 files, 4 tables):
- `src/pages/inventory/ManageInventory.tsx` — L901 (6 cols, zebra striping)
- `src/pages/inventory/RecordWastage.tsx` — L362 (5 cols)
- `src/pages/inventory/Recommendations.tsx` — L268 (7 cols)
- `src/pages/inventory/FEFOTracking.tsx` — L171 (7 cols)

**Cashier** (2 files, 3 tables):
- `src/pages/cashier/CashierHistory.tsx` — L19 (5 cols)
- `src/pages/cashier/ReturnsRefunds.tsx` — L122, L255 (2 tables)

**Manager** (5 files, 5 tables):
- `src/pages/manager/SupplierPerformance.tsx` — L148
- `src/pages/manager/Replenishment.tsx` — L210
- `src/pages/manager/InventoryPerformance.tsx` — L132
- `src/pages/manager/OverstockRisks.tsx` — L165
- `src/pages/manager/ExecutiveReports.tsx` — L256

**Dashboard** (2 files, 2 tables):
- `src/pages/dashboard/VendorCredits.tsx` — L141
- `src/pages/dashboard/FefoTracking.tsx` — L150

---

## Target Design Specifications

### Row Height
- Default data-row height: **48px** (achieved via `py-3` on `text-xs` cells)
- Keep row heights consistent throughout the table
- Do not increase row height for long text
- Vertically center all cell content

### Numeric Alignment
- All numeric data: **right-aligned** (`text-right`)
- Applies to: quantities, prices, currency values, totals, inventory counts, percentages, stock levels, reorder levels, purely numeric IDs
- Enable `font-variant-numeric: tabular-nums` (`tabular-nums` Tailwind class) on all numeric values
- Digits must have equal widths for vertical scanning
- **Never truncate numeric values** — give columns minimum width or allow horizontal scroll

### Text Alignment
- Text-based data: **left-aligned** (default)
- Applies to: product names, supplier names, category names, descriptions, employee names, transaction references, status text
- Actions: **right-aligned**

### Row Dividers
- 1px hairline divider between rows only (`divide-y`)
- No heavy borders around every cell
- No vertical borders between columns
- Keep the table visually lightweight

### Row Hover
- Subtle background change on hover
- No text size change, no layout shift
- Consistent color across all tables: `hover:bg-slate-50/50 dark:hover:bg-white/5`

### Action Buttons — Hover Only
- Hidden by default
- Revealed on row hover with smooth transition
- Preserve column width (actions column has fixed min-width)
- Compact icon buttons with tooltips
- Destructive actions in secondary menu (dropdown)
- On touch/mobile: persistent overflow menu alternative

### Long Text
- Truncate with ellipsis (`truncate` class)
- Show complete value in tooltip on hover
- Do not allow long text to expand row height
- Only truncate text attributes, never numbers

### Horizontal Scrolling
- Container: `overflow-x-auto`
- Columns get sensible `min-width` values
- Table does not squeeze content to unreadable sizes
- 48px row height preserved during scroll

### Pinned Identity Columns
- Primary identity column (product/item name) pinned on left during horizontal scroll
- `position: sticky; left: 0; z-index: 10` with background color
- Subtle right border/shadow to indicate frozen state

### Sticky Header
- `position: sticky; top: 0; z-index: 20` on `<thead>`
- Opaque background to prevent row content showing through
- Visual separation from scrolling rows (bottom border)

### Responsive Behavior
- Preserve right alignment on numeric columns
- Preserve `tabular-nums`
- Allow horizontal scrolling
- Preserve pinned identity columns where practical
- Keep sticky header
- Maintain 48px row height

### Accessibility
- Keyboard navigation usable
- Hover-only actions accessible via keyboard focus (`focus-visible:`)
- Tooltips accessible (ARIA attributes)
- Icon-only buttons have `aria-label`
- Sufficient color contrast
- Sticky columns/header do not interfere with keyboard navigation

---

## Architecture

### Component Hierarchy

```
DataTable (new, reusable)
├── Table Container (overflow-x-auto, relative)
│   ├── Table (w-full text-xs)
│   │   ├── StickyHeader (thead, sticky top-0)
│   │   │   └── HeaderRow
│   │   │       ├── Checkbox (optional, for selection)
│   │   │       ├── TextHeader (left-aligned)
│   │   │       ├── NumericHeader (right-aligned, tabular-nums)
│   │   │       └── ActionsHeader (right-aligned, min-width)
│   │   └── TableBody (tbody, divide-y)
│   │       ├── DataRow (48px, hover state)
│   │       │   ├── IdentityCell (pinned, sticky left, truncated text + tooltip)
│   │       │   ├── TextCell (left-aligned, truncated)
│   │       │   ├── NumericCell (right-aligned, tabular-nums, never truncated)
│   │       │   ├── StatusCell (badge)
│   │       │   └── ActionsCell (hidden, revealed on hover)
│   │       └── EmptyState (when no data)
│   └── PinnedColumnShadow (visual separator for frozen column)
└── Pagination (existing component, integrated)
```

---

## Phase 1: Core Component Creation

### 1A. Fix `src/components/ui/table.tsx`

**File**: `Frontend/src/components/ui/table.tsx`

The current file exports a `Switch` component. Replace it with proper shadcn/ui-style Table primitives that serve as the foundation for the DataTable.

```tsx
import * as React from "react"
import { cn } from "./utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
)
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 data-[state=selected]:bg-teal-50/30 dark:data-[state=selected]:bg-teal-900/10", className)} {...props} />
  )
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-10 px-4 text-left align-middle font-semibold text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
)
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

**Note**: The existing `Switch` export must be preserved or moved. Since `switch.tsx` already exists as a separate file, the Switch in `table.tsx` is redundant. Remove the Switch from `table.tsx`. Check if anything imports `Switch` from `table.tsx` — if so, update those imports to use `switch.tsx`.

### 1B. Create `src/components/shared/DataTable.tsx`

**File**: New — `Frontend/src/components/shared/DataTable.tsx`

This is the main reusable component. It wraps the Table primitives and adds:
- Column alignment (text vs numeric)
- Sticky header
- Pinned identity column
- Hover-only actions
- Text truncation with tooltip
- Tabular-nums for numeric values
- Integrated pagination
- Empty state
- Selection support

```tsx
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
import { Pagination } from '../ui/pagination';

// ─── Column Definition ───────────────────────────────────────────────
export interface DataTableColumn<T> {
  /** Unique key for this column */
  key: string;
  /** Header label */
  header: string;
  /** 'text' = left-aligned, 'numeric' = right-aligned + tabular-nums */
  align?: 'text' | 'numeric' | 'center';
  /** Minimum width (CSS value) — prevents column from shrinking too small */
  minWidth?: string;
  /** Width (CSS value) — e.g. '120px', '15%' */
  width?: string;
  /** Whether this is the identity column (pinned on left during scroll) */
  pinned?: boolean;
  /** Whether to truncate long text with ellipsis + tooltip */
  truncate?: boolean;
  /** Custom cell renderer — receives the row data and cell value */
  render?: (row: T, value: unknown) => React.ReactNode;
  /** Whether this column is numeric (auto-applies tabular-nums + text-right) */
  numeric?: boolean;
  /** Whether this column should be hidden on small screens */
  hideOnMobile?: boolean;
}

// ─── DataTable Props ─────────────────────────────────────────────────
export interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data array */
  data: T[];
  /** Unique key extractor for rows */
  rowKey: (row: T) => string | number;
  /** Whether to show checkboxes for row selection */
  selectable?: boolean;
  /** Selected row keys (controlled) */
  selectedKeys?: Set<string | number>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Whether to show the table header */
  showHeader?: boolean;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Empty state message (used when emptyState not provided) */
  emptyMessage?: string;
  /** Whether the table is loading */
  loading?: boolean;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Pagination props — if provided, table is paginated */
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    onPageChange: (page: number) => void;
  };
  /** Whether to enable horizontal scrolling (default: true) */
  horizontalScroll?: boolean;
  /** Table-level className */
  className?: string;
  /** Whether to enable hover-to-reveal actions (default: true) */
  hoverActions?: boolean;
  /** Row className modifier */
  rowClassName?: (row: T) => string;
  /** Whether rows are clickable */
  onRowClick?: (row: T) => void;
}

// ─── Truncated Cell with Tooltip ─────────────────────────────────────
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

// ─── DataTable Component ─────────────────────────────────────────────
export function DataTable<T extends Record<string, unknown>>({
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
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const allKeys = data.map(rowKey);
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

  // Find the pinned column
  const pinnedCol = columns.find(c => c.pinned);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
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
    <div className={cn("bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden", className)}>
      <div className={cn(horizontalScroll && "overflow-x-auto")}>
        <Table ref={tableRef} className={cn(pinnedCol && "min-w-[800px]")}>
          {showHeader && (
            <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
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
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.align === 'numeric' && "text-right",
                      col.align === 'center' && "text-center",
                      col.pinned && "sticky left-0 z-30 bg-slate-50 dark:bg-slate-900",
                      col.hideOnMobile && "hidden md:table-cell",
                    )}
                    style={{
                      minWidth: col.minWidth,
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </TableHead>
                ))}
                {/* Spacer for hover actions */}
                <TableHead className="w-16 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + 1}
                  className="text-center py-12"
                >
                  {emptyState ?? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map(row => {
                const key = rowKey(row);
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
                      const cellValue = row[col.key];
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            col.align === 'numeric' && "text-right tabular-nums",
                            col.align === 'center' && "text-center",
                            col.pinned && "sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50/50 dark:group-hover:bg-white/5",
                            col.numeric && "tabular-nums",
                            col.hideOnMobile && "hidden md:table-cell",
                          )}
                          style={col.pinned ? { left: selectable ? '40px' : '0' } : undefined}
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
                    {/* Actions column — hidden by default, shown on hover */}
                    <TableCell className="w-16 text-right">
                      {hoverActions && isHovered && (
                        <div className="flex items-center justify-end gap-1 animate-in fade-in duration-150">
                          {/* Actions slot — passed via render prop or children */}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pinned column shadow separator */}
      {pinnedCol && (
        <div className="pointer-events-none absolute top-0 bottom-0 left-[var(--pinned-width)] w-px bg-slate-200 dark:bg-white/10 shadow-[2px_0_8px_rgba(0,0,0,0.04)] z-10" />
      )}

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          totalItems={pagination.totalItems}
          perPage={pagination.perPage}
        />
      )}
    </div>
  );
}
```

### 1C. Create `src/components/shared/DataTableActions.tsx`

**File**: New — `Frontend/src/components/shared/DataTableActions.tsx`

Action button components for use inside DataTable rows:

```tsx
import React from 'react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
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
              ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200",
            disabled && "opacity-30 cursor-not-allowed",
          )}
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
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
        className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="More actions"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                item.variant === 'danger'
                  ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
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
```

---

## Phase 2: Integrate Pagination Component

### 2A. Update `src/components/ui/pagination.tsx`

**File**: `Frontend/src/components/ui/pagination.tsx`

The existing component is good but needs minor updates:
1. Accept `label` prop for custom "Showing X of Y" text (e.g., "products" vs "logs")
2. Ensure it handles `totalItems = 0` gracefully

```tsx
// Add to interface:
interface PaginationProps {
  // ... existing props
  label?: string; // e.g. "products", "logs", "orders"
}

// Update the "Showing" text:
const itemLabel = label ?? 'items';
// ...
<span>Showing {from}–{to} of {totalItems} {itemLabel}</span>
```

---

## Phase 3: Page Migration — Admin Pages

### 3A. ManageProducts.tsx

**File**: `Frontend/src/pages/admin/ManageProducts.tsx`

**Current**: 10-column table with checkbox selection, always-visible Edit/Archive buttons, no truncation, no sticky header, no pinned columns, inline pagination.

**Changes**:
- Replace inline `<table>` with `<DataTable>`
- Define columns array with proper alignment:
  - Product Name: `pinned: true, truncate: true`
  - SKU/Barcode: `truncate: true`
  - Cost Price: `numeric: true`
  - Selling Price: `numeric: true`
  - Stock Level: `numeric: true`
  - Status: `align: 'center'`
  - Actions: use `ActionButton` with hover-to-reveal
- Add sticky header
- Add horizontal scroll (table has 10 columns)
- Pin Product Name column
- Truncate product names with tooltip
- Use `tabular-nums` on all numeric cells
- Replace inline pagination with integrated `<Pagination>`
- Remove the empty state notification popup (table empty state handles it)

**Column definitions**:
```typescript
const productColumns: DataTableColumn<ApiProduct>[] = [
  { key: 'name', header: 'Product Name', pinned: true, truncate: true, minWidth: '180px' },
  { key: 'sku', header: 'SKU / Barcode', truncate: true, minWidth: '120px' },
  { key: 'category', header: 'Category', truncate: true, minWidth: '100px' },
  { key: 'supplier', header: 'Supplier', truncate: true, minWidth: '120px' },
  { key: 'cost_price', header: 'Cost Price', numeric: true, minWidth: '90px', render: (row) => currencyFormatter.format(row.cost_price as number) },
  { key: 'selling_price', header: 'Selling Price', numeric: true, minWidth: '100px', render: (row) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{currencyFormatter.format(row.selling_price as number)}</span> },
  { key: 'stock', header: 'Stock Level', numeric: true, minWidth: '100px', render: (row) => <StockBadge stock={row.stock} reorderLevel={row.reorder_level} /> },
  { key: 'status', header: 'Status', align: 'center', minWidth: '80px', render: (row) => <StatusBadge status={row.status} /> },
];
```

**Estimated lines changed**: ~120 (remove inline table JSX, add column defs + DataTable usage)

### 3B. ManageUsers.tsx

**File**: `Frontend/src/pages/admin/ManageUsers.tsx`

**Current**: 6-column table, always-visible Edit/Archive/Reset buttons, inline pagination with "Previous/Next" text.

**Changes**:
- Replace with `<DataTable>`
- Columns: User (pinned), Username, Email (truncate), Role (center), Status (center), Actions (hover)
- Add sticky header
- Integrate `<Pagination>`
- Hover-to-reveal actions

**Estimated lines changed**: ~80

### 3C. ManageSuppliers.tsx

**File**: `Frontend/src/pages/admin/ManageSuppliers.tsx`

**Current**: 7-column table with checkbox selection.

**Changes**:
- Replace with `<DataTable>`
- Columns: Name (pinned, truncate), Contact Person, Phone, Address (truncate), Products (numeric), Actions
- Add sticky header + horizontal scroll
- Hover-to-reveal actions

**Estimated lines changed**: ~80

### 3D. ManageCategories.tsx

**File**: `Frontend/src/pages/admin/ManageCategories.tsx`

**Current**: 4-column table with checkbox selection.

**Changes**:
- Replace with `<DataTable>`
- Columns: Category Name (pinned), Product Count (numeric), Actions
- Simple migration — few columns, no scroll needed

**Estimated lines changed**: ~60

### 3E. PurchaseOrders.tsx

**File**: `Frontend/src/pages/admin/PurchaseOrders.tsx`

**Current**: 7-column table with icon-only actions (Eye, X, Package).

**Changes**:
- Replace main table with `<DataTable>`
- Columns: PO Number (pinned), Supplier, Created By, Total (numeric), Status (center), Date, Actions
- Replace icon buttons with `ActionButton` + tooltips
- Add sticky header
- Inner modal table stays as-is (it's a small detail view, not a data management table)

**Estimated lines changed**: ~70

### 3F. AuditLogs.tsx

**File**: `Frontend/src/pages/admin/AuditLogs.tsx`

**Current**: 4-column table, simple layout.

**Changes**:
- Replace with `<DataTable>`
- Columns: Timestamp (pinned), Action, User, Entity
- Add sticky header
- Simple migration

**Estimated lines changed**: ~50

### 3G. GenerateReports.tsx

**File**: `Frontend/src/pages/admin/GenerateReports.tsx`

**Current**: 4 separate tables (Optimization Plan, Sales Transactions, Recent Compilations, Returns Oversight).

**Changes**:
- Replace each table with `<DataTable>`
- Each table gets its own column definitions
- Numeric columns: Order Value, Total, Refund — all right-aligned with `tabular-nums`
- Add sticky headers
- Add horizontal scroll where needed

**Estimated lines changed**: ~150 (4 tables)

---

## Phase 4: Page Migration — Inventory Pages

### 4A. ManageInventory.tsx

**File**: `Frontend/src/pages/inventory/ManageInventory.tsx`

**Current**: 6-column table with zebra striping, click-to-select rows, custom empty state with icon.

**Changes**:
- Replace with `<DataTable>`
- Columns: Item (pinned, truncate), Category, Stock Qty (numeric), Stock Status (center), Nearest Expiry, Last Movement
- Remove zebra striping (hover state replaces it)
- Use `onRowClick` for row selection
- Custom `emptyState` with Package icon + "Clear Filters" button
- Add sticky header

**Estimated lines changed**: ~80

### 4B. RecordWastage.tsx

**File**: `Frontend/src/pages/inventory/RecordWastage.tsx`

**Current**: 5-column table.

**Changes**:
- Replace with `<DataTable>`
- Columns: Item (pinned), Qty (numeric), Loss Cost (numeric), Reason, Recorded At
- Add sticky header

**Estimated lines changed**: ~50

### 4C. Recommendations.tsx

**File**: `Frontend/src/pages/inventory/Recommendations.tsx`

**Current**: 7-column table with Accept/Reject action buttons.

**Changes**:
- Replace with `<DataTable>`
- Columns: Product (pinned), Type (center), Current Stock (numeric), Recommended Stock (numeric), Confidence (numeric), Status (center), Actions (hover)
- Actions: Accept/Reject as `ActionButton` components
- Add sticky header + horizontal scroll

**Estimated lines changed**: ~70

### 4D. FEFOTracking.tsx

**File**: `Frontend/src/pages/inventory/FEFOTracking.tsx`

**Current**: 7-column table with custom status badges and action buttons.

**Changes**:
- Replace with `<DataTable>`
- Columns: Product (pinned), Batch #, Expiry Date, Days Left (numeric, center), Qty (numeric), Status (center), Action (hover)
- Keep existing status badge rendering
- Add sticky header

**Estimated lines changed**: ~70

---

## Phase 5: Page Migration — Cashier Pages

### 5A. CashierHistory.tsx

**File**: `Frontend/src/pages/cashier/CashierHistory.tsx`

**Current**: 5-column table inside a grid layout with receipt preview.

**Changes**:
- Replace table with `<DataTable>`
- Columns: Transaction ID (pinned, truncate), Time, Payment Method, Total (numeric), Actions
- Keep the grid layout + receipt preview panel unchanged
- Add sticky header

**Estimated lines changed**: ~40

### 5B. ReturnsRefunds.tsx

**File**: `Frontend/src/pages/cashier/ReturnsRefunds.tsx`

**Current**: 2 tables (Returnable Items, Recent Returns).

**Changes**:
- Replace both tables with `<DataTable>`
- Returnable Items: Transaction, Item (truncate), Sold Qty (numeric), Unit Price (numeric), Action (hover)
- Recent Returns: Product (truncate), Qty (numeric), Refund (numeric), Reason, Returned By, Date
- Add sticky headers

**Estimated lines changed**: ~80

---

## Phase 6: Page Migration — Manager Pages

### 6A. SupplierPerformance.tsx

**File**: `Frontend/src/pages/manager/SupplierPerformance.tsx`

**Changes**: Replace table with `<DataTable>`. Numeric columns for delivery rates, return rates.

**Estimated lines changed**: ~60

### 6B. Replenishment.tsx

**File**: `Frontend/src/pages/manager/Replenishment.tsx`

**Changes**: Replace table with `<DataTable>`. Numeric columns for quantities and order values.

**Estimated lines changed**: ~60

### 6C. InventoryPerformance.tsx

**File**: `Frontend/src/pages/manager/InventoryPerformance.tsx`

**Changes**: Replace table with `<DataTable>`. Numeric columns for turnover, stock rates.

**Estimated lines changed**: ~50

### 6D. OverstockRisks.tsx

**File**: `Frontend/src/pages/manager/OverstockRisks.tsx`

**Changes**: Replace table with `<DataTable>`. Numeric columns for quantities and risk levels.

**Estimated lines changed**: ~50

### 6E. ExecutiveReports.tsx

**File**: `Frontend/src/pages/manager/ExecutiveReports.tsx`

**Note**: This file may be redirected to GenerateReports per the admin dashboard redesign plan. If not yet redirected, apply standard table migration.

**Estimated lines changed**: ~50

---

## Phase 7: Page Migration — Dashboard Pages

### 7A. VendorCredits.tsx

**File**: `Frontend/src/pages/dashboard/VendorCredits.tsx`

**Current**: Uses `min-w-[800px]` instead of overflow container.

**Changes**:
- Replace with `<DataTable>`
- Columns: Return ID (pinned), Reason (truncate), Processed By, Date, Refund (numeric)
- Replace `min-w-[800px]` with proper horizontal scroll + pinned column
- Add sticky header

**Estimated lines changed**: ~50

### 7B. FefoTracking.tsx (Dashboard)

**File**: `Frontend/src/pages/dashboard/FefoTracking.tsx`

**Current**: Uses `min-w-[800px]` and `text-sm`.

**Changes**:
- Replace with `<DataTable>`
- Columns: Batch (pinned), Product, Expiry, Days Left (numeric), Qty (numeric), Status
- Replace `min-w-[800px]` with proper horizontal scroll + pinned column
- Add sticky header

**Estimated lines changed**: ~50

---

## Phase 8: Final Cleanup

### 8A. Verify All Imports

After all migrations, verify:
- No page imports `Switch` from `table.tsx` (if any, redirect to `switch.tsx`)
- All pages import `DataTable` from `../components/shared/DataTable`
- All pages import column types from `DataTable`
- `TooltipProvider` is wrapped at the app root (check `App.tsx` or `main.tsx`)

### 8B. Remove Dead Code

- Remove inline pagination implementations from each page (replaced by integrated `<Pagination>`)
- Remove unused `ChevronLeft`/`ChevronRight` imports from pages that no longer need them
- Remove the empty state notification popup code from ManageProducts (and any other page that has it)

### 8C. Testing Checklist

- [ ] All tables render with sticky headers
- [ ] All numeric columns are right-aligned with tabular-nums
- [ ] All text columns truncate long values with tooltip on hover
- [ ] Action buttons are hidden by default, revealed on row hover
- [ ] Pinned identity column stays visible during horizontal scroll
- [ ] Horizontal scrolling works on narrow viewports
- [ ] Pagination works correctly on all paginated tables
- [ ] Checkbox selection works on ManageProducts, ManageSuppliers, ManageCategories
- [ ] Row click works on ManageInventory
- [ ] Dark mode is consistent across all tables
- [ ] Keyboard navigation works (Tab through rows, Enter to activate)
- [ ] No numeric values are truncated
- [ ] 48px row height is consistent
- [ ] Empty states display correctly
- [ ] Loading states display correctly

---

## Execution Order

| Step | What | Files | Est. Lines Changed |
|------|------|-------|-------------------|
| 1 | Fix `table.tsx` (replace Switch with Table primitives) | `components/ui/table.tsx` | ~60 |
| 2 | Create `DataTable` component | `components/shared/DataTable.tsx` | ~250 |
| 3 | Create `DataTableActions` component | `components/shared/DataTableActions.tsx` | ~100 |
| 4 | Update `pagination.tsx` (add label prop) | `components/ui/pagination.tsx` | ~15 |
| 5 | Migrate ManageProducts | `admin/ManageProducts.tsx` | ~120 |
| 6 | Migrate ManageUsers | `admin/ManageUsers.tsx` | ~80 |
| 7 | Migrate ManageSuppliers | `admin/ManageSuppliers.tsx` | ~80 |
| 8 | Migrate ManageCategories | `admin/ManageCategories.tsx` | ~60 |
| 9 | Migrate PurchaseOrders | `admin/PurchaseOrders.tsx` | ~70 |
| 10 | Migrate AuditLogs | `admin/AuditLogs.tsx` | ~50 |
| 11 | Migrate GenerateReports (4 tables) | `admin/GenerateReports.tsx` | ~150 |
| 12 | Migrate ManageInventory | `inventory/ManageInventory.tsx` | ~80 |
| 13 | Migrate RecordWastage | `inventory/RecordWastage.tsx` | ~50 |
| 14 | Migrate Recommendations | `inventory/Recommendations.tsx` | ~70 |
| 15 | Migrate FEFOTracking (inventory) | `inventory/FEFOTracking.tsx` | ~70 |
| 16 | Migrate CashierHistory | `cashier/CashierHistory.tsx` | ~40 |
| 17 | Migrate ReturnsRefunds (2 tables) | `cashier/ReturnsRefunds.tsx` | ~80 |
| 18 | Migrate SupplierPerformance | `manager/SupplierPerformance.tsx` | ~60 |
| 19 | Migrate Replenishment | `manager/Replenishment.tsx` | ~60 |
| 20 | Migrate InventoryPerformance | `manager/InventoryPerformance.tsx` | ~50 |
| 21 | Migrate OverstockRisks | `manager/OverstockRisks.tsx` | ~50 |
| 22 | Migrate ExecutiveReports | `manager/ExecutiveReports.tsx` | ~50 |
| 23 | Migrate VendorCredits | `dashboard/VendorCredits.tsx` | ~50 |
| 24 | Migrate FefoTracking (dashboard) | `dashboard/FefoTracking.tsx` | ~50 |
| 25 | Final cleanup + testing | All files | — |
| **Total** | | | **~1,805** |

---

## Summary of Files

### New Files (2)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `Frontend/src/components/shared/DataTable.tsx` | Reusable standardized data table component | ~250 |
| `Frontend/src/components/shared/DataTableActions.tsx` | Action button + overflow menu components | ~100 |

### Modified Files (22)

| File | Changes | Est. Lines Changed |
|------|---------|-------------------|
| `Frontend/src/components/ui/table.tsx` | Replace Switch export with Table primitives | ~60 |
| `Frontend/src/components/ui/pagination.tsx` | Add `label` prop | ~15 |
| `Frontend/src/pages/admin/ManageProducts.tsx` | Replace inline table with DataTable | ~120 |
| `Frontend/src/pages/admin/ManageUsers.tsx` | Replace inline table with DataTable | ~80 |
| `Frontend/src/pages/admin/ManageSuppliers.tsx` | Replace inline table with DataTable | ~80 |
| `Frontend/src/pages/admin/ManageCategories.tsx` | Replace inline table with DataTable | ~60 |
| `Frontend/src/pages/admin/PurchaseOrders.tsx` | Replace inline table with DataTable | ~70 |
| `Frontend/src/pages/admin/AuditLogs.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/admin/GenerateReports.tsx` | Replace 4 inline tables with DataTable | ~150 |
| `Frontend/src/pages/inventory/ManageInventory.tsx` | Replace inline table with DataTable | ~80 |
| `Frontend/src/pages/inventory/RecordWastage.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/inventory/Recommendations.tsx` | Replace inline table with DataTable | ~70 |
| `Frontend/src/pages/inventory/FEFOTracking.tsx` | Replace inline table with DataTable | ~70 |
| `Frontend/src/pages/cashier/CashierHistory.tsx` | Replace inline table with DataTable | ~40 |
| `Frontend/src/pages/cashier/ReturnsRefunds.tsx` | Replace 2 inline tables with DataTable | ~80 |
| `Frontend/src/pages/manager/SupplierPerformance.tsx` | Replace inline table with DataTable | ~60 |
| `Frontend/src/pages/manager/Replenishment.tsx` | Replace inline table with DataTable | ~60 |
| `Frontend/src/pages/manager/InventoryPerformance.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/manager/OverstockRisks.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/manager/ExecutiveReports.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/dashboard/VendorCredits.tsx` | Replace inline table with DataTable | ~50 |
| `Frontend/src/pages/dashboard/FefoTracking.tsx` | Replace inline table with DataTable | ~50 |

---

## Design Consistency Rules

| Rule | Implementation |
|------|---------------|
| Row height | `py-3` on `text-xs` cells = ~48px |
| Divider | `border-b border-slate-100 dark:border-white/5` on each `TableRow` |
| Hover | `hover:bg-slate-50/50 dark:hover:bg-white/5` |
| Header bg | `bg-slate-50 dark:bg-slate-900` with `sticky top-0 z-20` |
| Pinned column | `sticky left-0 z-10 bg-white dark:bg-slate-950` with shadow separator |
| Numeric alignment | `text-right tabular-nums` |
| Text truncation | `truncate max-w-[200px]` with `Tooltip` on hover |
| Action reveal | `opacity-0 group-hover:opacity-100 transition-opacity` |
| Selection | `data-[state=selected]:bg-teal-50/30 dark:data-[state=selected]:bg-teal-900/10` |
| Pagination | Integrated `<Pagination>` component with `label` prop |
| Empty state | Centered message with optional icon + action |
| Loading | Spinner centered in table container |
