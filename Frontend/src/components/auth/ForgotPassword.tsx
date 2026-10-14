import React, { useEffect, useState } from 'react';
import { auth } from '../../services/api';
import { getPasswordRules, isPasswordValid } from '../../utils/passwordPolicy';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { inputCls } from '../ui/Toast';

export function ForgotPassword({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'email' | 'reset' | 'complete'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendAfter, setResendAfter] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendAfter) { setSecondsLeft(0); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((resendAfter - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [resendAfter]);

  function resetDialog() {
    setStep('email');
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmation('');
    setError('');
    setMessage('');
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await auth.forgotPassword(email.trim());
      setEmail(email.trim());
      setMessage(result.message);
      setStep('reset');
      setResendAfter(Date.now() + 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send a reset code.');
      const retryAfter = Number((err as { retryAfter?: number })?.retryAfter);
      if (retryAfter > 0) setResendAfter(Date.now() + retryAfter * 1000);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!/^\d{6}$/.test(otp)) { setError('Enter the six digit code from your email.'); return; }
    if (!isPasswordValid(password)) { setError('Your password must meet all policy requirements.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await auth.resetPassword({ email, otp, password, password_confirmation: confirmation });
      setMessage(result.message);
      setPassword('');
      setConfirmation('');
      setOtp('');
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!loading) { setOpen(next); if (next) resetDialog(); } }}>
      <DialogTrigger asChild><button type="button" disabled={disabled} className="rounded-md px-2 text-xs font-medium text-brand hover:underline disabled:opacity-50">Forgot password?</button></DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader className="text-left">
          <DialogTitle>{step === 'complete' ? 'Password reset complete' : 'Reset your password'}</DialogTitle>
          <DialogDescription>{step === 'email' ? 'Enter the email address registered to your account. We will send a reset code.' : step === 'reset' ? `Enter the code sent to ${email}. Codes expire after 10 minutes and can be used once.` : 'You can now sign in with your new password.'}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
        {step === 'email' && <form onSubmit={sendCode} className="space-y-4">
          <div><label htmlFor="reset-email" className="mb-1 block text-sm font-semibold">Email Address</label><input id="reset-email" type="email" required autoComplete="email" className={inputCls} value={email} disabled={loading} onChange={event => setEmail(event.target.value)} /></div>
          <button type="submit" disabled={loading || secondsLeft > 0} className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Sending...' : secondsLeft ? `Try again in ${secondsLeft}s` : 'Send Reset Code'}</button>
        </form>}
        {step === 'reset' && <form onSubmit={resetPassword} className="space-y-4">
          <div><label htmlFor="reset-otp" className="mb-1 block text-sm font-semibold">Reset Code</label><input id="reset-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className={inputCls} value={otp} disabled={loading} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
          <div><label htmlFor="reset-new-password" className="mb-1 block text-sm font-semibold">New Password</label><input id="reset-new-password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={password} disabled={loading} onChange={event => setPassword(event.target.value)} /></div>
          <ul className="space-y-1 text-xs" aria-label="Password policy">{getPasswordRules(password).map(rule => <li key={rule.id} className={rule.met ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}>{rule.met ? '✓ ' : '○ '}{rule.label}</li>)}</ul>
          <div><label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-semibold">Confirm New Password</label><input id="reset-confirm-password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={confirmation} disabled={loading} onChange={event => setConfirmation(event.target.value)} /></div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Resetting...' : 'Reset Password'}</button>
          <div className="flex flex-wrap justify-between gap-2 text-xs"><button type="button" disabled={loading || secondsLeft > 0} onClick={() => void sendCode()} className="text-brand hover:underline disabled:opacity-50">{secondsLeft ? `Resend code in ${secondsLeft}s` : 'Resend Code'}</button><button type="button" disabled={loading} onClick={() => { setStep('email'); setError(''); setMessage(''); }} className="text-slate-500 hover:underline">Change email</button></div>
        </form>}
        <DialogFooter><button type="button" disabled={loading} className="rounded-lg border border-slate-200 px-5 py-2 text-sm dark:border-slate-700" onClick={() => setOpen(false)}>Back to sign in</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
