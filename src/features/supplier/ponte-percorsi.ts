import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  briberySystem, energyBalance, energyVectorInput, gdprSystem, ghgActivityRow, ghgInventory, ghgTarget, kpiValue,
  materialityAssessment, mogModel, reportProject, soaDeclaration, wbChannel, wbSystem,
} from "@/lib/db/schema";
import type { Suggerimento } from "./ponte-filiera";

// Le risposte dell'autovalutazione ESG che gli ALTRI percorsi della stessa azienda possono
// già dare (decisione del committente del 17 ottobre 2026: le voci si trovano da sole).
//
// ⚠️ Si PROPONGONO, col motivo, come il ponte con la filiera: è un'autovalutazione che
// qualcuno firma, e una risposta comparsa da sola è una risposta che nessuno ha dato. Il
// consulente la accetta con un clic, e solo dove la domanda è ancora vuota.
//
// ⚠️ Si propone solo ciò che i dati DIMOSTRANO. «Sì» quando il percorso c'è ed è compilato;
// mai «no» perché un percorso manca: l'azienda può avere quel presidio fuori dal prodotto.
//
// Tutto dentro un solo tenant: sono dati che lo studio ha già scritto per quell'azienda.

export async function suggerimentiDaPercorsi(userId: string, orgId: string, companyId: string): Promise<Suggerimento[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const out: Suggerimento[] = [];
    const nostro = <T extends { companyId: unknown; organizationId: unknown }>(t: T) =>
      and(eq(t.companyId as never, companyId), eq(t.organizationId as never, orgId));

    // ── Ambiente ──────────────────────────────────────────────────────────────
    const [bil] = await tx.select({ id: energyBalance.id, anno: energyBalance.anno }).from(energyBalance).where(nostro(energyBalance)).orderBy(desc(energyBalance.anno)).limit(1);
    if (bil) {
      const pieni = await tx.select({ k: energyVectorInput.vettoreKey }).from(energyVectorInput).where(and(eq(energyVectorInput.balanceId, bil.id), gt(energyVectorInput.quantita, "0")));
      if (pieni.length) out.push({ chiave: "E1", risposta: "si", motivo: `Il bilancio energetico ${bil.anno} rileva ${pieni.length} vettori con le loro quantità.` });
      if (pieni.some((p) => p.k === "fv" || p.k === "ele_go")) {
        out.push({ chiave: "E9", risposta: "si", motivo: `Il bilancio energetico ${bil.anno} registra energia autoprodotta o con garanzia d'origine.` });
      }
    }

    const [inv] = await tx.select({ id: ghgInventory.id, anno: ghgInventory.anno }).from(ghgInventory).where(nostro(ghgInventory)).orderBy(desc(ghgInventory.anno)).limit(1);
    if (inv) {
      const voci = await tx.select({ c: ghgActivityRow.categoryKey }).from(ghgActivityRow).where(and(eq(ghgActivityRow.inventoryId, inv.id), gt(ghgActivityRow.quantita, "0")));
      const cat = new Set(voci.map((v) => v.c));
      if (cat.has("1") && cat.has("2")) out.push({ chiave: "E2", risposta: "si", motivo: `L'inventario GHG ${inv.anno} quantifica Scope 1 e Scope 2.` });
      else if (cat.has("1") || cat.has("2")) out.push({ chiave: "E2", risposta: "parziale", motivo: `L'inventario GHG ${inv.anno} quantifica solo lo Scope ${cat.has("1") ? "1" : "2"}.` });
      const s3 = ["3", "4", "5", "6"].filter((c) => cat.has(c));
      if (s3.length) out.push({ chiave: "E3", risposta: "si", motivo: `L'inventario GHG ${inv.anno} stima ${s3.length} categorie indirette (Scope 3).` });
    }
    const [obiettivo] = await tx.select({ anno: ghgTarget.annoTarget }).from(ghgTarget).where(nostro(ghgTarget)).limit(1);
    if (obiettivo) out.push({ chiave: "E4", risposta: "si", motivo: `L'inventario GHG ha un obiettivo di riduzione al ${obiettivo.anno}.` });

    const kpi = await tx
      .select({ k: kpiValue.kpiKey, anno: kpiValue.anno })
      .from(kpiValue)
      .where(and(nostro(kpiValue), inArray(kpiValue.kpiKey, ["ri_np", "ri_p", "ac_prel", "si_inf", "hr_tot", "re_don", "ec_pag", "fo_eti"])));
    const haKpi = (k: string) => kpi.find((x) => x.k === k);
    const conAnno = (k: string, frase: string) => {
      const r = haKpi(k);
      return r ? `${frase} (bilancio di sostenibilità ${r.anno}).` : "";
    };
    if (haKpi("ri_np") || haKpi("ri_p")) out.push({ chiave: "E5", risposta: "si", motivo: conAnno(haKpi("ri_np") ? "ri_np" : "ri_p", "I rifiuti sono quantificati negli indicatori") });
    if (haKpi("ac_prel")) out.push({ chiave: "E6", risposta: "si", motivo: conAnno("ac_prel", "Il prelievo idrico è misurato negli indicatori") });

    // ── Sociale ───────────────────────────────────────────────────────────────
    if (haKpi("si_inf")) out.push({ chiave: "S2", risposta: "si", motivo: conAnno("si_inf", "Gli infortuni sono registrati negli indicatori") });
    if (haKpi("hr_tot")) out.push({ chiave: "S4", risposta: "si", motivo: conAnno("hr_tot", "L'organico è rendicontato negli indicatori") });
    if (haKpi("re_don")) out.push({ chiave: "S6", risposta: "si", motivo: conAnno("re_don", "Le retribuzioni per genere sono negli indicatori, e il divario si calcola") });

    // ── Base: temi rilevanti ──────────────────────────────────────────────────
    const valutati = await tx
      .select({ id: materialityAssessment.id })
      .from(materialityAssessment)
      .innerJoin(reportProject, eq(reportProject.id, materialityAssessment.projectId))
      .where(and(eq(reportProject.companyId, companyId), eq(reportProject.organizationId, orgId)));
    if (valutati.length) out.push({ chiave: "B3", risposta: "si", motivo: `L'analisi di doppia materialità del bilancio valuta ${valutati.length} temi.` });

    // ── Governance ────────────────────────────────────────────────────────────
    const [mog] = await tx.select({ id: mogModel.id }).from(mogModel).where(nostro(mogModel)).limit(1);
    if (mog) out.push({ chiave: "G2", risposta: "si", motivo: "Il Modello 231 è avviato nel percorso dedicato." });
    const [wb] = await tx.select({ id: wbSystem.id }).from(wbSystem).where(nostro(wbSystem)).limit(1);
    if (wb) {
      const canali = await tx.select({ attiva: wbChannel.attiva }).from(wbChannel).where(eq(wbChannel.systemId, wb.id));
      const attivi = canali.filter((c) => c.attiva).length;
      if (attivi) {
        out.push({
          chiave: "G3",
          risposta: attivi === canali.length ? "si" : "parziale",
          motivo: `${attivi} forme del canale di segnalazione attive su ${canali.length} (D.Lgs. 24/2023 le chiede tutte).`,
        });
      }
    }
    const [anti] = await tx.select({ id: briberySystem.id }).from(briberySystem).where(nostro(briberySystem)).limit(1);
    if (anti) out.push({ chiave: "G4", risposta: "si", motivo: "Il sistema di prevenzione della corruzione (UNI ISO 37001) è avviato." });
    const [gdpr] = await tx.select({ id: gdprSystem.id }).from(gdprSystem).where(nostro(gdprSystem)).limit(1);
    const [soa] = await tx.select({ id: soaDeclaration.id }).from(soaDeclaration).where(nostro(soaDeclaration)).limit(1);
    if (gdpr || soa) {
      out.push({
        chiave: "G6",
        risposta: "si",
        motivo: [gdpr && "il percorso di protezione dei dati", soa && "la dichiarazione di applicabilità ISO 27001"].filter(Boolean).join(" e ") + " sono avviati.",
      });
    }
    if (haKpi("ec_pag")) out.push({ chiave: "G7", risposta: "si", motivo: conAnno("ec_pag", "I tempi di pagamento ai fornitori sono negli indicatori") });
    if (haKpi("fo_eti")) out.push({ chiave: "G8", risposta: "si", motivo: conAnno("fo_eti", "La formazione su etica e anticorruzione è negli indicatori") });

    // La prima lettera maiuscola: alcuni motivi cominciano da un nome comune.
    return out.map((s) => ({ ...s, motivo: s.motivo.charAt(0).toUpperCase() + s.motivo.slice(1) }));
  });
}
