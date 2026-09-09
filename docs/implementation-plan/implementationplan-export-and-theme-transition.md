# Export Fix & Dark-Mode Transition Plan

Two isolated frontend issues to fix before continuing the main phase sequence.

---

## Issue 1 — CSV & PDF Export Not Working

### Root Cause Analysis

| Location | Problem |
|---|---|
| [`ManageInventory.tsx` L255–270](file:///d:/cap%20only/WiWaste/Frontend/src/pages/inventory/ManageInventory.tsx#L255-L270) | `handleExportCSV` builds a blob from `items`. If the page loaded with an API error or `items` is still `[]`, the exported file is blank. No guard exists. Also, values that contain commas (product names, supplier names) are **not quoted**, which corrupts the CSV. |
| [`GenerateReports.tsx` L139–149](file:///d:/cap%20only/WiWaste/Frontend/src/pages/admin/GenerateReports.tsx#L139-L149) | `handleDownload` is **completely fake** — it just waits 1 second and shows a success toast. No file is ever created or downloaded. |

The backend report routes **do exist and return real data** (JSON) at:
- `GET /api/reports/waste-summary`
- `GET /api/reports/inventory-movement`
- `GET /api/reports/supplier-performance`
- `GET /api/reports/expiry-analysis`
- `GET /api/reports/category-analysis`
- `GET /api/reports/cost-impact`

The fix is **pure frontend** — no backend changes needed.

---

### Proposed Fix

#### 1A — ManageInventory CSV Guard & Quoting

**File:** [`ManageInventory.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/pages/inventory/ManageInventory.tsx)

- Add a guard: if `filtered.length === 0`, show an `error()` toast ("No inventory data to export") and return early.
- Wrap each cell in a `csvQuote()` helper: `(v) => `"${String(v ?? '').replace(/"/g, '""')}"`` to prevent comma-in-value corruption.
- Export the **filtered** list (`filtered`) rather than the full `items` array so the user gets what they currently see on screen.

```diff
- const rows = items.map(item => [
-   item.itemName, item.sku, ...
- ]);
+ if (filtered.length === 0) { error('No inventory data to export.'); return; }
+ const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
+ const rows = filtered.map(item => [
+   q(item.itemName), q(item.sku), q(item.category), q(item.qty),
+   q(item.stockStatus), q(item.costPrice), q(item.sellingPrice),
+   q(item.supplier), q(item.lastUpdated),
+ ]);
```

---

#### 1B — GenerateReports: Real CSV Download (replacing fake handler)

Since no PDF library (`jsPDF`, `pdfmake`) is currently installed, the recommended approach is:

**Option A (Recommended) — CSV download per report type**

Replace the fake `handleDownload` with a real fetch → parse → blob → download flow:

```ts
const handleDownload = async (comp: Compilation) => {
  // 1. Call the matching report API endpoint
  // 2. Receive JSON from the backend
  // 3. Convert JSON array → CSV rows (with quoting)
  // 4. Trigger blob download as `report-name.csv`
};
```

Map each `comp.id` (report card ID) to its backend API endpoint, fetch the data, flatten nested fields into columns, and download as a `.csv` file. This makes the download button **actually produce a file** the user can open in Excel.

**Option B — PDF via `window.print()`**

For PDF output without any npm packages: open a new tab, render a minimal HTML table from the report data, and call `window.print()`. The user can save as PDF from the browser print dialog.

> [!IMPORTANT]
> **Option A (CSV) is recommended** — simpler, fully functional, consistent with the existing ManageInventory export UX. A proper PDF library (jsPDF / pdfmake) can be layered in a later sprint.

---

**Files to Change:**

#### [MODIFY] [`ManageInventory.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/pages/inventory/ManageInventory.tsx)
- Guard for empty/filtered data.
- CSV RFC-4180 quoting fix.
- Export `filtered` array instead of `items`.

#### [MODIFY] [`GenerateReports.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/pages/admin/GenerateReports.tsx)
- Replace fake `handleDownload` (setTimeout) with real API fetch + CSV blob download.
- Add `REPORT_ENDPOINT_MAP` constant mapping each card `id` → `/api/reports/*` path.
- Flatten each report's JSON response to CSV columns per report type.

---

## Issue 2 — Dark Mode Transitions Out of Sync

### Root Cause Analysis

The `dark` class is toggled on `<html>` by [`useTheme.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/hooks/useTheme.tsx). Tailwind's `dark:` variants apply instantly on class toggle, but elements without an explicit `transition-colors` class paint their new background color immediately with no animation, making different parts of the UI appear to update at different visual moments.

The specific symptom — sidebar and navbar appearing "late" — happens because:
1. The sidebar and main wrapper divs in [`DashboardLayout.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/components/layout/DashboardLayout.tsx) have no `transition-colors` class.
2. Some nested elements repaint after a micro-task tick rather than synchronously with the class change.

### Proposed Fix

#### 2A — Add `transition-colors duration-200` to Layout Root Elements

**File:** [`DashboardLayout.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/components/layout/DashboardLayout.tsx)

Add `transition-colors duration-200` to:
- The outermost wrapper `<div>` (shell wrapping sidebar + main content)
- The sidebar `<aside>` / `<nav>` container
- The top header bar `<div>`

```diff
- <div className="flex h-screen bg-white dark:bg-gray-900 ...">
+ <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200 ...">

- <aside className="... bg-white dark:bg-gray-800 ...">
+ <aside className="... bg-white dark:bg-gray-800 transition-colors duration-200 ...">
```

#### 2B — Guarantee Synchronous `dark` Class Toggle *(audit only)*

**File:** [`useTheme.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/hooks/useTheme.tsx)

Verify that `document.documentElement.classList.toggle('dark', isDark)` runs **synchronously** and is not deferred inside a delayed `useEffect`. If it already does, no code change is needed here.

---

**Files to Change:**

#### [MODIFY] [`DashboardLayout.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/components/layout/DashboardLayout.tsx)
- Add `transition-colors duration-200` to sidebar, header bar, and main wrapper divs.

#### [MODIFY] [`useTheme.tsx`](file:///d:/cap%20only/WiWaste/Frontend/src/hooks/useTheme.tsx) *(only if a delay is found during audit)*
- Move `document.documentElement.classList.toggle('dark', isDark)` out of any delayed effect.

---

## Execution Order

1. **Dark-mode transitions** (2A) — ~5 min, zero-risk visual change.
2. **ManageInventory CSV** (1A) — ~10 min, isolated to one function.
3. **GenerateReports download** (1B) — ~20 min, requires mapping report IDs → endpoints and flattening JSON → CSV per report type.

After these three are done, resume the main plan:
- **Phase 3.1** — Brand Color Token Migration (`[#0F766E]` → `brand` tokens)
- **Phase 3.2** — Backend RBAC (Laravel Policies)

---

## Verification Checklist

| Test | Expected Result |
|---|---|
| Toggle dark mode | Sidebar, header, and main area all animate simultaneously with no visual lag |
| Export CSV in ManageInventory with no visible items | Toast: "No inventory data to export" |
| Export CSV in ManageInventory with items | `inventory.csv` downloads, opens cleanly in Excel — no broken columns for names containing commas |
| Click "Download" on a generated report card | A real `.csv` file downloads with live backend data |
