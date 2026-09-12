import React, { useState, useEffect } from 'react';
import { Users, Phone, MapPin, Package, Loader2, Info, AlertCircle } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { suppliers as suppliersApi, type ApiSupplier, type ApiSupplierDetail } from '../../services/api';

export function Suppliers() {
  const [supplierList, setSupplierList] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<Record<number, ApiSupplierDetail>>({});
  const [detailLoading, setDetailLoading] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    suppliersApi.list()
      .then((data) => {
        if (!cancelled) {
          setSupplierList(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load suppliers');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleViewProducts = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailData[id]) {
      setDetailLoading(id);
      try {
        const detail = await suppliersApi.show(id);
        setDetailData((prev) => ({ ...prev, [id]: detail }));
      } catch {
        // silently fail — show empty state
      } finally {
        setDetailLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
            Suppliers
          </h1>
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              View suppliers and their products
            </TooltipContent>
          </UITooltip>
        </div>
        <span className="text-xs text-[#64748B] dark:text-slate-400">
          {supplierList.length} supplier{supplierList.length !== 1 ? 's' : ''}
        </span>
      </div>

      {supplierList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {supplierList.map((supplier) => {
            const detail = detailData[supplier.id];
            const isExpanded = expandedId === supplier.id;
            const isLoadingDetail = detailLoading === supplier.id;

            return (
              <div
                key={supplier.id}
                className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-sm"
              >
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                    {supplier.name}
                  </h3>
                  {supplier.contact_person && (
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      {supplier.contact_person}
                    </p>
                  )}
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono">{supplier.contact_number}</span>
                  </div>
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-[#64748B] dark:text-slate-400">
                    Products Supplied:{' '}
                    <span className="font-semibold text-[#0F172A] dark:text-slate-100">
                      {supplier.product_count ?? 0}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => handleViewProducts(supplier.id)}
                  className="w-full text-center text-sm font-medium text-[#0F766E] hover:text-[#0d6560] dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                >
                  {isExpanded ? 'Hide Products' : 'View Products'}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-white/10">
                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-[#0F766E]" />
                      </div>
                    ) : detail?.recent_products?.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                          Recent Products
                        </p>
                        {detail.recent_products.map((p) => (
                          <div
                            key={p.product_id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[#0F172A] dark:text-slate-100 truncate">
                              {p.product_name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.stock_status === 'Low'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            }`}>
                              {p.current_stock} units
                            </span>
                          </div>
                        ))}
                        {detail.low_stock_count > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {detail.low_stock_count} product{detail.low_stock_count !== 1 ? 's' : ''} below reorder level
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        No product data available
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Suppliers;
