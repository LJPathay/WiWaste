import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardData } from './useDashboardData';

vi.mock('../services/api', () => ({
  dashboard: {
    overview: vi.fn().mockRejectedValue(new Error('offline')),
  },
}));

describe('useDashboardData', () => {
  it('falls back to local dashboard data when the API is unreachable', async () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });

    expect(result.current.overview).toBeNull();
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.user.email).toBeDefined();
  });
});
