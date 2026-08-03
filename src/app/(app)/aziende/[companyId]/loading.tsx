import { Skeleton, SkeletonTestata, SkeletonElenco } from "@/components/ui/skeleton";

// Segnaposto valido per il fascicolo e per l'ingresso di ogni modulo: sono
// tutte pagine che aprono con una testata e un elenco o un percorso a passi.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SkeletonTestata numeri={2} />
      <Skeleton className="mt-8 h-3.5 w-36" />
      <div className="mt-3">
        <SkeletonElenco righe={5} altezza="h-[74px]" />
      </div>
    </div>
  );
}
