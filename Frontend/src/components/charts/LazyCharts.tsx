/**
 * Recharts components, re-exported synchronously under the historical `Lazy*` names.
 *
 * They used to be `React.lazy` wrappers, each with its own `<Suspense>` boundary.
 * That looked like code splitting but broke rendering: Recharts identifies its
 * children (`Pie`, `Bar`, `XAxis`, `Cell`, ...) by component identity, and a wrapper
 * function component is not the component it is looking for. Charts such as the
 * wastage-by-category donut therefore rendered an empty surface — the container and
 * the card were there, but no slices, labels or legend were ever created.
 *
 * Loading the module up front costs little in practice: every page that imports this
 * file is already route-level lazy, so Recharts still lands in that page's chunk.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ComponentType, ReactNode } from 'react';

export const LazyAreaChart = AreaChart;
export const LazyLineChart = LineChart;
export const LazyBarChart = BarChart;
export const LazyPieChart = PieChart;
export const LazyComposedChart = ComposedChart;

export const LazyArea = Area;
export const LazyLine = Line;
export const LazyBar = Bar;
export const LazyPie = Pie;
export const LazyCell = Cell;

export const LazyXAxis = XAxis;
export const LazyYAxis = YAxis;
export const LazyLegend = Legend;
export const LazyCartesianGrid = CartesianGrid;
export const LazyReferenceLine = ReferenceLine;
export const LazyLabelList = LabelList;

/**
 * `ComponentProps<typeof Tooltip>` includes generic parameters that make `formatter`
 * expect the full recharts signature (value, name, item, index, payload). Call sites
 * pass simple one-argument functions, which are valid at runtime but rejected by the
 * inferred generic constraints. The widened shape keeps the other props checked.
 */
type LazyTooltipProps = Omit<TooltipProps<number | string, string>, 'formatter'> & {
  formatter?: (value: any, ...args: any[]) => ReactNode;
};

export const LazyTooltip = Tooltip as unknown as ComponentType<LazyTooltipProps>;
