import { and, asc, eq, inArray } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  company,
  qasChapter,
  qasIndicator,
  qasMeasurement,
  qasNorm,
  qasRequirement,
  qasRequirementState,
  qasSystem,
} from "@/lib/db/schema";
import { mediaCapitoli, mediaPesata, valutati } from "@/lib/calc/comune/valutazione";
import { statoIndicatore, type StatoIndicatore } from "@/lib/calc/sgiqas/motori";

// Le letture del Sistema di gestione integrato QAS.
//
// Sola lettura e nessun derivato persistito: conformità, stato degli indicatori e
// tendenze si ricalcolano a ogni apertura dalle funzioni pure — le stesse che useranno
// l'interfaccia e il documento.

/** I pesi del prototipo: «parzialmente conforme» vale metà. */
const PESI = { Conforme: 100, "Parzialmente conforme": 50, "Non conforme": 0 } as const;

/** Un numero scritto come testo, oppure `null`. Mai `Number("")`, che varrebbe zero. */
const num = (v: string | null): number | null => {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function getSgiQas(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [azienda] = await tx
      .select({ id: company.id, nome: company.nome, settore: company.settore, sede: company.sede })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!azienda) return null;

    const [sistema] = await tx
      .select()
      .from(qasSystem)
      .where(and(eq(qasSystem.companyId, companyId), eq(qasSystem.organizationId, orgId)));
    if (!sistema) return { azienda, sistema: null } as const;

    const [norme, capi, requisiti, stati, indicatori] = await Promise.all([
      tx.select().from(qasNorm).where(eq(qasNorm.setId, sistema.contentSetId)).orderBy(asc(qasNorm.ordine)),
      tx.select().from(qasChapter).where(eq(qasChapter.setId, sistema.contentSetId)).orderBy(asc(qasChapter.ordine)),
      tx
        .select()
        .from(qasRequirement)
        .where(eq(qasRequirement.setId, sistema.contentSetId))
        .orderBy(asc(qasRequirement.ordine)),
      tx
        .select()
        .from(qasRequirementState)
        .where(and(eq(qasRequirementState.systemId, sistema.id), eq(qasRequirementState.organizationId, orgId))),
      tx
        .select()
        .from(qasIndicator)
        .where(and(eq(qasIndicator.systemId, sistema.id), eq(qasIndicator.organizationId, orgId)))
        .orderBy(asc(qasIndicator.ordine)),
    ]);

    // ⚠️ Filtrata sugli indicatori DI QUESTO sistema, non su tutta l'organizzazione: uno
    // studio con venti aziende e venti indicatori ciascuna ha migliaia di rilevazioni, e
    // leggerle tutte per disegnarne una schermata sarebbe un costo che cresce col
    // portafoglio invece che col lavoro.
    const rilevazioni = indicatori.length
      ? await tx
          .select()
          .from(qasMeasurement)
          .where(
            and(
              eq(qasMeasurement.organizationId, orgId),
              inArray(qasMeasurement.indicatorId, indicatori.map((i) => i.id)),
            ),
          )
          .orderBy(asc(qasMeasurement.periodo))
      : [];

    // ⚠️ IL PERIMETRO DECIDE COSA SI CONTA. Un cliente certificato solo ISO 9001 ha 57
    // requisiti, non 107: calcolare l'indice su tutti e 107 gli mostrerebbe una
    // percentuale che non significa niente per lui, e gli chiederebbe di ignorare
    // cinquanta righe che non lo riguardano — il modo più rapido per fargli abbandonare
    // il percorso.
    const inPerimetro = requisiti.filter((r) => r.norme.some((n) => sistema.norme.includes(n)));
    const perChiave = new Map(stati.map((s) => [s.requirementKey, s]));

    const perCapitolo = capi.map((c) => {
      const suoi = inPerimetro.filter((r) => r.chapterKey === c.key);
      const valori = suoi.map((r) => perChiave.get(r.key)?.stato ?? null);
      return {
        capitolo: c,
        requisiti: suoi.length,
        valutati: valutati(valori),
        indice: mediaPesata(valori, PESI),
      };
    });

    // La conformità anche PER NORMA: è la domanda che si fa prima di un audit, e la
    // media complessiva non la risponde.
    const perNorma = norme
      .filter((n) => sistema.norme.includes(n.key))
      .map((n) => {
        const suoi = requisiti.filter((r) => r.norme.includes(n.key));
        const valori = suoi.map((r) => perChiave.get(r.key)?.stato ?? null);
        return {
          norma: n,
          requisiti: suoi.length,
          valutati: valutati(valori),
          indice: mediaPesata(valori, PESI),
        };
      });

    const perIndicatore = new Map<string, typeof rilevazioni>();
    for (const r of rilevazioni) {
      const lista = perIndicatore.get(r.indicatorId);
      if (lista) lista.push(r);
      else perIndicatore.set(r.indicatorId, [r]);
    }

    const conStato = indicatori.map((i) => {
      const serie = (perIndicatore.get(i.id) ?? []).filter((r) => num(r.valore) !== null);
      const ultimo = serie.length ? serie[serie.length - 1] : null;
      const penultimo = serie.length > 1 ? serie[serie.length - 2] : null;
      const stato: StatoIndicatore = statoIndicatore(
        { target: num(i.target), soglia: num(i.soglia), versoPositivo: i.versoPositivo },
        ultimo ? num(ultimo.valore) : null,
      );
      const d = ultimo && penultimo ? (num(ultimo.valore) ?? 0) - (num(penultimo.valore) ?? 0) : 0;
      return {
        ...i,
        serie,
        ultimo,
        stato,
        // Il verso della tendenza è relativo al verso dell'indicatore: per le non
        // conformità «meno» è un miglioramento, e una freccia che punta in giù col
        // colore del peggioramento sarebbe una bugia grafica.
        tendenza: d === 0 ? 0 : (d > 0) === i.versoPositivo ? 1 : -1,
      };
    });

    return {
      azienda,
      sistema,
      norme,
      capi,
      requisiti,
      inPerimetro,
      stati,
      indicatori: conStato,
      conformita: {
        perCapitolo,
        perNorma,
        indice: mediaCapitoli(perCapitolo.map((c) => c.indice)),
        valutati: perCapitolo.reduce((a, c) => a + c.valutati, 0),
        totale: inPerimetro.length,
      },
    };
  });
}
