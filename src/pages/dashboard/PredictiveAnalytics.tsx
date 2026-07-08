import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Brain, TrendingUp, Zap } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { retailExamples } from '../../utils/mockAuthAndFeatures';

export function PredictiveAnalyticsPage() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <div className="p-8">No data</div>;

  const forecastChart = data.predictiveAnalytics.wasteVolumeForecast.map((item) => ({
    month: item.month.replace(' 2026', ''),
    forecast: item.predicted,
    confidence: Math.round(item.confidence * 100),
  }));
  const peakForecast = forecastChart.reduce(
    (highest, item) => (item.forecast > highest.forecast ? item : highest),
    forecastChart[0]
  );
  const lowestConfidence = forecastChart.reduce(
    (lowest, item) => (item.confidence < lowest.confidence ? item : lowest),
    forecastChart[0]
  );
  const averageConfidence = Math.round(
    forecastChart.reduce((sum, item) => sum + item.confidence, 0) / forecastChart.length
  );

  const detections = [
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
    },
    {
      title: 'Detected anomaly',
      severity: data.predictiveAnalytics.anomalyDetection.severity,
      detail: data.predictiveAnalytics.anomalyDetection.description,
      action: 'Investigate shelf returns, damaged packs, and pharmacy blister-pack handling for the anomaly date.',
    },
  ];

  function getSeverityStyle(severity: string) {
    const s = severity.toLowerCase();
    if (s === 'critical') return { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', border: 'border-l-rose-500', bg: 'bg-rose-50/60 dark:bg-rose-500/5' };
    if (s === 'high') return { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-l-amber-500', bg: 'bg-amber-50/60 dark:bg-amber-500/5' };
    return { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300', border: 'border-l-sky-500', bg: 'bg-sky-50/60 dark:bg-sky-500/5' };
  }

  const anomalyIsHigh = detections[2].severity.toLowerCase() === 'high' || detections[2].severity.toLowerCase() === 'critical';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Predictive Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">AI-powered demand forecasts, projected wastage trends, and anomaly detection for smarter replenishment decisions.</p>
      </div>


      {/* Main Chart */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Forecast vs Confidence</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Forecasted waste volume and model confidence in one view.</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400"><span className="inline-block h-3 w-3 rounded-sm bg-sky-400" /> Forecasted waste</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><span className="inline-block h-0.5 w-6 bg-emerald-500" /> Confidence %</span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastChart}>
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="forecast" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="confidence" orientation="right" domain={[70, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
              />
              <Area yAxisId="forecast" type="monotone" dataKey="forecast" stroke="#0ea5e9" fill="url(#forecastFill)" strokeWidth={3} name="Forecasted waste" />
              <Line yAxisId="confidence" type="monotone" dataKey="confidence" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Confidence %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
              {data.predictiveAnalytics.seasonalTrends}. Watch high-turn minimart brands like{' '}
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
    </div>
  );
}
