import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoader } from '../ui/PageLoader';
import { SkipLink } from './SkipLink';

export function CashierLayout() {
  const { user: session, logout, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!session || session.role !== 'cashier') {
    logout();
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Matches the other layouts: a skip link and a `main` landmark carrying the
          `#main-content` id that the rest of the app (and the e2e suite) relies on. */}
      <SkipLink targets={[{ id: 'main-content', label: 'Main Content' }]} />
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}