import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';

export function DashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    // Redirect to role-specific dashboard
    const roleRoutes: Record<UserRole, string> = {
      owner: '/dashboard',
      inventory: '/dashboard/inventory',
      cashier: '/cashier/pos',
    };

    navigate(roleRoutes[session.role], { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006a61] mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    </div>
  );
}
