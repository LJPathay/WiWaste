import { Navigate, Outlet } from 'react-router-dom';
import { getStoredSession, clearStoredSession } from '../../utils/mockAuthAndFeatures';

export function CashierLayout() {
  const session = getStoredSession();

  if (!session || session.role !== 'cashier') {
    clearStoredSession();
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Outlet />
    </div>
  );
}
