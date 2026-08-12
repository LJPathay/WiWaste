import { useCallback, useEffect, useState } from 'react';
import {
  ComposedChart,
  Area,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowLeft, Brain, Info, RefreshCw, Zap } from 'lucide-react';
import { Link } from 'react-router';
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard?highlightKpi=0" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Predictive Analytics</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
          <Brain className="h-3.5 w-3.5" /> Model: ARIMA
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
        <div className="space-y-6 animate-pulse">
          <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      ) : error && !overview ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/5">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-rose-900 dark:text-rose-200">Forecast service unavailable</h2>
          <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-300/70">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating…' : 'Try generating forecasts'}
            </button>
            <button
              onClick={loadOverview}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Main Chart */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Forecast vs Confidence</h2>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Predicted demand (all products) with model confidence, generated by the Python ARIMA service.
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400"><span className="inline-block h-3 w-3 rounded-sm bg-sky-400" /> Predicted demand</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><span className="inline-block h-0.5 w-6 bg-emerald-500" /> Confidence %</span>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0b1c30] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating…' : 'Generate forecasts'}
                </button>
              </div>
            </div>

            {forecastChart.length === 0 ? (
              <div className="py-20 text-center">
                <Brain className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  No forecasts yet. Click &quot;Generate forecasts&quot; to run the ARIMA model for all active products.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {overview?.total_products ?? 0} products
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    Avg confidence {Math.round(overview?.avg_confidence ?? 0)}%
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {overview?.generated_at ? `Generated ${new Date(overview.generated_at).toLocaleDateString()}` : 'Not generated yet'}
                  </span>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastChart}>
                      <defs>
                        <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis yAxisId="forecast" tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: 'Units', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }} />
                      <YAxis yAxisId="confidence" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: 'Confidence %', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 12 } }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        }}
                      />
                      <Area yAxisId="forecast" type="linear" dataKey="forecast" stroke="#0ea5e9" fill="url(#forecastFill)" strokeWidth={3} name="Predicted demand" />
                      <Line yAxisId="confidence" type="linear" dataKey="confidence" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Confidence %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </section>

          {/* Detection Cards */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {detections.map((detection) => {
              const style = getSeverityStyle(detection.severity);
              const isAnomaly = detection.title === 'Detected anomaly';
              return (
                <div
                  key={detection.title}
                  className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 border-l-4 ${style.border} transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isAnomaly && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                      )}
                      <div className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">{detection.title}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold capitalize ${style.badge}`}>
                      {detection.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{detection.detail}</p>
                  <div className={`mt-4 rounded-2xl border border-slate-100 dark:border-white/5 ${style.bg} p-3 text-sm text-slate-700 dark:text-slate-300`}>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Recommended fix: </span>{detection.action}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Seasonal Advisory */}
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200">Read this before ordering</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">SEASONAL ALERT</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-800/80 dark:text-amber-200/70">
                  {data?.predictiveAnalytics?.seasonalTrends ?? 'Watch seasonal demand patterns before placing large orders.'} Watch high-turn minimart brands like{' '}
                  <span className="font-semibold">{retailExamples.minimart.topBrands.slice(0, 4).join(', ')}</span> and pharmacy items like{' '}
                  <span className="font-semibold">{retailExamples.pharma.topBrands.slice(0, 4).join(', ')}</span> because these are most exposed to over-ordering and expiry waste.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Action: Adjust purchase orders downward for flagged SKUs this season.</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
