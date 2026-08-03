import { withTenant } from "@/lib/db/tenant";
import { documentSnapshot } from "@/lib/db/schema";
import type { TipoDocumento } from "@/features/documents/tipi";
import { and, asc, eq, sql } from "drizzle-orm";

// Andamento nel tempo di un'azienda, letto DAGLI SNAPSHOT PUBBLICATI.
//
// Due ragioni per non costruirlo dai dati vivi, in ordine di importanza:
//
// 1. Correttezza. Lo snapshot è quello che hai davvero consegnato al cliente.
//    Un grafico costruito sui dati vivi mostrerebbe numeri che divergono dal PDF
//    che il cliente ha in mano, ed è peggio di nessun grafico.
// 2. Costo. Ricalcolare significherebbe eseguire il motore per ogni azienda e
//    ogni esercizio a ogni apertura di pagina. Qui si leggono valori già
//    congelati.
//
// PERCHÉ NON UNA COLONNA `sintesi` DEDICATA, che sarebbe più veloce da leggere:
// perché sarebbe un campo MUTABILE dentro un record immutabile. Il trigger della
// migrazione 0002 elenca le colonne bloccate una per una, quindi una colonna
// nuova nascerebbe libera di essere riscritta, e i 43 documenti già pubblicati
// resterebbero comunque vuoti. Si estraggono i valori dal JSONB al momento
// della lettura: nessuna migrazione, nessuna scappatoia nell'immutabilità, e
// funziona anche sullo storico che c'è già.
//
// L'estrazione avviene IN SQL con percorsi mirati: `dati` non viene mai portato
// in JavaScript per intero.

export type PuntoStorico = {
  /** Esercizio per i documenti annuali, numero di revisione per gli altri. */
  x: number;
  valore: number;
  versione: number;
  snapshotId: string;
  quando: Date;
};

export type SerieStorica = {
  tipo: TipoDocumento;
  titolo: string;
  unita: string;
  /** true se l'asse orizzontale è l'esercizio, false se è la revisione. */
  perEsercizio: boolean;
  /** Verso del miglioramento. Le emissioni che calano sono una buona notizia,
   *  un indice di maturità che cala è il contrario: senza questo, il colore
   *  della variazione direbbe la cosa sbagliata metà delle volte. */
  meglioSe: "sale" | "scende";
  punti: PuntoStorico[];
};

/** Dove sta il numero di testata dentro ciascuno snapshot, e come si chiama. */
const SERIE = {
  ghg: { path: ["risultati", "totL"], titolo: "Emissioni totali", unita: "tCO₂e", perEsercizio: true, meglioSe: "scende" },
  energetico: { path: ["risultati", "totali", "kwh"], titolo: "Energia in ingresso", unita: "kWh", perEsercizio: true, meglioSe: "scende" },
  attestato: { path: ["esito", "indice"], titolo: "Indice di prontezza ESG", unita: "/100", perEsercizio: false, meglioSe: "sale" },
  soa: { path: ["esito", "indice"], titolo: "Indice di maturità SGSI", unita: "/100", perEsercizio: false, meglioSe: "sale" },
} as const satisfies Partial<Record<TipoDocumento, Omit<SerieStorica, "tipo" | "punti"> & { path: string[] }>>;

// Il bilancio di sostenibilità non compare: non ha UN numero di testata che
// abbia senso seguire nel tempo. Metterci il conteggio dei temi materiali
// sarebbe un grafico che sale quando aggiungi righe, non quando migliori.

export async function getStorico(userId: string, orgId: string, companyId: string): Promise<SerieStorica[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const righe = await tx
      .select({
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        id: documentSnapshot.id,
        publishedAt: documentSnapshot.publishedAt,
        // Quattro estrazioni mirate, valutate dal database: `dati` resta lì.
        ghg: sql<string | null>`${documentSnapshot.dati} #>> '{risultati,totL}'`,
        energia: sql<string | null>`${documentSnapshot.dati} #>> '{risultati,totali,kwh}'`,
        indice: sql<string | null>`${documentSnapshot.dati} #>> '{esito,indice}'`,
      })
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, companyId), eq(documentSnapshot.organizationId, orgId)))
      .orderBy(asc(documentSnapshot.anno), asc(documentSnapshot.versione));

    const serie: SerieStorica[] = [];
    for (const [tipo, def] of Object.entries(SERIE) as [keyof typeof SERIE, (typeof SERIE)[keyof typeof SERIE]][]) {
      const grezzi = righe
        .filter((r) => r.tipo === tipo)
        .map((r) => {
          const testo = def.path[0] === "esito" ? r.indice : tipo === "ghg" ? r.ghg : r.energia;
          const valore = testo === null ? NaN : Number(testo);
          return { r, valore };
        })
        .filter(({ valore }) => Number.isFinite(valore));

      if (grezzi.length < 2) continue; // Un punto solo non è un andamento.

      // Per i documenti annuali si tiene l'ultima versione di ogni esercizio:
      // le revisioni dello stesso anno non sono passi nel tempo, sono correzioni.
      const perX = new Map<number, PuntoStorico>();
      for (const { r, valore } of grezzi) {
        const x = def.perEsercizio ? r.anno : r.versione;
        perX.set(x, { x, valore, versione: r.versione, snapshotId: r.id, quando: r.publishedAt });
      }
      const punti = [...perX.values()].sort((a, b) => a.x - b.x);
      if (punti.length < 2) continue;

      serie.push({ tipo, titolo: def.titolo, unita: def.unita, perEsercizio: def.perEsercizio, meglioSe: def.meglioSe, punti });
    }
    return serie;
  });
}
