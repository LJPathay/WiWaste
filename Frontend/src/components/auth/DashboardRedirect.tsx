import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';

export function DashboardRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // Only redirect from the exact /dashboard path, not from sub-routes
      if (location.pathname === '/dashboard') {
        let target = '/inventory/manage';
        if (user.role === 'cashier') {
          target = '/cashier/pos';
        } else if (user.role === 'owner') {
          target = '/owner/users';
        }
        navigate(target, { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return <PageLoader />;
}