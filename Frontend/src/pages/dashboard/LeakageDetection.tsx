import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, AlertTriangle, ArrowLeft, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { lossRisk, type ApiLossRiskItem, type ApiLossRiskSummary, type RiskTier } from '../../services/api';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

const TIER_FILTERS: Array<{ label: string; value: 'All' | RiskTier }> = [
  { label: 'All', value: 'All' },
  { label: 'High Risk', value: 'High' },
  { label: 'Medium Risk', value: 'Medium' },
  { label: 'Low Risk', value: 'Low' },
];

function getSeverityStyle(tier: RiskTier) {
  if (tier === 'High') return {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    bar: 'bg-rose-500',
    border: 'border-l-rose-500',
  };
  if (tier === 'Medium') return {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    bar: 'bg-amber-500',
    border: 'border-l-amber-500',
  };
  return {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    bar: 'bg-sky-500',
    border: 'border-l-sky-500',
  };
}

function topDriver(item: ApiLossRiskItem): { name: string; value: number } {
  const entries = Object.entries(item.feature_importance ?? {});
  if (entries.length === 0) return { name: 'unknown factor', value: 0 };
  const [name, value] = entries.reduce((best, current) => (current[1] > best[1] ? current : best));
  return { name: name.replaceAll('_', ' '), value };
}

export function LeakageDetectionPage() {
  const [items, setItems] = useState<ApiLossRiskItem[]>([]);
  const [summary, setSummary] = useState<ApiLossRiskSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [tier, setTier] = useState<'All' | RiskTier>('All');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([lossRisk.items(), lossRisk.summary()])
      .then(([itemsPayload, summaryPayload]) => {
        setItems(itemsPayload.items);
        setSummary(summaryPayload.summary);
        setGeneratedAt(itemsPayload.generated_at);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      await lossRisk.predict();
      await loadResults();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const filteredItems = useMemo(
    () => (tier === 'All' ? items : items.filter((item) => item.risk_tier === tier)),
    [items, tier]
  );

  const categoryData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of items) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.expected_loss);
    }
    return [...byCategory.entries()]
      .map(([name, amount]) => ({ name: name || 'Uncategorized', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [items]);

  const topItem = useMemo(
    () => [...items].sort((a, b) => b.expected_loss - a.expected_loss)[0],
    [items]
  );

  const totalExpectedLoss = summary?.total_expected_loss ?? items.reduce((sum, item) => sum + item.expected_loss, 0);
  const highRiskCount = summary?.high_risk ?? items.filter((item) => item.risk_tier === 'High').length;
  const mediumRiskCount = summary?.medium_risk ?? items.filter((item) => item.risk_tier === 'Medium').length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading loss-risk data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5" /> Could not load loss-risk data
          </div>
          <p className="mt-1 text-sm">{error}</p>
          <p className="mt-3 text-xs text-rose-600/70 dark:text-rose-300/70">
            The XGBoost scoring service runs in Python. Start it with <code>uvicorn app.main:app --port 8001</code> then run a risk assessment.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRun} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            <RefreshCw className="h-4 w-4" /> Run Risk Assessment
          </button>
          <button onClick={loadResults} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const empty = items.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard?highlightKpi=1" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Loss-Risk Visibility</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
          <ShieldAlert className="h-3.5 w-3.5" /> Model: XGBoost
        </span>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Per-SKU probability of expiry, spoilage, damage or shrinkage loss, with expected loss in pesos.
          </TooltipContent>
        </UITooltip>
        <div className="ml-auto flex items-center gap-3">
          {generatedAt && (
            <span className="text-xs text-slate-400 dark:text-slate-500">Assessed {new Date(generatedAt).toLocaleString()}</span>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Scoring…' : 'Run Risk Assessment'}
          </button>
        </div>
      </div>

      {empty ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/10 dark:bg-slate-900">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">No risk scores yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Run a risk assessment to score every active SKU against the XGBoost loss model. Results are cached for an hour.
          </p>
          <button
            onClick={handleRun}
            disabled={running}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Scoring…' : 'Run Risk Assessment'}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/5">
              <div className="text-xs font-semibold uppercase tracking-widest text-rose-400 dark:text-rose-500">Total Expected Loss</div>
              <div className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-300">{currencyFormatter.format(totalExpectedLoss)}</div>
              <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-400/70">across {summary?.total_products ?? items.length} active SKUs</div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 dark:text-amber-500">Highest Risk SKU</div>
              <div className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{topItem?.product_name ?? '—'}</div>
              <div className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/70">
                {topItem ? `${(topItem.loss_probability * 100).toFixed(0)}% probability · ${currencyFormatter.format(topItem.expected_loss)}` : '—'}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">High-Risk SKUs</div>
              <div className="mt-2 text-3xl font-bold text-[#0b1c30] dark:text-slate-100">{highRiskCount}</div>
              <div className="mt-1 text-xs text-slate-500">{mediumRiskCount} medium-risk need review</div>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Expected Loss by Category</h2>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Sum of per-SKU expected loss (probability × unit cost × stock), largest first.
                  </TooltipContent>
                </UITooltip>
              </div>
              <span className="inline-flex items-center gap-2 text-xs rounded-full bg-rose-50 text-rose-700 px-3 py-1 font-semibold dark:bg-rose-500/10 dark:text-rose-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                {currencyFormatter.format(totalExpectedLoss)} at risk
              </span>
            </div>
            <div style={{ height: Math.max(categoryData.length, 1) * 56 + 40 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 80, top: 8, bottom: 8 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="amount" radius={[0, 12, 12, 0]} fill="#ef4444" name="Expected loss">
                    <LabelList dataKey="amount" position="right" formatter={(value: number) => currencyFormatter.format(value)} style={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {topItem && topItem.risk_tier === 'High' && (
            <section className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-5 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-orange-500/5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/20">
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-rose-900 dark:text-rose-200">Biggest Vulnerability: {topItem.product_name}</h3>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">PRIORITY</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-rose-800/80 dark:text-rose-200/70">
                    This SKU alone could lose <strong>{currencyFormatter.format(topItem.expected_loss)}</strong> ({topItem.days_to_expiry} days to expiry, {topItem.current_stock} on hand). Treat it as the first investigation target.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {TIER_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTier(filter.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    tier === filter.value
                      ? 'bg-[#0b1c30] text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const style = getSeverityStyle(item.risk_tier);
                const driver = topDriver(item);
                return (
                  <div key={item.product_id} className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 border-l-4 ${style.border} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">{item.product_name}</h3>
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${style.badge}`}>{item.risk_tier}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.sku} · {item.category} · {item.current_stock} units · {item.days_to_expiry} days to expiry
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 dark:bg-slate-800 dark:border-white/5">
                        <div className="text-xs font-medium text-slate-400">Expected Loss</div>
                        <div className="mt-1 text-lg font-bold text-[#0b1c30] dark:text-slate-100">{currencyFormatter.format(item.expected_loss)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 dark:bg-slate-800 dark:border-white/5">
                        <div className="text-xs font-medium text-slate-400">Loss Probability</div>
                        <div className="mt-1 text-lg font-bold text-[#0b1c30] dark:text-slate-100">{(item.loss_probability * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Risk exposure</span>
                        <span>{(item.loss_probability * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className={`h-2 rounded-full ${style.bar} transition-all`} style={{ width: `${Math.round(item.loss_probability * 100)}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Top driver: </span>
                      {driver.name} ({driver.value.toFixed(2)} importance)
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  No {tier === 'All' ? '' : `${tier.toLowerCase()}-risk `}items in the current assessment.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
