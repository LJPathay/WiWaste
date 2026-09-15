import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { SkipLink } from './SkipLink';

/**
 * AuthLayout — used for authentication screens.
 * Shows a simple, clean branded header without public registration links.
 */
export function AuthLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-['Inter',sans-serif] transition-colors">
        <SkipLink targets={[
          { id: 'main-content', label: 'Main Content' },
        ]} />
        <main className="min-h-screen" id="main-content">
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
}
