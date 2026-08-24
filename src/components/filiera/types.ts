import type { getFiliera } from "@/features/filiera/queries";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono.

type Lettura = NonNullable<Awaited<ReturnType<typeof getFiliera>>>;
export type DatiFilieraPieno = Lettura & { programma: NonNullable<Lettura["programma"]> } & {
  dimensioni: NonNullable<Lettura["dimensioni"]>;
  aree: NonNullable<Lettura["aree"]>;
  flags: NonNullable<Lettura["flags"]>;
  fasi: NonNullable<Lettura["fasi"]>;
  partner: NonNullable<Lettura["partner"]>;
  quadro: NonNullable<Lettura["quadro"]>;
};
