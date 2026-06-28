import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, TimerReset } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function getDaysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getDeadlineRisk(daysUntilDeadline: number) {
  if (daysUntilDeadline < 0) return { label: 'Missed', color: '#ef4444', tone: 'bg-rose-50 text-rose-700' };
  if (daysUntilDeadline <= 10) return { label: 'Urgent', color: '#f59e0b', tone: 'bg-amber-50 text-amber-700' };
  return { label: 'Open', color: '#14b8a6', tone: 'bg-emerald-50 text-emerald-700' };
}

export function VendorCreditsPage() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading vendor credits...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const vendorChart = data.vendorReturns.map((item) => {
    const daysUntilDeadline = getDaysUntil(item.returnDeadline);
    return {
      name: item.vendorName,
      credit: item.eligibleCredit,
      risk: getDeadlineRisk(daysUntilDeadline),
      daysUntilDeadline,
    };
  });
  const totalCredits = data.vendorReturns.reduce((sum, item) => sum + item.eligibleCredit, 0);
  const missedWindows = vendorChart.filter((item) => item.daysUntilDeadline < 0);
  const urgentWindows = vendorChart.filter((item) => item.daysUntilDeadline >= 0 && item.daysUntilDeadline <= 10);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0b1c30]">Vendor Credit Recovery</h2>
            <p className="text-sm text-slate-500">Recoverable credit ranked by supplier and return-window risk.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 font-semibold">
            <CircleDollarSign className="h-3.5 w-3.5" />
            {currencyFormatter.format(totalCredits)} recoverable
          </span>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorChart} layout="vertical" margin={{ left: 48, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="credit" radius={[0, 12, 12, 0]} name="Eligible credit">
                {vendorChart.map((item) => (
                  <Cell key={item.name} fill={item.risk.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="text-sm text-slate-500">Missed windows</div>
          <div className="mt-2 text-3xl font-semibold text-[#0b1c30]">{missedWindows.length}</div>
          <p className="mt-3 text-sm text-slate-600">These credits are vulnerable because supplier return deadlines already passed.</p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="text-sm text-slate-500">Urgent windows</div>
          <div className="mt-2 text-3xl font-semibold text-[#0b1c30]">{urgentWindows.length}</div>
          <p className="mt-3 text-sm text-slate-600">Process these before credits convert into unrecoverable loss.</p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="text-sm text-slate-500">Pending returns</div>
          <div className="mt-2 text-3xl font-semibold text-[#0b1c30]">
            {data.vendorReturns.filter((item) => item.status === 'pending').length}
          </div>
          <p className="mt-3 text-sm text-slate-600">Pending items need proof of return, photos, and vendor claim submission.</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <TimerReset className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-[#0b1c30]">Return-window detections</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Vendor</th>
                <th className="px-5 py-3 text-left font-semibold">Risk</th>
                <th className="px-5 py-3 text-left font-semibold">Credit</th>
                <th className="px-5 py-3 text-left font-semibold">Deadline</th>
                <th className="px-5 py-3 text-left font-semibold">Problem</th>
              </tr>
            </thead>
            <tbody>
              {data.vendorReturns.map((vendor) => {
                const daysUntilDeadline = getDaysUntil(vendor.returnDeadline);
                const risk = getDeadlineRisk(daysUntilDeadline);
                return (
                  <tr key={vendor.vendorId} className="border-t border-slate-200">
                    <td className="px-5 py-4 font-semibold text-[#0b1c30]">{vendor.vendorName}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${risk.tone}`}>{risk.label}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{currencyFormatter.format(vendor.eligibleCredit)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)} days late` : `${daysUntilDeadline} days left`}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {daysUntilDeadline < 0 ? 'Return credit may be lost unless vendor grants exception.' : 'Claim should be prepared before the deadline closes.'}
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
