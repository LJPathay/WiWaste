import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Package,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { reorder as reorderApi, type ApiReorderSuggestion, type ApiReorderSummary } from '../../services/api';

export function ReorderDashboard() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
      const [safetyMultiplier, setSafetyMultiplier] = useState(1.5);
  const [autoApprove, setAutoApprove] = useState(false);
  const [maxCost, setMaxCost] = useState('');
  const [suggestions, setSuggestions] = useState<ApiReorderSuggestion[]>([]);
  const [summary, setSummary] = useState<ApiReorderSummary | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<ApiReorderSuggestion[] | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reorderApi.index({ safety_stock_multiplier: safetyMultiplier });
      setSuggestions(res.suggestions);
      setSummary(res.summary);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [safetyMultiplier]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleApprove = async (supplierSuggestions: ApiReorderSuggestion[]) => {
    try {
      await reorderApi.approve({ suggestions: supplierSuggestions });
      success('Purchase orders created successfully.');
      loadSuggestions();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleAutoApprove = async () => {
    const maxCostValue = maxCost ? parseFloat(maxCost) : undefined;
    try {
      await reorderApi.autoApprove({
        criteria: {
          max_cost_per_po: maxCostValue,
        }
      });
      success('Auto-approval completed.');
      loadSuggestions();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to auto-approve');
    }
  };

  const handleConfirmApprove = () => {
    if (confirmApprove) {
      handleApprove(confirmApprove);
      setConfirmApprove(null);
    }
  };

  const filteredSuggestions = useMemo(() => suggestions, [suggestions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reorder Suggestions</h1>
          <p className="text-sm text-muted-fg dark:text-muted-fg mt-1">
            Auto-generated purchase order drafts based on stock levels, sales velocity, and expiry awareness
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadSuggestions}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Refreshing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Refresh
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-fg dark:text-muted-fg">Safety Multiplier:</label>
            <select
              value={safetyMultiplier}
              onChange={(e) => setSafetyMultiplier(parseFloat(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="1.0">1.0x (Conservative)</option>
              <option value="1.5">1.5x (Balanced)</option>
              <option value="2.0">2.0x (Aggressive)</option>
              <option value="2.5">2.5x (Very Aggressive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border dark:border-slate-700">
            <div className="text-sm text-muted-fg dark:text-muted-fg">Total Products Analyzed</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total_products_analyzed}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border dark:border-slate-700">
            <div className="text-sm text-muted-fg dark:text-muted-fg">Products Needing Reorder</div>
            <div className="text-2xl font-bold text-amber-600">{summary.products_needing_reorder}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border dark:border-slate-700">
            <div className="text-sm text-muted-fg dark:text-muted-fg">Suppliers Involved</div>
            <div className="text-2xl font-bold text-blue-600">{summary.suppliers_involved}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border dark:border-slate-700">
            <div className="text-sm text-muted-fg dark:text-muted-fg">Est. Total Cost</div>
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(summary.estimated_total_cost)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-approve threshold:</label>
          <input
            type="number"
            placeholder="Max cost per PO (PHP)"
            value={maxCost}
            onChange={(e) => setMaxCost(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            min="0"
            step="100"
          />
          <label className="flex items-center gap-2 ml-4">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Auto-approve below threshold</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmApprove(filteredSuggestions)}
            disabled={filteredSuggestions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            Approve All ({filteredSuggestions.length})
          </button>
          {autoApprove && maxCost && (
            <button
              onClick={handleAutoApprove}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
            >
              <Zap className="w-4 h-4" />
              Auto-Approve (≤₱{maxCost})
            </button>
          )}
        </div>
      </div>

      {/* Supplier Grouped Suggestions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 overflow-hidden">
        {suggestions.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-muted-fg mb-4" />
            <p className="text-muted-fg dark:text-muted-fg">No reorder suggestions at this time</p>
            <p className="text-sm text-muted-fg dark:text-muted-fg mt-1">All products are above their reorder levels</p>
          </div>
        ) : (
          <div className="p-4 border-b border-border dark:border-slate-700 flex flex-wrap gap-4 items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {suggestions.length} supplier{filteredSuggestions.length !== 1 ? 's' : ''} with reorder suggestions
            </h3>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg dark:bg-slate-800/50 border-b border-border dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-fg dark:text-muted-fg">Supplier</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">Items</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">Est. Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">Lead Time</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">Expiry Adj.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {suggestions.map((supplier) => {
                  const hasExpiryAdjustments = supplier.items.some((i: any) => (i.expiry_adjustment ?? 0) > 0);
                  return (
                    <tr key={supplier.supplier_id} className="hover:bg-bg dark:hover:bg-slate-700/50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{supplier.supplier_name}</div>
                        <div className="text-xs text-muted-fg dark:text-muted-fg">ID: {supplier.supplier_id}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm">{supplier.total_items}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-brand-600 dark:text-brand-400">{formatCurrency(supplier.estimated_total_cost)}</td>
                      <td className="px-3 py-3 text-right text-sm text-muted-fg dark:text-muted-fg">{supplier.lead_time_days} days</td>
                      <td className="px-3 py-3 text-right">
                        {hasExpiryAdjustments && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                            <Zap className="w-3 h-3" />
                            Expiry adjusted
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => setConfirmApprove([supplier])}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                            bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={handleConfirmApprove}
        title="Approve All Suggestions"
        message="Create draft purchase orders for all suggested items? This will create {confirmApprove?.length ?? 0} draft POs."
      />
    </div>
  );
}