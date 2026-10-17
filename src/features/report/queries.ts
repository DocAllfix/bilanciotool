import { consumiDellAnno, proposteKpi } from "@/features/ponti/consumi";
import { dbCorrente, withTenant } from "@/lib/db/tenant";
import { company, kpiDefinition, kpiSection, materialityTopic, narrativeTemplate, reportProject } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { getMateriality } from "./materiality";
import { getKpiYears } from "./kpi";
import { listTopicManagement } from "./policies";
import { listChapters } from "./chapters";
import { getGapAnalysis } from "./gap";
import { getEmissionsBridge, checkCoherence } from "./ghg-bridge";
import { listReportProjects } from "./projects";
import { signedUrl } from "@/lib/storage";
import { deriveKpi, DEFAULT_CONVERSION_FACTORS, type DerivedKpi } from "@/lib/calc/report/derived-kpi";
import { generateDraft, DRAFT_KEYS, type DraftKey } from "@/lib/calc/report/narrative-drafts";
import { toFixedStr, type Decimal } from "@/lib/calc/shared/decimal";
import { conteggioParole } from "./validation";

// Composizione dati per la pagina del percorso Bilancio (un solo punto).

const serDerivati = (d: DerivedKpi): Record<string, string> =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [k, toFixedStr(v as Decimal, 6)]));

export type ReportWizardData = NonNullable<Awaited<ReturnType<typeof getReportWizardData>>>;

export async function getReportWizardData(userId: string, orgId: string, companyId: string, anno: number) {
  const base = await withTenant({ userId, orgId }, async (tx) => {
    const [az] = await tx.select().from(company).where(eq(company.id, companyId));
    if (!az) return null;
    const rows = await tx.select().from(reportProject).where(eq(reportProject.companyId, companyId));
    return { az, proj: rows.find((r) => r.anno === anno) ?? null };
  });
  if (!base) return null;

  const progetti = await listReportProjects(userId, orgId, companyId);
  const azienda = {
    id: base.az.id,
    nome: base.az.nome,
    settore: base.az.settore,
    sede: base.az.sede,
  };
  if (!base.proj) return { azienda, progetto: null, progetti, catalogo: null, stato: null };
  const proj = base.proj;

  const [temi, sezioni, defs, templates, materialita, kpiAnni, gestione, capitoli, gap, bridge, consumi] = await Promise.all([
    dbCorrente().select().from(materialityTopic).where(eq(materialityTopic.setId, proj.contentSetId)).orderBy(asc(materialityTopic.ordine)),
    dbCorrente().select().from(kpiSection).where(eq(kpiSection.setId, proj.contentSetId)).orderBy(asc(kpiSection.ordine)),
    dbCorrente().select().from(kpiDefinition).where(eq(kpiDefinition.setId, proj.contentSetId)).orderBy(asc(kpiDefinition.ordine)),
    dbCorrente().select().from(narrativeTemplate).where(eq(narrativeTemplate.setId, proj.contentSetId)).orderBy(asc(narrativeTemplate.ordine)),
    getMateriality(userId, orgId, proj.id),
    getKpiYears(userId, orgId, companyId, [anno, anno - 1]),
    listTopicManagement(userId, orgId, proj.id),
    listChapters(userId, orgId, proj.id),
    getGapAnalysis(userId, orgId, proj.id),
    getEmissionsBridge(userId, orgId, companyId, anno),
    withTenant({ userId, orgId }, (tx) => consumiDellAnno(tx, orgId, companyId, anno)),
  ]);
  // ⚠️ Le proposte per gli indicatori VUOTI dell'esercizio: consumi dal bilancio energetico o
  // dall'inventario GHG, addetti e ricavi dall'anagrafica. Si propongono, non si scrivono: il
  // dato resta dove nasce, e il consulente lo applica con un clic.
  const proposteKpiCorrente: Record<string, { valore: string; fonte: string }> = proposteKpi(consumi, kpiAnni[anno] ?? {});
  if (!(kpiAnni[anno]?.hr_tot ?? "").trim() && base.az.dipendenti != null) {
    proposteKpiCorrente.hr_tot = { valore: String(base.az.dipendenti), fonte: "dall'anagrafica dell'azienda (valore corrente)" };
  }
  if (!(kpiAnni[anno]?.ec_ric ?? "").trim() && base.az.fatturato != null) {
    proposteKpiCorrente.ec_ric = { valore: String(base.az.fatturato), fonte: "dall'anagrafica dell'azienda (valore corrente)" };
  }

  const derivati = deriveKpi(kpiAnni[anno], DEFAULT_CONVERSION_FACTORS);
  const derivatiPrec = deriveKpi(kpiAnni[anno - 1], DEFAULT_CONVERSION_FACTORS);

  // Bozze template-based per i capitoli vuoti (rule-based, niente AI).
  const profilo = proj.profilo as Record<string, string>;
  const bozze = Object.fromEntries(
    DRAFT_KEYS.map((k) => [
      k,
      generateDraft(k as DraftKey, {
        nome: base.az.nome,
        anno,
        settore: profilo.settore || base.az.settore || undefined,
        sede: profilo.sede || base.az.sede || undefined,
        dipendenti: kpiAnni[anno]?.hr_tot,
        materialiCount: materialita.esito.materialKeys.length,
        totalTopics: temi.length,
        soglia: materialita.soglia,
        standard: proj.standard,
        derived: derivati,
      }),
    ]),
  );

  const mediaConUrl = await Promise.all(
    capitoli.flatMap((c) =>
      c.media.map(async (m) => ({
        sectionKey: c.templateKey,
        id: m.id,
        tipo: m.tipo,
        chartKey: m.chartKey,
        url: m.storageKey ? await signedUrl(orgId, m.storageKey, 3600) : null,
        didascalia: m.didascalia,
        credito: m.credito,
        larghezza: m.larghezza,
        posizione: m.posizione,
      })),
    ),
  );

  return {
    azienda,
    progetto: {
      id: proj.id,
      anno: proj.anno,
      standard: proj.standard,
      perimetro: proj.perimetro,
      profilo,
      soglia: materialita.soglia,
    },
    progetti,
    catalogo: {
      temi: temi.map((t) => ({
        key: t.key,
        pillar: t.pillar,
        nome: t.nome,
        riferimenti: t.riferimenti,
        guida: t.guida as { def: string; imp: string[]; fin: string[]; alto: string; ev: string },
      })),
      sezioni: sezioni.map((s) => ({ key: s.key, nome: s.nome, riferimenti: s.riferimenti, pillar: s.pillar })),
      kpi: defs.map((d) => ({ key: d.key, sectionKey: d.sectionKey, nome: d.nome, um: d.um, hint: d.hint })),
      capitoli: templates.map((t) => ({ key: t.key, nome: t.nome, hint: t.hint })),
    },
    stato: {
      materialita: {
        soglia: materialita.soglia,
        perTopic: materialita.esito.perTopic,
        materialKeys: materialita.esito.materialKeys,
        assessedCount: materialita.esito.assessedCount,
        // I temi proposti dal codice ATECO e non ancora toccati, col motivo.
        proposte: Object.fromEntries(
          materialita.valutazioni.filter((v) => v.propostaMotivo).map((v) => [v.topicKey, v.propostaMotivo as string]),
        ),
      },
      kpi: { corrente: kpiAnni[anno], precedente: kpiAnni[anno - 1], proposte: proposteKpiCorrente },
      derivati: serDerivati(derivati),
      derivatiPrecedente: serDerivati(derivatiPrec),
      gestione: gestione.map((g) => ({
        topicKey: g.topicKey,
        politica: g.politica,
        azioni: g.azioni,
        target: g.target,
        annoBase: g.annoBase,
        annoTarget: g.annoTarget,
        responsabile: g.responsabile,
      })),
      capitoli: capitoli.map((c) => ({
        templateKey: c.templateKey,
        contenuto: c.contenuto,
        parole: conteggioParole(c.contenuto),
      })),
      media: mediaConUrl,
      bozze,
      gap,
      bridge: {
        corrente: bridge.corrente,
        precedente: bridge.precedente,
        warnings: checkCoherence(kpiAnni[anno], bridge.corrente),
      },
    },
  };
}
