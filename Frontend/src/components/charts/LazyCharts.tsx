import { lazy, Suspense } from 'react';
import type { ComponentProps, ComponentType } from 'react';
import type {
  Area,
  AreaChart as AreaChartBase,
  Bar,
  BarChart as BarChartBase,
  CartesianGrid,
  Cell,
  ComposedChart as ComposedChartBase,
  LabelList,
  Legend,
  Line,
  LineChart as LineChartBase,
  Pie,
  PieChart as PieChartBase,
  ReferenceLine,
  XAxis,
  YAxis,
  TooltipProps,
} from 'recharts';
import { PageLoader } from '../ui/PageLoader';

function lazyChart<P extends object>(importFn: () => Promise<{ default: unknown }>) {
  // `lazy()` is declared as `lazy<T extends ComponentType<any>>`, but recharts' `Area`, `Bar`
  // and `Pie` are generic function components intersected with an object literal type, which
  // is not assignable to `ComponentType<any>`. The cast is confined to this one place instead
  // of being repeated at each of the 17 call sites.
  //
  // It costs nothing in type safety: `P` is still derived from the real recharts component
  // at each `lazyChart<...>` call below, so every <LazyBar dataKey=... /> call site is
  // checked against recharts' actual props. Only the hand-off into `lazy()` is untyped.
  const Chart = lazy(importFn as () => Promise<{ default: ComponentType<any> }>);
  return function LazyChart(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Chart {...props} />
      </Suspense>
    );
  };
}

// These were declared as `React.ComponentPropsWithoutRef<'svg'>`, which is the prop set of
// a plain <svg> element -- not of a recharts series or chart container. Call sites were
// therefore checked against the wrong shape and every one of them failed with errors like
// "Property 'dataKey' does not exist on type 'Omit<SVGProps<SVGSVGElement>, "ref">'".
// The prop types are now derived from the components themselves, so they track whatever
// the installed recharts version declares.

export const LazyAreaChart = lazyChart<ComponentProps<typeof AreaChartBase>>(
  () => import('recharts').then(m => ({ default: m.AreaChart }))
);

export const LazyLineChart = lazyChart<ComponentProps<typeof LineChartBase>>(
  () => import('recharts').then(m => ({ default: m.LineChart }))
);

export const LazyBarChart = lazyChart<ComponentProps<typeof BarChartBase>>(
  () => import('recharts').then(m => ({ default: m.BarChart }))
);

export const LazyPieChart = lazyChart<ComponentProps<typeof PieChartBase>>(
  () => import('recharts').then(m => ({ default: m.PieChart }))
);

export const LazyComposedChart = lazyChart<ComponentProps<typeof ComposedChartBase>>(
  () => import('recharts').then(m => ({ default: m.ComposedChart }))
);

export const LazyArea = lazyChart<ComponentProps<typeof Area>>(
  () => import('recharts').then(m => ({ default: m.Area }))
);

export const LazyLine = lazyChart<ComponentProps<typeof Line>>(
  () => import('recharts').then(m => ({ default: m.Line }))
);

export const LazyBar = lazyChart<ComponentProps<typeof Bar>>(
  () => import('recharts').then(m => ({ default: m.Bar }))
);

export const LazyPie = lazyChart<ComponentProps<typeof Pie>>(
  () => import('recharts').then(m => ({ default: m.Pie }))
);

export const LazyCell = lazyChart<ComponentProps<typeof Cell>>(
  () => import('recharts').then(m => ({ default: m.Cell }))
);

export const LazyXAxis = lazyChart<ComponentProps<typeof XAxis>>(
  () => import('recharts').then(m => ({ default: m.XAxis }))
);

export const LazyYAxis = lazyChart<ComponentProps<typeof YAxis>>(
  () => import('recharts').then(m => ({ default: m.YAxis }))
);

/**
 * `ComponentProps<typeof Tooltip>` includes generic type parameters that make the
 * `formatter` prop expect the full recharts signature (value, name, item, index, payload).
 * Call sites pass simple one-arg functions, which are valid in practice but TypeScript
 * rejects them because the inferred generic constraints don't match. A local widening
 * keeps everything else checked while allowing the simple formatter.
 *
 * Using `TooltipProps<number | string, string>` with explicit generics avoids the
 * constraint expansion that `ComponentProps<typeof Tooltip>` produces. The formatter
 * is widened to accept any callable to accommodate the various simple signatures used
 * across call sites (e.g. `(value) => ...`, `(value, name) => ...`).
 */
type LazyTooltipProps = Omit<TooltipProps<number | string, string>, 'formatter'> & {
  formatter?: (value: any, ...args: any[]) => React.ReactNode;
};

export const LazyTooltip = lazyChart<LazyTooltipProps>(
  () => import('recharts').then(m => ({ default: m.Tooltip }))
);

export const LazyLegend = lazyChart<ComponentProps<typeof Legend>>(
  () => import('recharts').then(m => ({ default: m.Legend }))
);

export const LazyCartesianGrid = lazyChart<ComponentProps<typeof CartesianGrid>>(
  () => import('recharts').then(m => ({ default: m.CartesianGrid }))
);

export const LazyReferenceLine = lazyChart<ComponentProps<typeof ReferenceLine>>(
  () => import('recharts').then(m => ({ default: m.ReferenceLine }))
);

export const LazyLabelList = lazyChart<ComponentProps<typeof LabelList>>(
  () => import('recharts').then(m => ({ default: m.LabelList }))
);