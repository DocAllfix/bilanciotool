import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, ratingScale, supplierArea, supplierQuestion } from "@/lib/db/schema";
import { computeSupplier, type Domanda, type Risposta } from "@/lib/calc/supplier/scoring";
import { buildPlan } from "@/lib/calc/supplier/plan";
import { getAssessment, listAnswers } from "./assessments";
import { PROFILO_RICHIESTI, type ProfiloSupplier } from "./validation";

// Composizione dei dati del percorso fornitori: un solo punto di lettura.
// I derivati (indice, punteggi per area, piano) si calcolano QUI in lettura e
// non si persistono mai, salvo dentro l'attestato pubblicato.

export type SupplierData = NonNullable<Awaited<ReturnType<typeof getSupplierData>>>;

export async function getSupplierData(userId: string, orgId: string, companyId: string) {
  const az = await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx.select().from(company).where(eq(company.id, companyId));
    return row ?? null;
  });
  if (!az) return null;

  const azienda = { id: az.id, nome: az.nome, settore: az.settore, sede: az.sede };
  const valutazione = await getAssessment(userId, orgId, companyId);
  if (!valutazione) return { azienda, valutazione: null, catalogo: null, stato: null, esito: null };

  const setId = valutazione.contentSetId;
  const [aree, domande, scale, risposte] = await Promise.all([
    db.select().from(supplierArea).where(eq(supplierArea.setId, setId)).orderBy(asc(supplierArea.ordine)),
    db.select().from(supplierQuestion).where(eq(supplierQuestion.setId, setId)).orderBy(asc(supplierQuestion.ordine)),
    db.select().from(ratingScale).where(eq(ratingScale.setId, setId)),
    listAnswers(userId, orgId, valutazione.id),
  ]);

  const perDomanda = new Map(risposte.map((r) => [r.questionKey, r]));
  const mappaRisposte: Record<string, Risposta> = {};
  for (const r of risposte) if (r.risposta) mappaRisposte[r.questionKey] = r.risposta;

  const domandeMotore: Domanda[] = domande.map((q) => ({
    key: q.key,
    areaKey: q.areaKey,
    peso: q.peso,
    giorniStimati: q.giorniStimati,
  }));
  const evidenze = Object.fromEntries(domande.map((q) => [q.key, q.evidenzaAttesa]));

  const esitoCalc = computeSupplier(domandeMotore, mappaRisposte);
  const piano = buildPlan(domandeMotore, mappaRisposte, esitoCalc, evidenze);

  // Il piano porta il proprio stato di avanzamento, che vive sulla riga della
  // domanda: chi ci lavora, entro quando, a che punto è.
  const pianoConStato = piano.map((v) => {
    const r = perDomanda.get(v.key);
    return {
      ...v,
      responsabile: r?.responsabile ?? null,
      scadenza: r?.scadenza ?? null,
      statoAzione: r?.statoAzione ?? null,
    };
  });

  const profilo = (valutazione.profilo ?? {}) as ProfiloSupplier;
  const documentiDisponibili = risposte.filter((r) => r.statoDocumento === "disponibile").length;

  return {
    azienda,
    valutazione: {
      id: valutazione.id,
      contentSetId: setId,
      sogliaRichiesta: valutazione.sogliaRichiesta,
      profilo,
      creataIl: valutazione.createdAt.toISOString(),
    },
    catalogo: {
      aree: aree.map((a) => ({ key: a.key, nome: a.nome, peso: a.peso, colore: a.colore })),
      domande: domande.map((q) => ({
        key: q.key,
        areaKey: q.areaKey,
        peso: q.peso,
        testo: q.testo,
        riferimento: q.riferimento,
        evidenzaAttesa: q.evidenzaAttesa,
        giorniStimati: q.giorniStimati,
      })),
      fasce: (scale.find((s) => s.key === "fascia")?.livelli ?? []) as { min: number; l: string }[],
    },
    stato: {
      risposte: domande.map((q) => {
        const r = perDomanda.get(q.key);
        return {
          questionKey: q.key,
          risposta: r?.risposta ?? null,
          nota: r?.nota ?? null,
          statoDocumento: r?.statoDocumento ?? null,
          responsabile: r?.responsabile ?? null,
          scadenza: r?.scadenza ?? null,
          statoAzione: r?.statoAzione ?? null,
        };
      }),
      piano: pianoConStato,
      documentiDisponibili,
      profiloCompilati: PROFILO_RICHIESTI.filter((k) => (profilo[k] ?? "").trim() !== "").length,
      profiloAttesi: PROFILO_RICHIESTI.length,
    },
    esito: {
      indice: esitoCalc.indice,
      fascia: esitoCalc.fascia,
      valutate: esitoCalc.valutate,
      risposteDiMerito: esitoCalc.risposte,
      pctCompletamento: esitoCalc.pctCompletamento,
      perArea: Object.fromEntries(
        Object.entries(esitoCalc.perArea).map(([k, v]) => [
          k,
          { punteggio: v.punteggio, valutate: v.valutate, risposte: v.risposte, totale: v.totale },
        ]),
      ),
      /** Distanza dalla soglia chiesta dal committente: è la sola cifra che
       *  interessa davvero a chi legge l'attestato. */
      scartoDallaSoglia: esitoCalc.indice - valutazione.sogliaRichiesta,
      puntiRecuperabili: Number(piano.reduce((s, v) => s + v.punti, 0).toFixed(1)),
      giornateStimate: piano.reduce((s, v) => s + v.giorni, 0),
    },
  };
}
