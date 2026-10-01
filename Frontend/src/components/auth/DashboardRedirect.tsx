import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';

export function DashboardRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const target = user.role === 'cashier' 
        ? '/cashier/pos' 
        : user.role === 'owner' 
          ? '/owner/users' 
          : '/inventory/manage';
      navigate(target, { replace: true });
    }
  }, [user, loading, navigate]);

  return <PageLoader />;
}