import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { kpiDefinition, narrativeTemplate, reportProject } from "@/lib/db/schema";
import { computeGap } from "@/lib/calc/report/gap-analysis";
import { eq } from "drizzle-orm";
import { conteggioParole } from "./validation";
import { getKpiYears } from "./kpi";
import { getMateriality } from "./materiality";
import { listTopicManagement } from "./policies";
import { listChapters } from "./chapters";

// Gap-analysis "pronto a pubblicare" (passo 6): compone gli input reali e delega
// al motore (contratto del prototipo). Solo lettura.

const CAMPI_PROFILO = ["forma", "piva", "sede", "settore", "ateco", "sitiop", "mercati", "contatto"];

export async function getGapAnalysis(userId: string, orgId: string, projectId: string) {
  const proj = await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select().from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    return p;
  });

  const [defsKpi, templates, kpiAnni, materialita, gestione, capitoli] = await Promise.all([
    db.select({ key: kpiDefinition.key }).from(kpiDefinition).where(eq(kpiDefinition.setId, proj.contentSetId)),
    db.select({ key: narrativeTemplate.key }).from(narrativeTemplate).where(eq(narrativeTemplate.setId, proj.contentSetId)),
    getKpiYears(userId, orgId, proj.companyId, [proj.anno, proj.anno - 1]),
    getMateriality(userId, orgId, projectId),
    listTopicManagement(userId, orgId, projectId),
    listChapters(userId, orgId, projectId),
  ]);

  const gestionePer = new Map(gestione.map((g) => [g.topicKey, g]));
  const capitoloPer = new Map(capitoli.map((c) => [c.templateKey, c]));

  return computeGap({
    profilo: proj.profilo as Record<string, string>,
    profiloFields: CAMPI_PROFILO,
    kpiCorrente: kpiAnni[proj.anno],
    kpiPrecedente: kpiAnni[proj.anno - 1],
    totalKpi: defsKpi.length,
    kpiKeys: defsKpi.map((d) => d.key),
    materialTopics: materialita.esito.materialKeys.map((key) => ({
      key,
      politica: gestionePer.get(key)?.politica ?? "",
      azioni: gestionePer.get(key)?.azioni ?? "",
    })),
    assessedTopics: materialita.esito.assessedCount,
    totalTopics: 18,
    capitoli: templates.map((t) => {
      const c = capitoloPer.get(t.key);
      return { key: t.key, parole: c ? conteggioParole(c.contenuto) : 0, media: c?.media.length ?? 0 };
    }),
    totalCapitoli: templates.length,
  });
}
