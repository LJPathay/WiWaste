import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock3, PackageSearch } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

function getRisk(daysToExpiry: number) {
  if (daysToExpiry <= 3) return { label: 'Critical', color: '#ef4444', tone: 'bg-rose-50 text-rose-700' };
  if (daysToExpiry <= 7) return { label: 'High', color: '#f59e0b', tone: 'bg-amber-50 text-amber-700' };
  return { label: 'Stable', color: '#14b8a6', tone: 'bg-emerald-50 text-emerald-700' };
}

export function FefoTrackingPage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading FEFO tracking...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const fefoChart = data.batchFEFO.map((item) => ({
    name: item.batchId.replace('-2026-', ' '),
    daysToExpiry: item.daysToExpiry,
    priceDrop: Number(((item.currentPrice - item.recommendedPrice) / item.currentPrice * 100).toFixed(1)),
    risk: getRisk(item.daysToExpiry),
  }));
  const criticalBatches = data.batchFEFO.filter((item) => item.daysToExpiry <= 7);
  const nearestBatch = [...data.batchFEFO].sort(
    (firstBatch, secondBatch) => firstBatch.daysToExpiry - secondBatch.daysToExpiry
  )[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">FEFO Tracking</h2>
            <p className="text-sm text-slate-500">Days to expiry with the price reduction needed to clear stock.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-amber-50 text-amber-700 px-3 py-1 font-semibold">
            <Clock3 className="h-3.5 w-3.5" />
            {criticalBatches.length} urgent batches
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fefoChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="days" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="drop" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <ReferenceLine yAxisId="days" y={7} stroke="#f59e0b" strokeDasharray="4 4" label="7-day risk line" />
              <Bar yAxisId="days" dataKey="daysToExpiry" name="Days to expiry" radius={[12, 12, 0, 0]}>
                {fefoChart.map((item) => (
                  <Cell key={item.name} fill={item.risk.color} />
                ))}
              </Bar>
              <Line yAxisId="drop" type="monotone" dataKey="priceDrop" name="Recommended price drop %" stroke="#0ea5e9" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl bg-amber-50 border border-amber-100 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <PackageSearch className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Nearest expiry: {nearestBatch.batchId}</h3>
            <p className="mt-1 text-sm leading-6 text-amber-800/80">
              This batch expires in {nearestBatch.daysToExpiry} days. Move it to front shelves and apply the recommended price of ${nearestBatch.recommendedPrice.toFixed(2)}.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-[#0b1c30]">Batch vulnerabilities</h3>
          <p className="text-sm text-slate-500">Each row explains the operational problem and exact price action.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Batch</th>
                <th className="px-5 py-3 text-left font-semibold">Risk</th>
                <th className="px-5 py-3 text-left font-semibold">Days</th>
                <th className="px-5 py-3 text-left font-semibold">Current</th>
                <th className="px-5 py-3 text-left font-semibold">Recommended</th>
                <th className="px-5 py-3 text-left font-semibold">Problem</th>
              </tr>
            </thead>
            <tbody>
              {data.batchFEFO.map((batch) => {
                const risk = getRisk(batch.daysToExpiry);
                return (
                  <tr key={batch.batchId} className="border-t border-slate-200">
                    <td className="px-5 py-4 font-semibold text-[#0b1c30]">{batch.batchId}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${risk.tone}`}>{risk.label}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{batch.daysToExpiry}</td>
                    <td className="px-5 py-4 text-slate-600">${batch.currentPrice.toFixed(2)}</td>
                    <td className="px-5 py-4 text-slate-600">${batch.recommendedPrice.toFixed(2)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {batch.daysToExpiry <= 7 ? 'Expiry window is close; stock can become unsellable.' : 'Monitor rotation so this does not become urgent.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
