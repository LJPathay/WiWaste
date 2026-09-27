import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserRole } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  readonly allowedRoles: readonly UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user: session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
