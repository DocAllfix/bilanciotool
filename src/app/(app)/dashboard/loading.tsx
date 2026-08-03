import { Skeleton, SkeletonTestata } from "@/components/ui/skeleton";

// Segnaposto del portafoglio: ricalca la griglia di card e la colonna dello
// studio, cosi l'impaginato non salta quando arrivano i dati veri.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <SkeletonTestata />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border">
              <div className="space-y-2 p-5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="grid grid-cols-3 gap-3 border-t px-5 py-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 border-t bg-muted/40 p-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-11 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-8 lg:border-l lg:pl-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3.5 w-36" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-9 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
