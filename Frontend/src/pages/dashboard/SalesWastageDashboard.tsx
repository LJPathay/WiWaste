import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  BarChart2,
  PieChart,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { salesWastage } from '../../services/api';
import { PageLoader } from '../../components/ui/PageLoader';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import type {
  ApiSalesWastageOverview,
  ApiSalesWastageTimeSeries,
} from '../../types/api';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('en-PH', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const COLORS = {
  sold: '#0F766E',
  wasted: '#EF4444',
  categories: ['#0F766E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'],
  wasteReasons: ['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#06B6D4'],
};

// Every chart on this page shared these four properties verbatim.
const TOOLTIP_STYLE = {
  backgroundColor: '#1E293B',
  border: '1px solid #334155',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#F1F5F9',
};

const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' } as const;
const GRID_STROKE = '#F1F5F9';
const AXIS_STROKE = '#E5E7EB';
const CHART_HEIGHT = 320;

const CHART_PLACEHOLDER_CLASS = 'h-80 flex items-center justify-center text-muted-fg';
const TABLE_PLACEHOLDER_CLASS = 'h-64 flex items-center justify-center text-muted-fg';

function ChartPlaceholder({ message }: Readonly<{ message: string }>) {
  return <div className={CHART_PLACEHOLDER_CLASS}>{message}</div>;
}

function toThousands(value: number): string {
  return `${(value / 1000).toFixed(0)}k`;
}

export function SalesWastageDashboard() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['salesWastageOverview', from, to],
    queryFn: () => salesWastage.overview({ from, to }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['salesWastageTimeSeries', from, to],
    queryFn: () => salesWastage.timeSeries({ from, to }),
    staleTime: 5 * 60 * 1000,
  });

  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const blob = await salesWastage.exportCsv({ from, to });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-wastage-report_${from}_to_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  if (overviewLoading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales vs Wastage Dashboard</h1>
          <p className="text-sm text-muted-fg dark:text-muted-fg mt-1">Track units sold vs wasted, identify loss drivers, and monitor near-expiry risk.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker from={from} to={to} onChange={({ from: f, to: t }) => { setFrom(f); setTo(t); }} />
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="h-9 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-border dark:border-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Export CSV'}
          </button>
        </div>
      </div>

      <KpiCards overview={overview} />

      {/* Charts Row 1: Category Breakdown + Waste by Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Units Sold vs Wasted by Category" icon={<BarChart2 className="h-4 w-4" />}>
          <CategoryBreakdownChart loading={overviewLoading} rows={overview?.category_breakdown} />
        </Card>

        <Card title="Waste by Reason" icon={<PieChart className="h-4 w-4" />}>
          <WasteReasonChart loading={overviewLoading} byReason={overview?.waste_by_reason} />
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card title="Daily Trend: Units Sold vs Wasted" icon={<BarChart2 className="h-4 w-4" />} fullWidth>
        <TrendChart loading={timeSeriesLoading} rows={timeSeries} />
      </Card>

      <TopProductsTables overview={overview} loading={overviewLoading} />
    </div>
  );
}

function KpiCards({ overview }: Readonly<{ overview: ApiSalesWastageOverview | undefined }>) {
  const totalUnits = useMemo(() => overview?.summary?.total_units ?? 0, [overview]);
  const unitsSold = useMemo(() => overview?.summary?.units_sold ?? 0, [overview]);
  const unitsWasted = useMemo(() => overview?.summary?.units_wasted ?? 0, [overview]);
  const wastageRate = useMemo(() => overview?.summary?.wastage_rate_pct ?? 0, [overview]);
  const nearExpiry = useMemo(() => overview?.summary?.near_expiry_batches ?? 0, [overview]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Units Sold"
        value={numberFormatter.format(unitsSold)}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-50 dark:bg-emerald-950/30"
        trend={`${percentageFormatter.format(unitsSold / totalUnits)} of total`}
        trendUp={true}
      />
      <KpiCard
        label="Units Wasted"
        value={numberFormatter.format(unitsWasted)}
        icon={<AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        iconBg="bg-rose-50 dark:bg-rose-950/30"
        trend={`${percentageFormatter.format(wastageRate / 100)} wastage rate`}
        trendUp={false}
      />
      <KpiCard
        label="Wastage Rate"
        value={`${wastageRate.toFixed(1)}%`}
        icon={<PieChart className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-50 dark:bg-amber-950/30"
        trend={unitsWasted > 0 ? 'Needs attention' : 'Excellent'}
        trendUp={unitsWasted === 0}
      />
      <KpiCard
        label="Near-Expiry Batches"
        value={numberFormatter.format(nearExpiry)}
        icon={<Package className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        iconBg="bg-sky-50 dark:bg-sky-950/30"
        trend={nearExpiry > 0 ? 'Review FEFO list' : 'Clear'}
        trendUp={nearExpiry === 0}
      />
    </div>
  );
}

function CategoryBreakdownChart({
  loading,
  rows,
}: Readonly<{ loading: boolean; rows: ApiSalesWastageOverview['category_breakdown'] | undefined }>) {
  if (loading) {
    return <ChartPlaceholder message="Loading..." />;
  }
  if (!rows) {
    return <ChartPlaceholder message="No category data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={rows} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
        <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_STROKE} tickFormatter={toThousands} />
        <YAxis dataKey="category" type="category" tick={AXIS_TICK} stroke={AXIS_STROKE} width={120} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'units_sold') return [`${numberFormatter.format(value)} units`, 'Units Sold'];
            if (name === 'units_wasted') return [`${numberFormatter.format(value)} units`, 'Units Wasted'];
            return [value, name];
          }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend />
        <Bar dataKey="units_sold" fill={COLORS.sold} name="Units Sold" radius={[0, 4, 4, 0]} />
        <Bar dataKey="units_wasted" fill={COLORS.wasted} name="Units Wasted" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WasteReasonChart({
  loading,
  byReason,
}: Readonly<{ loading: boolean; byReason: Record<string, number> | undefined }>) {
  if (loading) {
    return <ChartPlaceholder message="Loading..." />;
  }
  if (!byReason || Object.keys(byReason).length === 0) {
    return <ChartPlaceholder message="No wastage data for this period" />;
  }

  const entries = Object.entries(byReason);
  const slices = entries.map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: COLORS.wasteReasons[i % COLORS.wasteReasons.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <RechartsPieChart>
        <Pie data={slices} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {slices.map((slice) => (
            <Cell key={`cell-${slice.name}`} fill={slice.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${numberFormatter.format(value)} units`, 'Wasted']}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

function TrendChart({
  loading,
  rows,
}: Readonly<{ loading: boolean; rows: ApiSalesWastageTimeSeries[] | undefined }>) {
  if (loading) {
    return <ChartPlaceholder message="Loading trend data..." />;
  }
  if (!rows || rows.length === 0) {
    return <ChartPlaceholder message="No trend data available for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={Math.max(1, Math.floor(rows.length / 10))} />
        <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} tickFormatter={toThousands} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'units_sold') return [`${numberFormatter.format(value)}`, 'Units Sold'];
            if (name === 'units_wasted') return [`${numberFormatter.format(value)}`, 'Units Wasted'];
            return [value, name];
          }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend />
        <Bar dataKey="units_sold" fill={COLORS.sold} name="Units Sold" radius={[4, 4, 0, 0]} />
        <Bar dataKey="units_wasted" fill={COLORS.wasted} name="Units Wasted" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopProductsTables({
  overview,
  loading,
}: Readonly<{ overview: ApiSalesWastageOverview | undefined; loading: boolean }>) {
  const topWasted = overview?.top_wasted_products;
  const slowMovers = overview?.slow_movers;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Top 10 Wasted Products" icon={<AlertTriangle className="h-4 w-4" />}>
        {(() => {
          if (loading) return <ChartPlaceholder message="Loading..." />;
          if (!topWasted?.length) return <div className={TABLE_PLACEHOLDER_CLASS}>No wasted products data</div>;
          return (
            <DataTable
              columns={[
                { key: 'product_name', header: 'Product', minWidth: '180px' },
                { key: 'sku', header: 'SKU', minWidth: '100px' },
                { key: 'units_wasted', header: 'Units Wasted', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
                { key: 'wastage_value', header: 'Est. Value', numeric: true, minWidth: '120px', render: (_, v) => currencyFormatter.format(v) },
              ]}
              data={topWasted}
            />
          );
        })()}
      </Card>

      <Card title="Slow Movers (Lowest Sales)" icon={<TrendingDown className="h-4 w-4" />}>
        {(() => {
          if (loading) return <ChartPlaceholder message="Loading..." />;
          if (!slowMovers?.length) return <div className={TABLE_PLACEHOLDER_CLASS}>No slow movers data</div>;
          return (
            <DataTable
              columns={[
                { key: 'product_name', header: 'Product', minWidth: '180px' },
                { key: 'sku', header: 'SKU', minWidth: '100px' },
                { key: 'units_sold', header: 'Units Sold', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
                { key: 'stock', header: 'Current Stock', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
              ]}
              data={slowMovers}
            />
          );
        })()}
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, iconBg, trend, trendUp }: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend: string;
  trendUp: boolean;
}>) {
  return (
    <div className="bg-bg-elevated rounded-xl border border-border dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-fg dark:text-muted-fg uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
          <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

function Card({ title, icon, children, fullWidth = false }: Readonly<{ title: string; icon: React.ReactNode; children: React.ReactNode; fullWidth?: boolean }>) {
  return (
    <div className={`bg-bg-elevated rounded-xl border border-border dark:border-slate-700 shadow-sm ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center justify-between border-b border-border dark:border-slate-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-fg dark:text-slate-300">{icon}</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataTable({ columns, data }: Readonly<{ columns: Array<{ key: string; header: string; numeric?: boolean; minWidth?: string; render?: (row: any, value: any) => React.ReactNode }>; data: any[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border dark:border-slate-700">
            {columns.map(col => (
              <th key={col.key} className={`text-left py-2 px-3 font-semibold text-muted-fg dark:text-muted-fg ${col.numeric ? 'text-right' : ''}`} style={{ minWidth: col.minWidth }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((row, i) => (
            <tr
              // Rows carry no stable id, so the row's own contents form the key —
              // an array index would remount unrelated rows when one is inserted.
              // `i` is kept only for the zebra striping, which the rule does not cover.
              key={JSON.stringify(row)}
              className={i % 2 === 0 ? 'bg-bg-elevated' : 'bg-bg dark:bg-slate-800/50'}
            >
              {columns.map(col => {
                const value = row[col.key];
                return (
                  <td key={col.key} className={`py-2 px-3 ${col.numeric ? 'text-right text-slate-900 dark:text-white font-mono' : 'text-slate-700 dark:text-slate-300'}`}>
                    {col.render ? col.render(row, value) : String(value ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
