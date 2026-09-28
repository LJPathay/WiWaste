import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';

export function DashboardRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'cashier' ? '/cashier/pos' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return <PageLoader />;
}