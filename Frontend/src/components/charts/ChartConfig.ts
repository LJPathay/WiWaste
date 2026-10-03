import { useEffect, useState } from 'react';

export const CHART_DEFAULTS = {
  animationDuration: 600,
  animationEasing: 'easeOutQuart',
  animationBegin: 0,
  // recharts' Animate.runJSAnimation dereferences a chart context that is null when
  // the chart remounts before its first animation frame (StrictMode double-mount, or a
  // re-render triggered by async dashboard data). That throws
  // "Cannot read properties of null (reading 'isStepper')" and takes the whole page
  // down via the ErrorBoundary. Charts render statically instead.
  isAnimationActive: false,
  layout: 'horizontal' as const,
} as const;

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

export function useChartAnimation(reduced?: boolean): { isAnimationActive: boolean; animationDuration: number; animationEasing: string } {
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
  grid: '#F1F5F9',
  text: '#94A3B8',
  axis: '#E5E7EB',
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