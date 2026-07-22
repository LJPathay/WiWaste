import { Outlet, Link } from 'react-router';
import { ThemeToggle } from '../ThemeToggle';
import { getStoredSession } from '../../utils/mockAuthAndFeatures';

const BRAND_WORDMARK = '/images/Logo_full.PNG';

/**
 * AuthLayout — used for authentication screens.
 * Shows a simple, clean branded header without public registration links.
 */
export function AuthLayout() {
  const isAuthed = Boolean(getStoredSession());

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/dashboard' : '/'} className="flex items-center gap-3">
            <img src={BRAND_WORDMARK} alt="WiWaste" className="h-10 w-auto object-contain" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Ipharma Mart POS & Inventory
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthed && (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-[#006a61] hover:underline dark:text-[#7ef0cf]"
              >
                Go to Dashboard →
              </Link>
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
