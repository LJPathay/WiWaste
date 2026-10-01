import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserRole } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';

interface ProtectedRouteProps {
  readonly allowedRoles: readonly UserRole[];
}

function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'cashier': return '/cashier/pos';
    case 'owner': return '/owner/users';
    case 'inventory': return '/inventory/manage';
    default: return '/dashboard';
  }
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user: session, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    // Redirect to role-appropriate default instead of /dashboard to avoid loops
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  return <Outlet />;
}
