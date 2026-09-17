import { Skeleton } from '../ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={`h-4 ${colIdx === 0 ? 'w-1/4' : colIdx === columns - 1 ? 'w-1/6' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
