import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth, type AuthUser, type UserRole } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

function makeUser(role: UserRole): AuthUser {
  return { id: 1, email: `${role}@wiwaste.test`, name: role, role, apiRole: role };
}

function mockSession(user: AuthUser | null, loading = false) {
  mockUseAuth.mockReturnValue({
    user,
    loading,
    login: vi.fn(),
    logout: vi.fn(),
    refetch: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

const SECRET = () => <div data-testid="secret">Secret</div>;

/**
 * `/secure/*` are guarded; the role landing pages are plain placeholders so a
 * redirect out of a guard is observable without re-entering another guard.
 */
function renderAt(path: string, allowedRoles: readonly UserRole[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/secure/owner-area" element={<SECRET />} />
          <Route path="/secure/cashier-area" element={<SECRET />} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/owner/users" element={<div>Owner users</div>} />
        <Route path="/inventory/manage" element={<div>Inventory manage</div>} />
        <Route path="/cashier/pos" element={<div>Cashier pos</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const OWNER_ROLES = ['owner', 'inventory'] as const;
const CASHIER_ROLES = ['cashier'] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('renders a loader while the session is still being verified', () => {
    mockSession(null, true);
    renderAt('/secure/owner-area', OWNER_ROLES);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no session', () => {
    mockSession(null, false);
    renderAt('/secure/owner-area', OWNER_ROLES);

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('allows an owner into owner/inventory routes', () => {
    mockSession(makeUser('owner'));
    renderAt('/secure/owner-area', OWNER_ROLES);

    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('allows inventory into owner/inventory routes', () => {
    mockSession(makeUser('inventory'));
    renderAt('/secure/owner-area', OWNER_ROLES);

    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('sends a cashier blocked from owner/inventory routes to the POS', () => {
    mockSession(makeUser('cashier'));
    renderAt('/secure/owner-area', OWNER_ROLES);

    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
    expect(screen.getByText('Cashier pos')).toBeInTheDocument();
  });

  it('sends inventory blocked from cashier-only routes to /inventory/manage', () => {
    mockSession(makeUser('inventory'));
    renderAt('/secure/cashier-area', CASHIER_ROLES);

    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
    expect(screen.getByText('Inventory manage')).toBeInTheDocument();
  });

  it('sends an owner blocked from cashier-only routes to /owner/users', () => {
    mockSession(makeUser('owner'));
    renderAt('/secure/cashier-area', CASHIER_ROLES);

    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
    expect(screen.getByText('Owner users')).toBeInTheDocument();
  });

  it('allows a cashier into cashier-only routes', () => {
    mockSession(makeUser('cashier'));
    renderAt('/secure/cashier-area', CASHIER_ROLES);

    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });
});