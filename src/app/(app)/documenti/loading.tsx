import { Skeleton, SkeletonTestata, SkeletonElenco } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SkeletonTestata numeri={1} />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>
      <div className="mt-6">
        <SkeletonElenco righe={6} altezza="h-[58px]" />
      </div>
    </div>
  );
}
