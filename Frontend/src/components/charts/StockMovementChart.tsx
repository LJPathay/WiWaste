import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartGradients, ChartTooltipStyle } from './ChartGradients';
import { CHART_COLORS, CHART_DEFAULTS, CHART_GRADIENTS } from './ChartConfig';

/**
 * The Stock In / Stock Out / Wastage movement panel.
 *
 * The inventory and predictive dashboards each carried a byte-identical copy of
 * this chart — the three `<Area>` series and their animation props were the
 * single largest duplicated block in the codebase. Both pages own their own
 * `data`; everything else is identical, so it lives here once.
 */

/** One series of the movement chart. */
export interface StockMovementSeries {
  /** Property on each row, e.g. `stock_in`. */
  readonly dataKey: string;
  /** Accessible/report name, e.g. `Stock In`. */
  readonly name: string;
  readonly stroke: string;
  /** `url(#id)` reference into the gradient defs `<ChartGradients />` renders. */
  readonly gradientId: string;
}

export const STOCK_MOVEMENT_SERIES: readonly StockMovementSeries[] = [
  {
    dataKey: 'stock_in',
    name: 'Stock In',
    stroke: CHART_COLORS.primary,
    gradientId: CHART_GRADIENTS.stockIn,
  },
  {
    dataKey: 'stock_out',
    name: 'Stock Out',
    stroke: CHART_COLORS.secondary,
    gradientId: CHART_GRADIENTS.stockOut,
  },
  {
    dataKey: 'wastage',
    name: 'Wastage',
    stroke: CHART_COLORS.danger,
    gradientId: CHART_GRADIENTS.wastage,
  },
];

export interface StockMovementChartProps {
  /** Rows shaped `{ date, stock_in, stock_out, wastage }`. */
  readonly data: readonly unknown[];
}

export function StockMovementChart({ data }: Readonly<StockMovementChartProps>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data as never}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} />
        <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} />
        <Tooltip contentStyle={ChartTooltipStyle()} />
        {STOCK_MOVEMENT_SERIES.map((series) => (
          <Area
            key={series.dataKey}
            type="monotone"
            dataKey={series.dataKey}
            name={series.name}
            stroke={series.stroke}
            fill={`url(#${series.gradientId})`}
            strokeWidth={2}
            isAnimationActive={CHART_DEFAULTS.isAnimationActive}
            animationDuration={CHART_DEFAULTS.animationDuration}
            animationEasing={CHART_DEFAULTS.animationEasing}
            animationBegin={CHART_DEFAULTS.animationBegin}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * The colour key printed above the movement chart.
 *
 * The legend swatches are drawn from the same `CHART_COLORS` the series use, so
 * a palette change cannot leave the key disagreeing with the lines.
 */
export function StockMovementLegend() {
  return (
    <div className="mb-2 flex items-center gap-3 text-[10px] text-[#64748B] dark:text-muted-fg">
      {STOCK_MOVEMENT_SERIES.map((series) => (
        <span key={series.dataKey} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: series.stroke }} />
          {series.name}
        </span>
      ))}
    </div>
  );
}
