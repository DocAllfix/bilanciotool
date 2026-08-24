import type { getSa8000 } from "@/features/sa8000/queries";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono.

type Lettura = NonNullable<Awaited<ReturnType<typeof getSa8000>>>;
export type DatiSa8000 = Lettura & { sistema: NonNullable<Lettura["sistema"]> };
