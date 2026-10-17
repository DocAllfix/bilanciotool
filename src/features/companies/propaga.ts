import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "@/lib/db/tenant";
import {
  briberySystem, chainProgram, energyBalance, gdprSystem, ghgInventory, mogModel, pasSystem, qasSystem,
  reportProject, saSystem, soaDeclaration, supplierAssessment, wbSystem,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { anagraficaInTesto, type ProfiloAzienda } from "./profilo";
import { proponiVociGhg } from "@/features/ghg/proposte";
import { proponiMaterialita } from "@/features/report/materiality";

// Un campo dell'anagrafica, appena salvato, entra da solo nei percorsi GIÀ AVVIATI che lo
// hanno ancora vuoto (decisione del committente del 17 ottobre 2026).
//
// ⚠️ SOLO DOVE È VUOTO, e lo decide la clausola WHERE, non il codice che legge prima: «leggi,
// guarda se è vuoto, scrivi» lascerebbe passare un valore scritto a mano un istante prima.
// Un campo compilato nel percorso non si tocca mai: lì il dato è del percorso.
//
// ⚠️ Un'istruzione per tabella, dentro la stessa transazione del salvataggio dell'anagrafica:
// le tabelle sono una dozzina e i valori sono pochi, e il costo è quello di un salvataggio.

type ChiaveTesto = keyof ReturnType<typeof anagraficaInTesto>;

/** Colonne di testo: tabella → (campo dell'anagrafica → nome della colonna SQL). */
const COLONNE: [PgTable, Partial<Record<ChiaveTesto, string>>][] = [
  [mogModel, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti" }],
  [briberySystem, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti" }],
  [wbSystem, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti" }],
  [chainProgram, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti" }],
  [qasSystem, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti" }],
  [saSystem, { piva: "piva", sede: "sede", settore: "settore", addetti: "addetti", sitoWeb: "sito_web" }],
  [gdprSystem, { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco", addetti: "dipendenti" }],
  [pasSystem, { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco" }],
];

/** Profili JSONB: tabella, colonna SQL, (campo dell'anagrafica → chiave JSON). */
const PROFILI: [PgTable, string, Partial<Record<ChiaveTesto, string>>][] = [
  [ghgInventory, "boundaries", { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco", addetti: "dipendenti" }],
  [energyBalance, "profilo", { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco" }],
  [reportProject, "profilo", { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco" }],
  [supplierAssessment, "profilo", { piva: "piva", sede: "sede", settore: "settore", ateco: "ateco", addetti: "dipendenti", fatturatoMilioni: "fatturato" }],
  [soaDeclaration, "profilo", { piva: "piva", sede: "sede" }],
];

/**
 * Porta nei percorsi avviati i campi dell'anagrafica che lì sono vuoti.
 *
 * @returns quante righe di percorso ha toccato, per l'audit.
 */
export async function propagaAnagrafica(
  tx: Tx,
  userId: string,
  orgId: string,
  companyId: string,
  az: ProfiloAzienda,
): Promise<number> {
  const valori = anagraficaInTesto(az);
  let toccate = 0;

  for (const [tabella, mappa] of COLONNE) {
    for (const [campo, colonna] of Object.entries(mappa) as [ChiaveTesto, string][]) {
      const v = valori[campo];
      if (!v) continue;
      const r = await tx.execute(sql`
        update ${tabella} set ${sql.identifier(colonna)} = ${v}
        where company_id = ${companyId} and organization_id = ${orgId}
          and (${sql.identifier(colonna)} is null or btrim(${sql.identifier(colonna)}) = '')
        returning id`);
      toccate += r.length;
    }
  }

  const inventariConAteco: string[] = [];
  const progettiConAteco: string[] = [];
  for (const [tabella, colonna, mappa] of PROFILI) {
    for (const [campo, chiave] of Object.entries(mappa) as [ChiaveTesto, string][]) {
      const v = valori[campo];
      if (!v) continue;
      const r = await tx.execute(sql`
        update ${tabella}
           set ${sql.identifier(colonna)} = coalesce(${sql.identifier(colonna)}, '{}'::jsonb) || jsonb_build_object(${chiave}::text, ${v}::text)
         where company_id = ${companyId} and organization_id = ${orgId}
           and coalesce(btrim(${sql.identifier(colonna)} ->> ${chiave}::text), '') = ''
        returning id`);
      toccate += r.length;
      if (tabella === ghgInventory && campo === "ateco") inventariConAteco.push(...(r as unknown as { id: string }[]).map((x) => x.id));
      if (tabella === reportProject && campo === "ateco") progettiConAteco.push(...(r as unknown as { id: string }[]).map((x) => x.id));
    }
  }

  // L'ATECO appena arrivato in un inventario porta le sue voci tipiche, come alla creazione.
  for (const id of inventariConAteco) await proponiVociGhg(tx, userId, orgId, id, valori.ateco);
  for (const id of progettiConAteco) await proponiMaterialita(tx, userId, orgId, id, valori.ateco);

  if (toccate) {
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company.anagrafica.propaga",
      entita: "company",
      entitaId: companyId,
      dettagli: { righe: toccate },
    });
  }
  return toccate;
}

/** Usato dai test: le tabelle coperte, per verificare che il registro non ne dimentichi. */
export const TABELLE_PROPAGATE = [...COLONNE.map(([t]) => t), ...PROFILI.map(([t]) => t)];
