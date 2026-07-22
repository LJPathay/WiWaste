import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  perPage?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, perPage = 20 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalItems ?? page * perPage);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500">
      {totalItems != null && (
        <span>Showing {from}–{to} of {totalItems} items</span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                pageNum === page
                  ? 'bg-[#006a61] text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === page ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
