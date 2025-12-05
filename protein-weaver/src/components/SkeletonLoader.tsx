import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="panel-card">
        <div className="panel-header">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <CardSkeleton />
    </div>
  );
}

