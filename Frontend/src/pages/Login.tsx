import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { setStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError(null);

    const companyMap: Record<UserRole, string> = {
      owner: 'WiWaste Owner Administration',
      inventory: 'WiWaste Inventory Floor',
      cashier: 'Ipharma Mart POS',
    };

    try {
      const result = await auth.login(username, password);
      localStorage.setItem('wiwaste_token', result.token);
      localStorage.setItem('wiwaste_user', JSON.stringify(result.user));

      const uiRole: UserRole = result.user.role === 'Admin' ? 'owner' : (result.user.role === 'Inventory' ? 'inventory' : 'cashier');

      setStoredSession({
        id: String(result.user.id ?? result.user.email ?? username),
        email: result.user.email || `${username}@ipharmamart.com`,
        name: result.user.name,
        company: companyMap[uiRole],
        role: uiRole,
      });

      navigate(uiRole === 'cashier' ? '/cashier/pos' : '/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .dark .bg-grid-pattern {
          background-image: radial-gradient(rgba(16, 185, 129, 0.12) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .shadow-card {
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 0 1px 1px rgba(0, 0, 0, 0.04);
        }
        .shadow-card-hover {
          box-shadow: 0 25px 50px -12px rgba(0, 135, 90, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.06);
        }
      `}</style>

      {/* ==================== LEFT COLUMN: VISUAL BRAND SHOWCASE ==================== */}
      <aside className="relative hidden lg:flex lg:w-[50%] xl:w-[52%] overflow-hidden flex-col justify-between p-8 xl:p-12 selection:bg-emerald-400 selection:text-slate-900 bg-slate-50 dark:bg-slate-900" data-purpose="brand-showcase">
        {/* Background Image with Clean High-end Treatment */}
        <img
          alt="Modern smart pharmacy inventory and warehouse management technology"
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 filter brightness-[0.98] contrast-[1.02]"
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80"
        />
        {/* Atmospheric Light Mint & Translucent Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/85 to-brand-50/80 backdrop-blur-[2px] dark:from-slate-900/95 dark:via-slate-900/85 dark:to-brand-900/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40 dark:from-slate-900/90 dark:via-transparent dark:to-slate-900/40"></div>
        {/* Top Overlay: Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm dark:bg-slate-800/90 dark:border-emerald-900">
            {/* WiWaste Official Logo */}
            <img
              src="/images/Logo_full.PNG"
              alt="WiWaste"
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>
        {/* Middle/Bottom Content: Tagline, Badges & Micro Metrics */}
        <div className="relative z-10 my-auto pt-16 pb-8 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100/70 text-brand-700 border border-brand-200 shadow-sm backdrop-blur-md dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
            <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
            </svg>
            <span>Intelligent Pharmacy Operations</span>
          </div>
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Next-Gen Pharmacy POS & Inventory Intelligence
          </h1>
          <p className="text-sm xl:text-base text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-normal">
            Empowering dispensary workflows with precision expiry tracking, zero-waste algorithms, and point-of-sale synchronicity across your pharmacy branches.
          </p>
          {/* High-end Crisp Badges */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm hover:bg-white transition dark:bg-slate-800/90 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>Real-time Stock Tracking</span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm hover:bg-white transition dark:bg-slate-800/90 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>Batch & Expiry Alerts</span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm hover:bg-white transition dark:bg-slate-800/90 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>Automated POS Reconciliation</span>
            </div>
          </div>
          {/* Left Bottom Footnote */}
          <div className="relative z-10 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Protected by HIPAA & Good Distribution Practice standards</span>
            <span className="font-medium text-slate-600 dark:text-slate-400">© WiWaste Systems</span>
          </div>
        </div>
      </aside>

      {/* ==================== RIGHT COLUMN: AUTHENTICATION PORTAL ==================== */}
      <main className="flex-1 flex flex-col justify-between bg-slate-50/70 dark:bg-slate-950 bg-grid-pattern relative min-h-screen">
        {/* Center Wrapper for Login Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-8">
          {/* Authentication Card */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-800 overflow-hidden max-w-lg" data-purpose="login-card">
            <div className="p-8 sm:p-12 space-y-6">
              {/* Login Form Fields */}
              <form action="#" className="space-y-6" data-purpose="login-form" method="POST" onSubmit={(e) => {
                e.preventDefault();
                handleLogin(e as React.FormEvent);
              }}>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" role="alert">
                    {error}
                  </div>
                )}
                {/* Username Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="username">
                    Username
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <input
                      className="block w-full pl-10 pr-3.5 py-3.5 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      id="username"
                      name="username"
                      placeholder="Enter username"
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="password">
                      Password
                    </label>
                    <a className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline transition" href="#forgot">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <input
                      className="block w-full pl-10 pr-10 py-3.5 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    {/* Toggle Password Visibility */}
                    <button
                      aria-label="Toggle password view"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      id="toggle-password-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg className="w-4 h-4" fill="none" id="eye-icon" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </>
                        ) : (
                          <>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Primary Submit CTA */}
                <div className="pt-2">
                  <button
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading}
                  >
                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
            {/* Card Inner Footer Note */}
            <div className="px-8 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access is provisioned by your Store Owner/Administrator.
              </p>
            </div>
          </div>
        </div>
        {/* Right Column Discreet Footer */}
        <footer className="w-full px-6 py-3 text-center text-xs text-slate-400 dark:text-slate-600">
          WiWaste Pharmacy OS • Secure Gateway
        </footer>
      </main>
    </div>
  );
}