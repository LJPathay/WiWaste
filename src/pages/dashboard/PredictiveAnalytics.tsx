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
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { retailExamples } from '../../utils/mockAuthAndFeatures';

export function PredictiveAnalyticsPage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading predictive analytics...</div>;
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">Predictive Analytics</h2>
            <p className="text-sm text-slate-500">Forecasted waste volume and model confidence in one view.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-sky-50 text-sky-700 px-3 py-1 font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            {averageConfidence}% average confidence
          </span>
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
              <Tooltip />
              <Area yAxisId="forecast" type="monotone" dataKey="forecast" stroke="#0ea5e9" fill="url(#forecastFill)" strokeWidth={3} name="Forecasted waste" />
              <Line yAxisId="confidence" type="monotone" dataKey="confidence" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Confidence %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {detections.map((detection) => (
          <div key={detection.title} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#0b1c30]">{detection.title}</div>
              <span className="rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-xs font-semibold capitalize">
                {detection.severity}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{detection.detail}</p>
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
              <span className="font-semibold">Fix: </span>{detection.action}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 text-amber-700 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Read this before ordering
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {data.predictiveAnalytics.seasonalTrends}. Watch high-turn minimart brands like {retailExamples.minimart.topBrands.slice(0, 4).join(', ')} and pharmacy items like {retailExamples.pharma.topBrands.slice(0, 4).join(', ')} because these are most exposed to over-ordering and expiry waste.
        </p>
      </section>
    </div>
  );
}
