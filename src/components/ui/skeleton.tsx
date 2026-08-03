import { cn } from "@/lib/utils";

// Segnaposto di caricamento.
//
// Serve a una cosa sola: dare una risposta immediata al clic. Ogni pagina
// dell'app è `force-dynamic` e la cache del router client è disattivata di
// proposito (i numeri devono riflettere l'ultima scrittura), quindi ogni
// navigazione aspetta il server. Senza un `loading.tsx` che renda questi
// segnaposto, fra il clic e la pagina non succede NIENTE, e la piattaforma si
// legge come lenta anche quando la query è veloce.
//
// L'animazione si ferma con `prefers-reduced-motion`: il segnaposto resta,
// pulsa soltanto chi ha accettato il movimento.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("motion-safe:animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Intestazione di pagina: titolo, sottotitolo, banda di numeri. */
export function SkeletonTestata({ numeri = 3 }: { numeri?: number }) {
  return (
    <>
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y py-4">
        {Array.from({ length: numeri }).map((_, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </>
  );
}

/** Elenco a righe dentro un riquadro. */
export function SkeletonElenco({ righe = 5, altezza = "h-14" }: { righe?: number; altezza?: string }) {
  return (
    <div className="divide-y rounded-xl border">
      {Array.from({ length: righe }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-4 px-5", altezza)}>
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
