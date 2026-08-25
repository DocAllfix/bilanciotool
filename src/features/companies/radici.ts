import { cache } from "react";
import { sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import type { ModuloAzienda } from "./moduli";

// Le radici dei moduli: quali aziende hanno avviato quale percorso, e con quale esercizio.
//
// ⚠️ UNA query per undici moduli, e non undici. La ragione è misurata, non stilistica.
//
// `stati-moduli.ts` e `scadenzario.ts` facevano ciascuno le stesse undici interrogazioni —
// ventidue viaggi al database — e le mettevano in `Promise.all` credendo di parallelizzarle.
// Non si parallelizzano: girano tutte dentro la stessa transazione di `withTenant`, cioè
// sulla stessa connessione, e una connessione esegue una istruzione per volta. Con undici
// moduli invece di cinque la dashboard è passata da circa un secondo a quattro-otto, e la
// lentezza non era una scortesia: il giro guidato del benvenuto attende i propri bersagli
// con una scadenza, e ha cominciato a non arrivare più fino all'offerta.
//
// ⚠️ E `cache()` di React: dentro la stessa richiesta la domanda si fa UNA volta sola,
// anche se la pongono due funzioni diverse. Senza, unire le undici query in una sola
// avrebbe portato i viaggi da ventidue a due invece che a uno.
//
// ⚠️ Il rovescio: aggiungendo un modulo bisogna aggiungerlo QUI. Non è automatico e non
// può esserlo — le tabelle radice hanno nomi e colonne diverse — ma `RADICI` è tipizzata
// su `ModuloAzienda`, quindi il compilatore segnala il modulo che manca invece di
// lasciarlo sparire in silenzio dal portafoglio.

/** La tabella radice di ogni modulo, e la colonna dell'esercizio se ne ha uno. */
const RADICI: Record<ModuloAzienda, { tabella: string; anno: string | null }> = {
  ghg: { tabella: "ghg_inventory", anno: "anno" },
  energetico: { tabella: "energy_balance", anno: "anno" },
  bilancio: { tabella: "report_project", anno: "anno" },
  sgesg: { tabella: "sgesg_programma", anno: "anno" },
  sa8000: { tabella: "sa_system", anno: null },
  fornitore: { tabella: "supplier_assessment", anno: null },
  filiera: { tabella: "chain_program", anno: null },
  soa: { tabella: "soa_declaration", anno: null },
  sgiqas: { tabella: "qas_system", anno: null },
  anticorruzione: { tabella: "bribery_system", anno: null },
  mog231: { tabella: "mog_model", anno: null },
  segnalazioni: { tabella: "wb_system", anno: null },
};

export type Radice = { modulo: ModuloAzienda; companyId: string; anno: number | null };

/**
 * Tutte le radici dello studio, in un viaggio solo.
 *
 * ⚠️ VA CHIAMATA FUORI da un `withTenant`, mai dentro. Apre la propria transazione, e una
 * transazione dentro un'altra prende una SECONDA connessione dal pool: la dashboard ne
 * apre cinque in parallelo, due di quelle chiedevano la connessione in piu', il pool
 * finiva e le esterne restavano ad aspettare le interne. Non era lentezza, era un
 * blocco: l'accesso rispondeva 200 e la dashboard non finiva mai di rendersi.
 *
 * `cache()` fa il resto: chi la chiama per secondo dentro la stessa richiesta non paga
 * niente, quindi chiamarla presto non costa.
 *
 * L'esercizio è il PIÙ ALTO fra quelli avviati: è l'anno su cui si sta lavorando, ed è
 * quello che il portafoglio e lo scadenzario mostrano.
 */
export const radiciModuli = cache(async function radiciModuli(
  userId: string,
  orgId: string,
): Promise<Radice[]> {
  // ⚠️ Il filtro `organization_id` è esplicito, oltre alle policy RLS: in sviluppo la
  // connessione è privilegiata e le policy non scattano. È la regola del progetto, e
  // vale a maggior ragione qui, dove l'SQL è scritto a mano.
  const pezzi = Object.entries(RADICI).map(
    ([modulo, r]) =>
      `select '${modulo}'::text as modulo, company_id, ${
        r.anno ? `max(${r.anno})::int` : "null::int"
      } as anno
       from ${r.tabella} where organization_id = $1 group by company_id`,
  );

  const righe = await withTenant({ userId, orgId }, (tx) =>
    tx.execute(sql.raw(pezzi.join("\nunion all\n").replace(/\$1/g, `'${orgId.replace(/'/g, "''")}'`))),
  );

  return (righe as unknown as { modulo: string; company_id: string; anno: number | null }[]).map(
    (r) => ({ modulo: r.modulo as ModuloAzienda, companyId: r.company_id, anno: r.anno }),
  );
});

/** Le radici indicizzate per modulo, nella forma che i due chiamanti usano. */
export async function radiciPerModulo(
  userId: string,
  orgId: string,
): Promise<Record<ModuloAzienda, Map<string, { anno: number | null }>>> {
  const righe = await radiciModuli(userId, orgId);
  const out = Object.fromEntries(
    (Object.keys(RADICI) as ModuloAzienda[]).map((m) => [m, new Map<string, { anno: number | null }>()]),
  ) as Record<ModuloAzienda, Map<string, { anno: number | null }>>;
  for (const r of righe) out[r.modulo].set(r.companyId, { anno: r.anno });
  return out;
}
