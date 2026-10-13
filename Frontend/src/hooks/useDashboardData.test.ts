import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useDashboardData } from './useDashboardData';

vi.mock('../services/api', () => ({
  dashboard: {
    overview: vi.fn().mockRejectedValue(new Error('offline')),
  },
  ownerDashboard: {
    overview: vi.fn().mockRejectedValue(new Error('offline')),
    analytics: vi.fn().mockRejectedValue(new Error('offline')),
  },
}));

/** `useDashboardData` reads from TanStack Query, which requires a provider. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDashboardData', () => {
  it('falls back to local dashboard data when the API is unreachable', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });

    expect(result.current.overview).toBeNull();
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.user.email).toBeDefined();
  });
});
