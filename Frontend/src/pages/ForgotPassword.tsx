import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { auth } from '../services/api';
import { Toast, useToast } from '../components/ui/Toast';

type Step = 'email' | 'otp' | 'reset';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;

export function ForgotPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toasts, dismiss, success } = useToast();

  const stepNumbers: Record<Step, number> = { email: 1, otp: 2, reset: 3 };

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(email);
      success('Reset code sent to your email');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.verifyOtp(email, otp);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(email);
      success('New code sent to your email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.resetPassword(email, otp, password, confirmPassword);
      success('Password reset successful. Redirecting to sign in...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-bg dark:bg-slate-950 px-4 py-10">
      <Toast toasts={toasts} onDismiss={dismiss} />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/images/logo.PNG" alt="WiWaste" className="h-11 w-11 rounded-xl object-cover" />
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">WiWaste</span>
        </div>

        <div className="bg-bg-elevated rounded-2xl border border-border dark:border-slate-800 p-8">
          {/* ── Step indicator ── */}
          <ol className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((n) => (
              <li className="flex items-center gap-2" key={n}>
                <div
                  aria-current={n === stepNumbers[step] ? 'step' : undefined}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    n < stepNumbers[step]
                      ? 'bg-emerald-500 text-white'
                      : n === stepNumbers[step]
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-muted-fg dark:text-muted-fg'
                  }`}
                >
                  {n < stepNumbers[step] ? <CheckCircle aria-hidden="true" className="h-5 w-5" /> : n}
                </div>
                {n < 3 && (
                  <div
                    aria-hidden="true"
                    className={`w-12 h-0.5 ${n < stepNumbers[step] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                )}
              </li>
            ))}
          </ol>

          {/* ── Step: email ── */}
          {step === 'email' && (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Enter your email</h1>
              <p className="mt-2 mb-6 text-sm text-muted-fg dark:text-muted-fg">
                We will send a 6-digit code to your registered email address.
              </p>
              <form className="space-y-5" onSubmit={handleForgotPassword}>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300"
                    htmlFor="email"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-fg"
                    />
                    <input
                      autoComplete="email"
                      autoFocus
                      className="block w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800/80 py-3.5 pl-10 pr-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={loading}
                      id="email"
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-brand-700 hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || !email}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset code'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step: OTP ── */}
          {step === 'otp' && (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Enter verification code</h1>
              <p className="mt-2 mb-6 text-sm text-muted-fg dark:text-muted-fg">
                We sent a 6-digit code to <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>.
              </p>
              <form className="space-y-5" onSubmit={handleVerifyOtp}>
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300">
                    Verification code
                  </span>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        aria-label={`Digit ${i + 1}`}
                        autoComplete="one-time-code"
                        className="h-12 w-10 rounded-lg border-2 border-border bg-white text-center font-mono text-2xl font-bold text-slate-900 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        data-index={i}
                        disabled={loading}
                        inputMode="numeric"
                        key={i}
                        maxLength={1}
                        onChange={(e) => {
                          const digit = e.target.value.replace(/\D/g, '');
                          setOtp((prev) => {
                            const next = prev.padEnd(6, ' ').split('');
                            next[i] = digit || ' ';
                            return next.join('').trim();
                          });
                          if (digit && i < 5) {
                            document.querySelector<HTMLInputElement>(`input[data-index="${i + 1}"]`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) {
                            e.preventDefault();
                            document.querySelector<HTMLInputElement>(`input[data-index="${i - 1}"]`)?.focus();
                          }
                        }}
                        type="text"
                        value={otp[i] ?? ''}
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-brand-700 hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || !/^\d{6}$/.test(otp)}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify code'
                  )}
                </button>
                <p className="text-center text-sm text-muted-fg dark:text-muted-fg">
                  Did not receive the code?{' '}
                  <button
                    className="font-medium text-brand-600 underline hover:text-brand-700 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
                    disabled={loading}
                    onClick={handleResendOtp}
                    type="button"
                  >
                    Resend code
                  </button>
                </p>
              </form>
            </>
          )}

          {/* ── Step: new password ── */}
          {step === 'reset' && (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create new password</h1>
              <p className="mt-2 mb-6 text-sm text-muted-fg dark:text-muted-fg">
                Your new password must be different from previous passwords.
              </p>
              <form className="space-y-5" onSubmit={handleReset}>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300"
                    htmlFor="password"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-fg"
                    />
                    <input
                      autoComplete="new-password"
                      className="block w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800/80 py-3.5 pl-10 pr-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={loading}
                      id="password"
                      name="password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      type="password"
                      value={password}
                    />
                  </div>
                  <p className="text-xs text-muted-fg dark:text-muted-fg">
                    Min 8 chars: uppercase, lowercase, number, special character
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300"
                    htmlFor="confirmPassword"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-fg"
                    />
                    <input
                      autoComplete="new-password"
                      className="block w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800/80 py-3.5 pl-10 pr-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={loading}
                      id="confirmPassword"
                      name="password_confirmation"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </div>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-brand-700 hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </form>
            </>
          )}

          {error && (
            <div
              className="mt-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-400"
              role="alert"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-fg dark:text-muted-fg">
            Remember your password?{' '}
            <Link className="font-medium text-brand-600 underline hover:text-brand-700 dark:text-brand-400" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}