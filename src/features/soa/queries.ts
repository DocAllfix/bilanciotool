import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, ratingScale, soaControl, soaFramework, soaSection } from "@/lib/db/schema";
import {
  chiaveControllo, computeSoa,
  type Controllo, type Decisione, type StatoAttuazione,
} from "@/lib/calc/soa/scoring";
import { buildPlan } from "@/lib/calc/soa/plan";
import { checkControlli, checkProfilo } from "@/lib/calc/soa/checks";
import { getDeclaration, listDecisions, listModules } from "./declarations";
import { PROFILO_RICHIESTI, type ProfiloSoa } from "./validation";

// Composizione dei dati del percorso SoA: un solo punto di lettura.
// Indice, punteggi per quadro e sezione, piano e rilievi si calcolano QUI in
// lettura e non si persistono mai, salvo dentro la Dichiarazione pubblicata.

export type SoaData = NonNullable<Awaited<ReturnType<typeof getSoaData>>>;

export async function getSoaData(userId: string, orgId: string, companyId: string) {
  const az = await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    return row ?? null;
  });
  if (!az) return null;

  const azienda = { id: az.id, nome: az.nome, settore: az.settore, sede: az.sede };
  const dichiarazione = await getDeclaration(userId, orgId, companyId);
  if (!dichiarazione) return { azienda, dichiarazione: null, catalogo: null, stato: null, esito: null };

  const setId = dichiarazione.contentSetId;
  const [quadri, sezioni, controlli, scale, moduli, decisioni] = await Promise.all([
    db.select().from(soaFramework).where(eq(soaFramework.setId, setId)).orderBy(asc(soaFramework.ordine)),
    db.select().from(soaSection).where(eq(soaSection.setId, setId)).orderBy(asc(soaSection.ordine)),
    db.select().from(soaControl).where(eq(soaControl.setId, setId)).orderBy(asc(soaControl.ordine)),
    db.select().from(ratingScale).where(eq(ratingScale.setId, setId)),
    listModules(userId, orgId, dichiarazione.id),
    listDecisions(userId, orgId, dichiarazione.id),
  ]);

  const moduliAttivi: Record<string, boolean> = {};
  for (const m of moduli) moduliAttivi[m.frameworkKey] = m.attivo;
  const sempreInAmbito = new Set(quadri.filter((q) => q.sempreInAmbito).map((q) => q.key));

  const catalogoMotore: Controllo[] = controlli.map((c) => ({
    frameworkKey: c.frameworkKey,
    sectionKey: c.sectionKey,
    controlloId: c.controlloId,
    cardine: c.cardine,
  }));

  const perChiave: Record<string, Decisione> = {};
  for (const d of decisioni) {
    perChiave[chiaveControllo(d.frameworkKey, d.controlloId)] = {
      applicabile: d.applicabile,
      stato: d.stato as StatoAttuazione | null,
      giustificazione: d.giustificazione,
      motivazioni: d.motivazioni,
      riferimentoDoc: d.riferimentoDoc,
      responsabile: d.responsabile,
    };
  }

  const esito = computeSoa(catalogoMotore, perChiave, moduliAttivi, sempreInAmbito);
  const piano = buildPlan(esito, perChiave);
  const profilo = (dichiarazione.profilo ?? {}) as ProfiloSoa;

  const rilievi = checkControlli(esito, perChiave);
  const avvisi = checkProfilo({
    ruoloPrivacy: dichiarazione.ruoloPrivacy,
    ruoloCloud: dichiarazione.ruoloCloud,
    moduliAttivi,
    scope: profilo.scope,
    approvato: profilo.approvato,
  });

  // Il piano porta il proprio avanzamento, che vive sulla riga della decisione.
  const decisionePer = new Map(decisioni.map((d) => [chiaveControllo(d.frameworkKey, d.controlloId), d]));
  const pianoConStato = piano.map((v) => {
    const d = decisionePer.get(chiaveControllo(v.frameworkKey, v.controlloId));
    return {
      ...v,
      responsabile: d?.responsabile ?? null,
      scadenza: d?.scadenza ?? null,
      statoAzione: d?.statoAzione ?? null,
    };
  });

  const inAmbitoKeys = new Set(esito.inAmbito.map((c) => chiaveControllo(c.frameworkKey, c.controlloId)));

  return {
    azienda,
    dichiarazione: {
      id: dichiarazione.id,
      contentSetId: setId,
      sogliaObiettivo: dichiarazione.sogliaObiettivo,
      ruoloPrivacy: dichiarazione.ruoloPrivacy,
      ruoloCloud: dichiarazione.ruoloCloud,
      profilo,
      creataIl: dichiarazione.createdAt.toISOString(),
    },
    catalogo: {
      quadri: quadri.map((q) => ({
        key: q.key,
        nome: q.nome,
        abbreviazione: q.abbreviazione,
        descrizione: q.descrizione,
        sempreInAmbito: q.sempreInAmbito,
        colore: q.colore,
        totale: controlli.filter((c) => c.frameworkKey === q.key).length,
      })),
      sezioni: sezioni.map((s) => ({ key: s.key, frameworkKey: s.frameworkKey, nome: s.nome })),
      controlli: controlli.map((c) => ({
        frameworkKey: c.frameworkKey,
        sectionKey: c.sectionKey,
        controlloId: c.controlloId,
        titolo: c.titolo,
        evidenzaAttesa: c.evidenzaAttesa,
        cardine: c.cardine,
        rimandi: c.rimandi,
        inAmbito: inAmbitoKeys.has(chiaveControllo(c.frameworkKey, c.controlloId)),
      })),
      stati: (scale.find((s) => s.key === "stato")?.livelli ?? {}) as Record<string, { n: string; v: number }>,
      motivazioni: (scale.find((s) => s.key === "motivazione")?.livelli ?? {}) as Record<string, { n: string; ab: string }>,
      fasce: (scale.find((s) => s.key === "fascia")?.livelli ?? []) as { min: number; l: string }[],
    },
    stato: {
      moduliAttivi,
      decisioni: decisioni.map((d) => ({
        frameworkKey: d.frameworkKey,
        controlloId: d.controlloId,
        applicabile: d.applicabile,
        giustificazione: d.giustificazione,
        motivazioni: d.motivazioni,
        stato: d.stato,
        riferimentoDoc: d.riferimentoDoc,
        responsabile: d.responsabile,
        scadenza: d.scadenza,
        statoAzione: d.statoAzione,
        note: d.note,
      })),
      piano: pianoConStato,
      rilievi,
      avvisi,
      profiloCompilati: PROFILO_RICHIESTI.filter((k) => (profilo[k] ?? "").trim() !== "").length,
      profiloAttesi: PROFILO_RICHIESTI.length,
    },
    esito: {
      indice: esito.indice,
      fascia: esito.fascia,
      totale: esito.totale,
      applicabili: esito.applicabili,
      esclusi: esito.esclusi,
      conStato: esito.conStato,
      attuati: esito.attuati,
      pctCompletamento: esito.pctCompletamento,
      perFramework: esito.perFramework,
      perSezione: esito.perSezione,
      scartoDallObiettivo: esito.indice - dichiarazione.sogliaObiettivo,
      rilieviAperti: rilievi.reduce((s, r) => s + r.controlli.length, 0),
    },
  };
}
