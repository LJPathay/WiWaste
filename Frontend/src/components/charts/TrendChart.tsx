import { ResponsiveContainer } from 'recharts';
import {
  LazyArea,
  LazyAreaChart,
  LazyBar,
  LazyBarChart,
  LazyCartesianGrid,
  LazyLabelList,
  LazyTooltip,
  LazyXAxis,
  LazyYAxis,
} from './LazyCharts';
import { CHART_AXIS_PROPS, CHART_COLORS, formatPesoAxis, formatShortDate, useChartAnimation } from './ChartConfig';
import { ChartGradients, ChartTooltipStyle } from './ChartGradients';

export type TrendPoint = { date: string; value: number };

type TrendChartProps = {
  data: TrendPoint[];
  name: string;
  /** `danger` for loss series, `primary` for revenue. */
  variant: 'danger' | 'primary';
  height?: number;
  ariaLabel: string;
};

/**
 * A four-day series drawn as an area chart is a lone diagonal across an empty box: it
 * reads as a rendering fault, not a trend. Short series therefore switch to columns,
 * where each recorded day is a discrete bar and the gaps are honest. Longer series keep
 * the gradient area, which is what actually shows a trajectory.
 */
const COLUMN_THRESHOLD = 12;

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function TrendChart({ data, name, variant, height = 224, ariaLabel }: TrendChartProps) {
  const { isAnimationActive, animationDuration, animationEasing } = useChartAnimation();
  const asColumns = data.length <= COLUMN_THRESHOLD;

  const stroke = variant === 'danger' ? '#E11D48' : CHART_COLORS.primary;
  const areaFill = variant === 'danger' ? 'url(#chart-danger-fill)' : 'url(#chart-primary-fill)';
  const barFill = variant === 'danger' ? 'url(#chart-bar-danger)' : 'url(#chart-bar-primary)';

  const xAxis = {
    dataKey: 'date',
    ...CHART_AXIS_PROPS,
    minTickGap: 24,
    tickFormatter: (value: string) => formatShortDate(value),
  };

  const yAxis = {
    ...CHART_AXIS_PROPS,
    width: 52,
    tickCount: 4,
    domain: [0, 'auto'] as [number, 'auto'],
    tickFormatter: (value: number) => formatPesoAxis(Number(value)),
  };

  const tooltip = {
    formatter: (value: unknown) => pesoFormatter.format(Number(value)),
    labelFormatter: (label: unknown) => formatShortDate(String(label)),
    contentStyle: ChartTooltipStyle(),
    cursor: variant === 'danger' ? { fill: 'rgba(225, 29, 72, 0.06)' } : { fill: 'rgba(15, 118, 110, 0.06)' },
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        {asColumns ? (
          <LazyBarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 0 }} barCategoryGap="32%">
            <ChartGradients />
            <LazyCartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <LazyXAxis {...xAxis} />
            <LazyYAxis {...yAxis} />
            <LazyTooltip {...tooltip} />
            <LazyBar
              dataKey="value"
              name={name}
              fill={barFill}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            >
              <LazyLabelList
                dataKey="value"
                position="top"
                offset={6}
                formatter={(value: unknown) => {
                  const amount = Number(value);
                  return amount > 0 ? formatPesoAxis(amount) : '';
                }}
                style={{ fill: CHART_COLORS.text, fontSize: 10, fontWeight: 700 }}
              />
            </LazyBar>
          </LazyBarChart>
        ) : (
          <LazyAreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <ChartGradients />
            <LazyCartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <LazyXAxis {...xAxis} />
            <LazyYAxis {...yAxis} />
            <LazyTooltip {...tooltip} />
            <LazyArea
              type="monotone"
              dataKey="value"
              name={name}
              stroke={stroke}
              strokeWidth={2.5}
              fill={areaFill}
              dot={{ r: 1.5, strokeWidth: 0, fill: stroke }}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#FFFFFF', fill: stroke }}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            />
          </LazyAreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
