import { and, asc, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  chainArea,
  chainDimension,
  chainFlagDef,
  chainPartner,
  chainPartnerScore,
  chainPhase,
  chainProgram,
  company,
} from "@/lib/db/schema";
import {
  AREE_CRITICHE,
  categoriaInerente,
  frequenzaVerifica,
  maturita,
  punteggioInerente,
  rischioResiduo,
  type Partner as PartnerCalcolo,
  type RischioResiduo,
} from "@/lib/calc/filiera/rischio";
import { RAPPORTI_VIVI, type StatoRapporto } from "./validation";

// La lettura del modulo filiera. Nessuna scrittura, nessun valore derivato persistito:
// il rischio si calcola, e il documento lo congela nello snapshot.

export type PartnerValutato = {
  partner: typeof chainPartner.$inferSelect;
  punteggi: Record<string, number>;
  /** Il rischio inerente, la maturità e il residuo, dal motore puro. */
  inerente: number;
  categoria: ReturnType<typeof categoriaInerente>;
  maturita: number;
  residuo: RischioResiduo | null;
  mesiVerifica: number | null;
  /** Le aree critiche lasciate in bianco: è ciò che il tetto della maturità punisce. */
  criticheMancanti: string[];
  vivo: boolean;
};

/** La chiave con cui un punteggio vive nella mappa: `dim:rp`, `area:min`. */
const chiavePunteggio = (genere: string, chiave: string) => `${genere}:${chiave}`;

export async function getFiliera(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [az] = await tx
      .select({ id: company.id, nome: company.nome, settore: company.settore })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!az) return null;

    const [programma] = await tx
      .select()
      .from(chainProgram)
      .where(and(eq(chainProgram.companyId, companyId), eq(chainProgram.organizationId, orgId)));
    if (!programma) return { azienda: az, programma: null };

    const set = programma.contentSetId;
    const [dimensioni, aree, flags, fasi, partner, punteggi] = await Promise.all([
      tx.select().from(chainDimension).where(eq(chainDimension.setId, set)).orderBy(asc(chainDimension.ordine)),
      tx.select().from(chainArea).where(eq(chainArea.setId, set)).orderBy(asc(chainArea.ordine)),
      tx.select().from(chainFlagDef).where(eq(chainFlagDef.setId, set)).orderBy(asc(chainFlagDef.ordine)),
      tx.select().from(chainPhase).where(eq(chainPhase.setId, set)).orderBy(asc(chainPhase.ordine)),
      tx
        .select()
        .from(chainPartner)
        .where(and(eq(chainPartner.programId, programma.id), eq(chainPartner.organizationId, orgId)))
        .orderBy(asc(chainPartner.ordine)),
      tx
        .select()
        .from(chainPartnerScore)
        .where(eq(chainPartnerScore.organizationId, orgId)),
    ]);

    const perPartner = new Map<string, Record<string, number>>();
    for (const s of punteggi) {
      const m = perPartner.get(s.partnerId) ?? {};
      m[chiavePunteggio(s.genere, s.chiave)] = s.valore;
      perPartner.set(s.partnerId, m);
    }

    const valutati: PartnerValutato[] = partner.map((p) => {
      const m = perPartner.get(p.id) ?? {};
      const perCalcolo: PartnerCalcolo = {
        paese: m["dim:rp"] ?? 0,
        settore: m["dim:rs"] ?? 0,
        prodotto: m["dim:rpr"] ?? 0,
        modello: m["dim:rm"] ?? 0,
        aree: Object.fromEntries(aree.map((a) => [a.key, m[`area:${a.key}`] ?? 0])),
        flag: p.flag.length > 0,
      };
      return {
        partner: p,
        punteggi: m,
        inerente: punteggioInerente(perCalcolo),
        categoria: categoriaInerente(perCalcolo),
        maturita: maturita(perCalcolo),
        residuo: rischioResiduo(perCalcolo),
        mesiVerifica: frequenzaVerifica(perCalcolo),
        criticheMancanti: AREE_CRITICHE.filter((k) => !(perCalcolo.aree[k] > 0)).map(
          (k) => aree.find((a) => a.key === k)?.nome ?? k,
        ),
        vivo: RAPPORTI_VIVI.includes(p.stato as StatoRapporto),
      };
    });

    // ⚠️ Ogni conteggio guarda i soli rapporti VIVI, spesa compresa. Nel prototipo la
    // spesa totale includeva i cessati mentre tutti i conteggi per numerosità no: un
    // cessato grosso schiacciava ogni percentuale di copertura, e la copertura è il
    // numero che la Dichiarazione annuale porta in prima pagina.
    const vivi = valutati.filter((v) => v.vivo);
    const spesaViva = vivi.reduce((a, v) => a + Number(v.partner.spesa ?? 0), 0);
    const spesaCoperta = vivi
      .filter((v) => v.residuo !== null)
      .reduce((a, v) => a + Number(v.partner.spesa ?? 0), 0);

    const perResiduo: Record<RischioResiduo, number> = { Critico: 0, Alto: 0, Medio: 0, Basso: 0 };
    for (const v of vivi) if (v.residuo) perResiduo[v.residuo] += 1;

    const quadro = {
      partnerTotali: valutati.length,
      partnerVivi: vivi.length,
      cessati: valutati.length - vivi.length,
      valutati: vivi.filter((v) => v.residuo !== null).length,
      perResiduo,
      spesaViva,
      spesaCoperta,
      /** La copertura si misura sulla SPESA, non sul numero: è la leva reale. */
      coperturaSpesa: spesaViva > 0 ? Math.round((spesaCoperta / spesaViva) * 100) : 0,
      coperturaNumero: vivi.length
        ? Math.round((vivi.filter((v) => v.residuo !== null).length / vivi.length) * 100)
        : 0,
      /** Quanti hanno lasciato in bianco almeno un'area critica: è la lacuna che conta. */
      conCriticheMancanti: vivi.filter((v) => v.residuo !== null && v.criticheMancanti.length > 0).length,
      /** Il riesame: nel prototipo il campo esisteva e nessuna vista lo scriveva. */
      riesameFatto: Boolean(programma.riesameData),
    };

    return { azienda: az, programma, dimensioni, aree, flags, fasi, partner: valutati, quadro };
  });
}

export type DatiFiliera = NonNullable<Awaited<ReturnType<typeof getFiliera>>>;
