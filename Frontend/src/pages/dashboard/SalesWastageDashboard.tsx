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
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const totalUnits = useMemo(() => (overview?.summary?.total_units ?? 0), [overview]);
  const unitsSold = useMemo(() => (overview?.summary?.units_sold ?? 0), [overview]);
  const unitsWasted = useMemo(() => (overview?.summary?.units_wasted ?? 0), [overview]);
  const wastageRate = useMemo(() => (overview?.summary?.wastage_rate_pct ?? 0), [overview]);
  const nearExpiry = useMemo(() => (overview?.summary?.near_expiry_batches ?? 0), [overview]);

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

      {/* KPI Cards */}
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

      {/* Charts Row 1: Category Breakdown + Waste by Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Units Sold vs Wasted by Category" icon={<BarChart2 className="h-4 w-4" />}>
          {overviewLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-fg">Loading...</div>
          ) : overview?.category_breakdown ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={overview.category_breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" width={120} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'units_sold') return [`${numberFormatter.format(value)} units`, 'Units Sold'];
                    if (name === 'units_wasted') return [`${numberFormatter.format(value)} units`, 'Units Wasted'];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Legend />
                <Bar dataKey="units_sold" fill={COLORS.sold} name="Units Sold" radius={[0, 4, 4, 0]} />
                <Bar dataKey="units_wasted" fill={COLORS.wasted} name="Units Wasted" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-fg">No category data available</div>
          )}
        </Card>

        <Card title="Waste by Reason" icon={<PieChart className="h-4 w-4" />}>
          {overviewLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-fg">Loading...</div>
          ) : overview?.waste_by_reason && Object.keys(overview.waste_by_reason).length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RechartsPieChart>
                <Pie
                  data={Object.entries(overview.waste_by_reason).map(([name, value], i) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value,
                    fill: COLORS.wasteReasons[i % COLORS.wasteReasons.length],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.entries(overview.waste_by_reason).map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS.wasteReasons[i % COLORS.wasteReasons.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${numberFormatter.format(value)} units`, 'Wasted']}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-fg">No wastage data for this period</div>
          )}
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card title="Daily Trend: Units Sold vs Wasted" icon={<BarChart2 className="h-4 w-4" />} fullWidth>
        {timeSeriesLoading ? (
          <div className="h-80 flex items-center justify-center text-muted-fg">Loading trend data...</div>
        ) : timeSeries && timeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" interval={Math.max(1, Math.floor(timeSeries.length / 10))} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'units_sold') return [`${numberFormatter.format(value)}`, 'Units Sold'];
                  if (name === 'units_wasted') return [`${numberFormatter.format(value)}`, 'Units Wasted'];
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#F1F5F9',
                }}
              />
              <Legend />
              <Bar dataKey="units_sold" fill={COLORS.sold} name="Units Sold" radius={[4, 4, 0, 0]} />
              <Bar dataKey="units_wasted" fill={COLORS.wasted} name="Units Wasted" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-fg">No trend data available for this period</div>
        )}
      </Card>

      {/* Tables Row: Top Wasted Products + Slow Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top 10 Wasted Products" icon={<AlertTriangle className="h-4 w-4" />}>
          {overviewLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-fg">Loading...</div>
          ) : overview?.top_wasted_products && overview.top_wasted_products.length > 0 ? (
            <DataTable
              columns={[
                { key: 'product_name', header: 'Product', minWidth: '180px' },
                { key: 'sku', header: 'SKU', minWidth: '100px' },
                { key: 'units_wasted', header: 'Units Wasted', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
                { key: 'wastage_value', header: 'Est. Value', numeric: true, minWidth: '120px', render: (_, v) => currencyFormatter.format(v) },
              ]}
              data={overview.top_wasted_products}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-fg">No wasted products data</div>
          )}
        </Card>

        <Card title="Slow Movers (Lowest Sales)" icon={<TrendingDown className="h-4 w-4" />}>
          {overviewLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-fg">Loading...</div>
          ) : overview?.slow_movers && overview.slow_movers.length > 0 ? (
            <DataTable
              columns={[
                { key: 'product_name', header: 'Product', minWidth: '180px' },
                { key: 'sku', header: 'SKU', minWidth: '100px' },
                { key: 'units_sold', header: 'Units Sold', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
                { key: 'stock', header: 'Current Stock', numeric: true, minWidth: '100px', render: (_, v) => numberFormatter.format(v) },
              ]}
              data={overview.slow_movers}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-fg">No slow movers data</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, iconBg, trend, trendUp }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend: string;
  trendUp: boolean;
}) {
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

function Card({ title, icon, children, fullWidth = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; fullWidth?: boolean }) {
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

function DataTable({ columns, data }: { columns: Array<{ key: string; header: string; numeric?: boolean; minWidth?: string; render?: (row: any, value: any) => React.ReactNode }>; data: any[] }) {
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
            <tr key={i} className={i % 2 === 0 ? 'bg-bg-elevated' : 'bg-bg dark:bg-slate-800/50'}>
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