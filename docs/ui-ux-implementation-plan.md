# WiWaste UI/UX Implementation Plan

> Based on audit findings from frontend-design and ui-ux-pro-max skills (2026-10-06)

---

## 1. Overview

This plan translates the UI/UX audit into actionable phases. The goal: move WiWaste from a competent SaaS dashboard to a distinctive pharmacy/retail operations platform with strong accessibility, consistent design tokens, and domain-specific visual identity.

**Current state**: Engineering-excellent, design-anonymous. Works well but reads as "any admin template."

**Target state**: Unmistakably *pharmacy operations software*. Warm, scannable, dense where it matters, accessible everywhere.

---

## 2. Design Principles

1. **Pharmacy vernacular** — The UI should feel like a tool a pharmacist, cashier, or inventory manager would nod at. Warm neutrals, not sterile slate. Status as glanceable color, not badges.
2. **One gray family** — Kill slate. Use a single warm neutral family for backgrounds, borders, and text.
3. **Density with breathing room** — 4px base unit. Cards 16px padding. Sections 24px gap. No 32px+ gaps unless separating major views.
4. **Status as left border** — One CSS rule replaces three badge components. Scannable, color-blind safe, works at density.
5. **Motion with purpose** — One orchestrated entrance on page load. No scattered hover-lifts, no fade-up on every section.
6. **Two fonts, clear roles** — Rubik for display/numbers. Nunito Sans for body/data. JetBrains Mono only where monospace matters (SKUs, barcodes).

---

## 3. Phase 1: Token Migration (Foundation)

**Goal**: Establish semantic color, radius, and font tokens as the single source of truth.

### 3.1 Color System

Add to `frontend/src/styles/theme.css`:

```css
:root {
  /* Base - warm paper white */
  --bg: #FAFAF9;
  --bg-elevated: #FFFFFF;
  --fg: #1C1C1C;

  /* Brand - teal-green you own */
  --brand: #0F766E;
  --brand-soft: #E8F7F2;

  /* Semantic - prescription vernacular */
  --critical: #C02828;
  --warning: #B8731A;
  --ok: #2E7D32;
  --info: #0F766E;

  /* Warm neutrals - ONE gray family */
  --muted: #E8E6E3;
  --muted-fg: #6B6864;
  --border: #D9D6D2;
}

.dark {
  --bg: #1A1A19;
  --bg-elevated: #232321;
  --fg: #F5F5F3;
  --brand-soft: #064E3B;
  --muted: #2E2D2B;
  --muted-fg: #9A9894;
  --border: #3A3936;
}
```

### 3.2 Radius Scale

Add to `frontend/tailwind.config.js`:

```js
borderRadius: {
  'sm': '4px',
  'md': '8px',
  'lg': '12px',
  'xl': '16px',
  'full': '9999px',
}
```

Usage rules:
- Cards: `rounded-xl` (16px)
- Inputs: `rounded-lg` (12px)
- Buttons: `rounded-md` (8px)
- Badges: `rounded-full`

### 3.3 Font Pruning

Keep in `theme.css` @import:
```
Nunito Sans (400,500,600,700)
Rubik (400,500,600,700)
JetBrains Mono (700)
```

Remove from Tailwind config: Inter, Hanken Grotesk, Fira Code, and their variants. Map remaining usages:
- Body → `Nunito Sans`
- Display/headlines → `Rubik`
- Code/SKU/barcode → `JetBrains Mono`

### 3.4 Migration Steps

1. Add new tokens to `theme.css` (additive, no breaking changes)
2. Update `tailwind.config.js` to reference new tokens
3. Search-and-replace in components:
   - `text-slate-500` → `text-muted-fg`
   - `text-slate-400` → `text-muted-fg`
   - `text-gray-500` → `text-muted-fg`
   - `border-slate-200` → `border-border`
   - `border-gray-100` → `border-border`
   - `bg-slate-50` → `bg-bg`
   - `bg-gray-50` → `bg-bg`
   - `bg-white dark:bg-slate-900` → `bg-bg-elevated`
4. Test dark mode on every page

**Files touched**: `theme.css`, `tailwind.config.js`, all page/component files (~40+ files, mechanical replace).

**Effort**: 2-3 hours (search-replace + manual review)

---

## 4. Phase 2: Table Accessibility

**Goal**: Admin users managing 1000s of SKUs can sort/filter via keyboard.

### 4.1 DataTable Changes

In `frontend/src/components/shared/DataTable.tsx`:

1. Add `aria-sort` to sortable column headers:
```tsx
<TableHead
  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
>
```

2. Add keyboard handler on sortable headers:
```tsx
<th
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(col.key);
    }
  }}
>
```

3. Add live region for pagination announcements:
```tsx
<div aria-live="polite" className="sr-only">
  {`Showing ${startIndex + 1} to ${endIndex} of ${totalItems} ${label}`}
</div>
```

4. Add `scope="col"` to all `<th>` elements (explicit, not implied)

### 4.2 Test Criteria

- [ ] Tab to column header, press Enter → sorts
- [ ] Screen reader announces "sorted ascending by Product Name"
- [ ] Pagination change announces "Showing 1 to 10 of 50 products"
- [ ] All columns have `scope="col"`

**Effort**: 3-4 hours

---

## 5. Phase 3: Touch Target Audit

**Goal**: Every interactive element is minimum 44×44px.

### 5.1 Audit Targets

| Component | Location | Issue |
|-----------|----------|-------|
| Sidebar toggle | `DashboardLayout.tsx` line ~211 | `h-7 w-7` = 28px |
| Theme toggle (compact) | `ThemeToggle.tsx` line ~18 | `h-9 w-9` = 36px |
| Action buttons in tables | `DataTableActions` | Often 32px |
| Close buttons (modal/toast) | `Toast.tsx`, `Modal` | `h-4 w-4` = 16px |
| Icon-only nav items | Sidebar compact mode | `h-4 w-4` = 16px |

### 5.2 Fix Pattern

```css
/* Minimum touch target */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

Apply via className or update component base classes.

**Effort**: 1-2 hours

---

## 6. Phase 4: Chart Accessibility

**Goal**: Charts convey meaning to screen reader users.

### 6.1 Data Table Alt Text

For each chart (Dashboard Overview, Leakage Detection, etc.), add a visually-hidden data table:

```tsx
<div className="sr-only">
  <table>
    <caption>Sales trend: Last 30 days</caption>
    <thead>
      <tr><th scope="col">Date</th><th scope="col">Revenue</th></tr>
    </thead>
    <tbody>
      {salesTrendData.map(row => (
        <tr key={row.date}>
          <td>{row.date}</td>
          <td>{currencyFormatter.format(row.value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 6.2 Chart Summary aria-label

Add to chart containers:
```tsx
<div
  role="img"
  aria-label={`Sales trend for last ${salesPeriod} days. Total: ${currencyFormatter.format(totalSales)}. Peak: ${peakDate}.`}
>
  {/* chart */}
</div>
```

**Effort**: 2-3 hours per chart type (area, bar, pie)

---

## 7. Phase 5: Error Messaging Overhaul

**Goal**: Errors tell users what happened and how to fix it.

### 7.1 Before/After

| Before | After |
|--------|-------|
| "Failed to create product." | "Couldn't save product. Check required fields and try again." |
| "Connection error (2002)" | "Can't reach server. Check your connection and try again." |
| "An unexpected error occurred." | "Something broke on our side. Reload the page or contact support." |

### 7.2 Toast Component Update

In `frontend/src/components/ui/Toast.tsx`:

```tsx
<div
  role="alert"
  aria-live="assertive"
  className={`... ${
    toast.type === 'error'
      ? 'bg-critical/10 border-critical/30 text-critical-foreground'
      : 'bg-ok/10 border-ok/30 text-ok-foreground'
  }`}
>
  {toast.type === 'success' ? (
    <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden="true" />
  ) : (
    <XCircle className="h-5 w-5 text-critical" aria-hidden="true" />
  )}
  <div>
    <p className="font-medium">{toast.title}</p>
    <p className="text-sm opacity-80">{toast.message}</p>
  </div>
  <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
    <X className="h-4 w-4" aria-hidden="true" />
  </button>
</div>
```

**Effort**: 1-2 hours

---

## 8. Phase 6: Focus-Visible Sweep

**Goal**: Every keyboard-navigable element shows visible focus.

### 8.1 Global CSS (already exists, verify)

```css
:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
```

### 8.2 Component Checklist

- [ ] All `<button>` elements (not inside other interactive elements)
- [ ] All `<a>` elements
- [ ] All `<input>`, `<select>`, `<textarea>`
- [ ] Custom interactive components (tabs, dropdowns, toggles)
- [ ] Skip links
- [ ] Table headers (sortable)
- [ ] Sidebar nav items
- [ ] Toast dismiss buttons
- [ ] Modal close buttons

### 8.3 Test: Tab Through Every Page

For each page, tab from top to bottom and verify focus ring is visible on every stop.

**Effort**: 1 hour (mostly verification)

---

## 9. Phase 7: CLS Audit on Dashboard

**Goal**: Dashboard doesn't shift layout on load.

### 9.1 Chart Container Sizes

Ensure chart containers have fixed dimensions before data loads:

```tsx
{/* Before: no height, layout shifts */}
<div className="h-48">
  <ResponsiveContainer>...</ResponsiveContainer>
</div>

{/* After: explicit height, no shift */}
<div className="h-48 w-full" style={{ minHeight: '192px' }}>
  <ResponsiveContainer>...</ResponsiveContainer>
</div>
```

### 9.2 KPI Card Skeletons

Already using `animate-pulse` skeletons — verify they match final card dimensions exactly.

### 9.3 Image Dimensions

Ensure all `<img>` tags have explicit `width`/`height` or CSS `aspect-ratio`.

**Effort**: 30 min

---

## 10. Phase 8: Status as Left Border

**Goal**: Replace badge components with scannable left-border status.

### 10.1 Utility Class

```css
.status-bar {
  border-left-width: 4px;
  border-left-style: solid;
}
.status-bar--ok { border-left-color: var(--ok); }
.status-bar--warning { border-left-color: var(--warning); }
.status-bar--critical { border-left-color: var(--critical); }
.status-bar--info { border-left-color: var(--info); }
```

### 10.2 DataTable Integration

In `DataTable.tsx`:

```tsx
<TableRow
  className={cn(
    'status-bar',
    row.status === 'Discontinued' && 'status-bar--critical',
    row.stockStatus === 'low' && 'status-bar--warning',
    row.stockStatus === 'ok' && 'status-bar--ok',
  )}
>
```

### 10.3 Migration

Replace `<StatusBadge>` usage with left-border rows. Keep badge for:
- KPI trend indicators (up/down percentages)
- Filter tab counts
- Anywhere color needs to be the *only* indicator

**Effort**: 2-3 hours

---

## 11. Phase 9: Pharmacy Vernacular Icons (Optional Polish)

**Goal**: Replace generic Lucide icons with pharmacy-specific visual language.

### 11.1 Icon Mapping

| Current (Lucide) | Proposed Meaning | Where |
|------------------|------------------|-------|
| `LayoutDashboard` | Dashboard overview | Sidebar |
| `Building2` | Pharmacy/branch | Sidebar group |
| `Package` | Product/medication | Sidebar, KPI |
| `Truck` | Supplier delivery | Sidebar |
| `Receipt` | POS transaction | POS terminal |
| `AlertTriangle` | Expiry warning | All pages |
| `CheckCircle` | Stock confirmed | FEFO tracking |
| `XCircle` | Expired/critical | Wastage records |

**Note**: Lucide already covers most needs well. Only consider custom SVGs if the icon set feels generic after token migration. Lowest priority.

**Effort**: 4-6 hours (if pursued)

---

## 12. Implementation Order

| Phase | Scope | Effort | Dependency |
|-------|-------|--------|------------|
| 1. Token Migration | Foundation for everything | 2-3 hrs | None |
| 6. Focus-Visible Sweep | Quick win, no deps | 1 hr | None |
| 7. CLS Audit | Quick win, no deps | 30 min | None |
| 5. Error Messaging | User-facing improvement | 1-2 hrs | Phase 1 (new tokens) |
| 3. Touch Targets | Interaction quality | 1-2 hrs | Phase 1 |
| 4. Chart A11y | Screen reader support | 4-6 hrs | Phase 1 |
| 2. Table A11y | Keyboard efficiency | 3-4 hrs | Phase 1 |
| 8. Status Left Border | Visual identity | 2-3 hrs | Phase 1 |
| 9. Pharmacy Icons | Polish | 4-6 hrs | Phase 1 + 8 |

**Total estimated**: 18-27 hours (1-2 focused sprint days)

---

## 13. Test Criteria per Phase

### Phase 1 (Tokens)
- [ ] Every page renders correctly in light mode
- [ ] Every page renders correctly in dark mode
- [ ] No hardcoded `text-slate-*`, `text-gray-*`, `border-slate-*`, `bg-white` remains (except in print styles)
- [ ] Font families reduced to 3

### Phase 2 (Table A11y)
- [ ] Keyboard sort works on all sortable columns
- [ ] Screen reader announces sort state
- [ ] Pagination changes are announced
- [ ] `scope="col"` on all headers

### Phase 3 (Touch Targets)
- [ ] Every button ≥ 44×44px
- [ ] Every icon button has visible focus ring
- [ ] Tablet POS terminal usable with touch

### Phase 4 (Chart A11y)
- [ ] Every chart has data table alternative
- [ ] Chart has `role="img"` and descriptive `aria-label`
- [ ] Screen reader can understand trends

### Phase 5 (Error Messaging)
- [ ] All error messages actionable
- [ ] Toasts use `role="alert"` + `aria-live="assertive"`
- [ ] Error text uses `--critical` token (not raw red)

### Phase 6 (Focus-Visible)
- [ ] Tab-through shows visible focus on every element
- [ ] Skip links work on all layouts
- [ ] Modal focus trap works correctly

### Phase 7 (CLS)
- [ ] No layout shift when charts load
- [ ] KPI skeletons match final layout
- [ ] Images have reserved space

### Phase 8 (Status Border)
- [ ] Row status conveyed by color bar + text label
- [ ] Color-blind users can distinguish via label + position
- [ ] No three-badge pattern remains

---

## 14. Files Likely Affected

| File | Phase | Change |
|------|-------|--------|
| `src/styles/theme.css` | 1 | Add tokens, remove Slate references |
| `tailwind.config.js` | 1 | Add radius scale, prune fonts |
| `src/components/shared/DataTable.tsx` | 2, 8 | aria-sort, keyboard sort, left-border status |
| `src/components/ui/table.tsx` | 2 | scope="col", aria-live |
| `src/components/ui/Toast.tsx` | 5 | New colors, aria-live, titles |
| `src/components/ThemeToggle.tsx` | 3 | Increase to 44px |
| `src/components/layout/DashboardLayout.tsx` | 3 | Increase toggle sizes |
| `src/pages/dashboard/Overview.tsx` | 4, 7 | Chart alt tables, CLS fix |
| `src/pages/dashboard/*.tsx` | 4 | Chart alt tables |
| `src/pages/admin/*.tsx` | 2, 3 | Touch targets, sort announcements |
| `src/pages/cashier/POSTerminal.tsx` | 3, 4 | Touch targets, chart a11y |
| `src/components/ui/Modal.tsx` | 6 | Focus verification |
| `src/components/ui/ErrorBoundary.tsx` | 5 | Better error message |

---

## 15. Definition of Done

- [ ] All 8 phases merged to main
- [ ] Dark mode tested on every page (light/dark/high-contrast screenshots)
- [ ] Keyboard-only walkthrough of POS terminal and Manage Products complete with no confusion
- [ ] Screen reader spot-check on Dashboard Overview with NVDA/VoiceOver
- [ ] Touch target measurement on iPad POS terminal usable
- [ ] No raw `slate-*` or `gray-*` classes remain in JSX (replaced with semantic tokens)
- [ ] Font count in computed styles reduced from 15+ to 3
- [ ] Lighthouse accessibility score ≥ 95 on key pages

---

## 16. Notes

- **Backup**: Create `Frontend.backup` branch before Phase 1 token migration. All changes are mechanical; rollback is `git revert`.
- **Code review**: Phase 1 is search-replace; other phases need careful review.
- **New components**: Don't add new components for left-border status — extend `DataTable` and `TableRow` with a `status` prop.
- **Skill references**: This plan was generated using `frontend-design` and `ui-ux-pro-max` skill critiques. Both should be consulted during implementation if any ambiguous choice arises.
