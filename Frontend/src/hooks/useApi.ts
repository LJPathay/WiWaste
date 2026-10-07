import { useRef } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { withFreshResponse } from '../services/api';

// Not generic: none of these options mention the fetched payload, so `UseApiOptions<T>`
// declared a type parameter that could not be used and `noUnusedLocals` rightly objected.
interface UseApiOptions {
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

/**
 * Shared query client, captured the first time a hook mounts. `clearApiCache()`
 * needs it to wipe the cache from outside React (logout, role switches).
 */
let sharedClient: QueryClient | null = null;

/**
 * Thin wrapper over TanStack Query.
 *
 * This used to hand-roll its own cache, TTL, stale-while-revalidate pass and
 * in-flight request dedup with a module-level `Map`. All four behaviours are what
 * TanStack Query already does, so the implementation now delegates and only keeps
 * the `{ data, loading, error, refetch, invalidate }` shape the pages consume.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { cacheTtl = 30_000, staleWhileRevalidate = true, dedupeKey } = options;

  // Fetchers are usually a fresh arrow on every render, so their identity cannot be
  // the cache key — that would defeat caching entirely. The source text is stable,
  // and callers that build a key out of their filter/page state pass `dedupeKey`.
  const fallbackKey = useRef(fetcher.toString()).current;
  const key = dedupeKey ?? fallbackKey;

  const queryClient = useQueryClient();
  sharedClient = queryClient;

  const { data, isLoading, error, refetch } = useQuery<T>({
    queryKey: ['useApi', key],
    queryFn: () => fetcher(),
    staleTime: cacheTtl,
    gcTime: Math.max(cacheTtl * 5, 60_000),
    refetchOnWindowFocus: staleWhileRevalidate,
    refetchOnMount: staleWhileRevalidate,
    retry: 1,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to load data'
      : null,
    refetch: async () => {
      // A refetch runs after a write, so it must not be answered by the copy the
      // browser stored while the list still had `max-age=60` on it.
      await withFreshResponse(() => refetch());
    },
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: ['useApi', key] });
    },
  };
}

export function clearApiCache() {
  sharedClient?.removeQueries({ queryKey: ['useApi'] });
}
