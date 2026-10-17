import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Bar } from 'recharts';

/**
 * recharts names this type `AnimationTiming` but does not re-export it from the package
 * root -- only `LegendType` is pulled out of `util/types`. Deriving it from the public
 * `Bar` export avoids a deep import into `recharts/types/util/types`, which an `exports`
 * map added in a future release would break.
 */
type AnimationTiming = NonNullable<ComponentProps<typeof Bar>['animationEasing']>;

export const CHART_DEFAULTS = {
  animationDuration: 600,
  // recharts types `animationEasing` as `AnimationTiming`, whose only members are
  // 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'. The previous value,
  // 'easeOutQuart', is a d3 easing name that recharts does not model, so every one of the
  // 21 charts passing it failed to compile. 'ease-out' is the member with the same shape.
  // It only takes effect once `isAnimationActive` is turned back on below.
  animationEasing: 'ease-out' as const,
  animationBegin: 0,
  // recharts' Animate.runJSAnimation dereferences a chart context that is null when
  // the chart remounts before its first animation frame (StrictMode double-mount, or a
  // re-render triggered by async dashboard data). That throws
  // "Cannot read properties of null (reading 'isStepper')" and takes the whole page
  // down via the ErrorBoundary. Charts render statically instead.
  isAnimationActive: false,
  layout: 'horizontal' as const,
} as const;

/**
 * Currency axis tick. Wastage and monthly totals on this app are frequently below
 * ₱1,000, so a "divide by 1000 and round" formatter printed "₱0k" on every gridline.
 * Keep the exact amount below a thousand and compact only above it.
 */
export function formatPesoAxis(value: number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₱0';
  if (Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `₱${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return `₱${Math.round(amount)}`;
}

export const RESPONSIVE_DEFAULTS = {
  width: '100%',
  height: '100%',
  debounce: 100,
} as const;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/**
 * The easing value is returned as recharts' `AnimationTiming` rather than `string`. Widening
 * it to `string` is what made all 21 `animationEasing={animationEasing}` call sites fail
 * with "Type 'string' is not assignable to type 'AnimationTiming | undefined'".
 */
export function useChartAnimation(reduced?: boolean): {
  isAnimationActive: boolean;
  animationDuration: number;
  animationEasing: AnimationTiming;
} {
  const prefersReduced = useReducedMotion();
  const shouldReduce = reduced ?? prefersReduced;
  return {
    isAnimationActive: false,
    animationDuration: shouldReduce ? 0 : CHART_DEFAULTS.animationDuration,
    animationEasing: CHART_DEFAULTS.animationEasing,
  };
}

export const CHART_COLORS = {
  primary: '#0F766E',
  primaryLight: '#10B981',
  secondary: '#3B82F6',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
  grid: '#EEF2F6',
  text: '#94A3B8',
  axis: '#E5E7EB',
} as const;

/**
 * Categorical palette for part-to-whole charts. Neighbouring slices alternate between
 * warm and cool hues so adjacent wedges stay distinguishable; the previous list ran teal,
 * orange, amber, yellow, green — three warm earth tones in a row that read as one slice.
 */
export const CHART_SERIES = ['#0F766E', '#F97316', '#2563EB', '#9333EA', '#EAB308', '#EC4899', '#0EA5E9', '#84CC16'] as const;

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  // Pinned to UTC: the API sends plain `YYYY-MM-DD` strings, which `new Date()` parses as
  // UTC midnight. Formatting that in a negative-offset timezone would print the day before.
  timeZone: 'UTC',
});

/** `2026-10-14` → `Oct 14`. Falls back to the raw label for anything unparseable. */
export function formatShortDate(value: string | number): string {
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return shortDateFormatter.format(parsed);
  }
  return raw;
}

/**
 * Shared styling for numeric axes: no axis line, no tick marks, muted labels. Recharts
 * defaults draw a full box around the plot area, which is what made the sparse charts
 * look like empty graph paper.
 */
export const CHART_AXIS_PROPS = {
  tick: { fontSize: 10, fill: CHART_COLORS.text },
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

export const CHART_GRADIENTS = {
  primary: 'chart-primary-gradient',
  primaryFill: 'chart-primary-fill',
  secondary: 'chart-secondary-gradient',
  secondaryFill: 'chart-secondary-fill',
  danger: 'chart-danger-gradient',
  dangerFill: 'chart-danger-fill',
  warning: 'chart-warning-gradient',
  warningFill: 'chart-warning-fill',
  stockIn: 'chart-stock-in-fill',
  stockOut: 'chart-stock-out-fill',
  wastage: 'chart-wastage-fill',
  barPrimary: 'chart-bar-primary',
  barDanger: 'chart-bar-danger',
} as const;

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1E293B',
  border: '1px solid #334155',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#F1F5F9',
} as const;