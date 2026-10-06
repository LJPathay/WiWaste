import React, { forwardRef } from 'react';
import { cn } from '../ui/utils';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      leftIcon,
      rightIcon,
      className,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className={cn(
            'block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300',
            required && 'text-rose-500'
          )}
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-fg">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'block w-full pr-10 py-3.5 text-sm bg-white dark:bg-slate-800/80 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors',
              error
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-border dark:border-white/10',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
            <span className="h-3 w-3" aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-muted-fg dark:text-muted-fg">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      hint,
      required,
      options,
      placeholder,
      className,
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id || label.toLowerCase().replace(/\s+/g, '-')}
          className="block text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>

        <div className="relative">
          <select
            ref={ref}
            id={id || label.toLowerCase().replace(/\s+/g, '-')}
            className={cn(
              'block w-full appearance-none bg-white dark:bg-slate-800/80 border rounded-lg px-3 py-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors',
              error
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-border dark:border-white/10',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-1">
            <span className="h-3 w-3" aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-xs text-muted-fg dark:text-muted-fg mt-1">
            {hint}
          </p>
        )}
    </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';