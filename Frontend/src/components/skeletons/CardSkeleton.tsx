import { Skeleton } from '../ui/skeleton';

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className }: CardSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className ?? ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
