import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { PageLoader } from '../ui/PageLoader';

function lazyChart<P extends object>(importFn: () => Promise<{ default: ComponentType<any> }>) {
  const Chart = lazy(importFn);
  return function LazyChart(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Chart {...props} />
      </Suspense>
    );
  };
}

export const LazyAreaChart = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.AreaChart }))
);

export const LazyLineChart = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.LineChart }))
);

export const LazyBarChart = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.BarChart }))
);

export const LazyPieChart = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.PieChart }))
);

export const LazyComposedChart = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.ComposedChart }))
);

export const LazyArea = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Area }))
);

export const LazyLine = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Line }))
);

export const LazyBar = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Bar }))
);

export const LazyPie = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Pie }))
);

export const LazyCell = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Cell }))
);

export const LazyXAxis = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.XAxis }))
);

export const LazyYAxis = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.YAxis }))
);

export const LazyTooltip = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Tooltip }))
);

export const LazyLegend = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.Legend }))
);

export const LazyCartesianGrid = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.CartesianGrid }))
);

export const LazyReferenceLine = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.ReferenceLine }))
);

export const LazyLabelList = lazyChart<React.ComponentPropsWithoutRef<'svg'>>(
  () => import('recharts').then(m => ({ default: m.LabelList }))
);