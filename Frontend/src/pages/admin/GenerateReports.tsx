import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface Compilation {
  id: string;
  reportName: string;
  generatedBy: string;
  date: string;
  size: string;
  status: 'Ready';
}

const REPORT_CARDS: ReportCard[] = [
  { id: 'waste', title: 'Waste Summary Report', description: 'Daily and weekly breakdown of waste items recorded across all categories.', icon: '🗂️' },
  { id: 'inventory', title: 'Inventory Movement Report', description: 'Track stock-in, stock-out, and adjustments over a selected period.', icon: '📦' },
  { id: 'supplier', title: 'Supplier Performance Report', description: 'Evaluate supplier delivery rates, return windows and order accuracy.', icon: '🚚' },
  { id: 'expiry', title: 'Expiry & Near-Expiry Report', description: 'Highlight items nearing expiration to minimize waste and losses.', icon: '⏰' },
  { id: 'category', title: 'Category Analysis Report', description: 'Breakdown of waste and inventory levels by product category.', icon: '📊' },
  { id: 'cost', title: 'Cost Impact Report', description: 'Estimate the financial impact of waste and spoilage across departments.', icon: '💰' },
];

const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const INITIAL_COMPILATIONS: Compilation[] = [
  { id: 'c1', reportName: 'Waste Summary Report', generatedBy: 'Lia Cruz', date: 'Jul 1, 2026', size: '214 KB', status: 'Ready' },
  { id: 'c2', reportName: 'Inventory Movement Report', generatedBy: 'John Store Ops', date: 'Jun 28, 2026', size: '185 KB', status: 'Ready' },
  { id: 'c3', reportName: 'Expiry & Near-Expiry Report', generatedBy: 'Mia Stockwell', date: 'Jun 25, 2026', size: '97 KB', status: 'Ready' },
  { id: 'c4', reportName: 'Category Analysis Report', generatedBy: 'Lia Cruz', date: 'Jun 20, 2026', size: '312 KB', status: 'Ready' },
];

export function GenerateReports() {
  const { toasts, dismiss, success } = useToast();

  const [compilations, setCompilations] = useState<Compilation[]>(INITIAL_COMPILATIONS);

  // Per-card generating state: id -> boolean
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Per-compilation downloading state: id -> boolean
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleGenerate = async (card: ReportCard) => {
    if (generatingIds.has(card.id)) return;
    setGeneratingIds(prev => new Set(prev).add(card.id));

    await new Promise(r => setTimeout(r, 2000));

    const newEntry: Compilation = {
      id: `c${Date.now()}`,
      reportName: card.title,
      generatedBy: 'Lia Cruz',
      date: TODAY,
      size: `${Math.floor(Math.random() * 300 + 80)} KB`,
      status: 'Ready',
    };

    setCompilations(prev => [newEntry, ...prev]);
    setGeneratingIds(prev => {
      const next = new Set(prev);
      next.delete(card.id);
      return next;
    });
    success(`"${card.title}" generated and ready for download.`);
  };

  const handleDownload = async (comp: Compilation) => {
    if (downloadingIds.has(comp.id)) return;
    setDownloadingIds(prev => new Set(prev).add(comp.id));
    await new Promise(r => setTimeout(r, 1000));
    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.delete(comp.id);
      return next;
    });
    success(`"${comp.reportName}" downloaded successfully.`);
  };

  return (
    <div className="space-y-8 w-full font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generate Reports</h1>
      </div>

      {/* Report Cards Grid */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => {
            const isGenerating = generatingIds.has(card.id);
            return (
              <div
                key={card.id}
                className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{card.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(card)}
                  disabled={isGenerating}
                  className="mt-auto inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Compilations Table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Recent Compilations</h2>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Report Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Generated By</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Size</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {compilations.map(comp => {
                  const isDownloading = downloadingIds.has(comp.id);
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          {comp.reportName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.generatedBy}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.date}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.size}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {comp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownload(comp)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline disabled:opacity-60 disabled:no-underline"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Downloading…
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
            {compilations.length} report{compilations.length !== 1 ? 's' : ''} compiled
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
