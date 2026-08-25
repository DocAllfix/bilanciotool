import { and, count, eq, isNotNull, or } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  documentSnapshot,
  ghgActivityRow,
  ghgInventory,
  kpiValue,
  materialityAssessment,
  narrativeSection,
  reportProject,
} from "@/lib/db/schema";

// I PONTI: tre delle otto fasi del metodo chiedono cose che il prodotto FA GIA'.
//
// ⚠️ QUI NON SI SCRIVE MAI NIENTE, ed e' il punto dell'intero file. La fase mostra lo
// stato del percorso e ci porta dentro; il dato resta dove nasce. E' la stessa forma del
// ponte GHG → Bilancio, che dal 2026 e' la fonte unica delle emissioni: la sezione
// emissioni del bilancio LEGGE dall'inventario, non ne tiene una copia.
//
// La tentazione opposta e' concreta: copiare nella scheda della fase 02 i temi materiali
// «cosi' il consulente li vede senza cambiare pagina». Il giorno dopo qualcuno corregge
// un punteggio nel Bilancio, la scheda mostra ancora il vecchio, e nessuno dei due sa
// quale sia quello buono. Un dato in due posti e' un dato in nessun posto.
//
// ⚠️ E il ponte NON avanza le fasi da solo. Sarebbe comodo: la fase 04 «si conclude» se
// l'inventario e' pubblicato. Ma lo stato della fase e' una dichiarazione del consulente
// — «questo pezzo di lavoro l'ho chiuso» — e dedurla da un dato tecnico gli toglierebbe
// di mano un giudizio che e' suo. Il ponte informa; chi decide e' chi firma.

export type StatoPonte = "mancante" | "vuoto" | "in-corso" | "pronto";

export type Ponte = {
  /** La fase del metodo che chiama in causa il percorso. */
  faseKey: string;
  /** Il modulo richiamato, come chiave del registro. */
  modulo: "ghg" | "bilancio";
  titolo: string;
  /** Che cosa la fase si aspetta da quel percorso. */
  richiesta: string;
  stato: StatoPonte;
  /** Il dettaglio numerico, quando c'e' qualcosa da contare. */
  dettaglio: string | null;
  href: string;
};

/** Il testo dello stato, senza inventare: dice cio' che si e' misurato. */
const TESTO: Record<StatoPonte, string> = {
  mancante: "Non ancora avviato",
  vuoto: "Avviato, ancora vuoto",
  "in-corso": "In lavorazione",
  pronto: "Pronto",
};

export function testoPonte(s: StatoPonte): string {
  return TESTO[s];
}

/**
 * Lo stato dei percorsi che le fasi 02, 04 e 06 richiamano, per un'azienda e un anno.
 *
 * Una lettura sola per tutti e tre i ponti: dentro una transazione `Promise.all` non
 * parallelizza — una connessione esegue un'istruzione per volta — ma evita di aprirne
 * tre, e su questo database aprire una transazione costa piu' della lettura.
 */
export async function pontiDelProgramma(
  userId: string,
  orgId: string,
  companyId: string,
  anno: number,
): Promise<Ponte[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx
      .select({ id: ghgInventory.id })
      .from(ghgInventory)
      .where(
        and(
          eq(ghgInventory.companyId, companyId),
          eq(ghgInventory.organizationId, orgId),
          eq(ghgInventory.anno, anno),
        ),
      )
      .limit(1);

    const [prog] = await tx
      .select({ id: reportProject.id })
      .from(reportProject)
      .where(
        and(
          eq(reportProject.companyId, companyId),
          eq(reportProject.organizationId, orgId),
          eq(reportProject.anno, anno),
        ),
      )
      .limit(1);

    const [nVoci, nTemi, nKpi, nCapitoli, pubblicati] = await Promise.all([
      inv
        ? tx.select({ n: count() }).from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inv.id))
        : Promise.resolve([{ n: 0 }]),
      prog
        ? tx
            .select({ n: count() })
            .from(materialityAssessment)
            .where(
              and(
                eq(materialityAssessment.projectId, prog.id),
                // ⚠️ Un tema «valutato» e' uno che ha ALMENO uno dei due punteggi. Nella
                // doppia materialita' i due assi si compilano in momenti diversi, e
                // pretenderli entrambi direbbe «non ancora avviato» a chi ha finito
                // meta' del lavoro.
                or(
                  isNotNull(materialityAssessment.scoreImpact),
                  isNotNull(materialityAssessment.scoreFinancial),
                ),
              ),
            )
        : Promise.resolve([{ n: 0 }]),
      tx
        .select({ n: count() })
        .from(kpiValue)
        .where(and(eq(kpiValue.companyId, companyId), eq(kpiValue.anno, anno))),
      prog
        ? tx
            .select({ n: count() })
            .from(narrativeSection)
            .where(and(eq(narrativeSection.projectId, prog.id), isNotNull(narrativeSection.contenuto)))
        : Promise.resolve([{ n: 0 }]),
      tx
        .select({ tipo: documentSnapshot.tipo })
        .from(documentSnapshot)
        .where(
          and(
            eq(documentSnapshot.companyId, companyId),
            eq(documentSnapshot.organizationId, orgId),
            eq(documentSnapshot.anno, anno),
          ),
        ),
    ]);

    const ghgPubblicato = pubblicati.some((d) => d.tipo === "ghg");
    const bilancioPubblicato = pubblicati.some((d) => d.tipo === "bilancio");

    const rottaGhg = `/aziende/${companyId}/ghg/${anno}`;
    const rottaBil = `/aziende/${companyId}/bilancio/${anno}`;

    return [
      {
        faseKey: "proc02",
        modulo: "bilancio",
        titolo: "Doppia materialità",
        richiesta: "I temi materiali si valutano nel Bilancio, con la matrice e le guide per tema.",
        stato: !prog
          ? "mancante"
          : nTemi[0].n === 0
            ? "vuoto"
            : nTemi[0].n < 18
              ? "in-corso"
              : "pronto",
        dettaglio: prog ? `${nTemi[0].n} temi su 18 valutati` : null,
        href: rottaBil,
      },
      {
        faseKey: "proc04",
        modulo: "ghg",
        titolo: "Emissioni e indicatori",
        richiesta:
          "Le emissioni si contano nell'Inventario GHG e gli indicatori nel Bilancio. Il «freeze» del dataset è la pubblicazione.",
        stato: !inv
          ? "mancante"
          : nVoci[0].n === 0
            ? "vuoto"
            : ghgPubblicato
              ? "pronto"
              : "in-corso",
        dettaglio: inv
          ? `${nVoci[0].n} voci di attività · ${nKpi[0].n} indicatori compilati${ghgPubblicato ? " · rapporto pubblicato" : ""}`
          : null,
        href: rottaGhg,
      },
      {
        faseKey: "proc06",
        modulo: "bilancio",
        titolo: "Capitoli e pubblicazione",
        richiesta:
          "Il racconto si scrive nei capitoli del Bilancio, con l'indice dei contenuti secondo lo standard scelto.",
        stato: !prog
          ? "mancante"
          : nCapitoli[0].n === 0
            ? "vuoto"
            : bilancioPubblicato
              ? "pronto"
              : "in-corso",
        dettaglio: prog
          ? `${nCapitoli[0].n} capitoli scritti${bilancioPubblicato ? " · bilancio pubblicato" : ""}`
          : null,
        href: rottaBil,
      },
    ];
  });
}
