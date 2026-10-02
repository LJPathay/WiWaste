import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, RotateCcw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { auth } from '../../services/api';
import { Toast, useToast } from '../../components/ui/Toast';

export function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toasts, dismiss, success, error: showError } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(email);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
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
  };

  const handleResendOtp = async () => {
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
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/.test(password)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.resetPassword(email, otp, password);
      success('Password reset successful');
      setTimeout(() => window.location.href = '/login', 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndicator = (currentStep: number) => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(stepNum => (
        <React.Fragment key={stepNum}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            stepNum < currentStep
              ? 'bg-green-500 text-white'
              : stepNum === currentStep
              ? 'bg-[#006a61] text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {stepNum < currentStep ? <CheckCircle className="h-5 w-5" /> : stepNum}
          </div>
          {stepNum < 3 && (
            <div className={`w-12 h-0.5 ${stepNum < currentStep ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const steps = {
    email: {
      title: 'Enter your email',
      description: 'We\'ll send a 6-digit code to your registered email address.',
      render: () => (
        <form onSubmit={handleForgotPassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full inline-flex items-center justify-center px-4 py-3.5 bg-[#006a61] hover:bg-[#00574f] text-white font-medium text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006a61] dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Sending...
              </>
            ) : 'Send reset code'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-[#006a61] hover:text-[#00574f] underline">
              Sign in
            </Link>
          </p>
        </form>
      ),
    },
    otp: {
      title: 'Enter verification code',
      description: `We've sent a 6-digit code to <strong>{email}</strong>.`,
      render: () => (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Verification code
            </label>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  autoComplete="one-time-code"
                  disabled={loading}
                  value={otp[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 1) {
                      setOtp(prev => prev.slice(0, i) + val + prev.slice(i + 1));
                      if (val && i < 5) {
                        const nextInput = document.querySelector(`input[data-index="${i + 1}"]`);
                        (nextInput as HTMLInputElement)?.focus();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      const prevInput = document.querySelector(`input[data-index="${i - 1}"]`);
                      (prevInput as HTMLInputElement)?.focus();
                    }
                  }}
                  data-index={i}
                  className="w-10 h-12 text-center text-2xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-all"
                  inputMode="numeric"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full inline-flex items-center justify-center px-4 py-3.5 bg-[#006a61] hover:bg-[#00574f] text-white font-medium text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006a61] dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Verifying...
              </>
            ) : 'Verify code'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="font-medium text-[#006a61] hover:text-[#00574f] underline"
            >
              Resend code
            </button>
          </p>
        </form>
      ),
    },
    reset: {
      title: 'Create new password',
      description: 'Your new password must be different from previous passwords.',
      render: () => (
        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="password">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="new-password"
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="block w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Min 8 chars: uppercase, lowercase, number, special character
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                autoComplete="new-password"
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="block w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-4 py-3.5 bg-[#006a61] hover:bg-[#00574f] text-white font-medium text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006a61] dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Resetting...
              </>
            ) : 'Reset password'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="font-medium text-[#006a61] hover:text-[#00574f] underline">
              Back to sign in
            </Link>
          </p>
        </form>
      ),
    },
  };

  const currentStep = steps[step];
  const stepNumbers = { email: 1, otp: 2, reset: 3 };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      <Toast toasts={toasts} onDismiss={dismiss} />

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
              {step === 'email' && 'Enter your email to receive a 6-digit verification code.'}
              {step === 'otp' && 'Check your email for the 6-digit code.'}
              {step === 'reset' && 'Create a strong new password for your account.'}
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

          {getStepIndicator(stepNumbers[step])}

          <h2 className="text-2xl font-bold text-[#0b1c30] dark:text-white mb-2">{currentStep.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 dangerouslySetInnerHTML={{ __html: currentStep.description }} />

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentStep.render()}
        </div>
      </main>
    </div>
  );
}