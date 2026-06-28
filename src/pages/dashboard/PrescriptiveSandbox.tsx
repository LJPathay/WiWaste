import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function getRiskStyle(riskLevel: string) {
  if (riskLevel === 'high') return { color: '#ef4444', tone: 'bg-rose-50 text-rose-700' };
  if (riskLevel === 'medium') return { color: '#f59e0b', tone: 'bg-amber-50 text-amber-700' };
  return { color: '#14b8a6', tone: 'bg-emerald-50 text-emerald-700' };
}

export function PrescriptiveSandboxPage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading prescriptive sandbox...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const scenarioChart = data.prescriptiveDecisions.map((item, index) => ({
    name: `S${index + 1}`,
    roi: item.expectedROI,
    riskLevel: item.riskLevel,
    scenario: item.scenario,
    style: getRiskStyle(item.riskLevel),
  }));
  const bestScenario = [...data.prescriptiveDecisions].sort(
    (firstItem, secondItem) => secondItem.expectedROI - firstItem.expectedROI
  )[0];
  const safestScenario = data.prescriptiveDecisions.find((item) => item.riskLevel === 'low') ?? data.prescriptiveDecisions[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">Decision Sandbox</h2>
            <p className="text-sm text-slate-500">Compare action plans by expected ROI and risk before committing operations.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-violet-50 text-violet-700 px-3 py-1 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            {data.prescriptiveDecisions.length} scenarios tested
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarioChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="roi" radius={[12, 12, 0, 0]} name="Expected ROI">
                {scenarioChart.map((item) => (
                  <Cell key={item.name} fill={item.style.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <Lightbulb className="h-5 w-5" />
            Safest move
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-800/80">
            {safestScenario.scenario}: {safestScenario.recommendation}
          </p>
        </div>
        <div className="rounded-3xl bg-violet-50 border border-violet-100 p-5 text-violet-900">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5" />
            Highest ROI move
          </div>
          <p className="mt-3 text-sm leading-6 text-violet-800/80">
            {bestScenario.scenario}: {currencyFormatter.format(bestScenario.expectedROI)} expected ROI, but check operational risk before rollout.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.prescriptiveDecisions.map((item, index) => {
          const style = getRiskStyle(item.riskLevel);
          return (
            <div key={item.scenario} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#0b1c30]">S{index + 1}: {item.scenario}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.tone}`}>
                  {item.riskLevel} risk
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.recommendation}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Expected ROI</div>
                  <div className="mt-1 text-lg font-semibold text-[#0b1c30]">{currencyFormatter.format(item.expectedROI)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">What to watch</div>
                  <div className="mt-1 text-sm font-semibold text-[#0b1c30]">
                    {item.riskLevel === 'high' ? 'Capital and execution risk' : item.riskLevel === 'medium' ? 'Process adoption risk' : 'Low rollout friction'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
