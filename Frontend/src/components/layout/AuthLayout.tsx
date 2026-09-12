import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../ui/ErrorBoundary';

/**
 * AuthLayout — used for authentication screens.
 * Shows a simple, clean branded header without public registration links.
 */
export function AuthLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-['Inter',sans-serif] transition-colors">
<main className="min-h-screen">
        <Outlet />
      </main>
      </div>
    </ErrorBoundary>
  );
}
