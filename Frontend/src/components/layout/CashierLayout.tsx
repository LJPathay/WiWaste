import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function CashierLayout() {
  const { user: session, logout } = useAuth();

  if (!session || session.role !== 'cashier') {
    logout();
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Outlet />
    </div>
  );
}
