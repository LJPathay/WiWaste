import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserRole } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';

interface ProtectedRouteProps {
  readonly allowedRoles: readonly UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user: session, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
