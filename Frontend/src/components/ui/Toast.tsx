import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from './utils';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium min-w-[280px] max-w-sm animate-in slide-in-from-bottom-2 ${
        toast.type === 'success'
          ? 'bg-bg-elevated border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          : 'bg-bg-elevated border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-muted-fg hover:text-muted-fg dark:hover:text-slate-200"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = React.useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = React.useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = React.useCallback((msg: string) => addToast('error', msg), [addToast]);

  return { toasts, dismiss, success, error };
}

// Focus trap hook
function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0], last = focusable[focusable.length - 1];
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ref, active]);
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Several call sites already pass `isOpen` and wrap the modal in a guard of their own,
   * while others rely on the component always rendering. Both are supported: default `true`
   * keeps the unconditional call sites working, and `false` makes the modal render nothing.
   * Before this prop existed the value was ignored, so a page that passed `isOpen` without
   * also guarding would have shown its dialog permanently.
   */
  isOpen?: boolean;
  /** Extra classes for the dialog panel. */
  className?: string;
  /** Extra classes for the body wrapper that already carries the `p-6` padding. */
  contentClassName?: string;
  /** Extra classes for the heading. */
  titleClassName?: string;
}

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
  isOpen = true,
  className,
  contentClassName,
  titleClassName,
}: Readonly<ModalProps>) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  useFocusTrap(modalRef, true);

  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  // After the hooks, so hook order stays stable across renders.
  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 m-0 w-screen h-screen max-w-none max-h-none border-0 bg-transparent backdrop:bg-black/40"
    >
      {/* Click-away surface. It and the panel below are roleless containers: a <dialog>
          carries a non-interactive role and must not take pointer or key handlers. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        className={cn(
          'relative bg-bg-elevated rounded-xl border border-border dark:border-white/10 w-full shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          sizeClasses[size],
          className,
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-white/10">
          <h2 id="modal-title" className={cn('text-sm font-bold text-slate-900 dark:text-slate-100', titleClassName)}>
            {title}
          </h2>
          <button onClick={onClose} className="text-muted-fg hover:text-muted-fg dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className={cn('p-6', contentClassName)}>{children}</div>
      </div>
    </dialog>
  );
}

interface ConfirmProps {
  readonly message: string;
  readonly onConfirm: () => void;
  /** Dismiss handler. `onClose` is accepted as an alias -- most call sites use that name. */
  readonly onCancel?: () => void;
  readonly onClose?: () => void;
  /** Optional heading, rendered above the message when given. */
  readonly title?: string;
  readonly isOpen?: boolean;
  readonly confirmLabel?: string;
  readonly danger?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  onClose,
  title,
  isOpen = true,
  confirmLabel = 'Confirm',
  danger = false,
}: ConfirmProps) {
  const dismiss = onCancel ?? onClose;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  // After the hooks, so hook order stays stable across renders.
  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-labelledby={title ? 'confirm-title' : 'confirm-message'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 m-0 w-screen h-screen max-w-none max-h-none border-0 bg-transparent backdrop:bg-black/40"
    >
      {/* Roleless containers again: a <dialog> is non-interactive and cannot hold
          pointer or key handlers directly. */}
      <div className="absolute inset-0" onClick={dismiss} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={e => { if (e.key === 'Escape') dismiss?.(); }}
        className="relative bg-bg-elevated rounded-xl border border-border dark:border-white/10 w-full max-w-sm shadow-xl p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 id="confirm-title" className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
        )}
        <p id="confirm-message" className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{message}</p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={dismiss}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-fg dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#006a61] hover:bg-[#00574f]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface FieldProps {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly error?: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  /** Marks the control as required: renders the asterisk and sets `aria-required`. */
  readonly required?: boolean;
  /** Extra classes for the label element. */
  readonly labelClassName?: string;
}

export function FormField({ label, children, error, hint, htmlFor, required, labelClassName }: FieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className={cn('block text-xs font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider mb-1.5', labelClassName)}
      >
        {label}
        {required && <span className="text-rose-500" aria-hidden="true"> *</span>}
      </label>
      {/* `ReactElement` defaults its props to `unknown`, which makes `cloneElement`
          reject every prop passed in. The children are form controls, so the attribute
          bag is open-ended and `Record<string, unknown>` is the honest shape here. */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            'aria-describedby': describedBy,
            'aria-invalid': error ? 'true' : 'false',
            ...(required ? { 'aria-required': 'true' } : {}),
          })
        : children}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-fg dark:text-muted-fg">
          {hint}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  'w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-800 dark:text-slate-100';
