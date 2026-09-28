import { useState, useCallback } from 'react';

/**
 * Standardized form state hook
 * Provides consistent form state management across the application
 */
export function useFormState<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setFieldTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const validate = useCallback((validators: Record<keyof T, (value: T[keyof T]) => string | undefined>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const [field, validator] of Object.entries(validators)) {
      const error = validator(values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  const setSubmitErrorMessage = useCallback((message: string | null) => {
    setSubmitError(message);
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    setValue,
    setFieldTouched,
    setFieldError,
    validate,
    reset,
    setIsSubmitting,
    setSubmitErrorMessage,
  };
}

/**
 * Standardized modal state hook
 * Provides consistent modal state management
 */
export function useModalState<T = unknown>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [mode, setMode] = useState<'add' | 'edit' | 'view'>('add');

  const openAdd = useCallback(() => {
    setData(null);
    setMode('add');
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setData(item);
    setMode('edit');
    setIsOpen(true);
  }, []);

  const openView = useCallback((item: T) => {
    setData(item);
    setMode('view');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setMode('add');
  }, []);

  return {
    isOpen,
    data,
    mode,
    openAdd,
    openEdit,
    openView,
    close,
  };
}

/**
 * Standardized async state hook
 * For managing loading, error, and data states for async operations
 */
export function useAsyncState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
    setError,
  };
}