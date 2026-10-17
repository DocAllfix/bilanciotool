import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { withTenant, dbCorrente, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import {
  company,
  pasAttivita,
  pasAttivitaTipo,
  pasAudit,
  pasComunicazione,
  pasConsultazione,
  pasEmergenza,
  pasFattore,
  pasFormazione,
  pasFornitore,
  pasMisura,
  pasNonConformita,
  pasObiettivo,
  pasParte,
  pasParteTipo,
  pasReclamo,
  pasRequisitoStato,
  pasRiesame,
  pasRischio,
  pasRischioTipo,
  pasSystem,
  pasTesto,
} from "@/lib/db/schema";
import { DERIVATI } from "@/lib/calc/pas/indicatori";
import {
  avviaSchema,
  CAMPI_REQUISITO,
  CAMPI_RIGHE,
  CAMPI_SISTEMA,
  contenutoPoliticaSchema,
  misuraSchema,
  PARAMETRI,
  parametroSchema,
  requisitoChiaveSchema,
  validaCampo,
  type TipoRiga,
} from "./validation";
import type { z } from "zod";

// Il percorso Sistema di gestione sociale di un'azienda: letture in `queries.ts`, qui le
// scritture. Stesso impianto del GDPR, da cui il prototipo PAS e' ricalcato.
//
// Le regole di ogni feature layer: `requireEntitlement(write_data)` e audit su ogni
// mutazione, filtro `organization_id` ESPLICITO oltre a RLS, un campo per volta, nessun
// derivato persistito. Le figlie non portano `company_id`: il confine di tenant passa da
// `pretendiSistema`, che rilegge la radice filtrando per organizzazione.

export async function latestPasSetId(): Promise<string> {
  return latestSetId("pas", "Catalogo del sistema di gestione sociale non disponibile: esegui il seed dei contenuti");
}

/**
 * Avvia il percorso: la radice, le otto parti interessate e i venti rischi tipo, come fa il
 * prototipo alla creazione di un'organizzazione. È l'unica scrittura che lo fa nascere, ed è
 * idempotente: un secondo «Avvia» restituisce la radice che c'è già, senza resuscitare le
 * parti o i rischi che il consulente ha tolto.
 *
 * ⚠️ Su un'azienda archiviata la rifiuta il database (`azienda_scrivibile`, migrazione
 * 0061), con un messaggio che `daErrore` traduce.
 */
export async function avviaSistema(userId: string, orgId: string, input: z.input<typeof avviaSchema>): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = avviaSchema.parse(input);
  const setId = await latestPasSetId();

  return withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro studio");

    const id = randomUUID();
    const nuova = await tx
      .insert(pasSystem)
      .values({ id, organizationId: orgId, companyId: v.companyId, contentSetId: setId })
      .onConflictDoNothing({ target: pasSystem.companyId })
      .returning({ id: pasSystem.id });
    if (!nuova.length) {
      const [c] = await tx
        .select({ id: pasSystem.id })
        .from(pasSystem)
        .where(and(eq(pasSystem.companyId, v.companyId), eq(pasSystem.organizationId, orgId)));
      return c.id;
    }

    const d = dbCorrente();
    const [parti, rischi] = await Promise.all([
      d.select().from(pasParteTipo).where(eq(pasParteTipo.setId, setId)).orderBy(asc(pasParteTipo.ordine)),
      d.select().from(pasRischioTipo).where(eq(pasRischioTipo.setId, setId)).orderBy(asc(pasRischioTipo.ordine)),
    ]);
    if (parti.length) {
      await tx.insert(pasParte).values(
        parti.map((p, i) => ({
          id: randomUUID(),
          organizationId: orgId,
          systemId: id,
          tipoKey: p.key,
          nome: p.nome,
          esigenze: p.esigenze,
          obbligo: p.obbligo,
          gestita: true,
          coinvolgimento: p.coinvolgimento,
          ordine: i,
        })),
      );
    }
    if (rischi.length) {
      await tx.insert(pasRischio).values(
        rischi.map((r, i) => ({ id: randomUUID(), organizationId: orgId, systemId: id, tipoKey: r.key, area: r.area, ambito: r.ambito, testo: r.testo, ordine: i })),
      );
    }
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.sistema.create", entita: "pas_system", entitaId: id });
    return id;
  });
}

/** Un campo del profilo, dei ruoli o della politica. */
export async function setCampoSistema(userId: string, orgId: string, systemId: string, campo: string, valore: unknown): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = validaCampo(CAMPI_SISTEMA, campo, valore);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(pasSystem)
      .set({ [campo]: v, updatedAt: new Date() })
      .where(and(eq(pasSystem.id, systemId), eq(pasSystem.organizationId, orgId)))
      .returning({ id: pasSystem.id });
    if (!agg.length) throw new Error("Percorso inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.sistema.set", entita: "pas_system", entitaId: systemId, dettagli: { campo } });
  });
}

/**
 * Una soglia: orari, settimane, livelli di rischio, giorni per sollecitare un reclamo.
 *
 * ⚠️ Due coppie si controllano INSIEME: l'orario complessivo non sotto quello ordinario, il
 * rischio alto sopra il medio. Il valore dell'altra soglia si rilegge dentro la transazione,
 * mai dal browser — è il read-modify-write che questo progetto ha già pagato quattro volte.
 * Il CHECK della 0066 tiene comunque.
 */
export async function setParametro(userId: string, orgId: string, systemId: string, input: z.input<typeof parametroSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = parametroSchema.parse(input);
  const [min, max] = PARAMETRI[v.campo];
  if (v.valore < min || v.valore > max) throw new Error(`Valore fuori intervallo: da ${min} a ${max}`);

  await withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId);
    const con = { ...s, [v.campo]: v.valore };
    if (con.paramAlto <= con.paramMedio) throw new Error("La soglia del rischio alto deve superare quella del medio");
    if (con.paramOreTotali < con.paramOreOrdinarie) throw new Error("Il limite complessivo non può stare sotto quello dell'orario ordinario");
    await tx.update(pasSystem).set({ [v.campo]: v.valore, updatedAt: new Date() }).where(eq(pasSystem.id, systemId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.parametro.set", entita: "pas_system", entitaId: systemId, dettagli: { campo: v.campo } });
  });
}

/** Accende o spegne un contenuto atteso della politica: una sola istruzione, senza rileggere. */
export async function setContenutoPolitica(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof contenutoPoliticaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = contenutoPoliticaSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const nuovo = v.acceso
      ? sql`case when ${v.chiave} = any(${pasSystem.politicaContenuti}) then ${pasSystem.politicaContenuti}
             else array_append(${pasSystem.politicaContenuti}, ${v.chiave}) end`
      : sql`array_remove(${pasSystem.politicaContenuti}, ${v.chiave})`;
    const agg = await tx
      .update(pasSystem)
      .set({ politicaContenuti: nuovo, updatedAt: new Date() })
      .where(and(eq(pasSystem.id, systemId), eq(pasSystem.organizationId, orgId)))
      .returning({ id: pasSystem.id });
    if (!agg.length) throw new Error("Percorso inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.politica.contenuto", entita: "pas_system", entitaId: systemId, dettagli: { chiave: v.chiave, acceso: v.acceso } });
  });
}

/** Sostituisce il testo della politica col modello del catalogo, col nome dell'azienda. */
export async function inserisciModelloPolitica(userId: string, orgId: string, systemId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId);
    const [co] = await tx.select({ nome: company.nome }).from(company).where(and(eq(company.id, s.companyId), eq(company.organizationId, orgId)));
    const [modello] = await dbCorrente()
      .select({ testo: pasTesto.testo })
      .from(pasTesto)
      .where(and(eq(pasTesto.setId, s.contentSetId), eq(pasTesto.key, "politica")));
    if (!modello || !co) throw new Error("Modello di politica non disponibile");
    await tx
      .update(pasSystem)
      .set({ politicaTesto: modello.testo.replaceAll("{nome}", co.nome), updatedAt: new Date() })
      .where(eq(pasSystem.id, systemId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.politica.modello", entita: "pas_system", entitaId: systemId });
  });
}

/** Un campo di un requisito: una riga per requisito, creata al primo campo toccato. */
export async function setCampoRequisito(
  userId: string,
  orgId: string,
  systemId: string,
  requisitoKey: string,
  campo: string,
  valore: unknown,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const key = requisitoChiaveSchema.parse(requisitoKey);
  const v = validaCampo(CAMPI_REQUISITO, campo, valore);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    await tx
      .insert(pasRequisitoStato)
      .values({ id: randomUUID(), organizationId: orgId, systemId, requisitoKey: key, [campo]: v })
      .onConflictDoUpdate({
        target: [pasRequisitoStato.systemId, pasRequisitoStato.requisitoKey],
        set: { [campo]: v, updatedAt: new Date() },
      });
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.requisito.set", entita: "pas_requisito_stato", entitaId: `${systemId}:${key}`, dettagli: { campo } });
  });
}

/** Le coppie «di cui ⊆ totale» degli indicatori, dal motore: una sola fonte. */
const COPPIE_DI_CUI = DERIVATI.flatMap((d) => ("diCui" in d && d.diCui ? [d.diCui as readonly [string, string]] : []));

/**
 * Il valore di un indicatore in un esercizio. Il vuoto CANCELLA la riga: un numero che non
 * si conosce non è zero, e nel database non deve diventarlo — è il difetto del prototipo
 * che faceva uscire un divario retributivo del 100%.
 *
 * ⚠️ «Di cui» non può superare il totale (donne su addetti, coperti dal contratto…): il
 * controllo legge l'altro valore della coppia dentro la transazione.
 */
export async function setMisura(userId: string, orgId: string, systemId: string, input: z.input<typeof misuraSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = misuraSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    if (v.valore !== null) {
      for (const [parte, totale] of COPPIE_DI_CUI.filter(([p, t]) => p === v.chiave || t === v.chiave)) {
        const altra = parte === v.chiave ? totale : parte;
        const [r] = await tx
          .select({ valore: pasMisura.valore })
          .from(pasMisura)
          .where(and(eq(pasMisura.systemId, systemId), eq(pasMisura.anno, v.anno), eq(pasMisura.indicatoreKey, altra), eq(pasMisura.organizationId, orgId)));
        if (!r) continue;
        const p = Number(parte === v.chiave ? v.valore : r.valore);
        const t = Number(totale === v.chiave ? v.valore : r.valore);
        if (p > t) throw new Error("Il «di cui» non può superare il totale");
      }
      await tx
        .insert(pasMisura)
        .values({ id: randomUUID(), organizationId: orgId, systemId, anno: v.anno, indicatoreKey: v.chiave, valore: v.valore })
        .onConflictDoUpdate({
          target: [pasMisura.systemId, pasMisura.anno, pasMisura.indicatoreKey],
          set: { valore: v.valore, updatedAt: new Date() },
        });
    } else {
      await tx
        .delete(pasMisura)
        .where(and(eq(pasMisura.systemId, systemId), eq(pasMisura.anno, v.anno), eq(pasMisura.indicatoreKey, v.chiave), eq(pasMisura.organizationId, orgId)));
    }
    await logAudit(tx, { organizationId: orgId, userId, azione: "pas.misura.set", entita: "pas_misura", entitaId: `${systemId}:${v.anno}:${v.chiave}` });
  });
}

// ─── Righe ──────────────────────────────────────────────────────────────────
//
// Quattordici tabelle chiedono le stesse tre operazioni. Le azioni d'audit sono scritte PER
// ESTESO, una per tabella e per operazione: la guardia `etichette-audit` legge solo le forme
// letterali, e un nome costruito a runtime finirebbe nell'attività recente come nome macchina.

type Riga = {
  tabella: PgTable & { id: unknown; organizationId: unknown; systemId: unknown };
  crea: { azione: string };
  cambia: { azione: string };
  elimina: { azione: string };
};

const RIGHE: Record<TipoRiga, Riga> = {
  fattore: { tabella: pasFattore, crea: { azione: "pas.fattore.create" }, cambia: { azione: "pas.fattore.set" }, elimina: { azione: "pas.fattore.delete" } },
  parte: { tabella: pasParte, crea: { azione: "pas.parte.create" }, cambia: { azione: "pas.parte.set" }, elimina: { azione: "pas.parte.delete" } },
  rischio: { tabella: pasRischio, crea: { azione: "pas.rischio.create" }, cambia: { azione: "pas.rischio.set" }, elimina: { azione: "pas.rischio.delete" } },
  fornitore: { tabella: pasFornitore, crea: { azione: "pas.fornitore.create" }, cambia: { azione: "pas.fornitore.set" }, elimina: { azione: "pas.fornitore.delete" } },
  obiettivo: { tabella: pasObiettivo, crea: { azione: "pas.obiettivo.create" }, cambia: { azione: "pas.obiettivo.set" }, elimina: { azione: "pas.obiettivo.delete" } },
  attivita: { tabella: pasAttivita, crea: { azione: "pas.attivita.create" }, cambia: { azione: "pas.attivita.set" }, elimina: { azione: "pas.attivita.delete" } },
  reclamo: { tabella: pasReclamo, crea: { azione: "pas.reclamo.create" }, cambia: { azione: "pas.reclamo.set" }, elimina: { azione: "pas.reclamo.delete" } },
  nonConformita: { tabella: pasNonConformita, crea: { azione: "pas.non_conformita.create" }, cambia: { azione: "pas.non_conformita.set" }, elimina: { azione: "pas.non_conformita.delete" } },
  formazione: { tabella: pasFormazione, crea: { azione: "pas.formazione.create" }, cambia: { azione: "pas.formazione.set" }, elimina: { azione: "pas.formazione.delete" } },
  emergenza: { tabella: pasEmergenza, crea: { azione: "pas.emergenza.create" }, cambia: { azione: "pas.emergenza.set" }, elimina: { azione: "pas.emergenza.delete" } },
  comunicazione: { tabella: pasComunicazione, crea: { azione: "pas.comunicazione.create" }, cambia: { azione: "pas.comunicazione.set" }, elimina: { azione: "pas.comunicazione.delete" } },
  consultazione: { tabella: pasConsultazione, crea: { azione: "pas.consultazione.create" }, cambia: { azione: "pas.consultazione.set" }, elimina: { azione: "pas.consultazione.delete" } },
  audit: { tabella: pasAudit, crea: { azione: "pas.audit.create" }, cambia: { azione: "pas.audit.set" }, elimina: { azione: "pas.audit.delete" } },
  riesame: { tabella: pasRiesame, crea: { azione: "pas.riesame.create" }, cambia: { azione: "pas.riesame.set" }, elimina: { azione: "pas.riesame.delete" } },
};

/** Le tabelle con un ordine manuale: i registri si leggono per data. */
const CON_ORDINE = new Set<TipoRiga>(["fattore", "parte", "rischio", "fornitore", "obiettivo", "attivita"]);

/** I registri: una voce nuova nasce con la data di oggi, come nel prototipo. */
const REGISTRI = new Set<TipoRiga>(["reclamo", "nonConformita", "formazione", "emergenza", "comunicazione", "consultazione", "audit", "riesame"]);

/** I valori iniziali di una riga nuova: quelli che il prototipo precompilava e le colonne non danno. */
function iniziali(tipo: TipoRiga, oggi: string): Record<string, unknown> {
  if (tipo === "attivita") return { mese: Number(oggi.slice(5, 7)) };
  if (REGISTRI.has(tipo)) return { data: oggi };
  return {};
}

/** Crea una riga vuota. `oggi` è il giorno italiano, deciso dal server. */
export async function creaRiga(userId: string, orgId: string, systemId: string, tipo: TipoRiga, oggi: string): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const r = RIGHE[tipo];
  if (!r) throw new Error("Tipo di riga sconosciuto");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    const extra: Record<string, unknown> = {};
    if (CON_ORDINE.has(tipo)) extra.ordine = await prossimoOrdine(tx, r.tabella as unknown as typeof pasFattore, orgId, systemId);
    await tx.insert(r.tabella).values({ id, organizationId: orgId, systemId, ...iniziali(tipo, oggi), ...extra } as never);
    await logAudit(tx, { organizationId: orgId, userId, azione: r.crea.azione, entita: tipo, entitaId: id });
  });
  return id;
}

/** Un campo di una riga. */
export async function setCampoRiga(userId: string, orgId: string, tipo: TipoRiga, id: string, campo: string, valore: unknown): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const r = RIGHE[tipo];
  if (!r) throw new Error("Tipo di riga sconosciuto");
  const v = validaCampo(CAMPI_RIGHE[tipo], campo, valore);
  const t = r.tabella as unknown as typeof pasFattore;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(t)
      .set({ [campo]: v } as never)
      .where(and(eq(t.id, id), eq(t.organizationId, orgId)))
      .returning({ id: t.id });
    if (!agg.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: r.cambia.azione, entita: tipo, entitaId: id, dettagli: { campo } });
  });
}

export async function eliminaRiga(userId: string, orgId: string, tipo: TipoRiga, id: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const r = RIGHE[tipo];
  if (!r) throw new Error("Tipo di riga sconosciuto");
  const t = r.tabella as unknown as typeof pasFattore;
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx.delete(t).where(and(eq(t.id, id), eq(t.organizationId, orgId))).returning({ id: t.id });
    if (!via.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: r.elimina.azione, entita: tipo, entitaId: id });
  });
}

/** Carica il piano tipo. Idempotente: aggiunge solo le attività che mancano. */
export async function caricaPianoTipo(userId: string, orgId: string, systemId: string): Promise<{ aggiunti: number }> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    const tipo = await dbCorrente().select().from(pasAttivitaTipo).where(eq(pasAttivitaTipo.setId, s.contentSetId)).orderBy(asc(pasAttivitaTipo.ordine));
    const base = await prossimoOrdine(tx, pasAttivita as unknown as typeof pasFattore, orgId, systemId);
    const nuovi = await tx
      .insert(pasAttivita)
      .values(tipo.map((a, i) => ({ id: randomUUID(), organizationId: orgId, systemId, tipoKey: a.key, mese: a.mese, riferimento: a.riferimento, attivita: a.attivita, ordine: base + i })))
      .onConflictDoNothing({ target: [pasAttivita.systemId, pasAttivita.tipoKey] })
      .returning({ id: pasAttivita.id });
    if (nuovi.length) {
      await logAudit(tx, { organizationId: orgId, userId, azione: "pas.piano.tipo", entita: "pas_system", entitaId: systemId, dettagli: { aggiunti: nuovi.length } });
    }
    return { aggiunti: nuovi.length };
  });
}

async function prossimoOrdine(tx: Tx, t: typeof pasFattore, orgId: string, systemId: string): Promise<number> {
  const [{ prossimo }] = await tx
    .select({ prossimo: sql<number>`coalesce(max(${t.ordine}), -1) + 1` })
    .from(t)
    .where(and(eq(t.systemId, systemId), eq(t.organizationId, orgId)));
  return Number(prossimo);
}

/**
 * Il confine di tenant per le righe figlie: la radice, filtrata per organizzazione.
 *
 * ⚠️ `nuovaRiga`: le figlie non portano `company_id`, quindi il trigger `azienda_scrivibile`
 * (0061) non le vede. Su un'azienda archiviata il lavoro NUOVO si ferma qui, con la stessa
 * frase del database; gli aggiornamenti delle righe esistenti restano liberi, come stabilisce
 * la 0061 per le tabelle che il trigger copre.
 */
async function pretendiSistema(tx: Tx, orgId: string, systemId: string, opzioni: { nuovaRiga?: boolean } = {}) {
  const [row] = await tx
    .select({
      id: pasSystem.id,
      companyId: pasSystem.companyId,
      contentSetId: pasSystem.contentSetId,
      paramOreOrdinarie: pasSystem.paramOreOrdinarie,
      paramOreTotali: pasSystem.paramOreTotali,
      paramAlto: pasSystem.paramAlto,
      paramMedio: pasSystem.paramMedio,
      statoAzienda: company.stato,
    })
    .from(pasSystem)
    .innerJoin(company, eq(company.id, pasSystem.companyId))
    .where(and(eq(pasSystem.id, systemId), eq(pasSystem.organizationId, orgId), eq(company.organizationId, orgId)));
  if (!row) throw new Error("Percorso inesistente o di un altro studio");
  if (opzioni.nuovaRiga && row.statoAzienda !== "active") {
    throw new Error("L'azienda è archiviata: ripristinala dal portafoglio per riprendere il lavoro.");
  }
  return row;
}
