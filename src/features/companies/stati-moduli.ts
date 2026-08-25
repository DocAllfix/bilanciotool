import { withTenant } from "@/lib/db/tenant";
import { radiciPerModulo } from "./radici";
import { aziendeAttive, documentiDelloStudio } from "./lettori-condivisi";
import { company, documentSnapshot } from "@/lib/db/schema";
import { MODULI_AZIENDA, type ModuloAzienda } from "./moduli";
import type { StatoModulo } from "./fascicolo";
import { and, desc, eq, max } from "drizzle-orm";

// Stato dei cinque moduli per OGNI azienda dello studio, in un passaggio solo.
//
// Sette query aggregate per l'intero portafoglio, non cinque per azienda: con
// dieci aziende la differenza è fra sette viaggi e cinquanta. Il fascicolo
// (`fascicolo.ts`) fa la stessa cosa per una sola azienda e in più conta il
// riempimento; qui i conteggi non servono, serve lo stato.
//
// Da questa lettura sola nascono tre cose che prima erano tre query diverse:
// le caselle accese sulle card, la banda dei servizi dello studio e lo
// scadenzario.

export type StatoAziendaModulo = {
  modulo: ModuloAzienda;
  stato: StatoModulo;
  /** Esercizio più recente per i moduli annuali, null per gli altri. */
  anno: number | null;
  /** Esercizio più recente pubblicato, se esiste. */
  annoPubblicato: number | null;
};

export type AziendaConStati = {
  id: string;
  nome: string;
  isDemo: boolean;
  moduli: StatoAziendaModulo[];
};

export type ContoServizio = {
  modulo: ModuloAzienda;
  nome: string;
  avviati: number;
  pubblicati: number;
  totale: number;
};

export type StatiPortafoglio = {
  aziende: AziendaConStati[];
  /** Quante aziende hanno ciascun servizio avviato e quante pubblicato. */
  servizi: ContoServizio[];
};

export async function getStatiPortafoglio(userId: string, orgId: string): Promise<StatiPortafoglio> {
  // Ogni select porta il proprio filtro sull'organizzazione oltre alle policy
  // RLS: in sviluppo la connessione è privilegiata e le policy non scattano.
  // ⚠️ Le tre letture sono ora CONDIVISE: `cache()` di React le fa una volta per
  // richiesta, e la dashboard le chiedeva da tre parti diverse. Misurato col tracciatore:
  // `company` interrogata quattro volte, `document_snapshot` tre.
  const [radici, aziende, docs] = await Promise.all([
    radiciPerModulo(userId, orgId),
    aziendeAttive(userId, orgId),
    documentiDelloStudio(userId, orgId),
  ]);

  // ⚠️ Le undici radici dei moduli arrivano da `radiciModuli`, che le chiede in un viaggio
  // solo con una UNION ALL — e che `scadenzario.ts` condivide, perché faceva le stesse
  // identiche undici. Vedi il commento in `radici.ts`: dentro una transazione
  // `Promise.all` non parallelizza niente.
  {
    // L'anno più alto per azienda|tipo: si ricava dall'elenco già ordinato, invece di un
    // `group by` che sarebbe un viaggio in più.
    const pubblicati = new Map<string, number>();
    for (const d of docs) {
      const k = `${d.companyId}|${d.tipo}`;
      const a = pubblicati.get(k);
      if (a === undefined || d.anno > a) pubblicati.set(k, d.anno);
    }

    const conStati: AziendaConStati[] = aziende.map((a) => ({
      id: a.id,
      nome: a.nome,
      isDemo: a.isDemo,
      moduli: MODULI_AZIENDA.map((m) => {
        const radice = radici[m.href].get(a.id);
        const annoPubblicato = pubblicati.get(`${a.id}|${m.documenti[0]}`) ?? null;
        const anno = m.perEsercizio ? (radice?.anno ?? null) : null;
        return {
          modulo: m.href,
          // «Pubblicato» vuol dire che ESISTE un documento consegnato, non che
          // sia dell'esercizio in corso: quello è un ritardo, e lo dice lo
          // scadenzario. Qui la casella accesa risponde a «questo servizio è
          // stato erogato almeno una volta».
          stato: annoPubblicato !== null ? "pubblicato" : radice ? "in-corso" : "non-avviato",
          anno,
          annoPubblicato,
        };
      }),
    }));

    // Le aziende dimostrative non contano nei servizi dello studio: sono per
    // provare il prodotto, non lavoro consegnato a un cliente.
    const reali = conStati.filter((a) => !a.isDemo);
    const servizi: ContoServizio[] = MODULI_AZIENDA.map((m) => {
      const stati = reali.map((a) => a.moduli.find((x) => x.modulo === m.href)!.stato);
      return {
        modulo: m.href,
        nome: m.nome,
        avviati: stati.filter((s) => s !== "non-avviato").length,
        pubblicati: stati.filter((s) => s === "pubblicato").length,
        totale: reali.length,
      };
    });

    return { aziende: conStati, servizi };
  }
}
