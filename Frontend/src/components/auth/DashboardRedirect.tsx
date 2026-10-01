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
        const target = user.role === 'cashier' 
          ? '/cashier/pos' 
          : user.role === 'owner' 
            ? '/owner/users' 
            : '/inventory/manage';
        navigate(target, { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return <PageLoader />;
}