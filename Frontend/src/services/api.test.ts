import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboard } from './api';

function mockFetch(overrides: { ok: boolean; status?: number; body?: unknown }): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: overrides.ok,
    status: overrides.status ?? 200,
    json: async () => overrides.body ?? {},
  } as Response);
  // `global` is a Node-only global and is not declared under this project's `types`
  // (`vite/client` only). `globalThis` is the standard equivalent and is available here.
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('api request()', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    // `global` is a Node-only global and is not declared under this project's `types`
  // (`vite/client` only). `globalThis` is the standard equivalent and is available here.
  globalThis.fetch = originalFetch;
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

  it('calls the requested resource relative to the API base', async () => {
    const fetchMock = mockFetch({ ok: true });

    await dashboard.overview();

    // Relative by default: the dev server proxies /api to Laravel, so requests stay
    // same-origin instead of becoming a cross-origin batch the browser can reject.
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/dashboard/overview');
  });

  it('sends credentials so the HttpOnly refresh cookie travels with the request', async () => {
    const fetchMock = mockFetch({ ok: true });

    await dashboard.overview();

    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('names the endpoint and the cause when the request never reaches the API', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(dashboard.overview()).rejects.toThrow(
      'Cannot reach the API at /api/v1/dashboard/overview (Failed to fetch).'
    );
  });
});
