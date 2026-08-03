import { Skeleton, SkeletonTestata, SkeletonElenco } from "@/components/ui/skeleton";

// Segnaposto generico dell'app: si applica a ogni rotta che non ne abbia uno
// piu specifico. Esiste perche senza, fra il clic e la pagina non appariva
// nulla e la navigazione si leggeva come bloccata.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SkeletonTestata />
      <Skeleton className="mt-8 h-4 w-40" />
      <div className="mt-3">
        <SkeletonElenco righe={4} />
      </div>
    </div>
  );
}
