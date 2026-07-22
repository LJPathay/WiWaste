import { useState, useEffect, useCallback } from 'react';

export function useOptimisticList<T extends { id: number }>(
  fetcher: () => Promise<T[]>
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { fetch(); }, [fetch]);

  const addItem = useCallback((item: T) => {
    setData(prev => prev ? [...prev, item] : [item]);
  }, []);

  const updateItem = useCallback((id: number, updates: Partial<T>) => {
    setData(prev =>
      prev ? prev.map(item => item.id === id ? { ...item, ...updates } : item) : prev
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setData(prev => prev ? prev.filter(item => item.id !== id) : prev);
  }, []);

  return { data, loading, error, refetch: fetch, addItem, updateItem, removeItem, setData };
}
