import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function LeakageDetectionPage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading leakage detection...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const leakageChart = [...data.profitLeakage]
    .sort((firstItem, secondItem) => secondItem.leakageAmount - firstItem.leakageAmount)
    .map((item) => ({
      name: item.category,
      amount: item.leakageAmount,
      percentage: item.percentage,
    }));
  const totalLeakage = data.profitLeakage.reduce((sum, item) => sum + item.leakageAmount, 0);
  const highestLeak = leakageChart[0];
  const leakageDetections = data.profitLeakage.map((item) => ({
    ...item,
    severity: item.leakageAmount >= 10000 ? 'Critical' : item.leakageAmount >= 7000 ? 'High' : 'Medium',
    share: Math.round((item.leakageAmount / totalLeakage) * 100),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">Leakage Detection</h2>
            <p className="text-sm text-slate-500">Ranked loss drivers so users can see where money is leaking first.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-rose-50 text-rose-700 px-3 py-1 font-semibold">
            <ShieldAlert className="h-3.5 w-3.5" />
            {currencyFormatter.format(totalLeakage)} total leakage
          </span>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leakageChart} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="amount" radius={[0, 12, 12, 0]} fill="#ef4444" name="Leakage amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl bg-rose-50 border border-rose-100 p-5 text-rose-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Biggest vulnerability: {highestLeak.name}</h3>
            <p className="mt-1 text-sm leading-6 text-rose-800/80">
              This category alone is leaking {currencyFormatter.format(highestLeak.amount)}. Treat it as the first investigation target before optimizing smaller issues.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {leakageDetections.map((item) => (
          <div key={item.category} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#0b1c30]">{item.category}</h3>
              <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">{item.severity}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Amount</div>
                <div className="mt-1 text-lg font-semibold text-[#0b1c30]">{currencyFormatter.format(item.leakageAmount)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Share of leakage</div>
                <div className="mt-1 text-lg font-semibold text-[#0b1c30]">{item.share}%</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{item.source}</p>
            <div className="mt-4 text-sm text-slate-700">
              <span className="font-semibold">Detection: </span>
              {item.percentage}% margin exposure needs review by store operations.
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
