import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  /** Cache TTL in milliseconds (default: 30 seconds) */
  cacheTtl?: number;
  /** Whether to enable stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Unique key for deduplication (defaults to fetcher function reference) */
  dedupeKey?: string;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Manually invalidate cache */
  invalidate: () => void;
}

// Global request deduplication map
const pendingRequests = new Map<string, Promise<unknown>>();
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const {
    cacheTtl = 30_000, // 30 seconds default
    staleWhileRevalidate = true,
    dedupeKey,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const dedupeKeyRef = useRef(dedupeKey ?? fetcher.toString());
  const mountedRef = useRef(true);

  // Update refs when fetcher changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    dedupeKeyRef.current = dedupeKey ?? fetcher.toString();
  }, [dedupeKey, fetcher]);

  const cacheKey = dedupeKeyRef.current;

  const getCachedData = useCallback((): T | null => {
    const cached = cache.get(cacheKey);
    if (!cached) return null;
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }
    return cached.data as T;
  }, [cacheKey]);

  const setCachedData = useCallback((newData: T) => {
    cache.set(cacheKey, { data: newData, timestamp: Date.now(), ttl: cacheTtl });
  }, [cacheKey, cacheTtl]);

  const fetch = useCallback(async (isBackground = false) => {
    const key = dedupeKeyRef.current;

    // Check cache first
    const cached = getCachedData();
    if (cached && !isBackground) {
      setData(cached);
      setLoading(false);
      setError(null);
      // If stale-while-revalidate is enabled, fetch in background
      if (staleWhileRevalidate) {
        // Don't await - fire and forget for background refresh
        backgroundFetch();
      }
      return;
    }

    // Request deduplication: check if same request is already in flight
    if (pendingRequests.has(key)) {
      try {
        const result = await pendingRequests.get(key)!;
        if (mountedRef.current) {
          setData(result as T);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
      return;
    }

    // New request
    if (!isBackground) setLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const fetcher = fetcherRef.current;
        const result = await fetcher();
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
        setCachedData(result);
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
        throw err;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, promise);

    try {
      const result = await promise;
      if (!isBackground && mountedRef.current) {
        setData(result);
      }
    } catch {
      // Error already handled
    } finally {
      if (!isBackground && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [staleWhileRevalidate]);

  const backgroundFetch = useCallback(() => {
    fetch(true);
  }, [fetch]);

  const invalidate = useCallback(() => {
    cache.delete(cacheKey);
    pendingRequests.delete(cacheKey);
    fetch();
  }, [cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = getCachedData();
    if (cached) {
      setData(cached);
      setLoading(false);
      // Background refresh if stale-while-revalidate
      if (staleWhileRevalidate) {
        backgroundFetch();
      }
    } else {
      fetch();
    }
    return () => { mountedRef.current = false; };
  }, []);

  return { data, loading, error, refetch: fetch, invalidate };
}

export function clearApiCache() {
  cache.clear();
  pendingRequests.clear();
}