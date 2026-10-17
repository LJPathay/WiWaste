import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ApiDashboard, ApiOwnerAnalytics } from '../../types/api';

// The page pulls four independent API resources. Only the two owner endpoints carry the
// data these charts draw, so the rest resolve empty.
const ownerAnalytics: ApiOwnerAnalytics = {
  sales_trend: [
    { date: '2026-10-15', value: 420 },
    { date: '2026-10-16', value: 545 },
    { date: '2026-10-17', value: 877 },
  ],
  wastage_trend: [
    { date: '2026-10-14', value: 325 },
    { date: '2026-10-16', value: 180 },
  ],
  leakage_by_category: [{ category: 'Food & Beverage', value: 505, quantity: 85, percentage: 100 }],
  inventory_health: { healthy: 14, low_stock: 1, overstock: 0, expiring_soon: 0, expired: 0 },
  top_wasted_products: [
    { product_id: 1, name: 'Gardenia Classic White Bread', loss: 325, quantity: 60 },
    { product_id: 2, name: 'Del Monte Pineapple Tidbits', loss: 180, quantity: 25 },
  ],
  payment_breakdown: [
    { payment_method: 'cash', revenue: 620 },
    { payment_method: 'e_wallet', revenue: 257 },
  ],
  forecast_confidence: 88.4,
};

const overview = {
  sales_this_month: 1842,
  sales_last_month: 1500,
  gross_profit_this_month: 640,
  gross_profit_last_month: 700,
  wastage_this_month: 505,
  inventory_value: 48210,
  active_skus: 15,
  total_users: 3,
  active_suppliers: 6,
} as ApiDashboard;

vi.mock('../../hooks/useDashboardData', () => ({
  useDashboardData: () => ({ data: { user: { name: 'Owner' } }, overview, ownerAnalytics, loading: false }),
}));

vi.mock('../../services/api', () => ({
  inventoryAnalytics: {
    dashboardSummary: vi.fn().mockResolvedValue({
      expiring_soon_count: 0,
      expiring_soon_items: [],
      low_stock_count: 1,
      low_stock_items: [],
    }),
    overstock: vi.fn().mockResolvedValue({ items: [], total_items: 0, total_exposure: 0 }),
  },
  forecast: { overview: vi.fn().mockResolvedValue({ total_products: 15, top_risks: [], avg_confidence: 88.4 }) },
  lossRisk: {
    items: vi.fn().mockResolvedValue({ items: [], generated_at: '2026-10-17T08:00:00Z' }),
    summary: vi.fn().mockResolvedValue({}) as never,
    predict: vi.fn(),
  },
}));

describe('DashboardOverview charts', () => {
  it('renders the loss breakdown, product ranking and payment methods for a narrow dataset', async () => {
    const { DashboardOverview } = await import('./Overview');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardOverview />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Category donut legend: one slice must still be labelled and summed instead of
    // rendering a broken arc with a clipped outside label.
    expect(await screen.findByText('Food & Beverage')).toBeInTheDocument();
    expect(screen.getByText('Only one category recorded wastage in this period, so it accounts for all of the loss.')).toBeInTheDocument();

    // Ranked product rows carry the exact amount and a share of the period total.
    expect(screen.getByText('Gardenia Classic White Bread')).toBeInTheDocument();
    expect(screen.getAllByText('₱325').length).toBeGreaterThan(0);

    // Payment slugs are humanised rather than printed raw.
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('E-Wallet')).toBeInTheDocument();
  });
});
