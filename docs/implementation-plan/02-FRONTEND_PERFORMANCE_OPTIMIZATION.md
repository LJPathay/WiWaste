# Implementation Plan: Frontend Performance Optimization (Target: 300-700ms)

## Overview
Optimize frontend for 4K product catalog with focus on Cashier POS cold load performance. Target: < 700ms on 3G throttled.

## Current State
- POS loads 100 products on mount (will be 4K in production)
- No virtualization, no code splitting per role
- Vite config has only 2 vendor chunks
- Single bundle for all roles

## Tasks

### 2.1 POS Product Catalog - Virtualized Grid (CRITICAL)

**File:** `Frontend/src/pages/cashier/POSTerminal.tsx`
**New Hook:** `Frontend/src/hooks/useVirtualizedCatalog.ts`

```typescript
// useVirtualizedCatalog.ts
import { useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Product {
  product_id: string;
  product_name: string;
  barcode: string;
  selling_price: number;
  current_stock: number;
  category_id: string;
}

export function useVirtualizedCatalog(products: Product[], category: string, search: string) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  
  // Server-side search for barcode scanner
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 3) return products;
    const res = await fetch(`/api/v1/products/lookup/${encodeURIComponent(query)}`);
    return res.ok ? [await res.json()] : [];
  }, [products]);

  // Virtualized grid - only render visible items
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // item height
    overscan: 5,
  });

  return { virtualizer, parentRef, filteredProducts, searchProducts };
}
```

**POS Grid Component:**
```tsx
// In POSTerminal.tsx - replace product grid
<div ref={parentRef} className="h-[60vh] overflow-auto">
  <div style={{ height: virtualizer.getTotalSize() }}>
    {virtualizer.getVirtualItems().map((virtualRow) => (
      <ProductTile
        key={filteredProducts[virtualRow.index].product_id}
        product={filteredProducts[virtualRow.index]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
      />
    ))}
  </div>
</div>
```

### 2.2 Infinite Scroll / Search-Only Catalog Loading

**Decision:** Don't load 4K products on POS mount. Only load on:
- Barcode scan (exact match via `/products/lookup/{code}`)
- Name search (debounced 300ms, `/products?search=`)

**Implementation:**
```typescript
// In POSTerminal.tsx - remove useEffect that loads all products
// Replace with:
const handleBarcodeScan = async (code: string) => {
  const product = await productsApi.lookup(code);
  addProduct(apiProductToCashier(product));
};

const handleSearch = debounce(async (query: string) => {
  if (query.length >= 3) {
    const res = await productsApi.list({ search: query, per_page: 50 });
    setFilteredProducts(res.data.map(apiProductToCashier));
  }
}, 300);
```

### 2.3 Route-Level Code Splitting

**File:** `Frontend/src/routes.tsx`

```typescript
// Lazy load per role group
const OwnerRoutes = lazy(() => import('./routes/owner'));
const InventoryRoutes = lazy(() => import('./routes/inventory'));
const CashierRoutes = lazy(() => import('./routes/cashier'));
const PublicRoutes = lazy(() => import('./routes/public'));

// In router:
{
  element: <ProtectedRoute allowedRoles={['owner']} />,
  children: [
    { path: 'owner/*', element: <OwnerRoutes /> },
  ],
},
{
  element: <ProtectedRoute allowedRoles={['cashier']} />,
  children: [
    { path: 'cashier/*', element: <CashierRoutes /> },
  ],
},
```

**New route files:**
```
Frontend/src/routes/
├── owner.tsx        # All /owner/*, /admin/*, /reports/*, /dashboard/*
├── inventory.tsx    # All /inventory/*, /dashboard/inventory, /dashboard/fefo
├── cashier.tsx      # All /cashier/*
└── public.tsx       # /, /login, /forgot-password, /privacy, /terms
```

### 2.4 Vite Bundle Optimization

**File:** `Frontend/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({...})],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select', '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip', '@radix-ui/react-popover',
            'lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'
          ],
          'vendor-charts': ['recharts'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['date-fns', 'zustand'],
          'vendor-table': ['@tanstack/react-virtual', '@tanstack/react-table'],
        },
      },
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
});
```

### 2.5 Service Worker Caching (PWA)

**File:** `Frontend/vite.config.ts` - already has `VitePWA`

Add runtime caching for API responses:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {...},
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/localhost:8000\/api\/v1\/products/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'product-catalog',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24hr
        },
      },
      {
        urlPattern: /^https:\/\/localhost:8000\/api\/v1\/dashboard/,
        handler: 'NetworkFirst',
        options: { cacheName: 'dashboard-data', networkTimeoutSeconds: 5 },
      },
    ],
  },
})
```

### 2.6 Preload Critical Chunks on Login

**File:** `Frontend/src/pages/Login.tsx` - after successful login

```typescript
const preloadCriticalChunks = (role: UserRole) => {
  const chunks = {
    owner: ['vendor-react', 'vendor-ui', 'api-owner', 'vendor-charts'],
    inventory: ['vendor-react', 'vendor-ui', 'api-inventory', 'vendor-table'],
    cashier: ['vendor-react', 'vendor-ui', 'api-cashier', 'vendor-table'],
  };
  
  chunks[role]?.forEach(chunk => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = `/assets/${chunk}-[hash].js`; // Vite outputs to assets/
    document.head.appendChild(link);
  });
};
```

### 2.7 POS-Specific Optimizations

| Optimization | Implementation |
|--------------|----------------|
| Barcode scanner input | Keep focused, prevent virtual keyboard on mobile |
| Product tile memoization | `React.memo(ProductTile)` with stable keys |
| Cart calculations | `useMemo` for totals, only recalc on cart change |
| Receipt print | Defer until after transaction confirmed |

## Acceptance Criteria
- [ ] Cashier POS cold load < 700ms (3G throttled, Lighthouse)
- [ ] Initial JS bundle < 150KB gzipped for Cashier role
- [ ] 4K products handled via virtualization (60fps scrolling)
- [ ] Barcode scan → product add < 100ms
- [ ] Search debounced, server-side, results in < 300ms
- [ ] Role-based chunks loaded only when needed

## Dependencies
- `@tanstack/react-virtual` (add to package.json)
- Role-based API service split (Plan 01)

## Estimated Effort
- Virtualized catalog: 8 hours
- Route splitting: 4 hours
- Vite config + PWA: 3 hours
- POS optimizations: 4 hours
- Testing & Lighthouse CI: 4 hours
**Total: ~23 hours**