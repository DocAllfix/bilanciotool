import { withTenant } from "@/lib/db/tenant";
import { ghgActivityRow, ghgInventory } from "@/lib/db/schema";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { toFixedStr } from "@/lib/calc/shared/decimal";
import { and, eq } from "drizzle-orm";

// PONTE GHG → Bilancio: la sezione emissioni del bilancio LEGGE dall'inventario
// GHG della stessa azienda/anno. Fonte unica: qui non si scrive MAI nulla —
// se l'inventario cambia, il bilancio riflette il cambiamento alla lettura.
// (Nel prototipo i due strumenti duplicavano il calcolo con fattori diversi:
// questa è l'integrazione chiave decisa in analisi.)

export type EmissionsBridge =
  | { stato: "mancante" } // nessun inventario per l'anno
  | { stato: "vuoto"; inventoryId: string } // inventario senza voci
  | {
      stato: "ok";
      inventoryId: string;
      n: number;
      scope1: string;
      scope2Loc: string;
      scope2Mkt: string;
      scope3: string;
      totLoc: string;
      totMkt: string;
      bio: string;
    };

async function bridgeAnno(userId: string, orgId: string, companyId: string, anno: number): Promise<EmissionsBridge> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx
      .select({ id: ghgInventory.id })
      .from(ghgInventory)
      .where(and(eq(ghgInventory.companyId, companyId), eq(ghgInventory.anno, anno)));
    if (!inv) return { stato: "mancante" as const };
    const rows = await tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inv.id));
    if (!rows.length) return { stato: "vuoto" as const, inventoryId: inv.id };
    const c = computeInventory(
      rows.map((r) => ({
        id: r.id,
        categoryKey: r.categoryKey,
        sourceTypeKey: r.sourceTypeKey,
        quantita: r.quantita,
        fe: r.fe,
        feMarket: r.feMarket,
        quotaGo: r.quotaGo,
        feBiogenic: r.feBiogenic,
        dq: r.dq,
        incertezza: r.incertezza,
      })),
    );
    return {
      stato: "ok" as const,
      inventoryId: inv.id,
      n: c.n,
      scope1: toFixedStr(c.s1, 6),
      scope2Loc: toFixedStr(c.s2l, 6),
      scope2Mkt: toFixedStr(c.s2m, 6),
      scope3: toFixedStr(c.s3, 6),
      totLoc: toFixedStr(c.totL, 6),
      totMkt: toFixedStr(c.totM, 6),
      bio: toFixedStr(c.bio, 6),
    };
  });
}

export async function getEmissionsBridge(userId: string, orgId: string, companyId: string, anno: number) {
  const [corrente, precedente] = await Promise.all([
    bridgeAnno(userId, orgId, companyId, anno),
    bridgeAnno(userId, orgId, companyId, anno - 1),
  ]);
  return { corrente, precedente };
}

// Controlli di coerenza cross-modulo (rule-based, niente AI): non bloccano,
// segnalano. Il consulente decide.
export type CoherenceWarning = { codice: string; messaggio: string };

export function checkCoherence(
  kpi: Record<string, string>,
  bridge: EmissionsBridge,
): CoherenceWarning[] {
  const warnings: CoherenceWarning[] = [];
  const ha = (k: string) => kpi[k] !== undefined && kpi[k] !== "" && Number(kpi[k]) > 0;

  if (bridge.stato === "mancante" && (ha("en_ele") || ha("en_gas"))) {
    warnings.push({
      codice: "inventario_mancante",
      messaggio: "Hai inserito consumi energetici nel bilancio ma non esiste un inventario GHG per quest'anno: la sezione emissioni resterà vuota.",
    });
  }
  if (bridge.stato === "ok") {
    if (ha("en_ele") && Number(bridge.scope2Loc) === 0) {
      warnings.push({
        codice: "elettricita_incoerente",
        messaggio: "Il bilancio dichiara elettricità acquistata ma l'inventario GHG non ha voci in categoria 2.",
      });
    }
    if (ha("en_gas") && Number(bridge.scope1) === 0) {
      warnings.push({
        codice: "gas_incoerente",
        messaggio: "Il bilancio dichiara gas naturale ma l'inventario GHG non ha voci in categoria 1.",
      });
    }
  }
  return warnings;
}
