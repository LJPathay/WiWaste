import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate API call — backend endpoint not yet created
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left brand panel */}
      <aside className="relative hidden lg:flex lg:w-1/2 overflow-hidden flex-col p-8 xl:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <img src="/images/logo.PNG" alt="WiWaste" className="h-12 w-12 rounded-xl object-cover" />
          <span className="text-2xl font-bold text-[#0b1c30] dark:text-white tracking-tight">WiWaste</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-[#0b1c30] dark:text-white leading-tight mb-4">
              Password Recovery
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/images/logo.PNG" alt="WiWaste" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-xl font-bold text-[#0b1c30] dark:text-white">WiWaste</span>
          </div>

          <h2 className="text-2xl font-bold text-[#0b1c30] dark:text-white mb-2">Reset your password</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            We'll email you instructions to reset your password.
          </p>

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">Check your email</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <Link to="/login" className="inline-block mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="email">
                  Email address
                </label>
                <input
                  className="block w-full px-4 py-3.5 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                className="w-full inline-flex items-center justify-center px-4 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading || !email}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Remember your password?{' '}
                <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
