import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, auth, normalizeUser, users } from './api';

const originalFetch = globalThis.fetch;
function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  globalThis.fetch = fetchMock;
  return fetchMock;
}
afterEach(() => { globalThis.fetch = originalFetch; localStorage.clear(); });

describe('user and authentication API contracts', () => {
  it('unwraps created account JSON and safely normalizes optional fields', async () => {
    respond({ message: 'User created.', id: 10, user: { id: 10, Full_name: 'Jane Marie Doe', username: 'janedoe', email: 'jane@example.com', role: 'Inventory', status: 'Active' } });
    const created = await users.create({ First_name: 'Jane', Middle_name: 'Marie', Surname: 'Doe', username: 'janedoe', email: 'jane@example.com', contact_number: '09123456789', password: 'Strong1!', role: 'Inventory', status: 'Active' });
    expect(created).toMatchObject({ id: 10, name: 'Jane Marie Doe', First_name: 'Jane', Middle_name: 'Marie', Surname: 'Doe', username: 'janedoe', email: 'jane@example.com' });
    const legacy = normalizeUser({ id: 3, Full_name: 'Legacy Account', role: 'Business Owner', status: 'Inactive' });
    expect(legacy).toMatchObject({ name: 'Legacy Account', role: 'Cashier', username: '', email: '', contact_number: '' });
    expect(legacy.email.toLowerCase()).toBe('');
  });

  it('normalizes arrays and preserves archived status when fetching users', async () => {
    respond([{ id: 4, Full_name: 'Archived Person', status: 'Archived', role: 'Cashier' }]);
    expect(await users.list()).toEqual([expect.objectContaining({ id: 4, name: 'Archived Person', status: 'Archived', username: '', email: '' })]);
  });

  it('sends an explicit confirmation when archiving without deleting the account', async () => {
    const fetchMock = respond({ message: 'Archived.', user: { id: 4, name: 'Person', status: 'Archived', role: 'Cashier' } });
    await users.archive(4);
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body as string)).toEqual({ status: 'Archived', status_change_confirmed: true });
  });

  it('exposes lockout metadata to the login countdown', async () => {
    respond({ message: 'Account locked.', retry_after: 300, locked_until: '2026-10-14T04:05:00Z' }, 423);
    await expect(auth.login('owner', 'WrongPassword!')).rejects.toMatchObject({ status: 423, retryAfter: 300, lockedUntil: '2026-10-14T04:05:00Z' });
  });

  it('retains the current session on invalid public login credentials', async () => {
    localStorage.setItem('wiwaste_token', 'existing-token');
    respond({ message: 'Invalid credentials.' }, 401);
    await expect(auth.login('owner', 'WrongPassword!')).rejects.toThrow('Invalid credentials.');
    expect(localStorage.getItem('wiwaste_token')).toBe('existing-token');
  });

  it('returns the useful OTP validation error', async () => {
    respond({ message: 'Validation failed.', errors: { otp: ['The reset code is invalid or expired.'] } }, 422);
    await expect(auth.resetPassword({ email: 'owner@example.com', otp: '123456', password: 'Strong1!', password_confirmation: 'Strong1!' })).rejects.toThrow('The reset code is invalid or expired.');
    const error = new ApiError(429, { message: 'Please wait.', retry_after: 60 });
    expect(error.retryAfter).toBe(60);
  });
});
