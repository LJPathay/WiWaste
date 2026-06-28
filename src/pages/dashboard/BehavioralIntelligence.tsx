import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Brain, UsersRound } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function BehavioralIntelligencePage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading behavioral intelligence...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const behavioralChart = [...data.behavioralInsights]
    .sort((firstItem, secondItem) => secondItem.impact - firstItem.impact)
    .map((item) => ({
      name: item.patternId.replace('PATTERN-', 'P'),
      impact: item.impact,
      frequency: item.frequency,
      description: item.description,
    }));
  const totalImpact = data.behavioralInsights.reduce((sum, item) => sum + item.impact, 0);
  const topPattern = [...data.behavioralInsights].sort(
    (firstItem, secondItem) => secondItem.impact - firstItem.impact
  )[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">Behavioral Intelligence</h2>
            <p className="text-sm text-slate-500">Staff, customer, and partner behavior patterns causing preventable loss.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-violet-50 text-violet-700 px-3 py-1 font-semibold">
            <Brain className="h-3.5 w-3.5" />
            {currencyFormatter.format(totalImpact)} behavior impact
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={behavioralChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="impact" radius={[12, 12, 0, 0]} fill="#8b5cf6" name="Impact" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl bg-violet-50 border border-violet-100 p-5 text-violet-900">
        <div className="flex items-start gap-3">
          <UsersRound className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Top behavioral vulnerability: {topPattern.description}</h3>
            <p className="mt-1 text-sm leading-6 text-violet-800/80">
              This pattern appears {topPattern.frequency} times and costs about {currencyFormatter.format(topPattern.impact)}. Address it first because behavior fixes often reduce repeated losses.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.behavioralInsights.map((item) => (
          <div key={item.patternId} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#0b1c30]">{item.description}</h3>
              <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">
                {item.frequency}x
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Loss impact</div>
                <div className="mt-1 text-lg font-semibold text-[#0b1c30]">{currencyFormatter.format(item.impact)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Problem type</div>
                <div className="mt-1 text-lg font-semibold text-[#0b1c30]">{item.patternId}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900">
              <span className="font-semibold">Recommended action: </span>{item.recommendation}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
