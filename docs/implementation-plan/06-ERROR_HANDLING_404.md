# Implementation Plan: Custom 404 Page & Error Handling

## Overview
Replace Vite's default error overlay with a user-friendly custom 404 page and improve error boundaries.

## Current State
- `ErrorBoundary.tsx` exists but only catches React render errors
- No catch-all route for 404 (React Router shows blank page or Vite error)
- Vite dev error overlay shows in production-like errors

## Tasks

### 5.1 Custom 404 Page Component

**File:** `Frontend/src/pages/NotFound.tsx` (NEW)

```tsx
import { Link } from 'react-router-dom';
import { Home, Search, RefreshCw, AlertCircle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">Page Not Found</h2>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved, 
          deleted, or the URL might be incorrect.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg font-semibold transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-semibold transition-colors"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </button>
        
        <details className="mt-8 text-left">
          <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-600">Technical Details</summary>
          <pre className="mt-2 p-3 text-xs bg-slate-100 dark:bg-slate-800 rounded overflow-auto">
            {`Path: ${window.location.pathname}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}`}
          </pre>
        </details>
      </div>
    </div>
  );
}
```

### 5.2 Catch-All Route in Router

**File:** `Frontend/src/routes.tsx` (MODIFY)

```tsx
import { NotFound } from './pages/NotFound';

// ... existing imports

export const router = createBrowserRouter([
  // ... existing routes
  
  // Catch-all 404 route (MUST BE LAST)
  {
    path: "*",
    Component: NotFound,
  },
]);
```

### 5.3 Enhanced ErrorBoundary

**File:** `Frontend/src/components/ui/ErrorBoundary.tsx` (UPDATE)

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, BugReport } from 'lucide-react';
import { Button } from './Button'; // Assuming Button component exists

interface Props { 
  children: ReactNode; 
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error('ErrorBoundary caught:', error, info);
    
    // Call optional callback for logging
    this.props.onError?.(error, info);
    
    // Could send to error tracking service (Sentry, etc.)
    // captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
              <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-slate-400 cursor-pointer flex items-center gap-1">
                  <BugReport className="h-3.5 w-3.5" />
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-3 text-[10px] bg-slate-100 dark:bg-slate-800 rounded overflow-auto text-left max-h-64">
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 5.4 Wrap Routes with ErrorBoundary

**File:** `Frontend/src/routes.tsx` (MODIFY)

```tsx
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Wrap each role section with ErrorBoundary
{
  element: (
    <ErrorBoundary
      onError={(error, info) => {
        // Log to monitoring service
        console.error('Route error:', error, info);
      }}
    >
      <DashboardLayout />
    </ErrorBoundary>
  ),
  children: [/* dashboard children */],
},
{
  element: (
    <ErrorBoundary>
      <CashierLayout />
    </ErrorBoundary>
  ),
  children: [/* cashier children */],
},
```

### 5.5 API Error Handling Improvement

**File:** `Frontend/src/services/api.ts` (UPDATE `request` function)

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!res.ok) {
      // Handle specific status codes
      if (res.status === 401) {
        clearAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
        throw new Error('Session expired. Please log in again.');
      }
      
      if (res.status === 403) {
        throw new Error('You do not have permission to access this resource.');
      }
      
      if (res.status === 404) {
        // Don't throw for 404 - let React Router handle via catch-all route
        // But for API calls, we still need to throw
        const err = await res.json().catch(() => ({ message: 'Not found' }));
        throw new Error(err.message ?? 'Resource not found');
      }
      
      if (res.status === 422) {
        const err = await res.json().catch(() => ({ message: 'Validation failed' }));
        throw new Error(err.message ?? 'Validation failed');
      }
      
      if (res.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      const err = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(err.message ?? `HTTP ${res.status}`);
    }
    
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw err;
  }
}

function clearAuth() {
  localStorage.removeItem('wiwaste_token');
  localStorage.removeItem('wiwaste_user');
  localStorage.removeItem('wiwaste-session');
}
```

### 5.6 Global Error Handler (Optional)

**File:** `Frontend/src/main.tsx` (ADD)

```tsx
// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  // Could send to error tracking
  // Sentry.captureException(event.reason);
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Sentry.captureException(event.error);
});
```

## Acceptance Criteria
- [ ] Navigating to `/invalid-route` shows custom 404 page (not Vite error)
- [ ] 404 page has working "Go to Dashboard" and "Search" links
- [ ] React render errors caught by ErrorBoundary show friendly UI
- [ ] ErrorBoundary has "Reload Page" and "Go to Dashboard" buttons
- [ ] API 401 redirects to login with `?expired=1` param
- [ ] API 403 shows permission error message
- [ ] API 500 shows generic "server error" message
- [ ] Network errors show "check your connection" message
- [ ] No Vite error overlay appears for caught errors

## Dependencies
- React Router v7 (already installed)
- Lucide icons (already installed)

## Estimated Effort
- NotFound page: 2 hours
- Router catch-all: 30 minutes
- ErrorBoundary enhancement: 2 hours
- API error handling: 2 hours
- Testing: 2 hours
**Total: ~6.5 hours**