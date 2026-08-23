import type { getSgiQas } from "@/features/sgiqas/queries";
import type { StatoIndicatore } from "@/lib/calc/sgiqas/motori";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono.

type Lettura = NonNullable<Awaited<ReturnType<typeof getSgiQas>>>;
export type DatiSgiQas = Lettura & { sistema: NonNullable<Lettura["sistema"]> };

export type Indicatore = DatiSgiQas["indicatori"][number];
export type Capitolo = DatiSgiQas["conformita"]["perCapitolo"][number];

/** I colori degli stati di un indicatore. */
export const COLORE_STATO: Record<StatoIndicatore, string> = {
  ok: "var(--success)",
  mid: "var(--warning)",
  no: "var(--destructive)",
  nd: "var(--muted-foreground)",
};

export const NOME_STATO: Record<StatoIndicatore, string> = {
  ok: "a target",
  mid: "sotto il target",
  no: "fuori soglia",
  nd: "non rilevato",
};

export const COLORE_CONFORMITA: Record<string, string> = {
  Conforme: "var(--success)",
  "Parzialmente conforme": "var(--warning)",
  "Non conforme": "var(--destructive)",
  "Non applicabile": "var(--muted-foreground)",
};

/** Il nome esteso di una norma dalla sua lettera, per le pastiglie. */
export const NOME_NORMA: Record<string, string> = { Q: "Qualità", A: "Ambiente", S: "Sicurezza" };
