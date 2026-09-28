import { useState, useEffect, useCallback } from 'react';

export function useOptimisticList<T extends { id: number }>(
  fetcher: () => Promise<T[] | { data: T[] }>
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      // Ensure we always have an array, even if the API returns unexpected data
      let items: T[] = [];
      if (Array.isArray(result)) {
        items = result;
      } else if (result && typeof result === 'object' && Array.isArray(result.data)) {
        items = result.data;
      }
      // items is guaranteed to be an array
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { fetch(); }, [fetch]);

  const addItem = useCallback((item: T) => {
    setData(prev => {
      // Ensure prev is an array before attempting to spread it
      if (Array.isArray(prev)) {
        return [...prev, item];
      }
      // If prev is not an array, treat it as empty and return a new array with just the item
      return [item];
    });
  }, []);

  const updateItem = useCallback((id: number, updates: Partial<T>) => {
    setData(prev => {
      // If prev is null or not an array, return it as-is (nothing to update)
      if (!prev || !Array.isArray(prev)) {
        return prev;
      }
      return prev.map(item => item.id === id ? { ...item, ...updates } : item);
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setData(prev => {
      // If prev is null or not an array, return it as-is (nothing to remove)
      if (!prev || !Array.isArray(prev)) {
        return prev;
      }
      return prev.filter(item => item.id !== id);
    });
  }, []);

  return { data, loading, error, refetch: fetch, addItem, updateItem, removeItem, setData };
}
