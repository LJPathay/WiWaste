import { Outlet, Link, useLocation } from 'react-router';
import { ThemeToggle } from '../ThemeToggle';
import { getStoredSession } from '../../utils/mockAuthAndFeatures';

const BRAND_WORDMARK = '/images/Logo_full.PNG';

/**
 * AuthLayout — used only for /login and /register pages.
 * Shows a simple branded header above the auth form.
 */
export function AuthLayout() {
  const location = useLocation();
  const isAuthed = Boolean(getStoredSession());

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/dashboard' : '/'} className="flex items-center gap-3">
            <img src={BRAND_WORDMARK} alt="WiWaste" className="h-10 w-auto object-contain" />

          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-[#45464d] hover:text-[#006b5f] dark:text-slate-300 dark:hover:text-[#7ef0cf]"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors hover:text-[#006b5f] dark:hover:text-[#7ef0cf] ${
                    location.pathname === '/login'
                      ? 'text-[#006b5f] dark:text-[#7ef0cf]'
                      : 'text-[#45464d] dark:text-slate-300'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#131b2e] px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors shadow-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="theme-content px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
    </div>
  );
}
