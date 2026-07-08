import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Reads `?highlightKpi=<index>` from the URL and returns the highlighted card index.
 * After `durationMs` the highlight is cleared and the param is removed.
 */
export function useKpiHighlight(durationMs = 5000) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('highlightKpi');
  const initialIdx = raw !== null ? Number(raw) : null;
  const [activeIdx, setActiveIdx] = useState<number | null>(
    initialIdx !== null && !Number.isNaN(initialIdx) ? initialIdx : null,
  );

  useEffect(() => {
    if (activeIdx === null) return;
    const timer = setTimeout(() => {
      setActiveIdx(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('highlightKpi');
        return next;
      }, { replace: true });
    }, durationMs);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  return activeIdx;
}
