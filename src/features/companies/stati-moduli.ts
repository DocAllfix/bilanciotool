import { withTenant } from "@/lib/db/tenant";
import { radiciPerModulo } from "./radici";
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
  // ⚠️ FUORI dalla transazione: `radiciPerModulo` apre la propria, e annidarle esaurisce
  // il pool di connessioni. Vedi il commento in `radici.ts` — la dashboard si bloccava.
  const radici = await radiciPerModulo(userId, orgId);

  return withTenant({ userId, orgId }, async (tx) => {
    // ⚠️ DUE interrogazioni, non tredici. Le undici radici dei moduli arrivano da
    // `radiciModuli`, che le chiede in un viaggio solo con una UNION ALL — e che
    // `scadenzario.ts` condivide, perche' faceva le stesse identiche undici. Vedi il
    // commento in `radici.ts`: dentro una transazione `Promise.all` non parallelizza
    // niente, e con undici moduli la dashboard era passata da un secondo a quattro-otto.
    const [aziende, docs] = await Promise.all([
      tx
        .select({ id: company.id, nome: company.nome, isDemo: company.isDemo })
        .from(company)
        .where(and(eq(company.organizationId, orgId), eq(company.stato, "active")))
        .orderBy(desc(company.createdAt)),
      tx
        .select({
          companyId: documentSnapshot.companyId,
          tipo: documentSnapshot.tipo,
          anno: max(documentSnapshot.anno),
        })
        .from(documentSnapshot)
        .where(eq(documentSnapshot.organizationId, orgId))
        .groupBy(documentSnapshot.companyId, documentSnapshot.tipo),
    ]);

    const pubblicati = new Map(docs.map((d) => [`${d.companyId}|${d.tipo}`, d.anno ?? 0]));

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
  });
}
