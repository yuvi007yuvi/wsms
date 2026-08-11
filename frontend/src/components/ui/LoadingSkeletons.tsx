import { Skeleton } from "@/components/ui/skeleton";

// The 3x2 grid of cards that resembles the user's screenshot
export function CardGridSkeleton() {
  const cards = Array.from({ length: 6 });
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {cards.map((_, i) => (
        <div key={i} className="flex flex-col space-y-3 p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// A standard table loading skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const rowArray = Array.from({ length: rows });
  
  return (
    <div className="w-full bg-white border border-slate-200 rounded-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-6 w-1/4" />
      </div>
      
      {/* Rows */}
      <div className="space-y-3">
        {rowArray.map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-8 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
