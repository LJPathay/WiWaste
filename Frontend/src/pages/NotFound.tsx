import { Link } from 'react-router-dom';
import { Home, Search, RefreshCw, AlertCircle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-slate-950 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">Page Not Found</h2>
        
        <p className="text-muted-fg dark:text-muted-fg mb-8">
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-bg dark:hover:bg-slate-800 rounded-lg font-semibold transition-colors"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center gap-2 text-muted-fg dark:text-muted-fg hover:text-slate-700 dark:hover:text-slate-200 font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </button>
        
        <details className="mt-8 text-left">
          <summary className="text-sm text-muted-fg cursor-pointer hover:text-muted-fg">Technical Details</summary>
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