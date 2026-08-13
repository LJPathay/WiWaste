import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboard } from './api';

function mockFetch(overrides: { ok: boolean; status?: number; body?: unknown }): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: overrides.ok,
    status: overrides.status ?? 200,
    json: async () => overrides.body ?? {},
  } as Response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('api request()', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('attaches the stored token as a Bearer Authorization header', async () => {
    localStorage.setItem('wiwaste_token', 'test-token');
    const fetchMock = mockFetch({ ok: true, body: { active_skus: 3 } });

    await dashboard.overview();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('omits the Authorization header when no token is stored', async () => {
    const fetchMock = mockFetch({ ok: true, body: { active_skus: 3 } });

    await dashboard.overview();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('throws an Error with the server message on non-OK responses', async () => {
    mockFetch({ ok: false, status: 422, body: { message: 'Validation failed' } });

    await expect(dashboard.overview()).rejects.toThrow('Validation failed');
  });

  it('throws a generic error when the server sends no message', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(dashboard.overview()).rejects.toThrow('HTTP 500');
  });

  it('calls the correct endpoint for the requested resource', async () => {
    const fetchMock = mockFetch({ ok: true });

    await dashboard.overview();

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/dashboard/overview');
  });
});
