import { Skeleton } from '../ui/skeleton';

interface ReadonlyTableSkeletonProps {
  readonly rows?: number;
  readonly columns?: number;
  readonly className?: string;
}

function colWidth(colIdx: number, totalColumns: number): string {
  if (colIdx === 0) return 'w-1/4';
  if (colIdx === totalColumns - 1) return 'w-1/6';
  return 'flex-1';
}

export function TableSkeleton({ rows = 5, columns = 5, className }: ReadonlyTableSkeletonProps) {
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`col-${columns}-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <div key={`row-${rows}-${rowIdx}`} className="flex gap-4">
          {Array.from({ length: columns }, (_, colIdx) => (
            <Skeleton
              key={`cell-${rows}-${rowIdx}-${colIdx}`}
              className={`h-4 ${colWidth(colIdx, columns)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
