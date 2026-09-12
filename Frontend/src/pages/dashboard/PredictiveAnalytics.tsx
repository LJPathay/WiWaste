import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import { AlertTriangle, ArrowLeft, Brain, Info, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData';
import { forecast as forecastApi, type ApiForecastOverview } from '../../services/api';
import { retailExamples } from '../../utils/mockAuthAndFeatures';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriod(period: string): string {
  const [year, month, day] = period.split('-').map(Number);
  const label = MONTHS[(month ?? 1) - 1] ?? '';
  return `${label} ${day} '${String(year).slice(-2)}`;
}

const chartTooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
  fontSize: '12px',
};

// Mock stock movement data for predictive view
const mockPredictiveMovement = [
  { date: 'Mon', stock_in: 45, stock_out: 38, wastage: 3 },
  { date: 'Tue', stock_in: 52, stock_out: 48, wastage: 2 },
  { date: 'Wed', stock_in: 38, stock_out: 42, wastage: 4 },
  { date: 'Thu', stock_in: 60, stock_out: 35, wastage: 1 },
  { date: 'Fri', stock_in: 48, stock_out: 52, wastage: 3 },
  { date: 'Sat', stock_in: 55, stock_out: 44, wastage: 2 },
  { date: 'Sun', stock_in: 20, stock_out: 15, wastage: 1 },
];

// Mock wastage trend for predictive view
const mockPredictiveWastage = [
  { date: 'Week 1', predicted: 1150, actual: 1200 },
  { date: 'Week 2', predicted: 890, actual: 890 },
  { date: 'Week 3', predicted: 1420, actual: 1450 },
  { date: 'Week 4', predicted: 650, actual: 620 },
];

export function PredictiveAnalyticsPage() {
  const { data } = useDashboardData();
  const [overview, setOverview] = useState<ApiForecastOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadOverview = useCallback(() => {
    setLoading(true);
    setError(null);
    forecastApi
      .overview()
      .then((payload) => setOverview(payload))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await forecastApi.generate();
      await loadOverview();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const forecastChart = (overview?.series ?? []).map((point) => ({
    month: formatPeriod(point.period),
    forecast: point.predicted_demand,
    confidence: Math.round(point.confidence),
  }));

  const peakForecast = forecastChart.reduce(
    (highest, item) => (item.forecast > highest.forecast ? item : highest),
    forecastChart[0]
  );
  const lowestConfidence = forecastChart.reduce(
    (lowest, item) => (item.confidence < lowest.confidence ? item : lowest),
    forecastChart[0]
  );

  const detections: { title: string; severity: string; detail: string; action: string }[] = [];
  if (peakForecast && lowestConfidence) {
    detections.push(
      {
        title: 'Demand spike vulnerability',
        severity: 'High',
        detail: `${peakForecast.month} forecast reaches ${peakForecast.forecast.toLocaleString()} units, so overstock and expiry risk are rising.`,
        action: 'Reduce replenishment quantities for slow-moving SKUs and prioritize FEFO rotation.',
      },
      {
        title: 'Weakest forecast confidence',
        severity: 'Medium',
        detail: `${lowestConfidence.month} has the lowest confidence at ${lowestConfidence.confidence}%, meaning planning should include buffer checks.`,
        action: 'Review promo calendars, supplier lead times, and recent stock corrections before ordering.',
      }
    );
  }
  detections.push({
    title: 'Detected anomaly',
    severity: data?.predictiveAnalytics?.anomalyDetection?.severity ?? 'low',
    detail:
      data?.predictiveAnalytics?.anomalyDetection?.description ??
      'No anomaly detected on the current dataset.',
    action: 'Investigate shelf returns, damaged packs, and pharmacy blister-pack handling for the anomaly date.',
  });

  function getSeverityStyle(severity: string) {
    const s = severity.toLowerCase();
    if (s === 'critical') return { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', border: 'border-l-rose-500', bg: 'bg-rose-50/60 dark:bg-rose-500/5' };
    if (s === 'high') return { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-l-amber-500', bg: 'bg-amber-50/60 dark:bg-amber-500/5' };
    return { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300', border: 'border-l-sky-500', bg: 'bg-sky-50/60 dark:bg-sky-500/5' };
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/dashboard?highlightKpi=0" className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-3.5 w-3.5" /></Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Predictive Analytics</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[9px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
          <Brain className="h-3 w-3" /> Model: ARIMA
        </span>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            AI-powered demand forecasts from the Python ARIMA/SARIMAX service, plus projected wastage trends and anomaly detection.
          </TooltipContent>
        </UITooltip>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      ) : error && !overview ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-500/20 dark:bg-rose-500/5">
          <AlertTriangle className="mx-auto h-6 w-6 text-rose-500" />
          <h2 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">Forecast service unavailable</h2>
          <p className="mt-1.5 text-xs text-rose-700/80 dark:text-rose-300/70">{error}</p>
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60 h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating…' : 'Try generating forecasts'}
            </button>
            <button
              onClick={loadOverview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 h-8"
            >
              Retry
            </button>
          </div>
        </section>
      ) : (
        <>
{/* ── Section 1: Stock Movement Forecast ── */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Stock Movement Forecast</h2>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Predicted stock in/out and wastage for the next 7 days based on historical patterns.
                  </TooltipContent>
                </UITooltip>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500 h-8"
              >
                <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating…' : 'Regenerate Forecast'}
              </button>
            </div>
            <div className="mb-2 flex items-center gap-3 text-[10px] text-[#64748B] dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#0F766E]" />
                Stock In
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#3B82F6]" />
                Stock Out
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#EF4444]" />
                Wastage
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPredictiveMovement}>
                  <defs>
                    <linearGradient id="stockInGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stockOutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="wastageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#0F766E" fill="url(#stockInGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#3B82F6" fill="url(#stockOutGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="wastage" name="Wastage" stroke="#EF4444" fill="url(#wastageGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Section 2: Wastage Trend (Predicted vs Actual) ── */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Wastage Trend</h2>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Predicted vs actual wastage value. Helps identify forecast accuracy gaps.
                  </TooltipContent>
                </UITooltip>
              </div>
              <Link to="/dashboard/leakage" className="flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
                View Details <TrendingUp className="h-2.5 w-2.5" />
              </Link>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPredictiveWastage}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => `₱${value.toLocaleString()}`}
                    contentStyle={chartTooltipStyle}
                  />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[#64748B] dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-5 rounded-sm bg-[#3B82F6]" />
                Predicted
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-5 rounded-sm bg-[#EF4444]" />
                Actual
              </span>
            </div>
          </section>

          {/* ── Section 3: Forecast Summary ── */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-bold text-[#0F172A] dark:text-slate-100">ARIMA Forecast Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#E5E7EB] dark:border-white/10 p-3">
                <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">Products Analyzed</div>
                <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{overview?.total_products ?? 0}</div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] dark:border-white/10 p-3">
                <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">Avg Confidence</div>
                <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{Math.round(overview?.avg_confidence ?? 0)}%</div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] dark:border-white/10 p-3">
                <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">Model</div>
                <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">ARIMA/SARIMAX</div>
              </div>
            </div>
          </section>

          {/* Detection Cards */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {detections.map((detection) => {
              const style = getSeverityStyle(detection.severity);
              const isAnomaly = detection.title === 'Detected anomaly';
              return (
                <div
                  key={detection.title}
                  className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900 border-l-3 ${style.border} transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isAnomaly && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                      )}
                      <div className="text-xs font-bold text-[#0b1c30] dark:text-slate-100">{detection.title}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold capitalize ${style.badge}`}>
                      {detection.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{detection.detail}</p>
                  <div className={`mt-3 rounded-xl border border-slate-100 dark:border-white/5 ${style.bg} p-2.5 text-xs text-slate-700 dark:text-slate-300`}>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Recommended fix: </span>{detection.action}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Seasonal Advisory */}
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Read this before ordering</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">SEASONAL ALERT</span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-amber-800/80 dark:text-amber-200/70">
                  {data?.predictiveAnalytics?.seasonalTrends ?? 'Watch seasonal demand patterns before placing large orders.'} Watch high-turn minimart brands like{' '}
                  <span className="font-semibold">{retailExamples.minimart.topBrands.slice(0, 4).join(', ')}</span> and pharmacy items like{' '}
                  <span className="font-semibold">{retailExamples.pharma.topBrands.slice(0, 4).join(', ')}</span> because these are most exposed to over-ordering and expiry waste.
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300">Action: Adjust purchase orders downward for flagged SKUs this season.</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
