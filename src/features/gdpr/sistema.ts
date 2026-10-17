import { proponiTrattamenti } from "./proposte";
import { anagraficaInTesto, profiloAzienda } from "@/features/companies/profilo";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { withTenant, dbCorrente, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import {
  company,
  gdprAttivita,
  gdprAttivitaTipo,
  gdprDocumento,
  gdprDocumentoTipo,
  gdprFormazione,
  gdprFornitore,
  gdprMisura,
  gdprRequisitoStato,
  gdprRichiesta,
  gdprRiesame,
  gdprSystem,
  gdprTesto,
  gdprTrattamento,
  gdprTrattamentoTipo,
  gdprVerifica,
  gdprVerificaAds,
  gdprViolazione,
} from "@/lib/db/schema";
import { DERIVATI } from "@/lib/calc/gdpr/indicatori";
import { QUALIFICA_TITOLARE_AUTONOMO } from "@/lib/calc/gdpr/tipi";
import {
  avviaSchema,
  CAMPI_REQUISITO,
  CAMPI_RIGHE,
  CAMPI_SISTEMA,
  contenutoPoliticaSchema,
  criterioSchema,
  misuraSchema,
  PARAMETRI,
  parametroSchema,
  requisitoChiaveSchema,
  validaCampo,
  type TipoRiga,
} from "./validation";
import type { z } from "zod";

// Il percorso Protezione dei dati di un'azienda: letture in `queries.ts`, qui le scritture.
//
// Le regole di ogni feature layer: `requireEntitlement(write_data)` e audit su ogni
// mutazione, filtro `organization_id` ESPLICITO oltre a RLS, un campo per volta, nessun
// derivato persistito. Le figlie non portano `company_id`: il confine di tenant passa da
// `pretendiSistema`, che rilegge la radice filtrando per organizzazione.

export async function latestGdprSetId(): Promise<string> {
  return latestSetId("gdpr", "Catalogo del percorso protezione dei dati non disponibile: esegui il seed dei contenuti");
}

/**
 * Avvia il percorso. È l'unica scrittura che lo fa nascere, ed è idempotente: un secondo
 * «Avvia» restituisce la radice che c'è già invece di sollevare.
 *
 * ⚠️ Su un'azienda archiviata la rifiuta il database (`azienda_scrivibile`, migrazione
 * 0061), con un messaggio che `daErrore` traduce.
 */
export async function avviaSistema(userId: string, orgId: string, input: z.input<typeof avviaSchema>): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = avviaSchema.parse(input);
  const setId = await latestGdprSetId();

  return withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro studio");

    const id = randomUUID();
    // L'anagrafica dell'azienda si copia una volta, nei campi che il percorso ha: chiederla di
    // nuovo la farebbe divergere da quella del portafoglio. Da qui in poi i campi sono del percorso.
    const az = await profiloAzienda(tx, orgId, v.companyId);
    const an = anagraficaInTesto(az);
    const nuova = await tx
      .insert(gdprSystem)
      .values({
        id, organizationId: orgId, companyId: v.companyId, contentSetId: setId, ruolo: "Titolare del trattamento",
        // L'anagrafica si copia una volta (vedi `features/companies/profilo.ts`).
        piva: an.piva, sede: an.sede, settore: an.settore, ateco: an.ateco, dipendenti: an.addetti,
      })
      .onConflictDoNothing({ target: gdprSystem.companyId })
      .returning({ id: gdprSystem.id });
    if (!nuova.length) {
      const [c] = await tx
        .select({ id: gdprSystem.id })
        .from(gdprSystem)
        .where(and(eq(gdprSystem.companyId, v.companyId), eq(gdprSystem.organizationId, orgId)));
      return c.id;
    }
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.sistema.create", entita: "gdpr_system", entitaId: id });
    // I trattamenti che quasi ogni azienda ha, marcati «proposta»: vedi `gdpr/proposte.ts`.
    await proponiTrattamenti(tx, userId, orgId, id, setId, az);
    return id;
  });
}

/** Un campo del profilo, del DPO o della politica. */
export async function setCampoSistema(userId: string, orgId: string, systemId: string, campo: string, valore: unknown): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = validaCampo(CAMPI_SISTEMA, campo, valore);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(gdprSystem)
      .set({ [campo]: v, updatedAt: new Date() })
      .where(and(eq(gdprSystem.id, systemId), eq(gdprSystem.organizationId, orgId)))
      .returning({ id: gdprSystem.id });
    if (!agg.length) throw new Error("Percorso inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.sistema.set", entita: "gdpr_system", entitaId: systemId, dettagli: { campo } });
  });
}

/**
 * Una soglia di classificazione.
 *
 * ⚠️ Le soglie si controllano INSIEME: alto deve restare sopra medio. Il valore dell'altra
 * soglia si rilegge dentro la transazione, mai dal browser — è il read-modify-write che
 * questo progetto ha già pagato quattro volte. Il CHECK della 0063 tiene comunque.
 */
export async function setParametro(userId: string, orgId: string, systemId: string, input: z.input<typeof parametroSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = parametroSchema.parse(input);
  const [min, max] = PARAMETRI[v.campo];
  if (v.valore < min || v.valore > max) throw new Error(`Valore fuori intervallo: da ${min} a ${max}`);

  await withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId);
    const alto = v.campo === "paramAlto" ? v.valore : s.paramAlto;
    const medio = v.campo === "paramMedio" ? v.valore : s.paramMedio;
    if (alto <= medio) throw new Error("La soglia del rischio alto deve superare quella del medio");
    await tx.update(gdprSystem).set({ [v.campo]: v.valore, updatedAt: new Date() }).where(eq(gdprSystem.id, systemId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.parametro.set", entita: "gdpr_system", entitaId: systemId, dettagli: { campo: v.campo } });
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
      ? sql`case when ${v.chiave} = any(${gdprSystem.politicaContenuti}) then ${gdprSystem.politicaContenuti}
             else array_append(${gdprSystem.politicaContenuti}, ${v.chiave}) end`
      : sql`array_remove(${gdprSystem.politicaContenuti}, ${v.chiave})`;
    const agg = await tx
      .update(gdprSystem)
      .set({ politicaContenuti: nuovo, updatedAt: new Date() })
      .where(and(eq(gdprSystem.id, systemId), eq(gdprSystem.organizationId, orgId)))
      .returning({ id: gdprSystem.id });
    if (!agg.length) throw new Error("Percorso inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.politica.contenuto", entita: "gdpr_system", entitaId: systemId, dettagli: { chiave: v.chiave, acceso: v.acceso } });
  });
}

/** Sostituisce il testo della politica col modello del catalogo, col nome dell'azienda. */
export async function inserisciModelloPolitica(userId: string, orgId: string, systemId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId);
    const [co] = await tx.select({ nome: company.nome }).from(company).where(and(eq(company.id, s.companyId), eq(company.organizationId, orgId)));
    const [modello] = await dbCorrente()
      .select({ testo: gdprTesto.testo })
      .from(gdprTesto)
      .where(and(eq(gdprTesto.setId, s.contentSetId), eq(gdprTesto.key, "politica")));
    if (!modello || !co) throw new Error("Modello di politica non disponibile");
    await tx
      .update(gdprSystem)
      .set({ politicaTesto: modello.testo.replaceAll("{nome}", co.nome), updatedAt: new Date() })
      .where(eq(gdprSystem.id, systemId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.politica.modello", entita: "gdpr_system", entitaId: systemId });
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
      .insert(gdprRequisitoStato)
      .values({ id: randomUUID(), organizationId: orgId, systemId, requisitoKey: key, [campo]: v })
      .onConflictDoUpdate({
        target: [gdprRequisitoStato.systemId, gdprRequisitoStato.requisitoKey],
        set: { [campo]: v, updatedAt: new Date() },
      });
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.requisito.set", entita: "gdpr_requisito_stato", entitaId: `${systemId}:${key}`, dettagli: { campo } });
  });
}

/**
 * Il valore di un indicatore in un esercizio. Il vuoto CANCELLA la riga: un numero che non
 * si conosce non è zero, e nel database non deve diventarlo.
 *
 * ⚠️ «Di cui» non può superare il totale (formati su autorizzati, cifrati su dispositivi…):
 * il controllo legge l'altro valore della coppia dentro la transazione.
 */
export async function setMisura(userId: string, orgId: string, systemId: string, input: z.input<typeof misuraSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = misuraSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    if (v.valore !== null) {
      for (const d of DERIVATI.filter((x) => x.diCui && (x.parte === v.chiave || x.totale === v.chiave))) {
        const altra = d.parte === v.chiave ? d.totale : d.parte;
        const [r] = await tx
          .select({ valore: gdprMisura.valore })
          .from(gdprMisura)
          .where(and(eq(gdprMisura.systemId, systemId), eq(gdprMisura.anno, v.anno), eq(gdprMisura.indicatoreKey, altra)));
        if (!r) continue;
        const parte = Number(d.parte === v.chiave ? v.valore : r.valore);
        const totale = Number(d.totale === v.chiave ? v.valore : r.valore);
        if (parte > totale) throw new Error("Il «di cui» non può superare il totale");
      }
      await tx
        .insert(gdprMisura)
        .values({ id: randomUUID(), organizationId: orgId, systemId, anno: v.anno, indicatoreKey: v.chiave, valore: v.valore })
        .onConflictDoUpdate({
          target: [gdprMisura.systemId, gdprMisura.anno, gdprMisura.indicatoreKey],
          set: { valore: v.valore, updatedAt: new Date() },
        });
    } else {
      await tx
        .delete(gdprMisura)
        .where(and(eq(gdprMisura.systemId, systemId), eq(gdprMisura.anno, v.anno), eq(gdprMisura.indicatoreKey, v.chiave), eq(gdprMisura.organizationId, orgId)));
    }
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.misura.set", entita: "gdpr_misura", entitaId: `${systemId}:${v.anno}:${v.chiave}` });
  });
}

// ─── Righe ──────────────────────────────────────────────────────────────────
//
// Dieci tabelle chiedono le stesse tre operazioni. Le azioni d'audit sono scritte PER
// ESTESO, una per tabella e per operazione: la guardia `etichette-audit` legge solo le
// forme letterali, e un nome costruito a runtime finirebbe nell'attività recente come
// nome macchina.

type Riga = {
  tabella: PgTable & { id: unknown; organizationId: unknown; systemId: unknown };
  crea: { azione: string };
  cambia: { azione: string };
  elimina: { azione: string };
};

const RIGHE: Record<TipoRiga, Riga> = {
  trattamento: { tabella: gdprTrattamento, crea: { azione: "gdpr.trattamento.create" }, cambia: { azione: "gdpr.trattamento.set" }, elimina: { azione: "gdpr.trattamento.delete" } },
  fornitore: { tabella: gdprFornitore, crea: { azione: "gdpr.fornitore.create" }, cambia: { azione: "gdpr.fornitore.set" }, elimina: { azione: "gdpr.fornitore.delete" } },
  documento: { tabella: gdprDocumento, crea: { azione: "gdpr.documento.create" }, cambia: { azione: "gdpr.documento.set" }, elimina: { azione: "gdpr.documento.delete" } },
  attivita: { tabella: gdprAttivita, crea: { azione: "gdpr.attivita.create" }, cambia: { azione: "gdpr.attivita.set" }, elimina: { azione: "gdpr.attivita.delete" } },
  richiesta: { tabella: gdprRichiesta, crea: { azione: "gdpr.richiesta.create" }, cambia: { azione: "gdpr.richiesta.set" }, elimina: { azione: "gdpr.richiesta.delete" } },
  violazione: { tabella: gdprViolazione, crea: { azione: "gdpr.violazione.create" }, cambia: { azione: "gdpr.violazione.set" }, elimina: { azione: "gdpr.violazione.delete" } },
  formazione: { tabella: gdprFormazione, crea: { azione: "gdpr.formazione.create" }, cambia: { azione: "gdpr.formazione.set" }, elimina: { azione: "gdpr.formazione.delete" } },
  verifica: { tabella: gdprVerifica, crea: { azione: "gdpr.verifica.create" }, cambia: { azione: "gdpr.verifica.set" }, elimina: { azione: "gdpr.verifica.delete" } },
  verificaAds: { tabella: gdprVerificaAds, crea: { azione: "gdpr.verifica_ads.create" }, cambia: { azione: "gdpr.verifica_ads.set" }, elimina: { azione: "gdpr.verifica_ads.delete" } },
  riesame: { tabella: gdprRiesame, crea: { azione: "gdpr.riesame.create" }, cambia: { azione: "gdpr.riesame.set" }, elimina: { azione: "gdpr.riesame.delete" } },
};

/** Le colonne `timestamptz`: dalla conoscenza decorrono le 72 ore. */
const ISTANTI = new Set(["conoscenzaIl", "notificataIl"]);

/** Le tabelle con un ordine manuale: le altre si leggono per data. */
const CON_ORDINE = new Set<TipoRiga>(["trattamento", "fornitore", "documento", "attivita"]);

/** I valori iniziali di una riga nuova: quelli che il prototipo precompilava. */
function iniziali(tipo: TipoRiga, oggi: string): Record<string, unknown> {
  switch (tipo) {
    case "attivita":
      return { mese: Number(oggi.slice(5, 7)) };
    case "documento":
      return { tipo: "Informativa (art. 13)" };
    case "richiesta":
      return { ricevutaIl: oggi };
    case "formazione":
    case "verifica":
    case "verificaAds":
    case "riesame":
      return { data: oggi };
    default:
      return {};
  }
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
    if (CON_ORDINE.has(tipo)) {
      const t = r.tabella as unknown as typeof gdprTrattamento;
      const [{ prossimo }] = await tx
        .select({ prossimo: sql<number>`coalesce(max(${t.ordine}), -1) + 1` })
        .from(t)
        .where(and(eq(t.systemId, systemId), eq(t.organizationId, orgId)));
      extra.ordine = prossimo;
    }
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
  const t = r.tabella as unknown as typeof gdprFornitore;

  await withTenant({ userId, orgId }, async (tx) => {
    // ⚠️ «Non dovuto» descrive solo il titolare autonomo. La combinazione si controlla
    // leggendo l'ALTRO campo dalla riga salvata, non da ciò che il browser crede.
    if (tipo === "fornitore" && (campo === "contratto" || campo === "qualifica")) {
      const [f] = await tx
        .select({ qualifica: gdprFornitore.qualifica, contratto: gdprFornitore.contratto })
        .from(gdprFornitore)
        .where(and(eq(gdprFornitore.id, id), eq(gdprFornitore.organizationId, orgId)));
      if (f) {
        const qualifica = campo === "qualifica" ? v : f.qualifica;
        const contratto = campo === "contratto" ? v : f.contratto;
        if (contratto === "Non dovuto" && qualifica !== QUALIFICA_TITOLARE_AUTONOMO) {
          throw new Error("«Non dovuto» vale solo per un titolare autonomo: con un responsabile il contratto è sempre dovuto");
        }
      }
    }
    // Gli istanti arrivano dalla validazione come ISO (già convertiti dall'ora italiana);
    // le colonne `timestamptz` di Drizzle vogliono un `Date`.
    const valore = ISTANTI.has(campo) && typeof v === "string" ? new Date(v) : v;
    const agg = await tx
      .update(t)
      // Toccare un trattamento proposto lo rende del consulente: la marca si spegne.
      .set((tipo === "trattamento" ? { [campo]: valore, propostaMotivo: null } : { [campo]: valore }) as never)
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
  const t = r.tabella as unknown as typeof gdprFornitore;
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx.delete(t).where(and(eq(t.id, id), eq(t.organizationId, orgId))).returning({ id: t.id });
    if (!via.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: r.elimina.azione, entita: tipo, entitaId: id });
  });
}

/** Accende o spegne un criterio di vaglio di un trattamento: una sola istruzione. */
export async function setCriterio(userId: string, orgId: string, trattamentoId: string, input: z.input<typeof criterioSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = criterioSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const nuovo = v.acceso
      ? sql`case when ${v.chiave} = any(${gdprTrattamento.criteri}) then ${gdprTrattamento.criteri}
             else array_append(${gdprTrattamento.criteri}, ${v.chiave}) end`
      : sql`array_remove(${gdprTrattamento.criteri}, ${v.chiave})`;
    const agg = await tx
      .update(gdprTrattamento)
      .set({ criteri: nuovo, updatedAt: new Date() })
      .where(and(eq(gdprTrattamento.id, trattamentoId), eq(gdprTrattamento.organizationId, orgId)))
      .returning({ id: gdprTrattamento.id });
    if (!agg.length) throw new Error("Trattamento inesistente o di un altro studio");
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.trattamento.criterio", entita: "trattamento", entitaId: trattamentoId, dettagli: { chiave: v.chiave, acceso: v.acceso } });
  });
}

// ─── Dal catalogo ───────────────────────────────────────────────────────────

/**
 * Aggiunge un trattamento dal catalogo, già impostato. Idempotente: lo stesso trattamento
 * tipo due volte non fa due righe (indice unico su `tipo_key`).
 */
export async function aggiungiTrattamentoTipo(userId: string, orgId: string, systemId: string, tipoKey: string): Promise<string | null> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    const [t] = await dbCorrente()
      .select()
      .from(gdprTrattamentoTipo)
      .where(and(eq(gdprTrattamentoTipo.setId, s.contentSetId), eq(gdprTrattamentoTipo.key, tipoKey)));
    if (!t) throw new Error("Trattamento del catalogo inesistente");
    const [{ prossimo }] = await tx
      .select({ prossimo: sql<number>`coalesce(max(${gdprTrattamento.ordine}), -1) + 1` })
      .from(gdprTrattamento)
      .where(and(eq(gdprTrattamento.systemId, systemId), eq(gdprTrattamento.organizationId, orgId)));
    const id = randomUUID();
    const nuovo = await tx
      .insert(gdprTrattamento)
      .values({
        id,
        organizationId: orgId,
        systemId,
        tipoKey: t.key,
        nome: t.nome,
        finalita: t.finalita,
        base: t.base,
        interessati: t.interessati,
        dati: t.dati,
        particolari: t.particolari,
        condizione9: t.condizione9 || null,
        destinatari: t.destinatari,
        conservazione: t.conservazione,
        criteri: t.criteri,
        ordine: prossimo,
      })
      .onConflictDoNothing({ target: [gdprTrattamento.systemId, gdprTrattamento.tipoKey] })
      .returning({ id: gdprTrattamento.id });
    if (!nuovo.length) return null;
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.trattamento.catalogo", entita: "trattamento", entitaId: id, dettagli: { tipo: t.key } });
    return id;
  });
}

/** Carica l'elenco tipo dei documenti. Idempotente: aggiunge solo le voci che mancano. */
export async function caricaDocumentiTipo(userId: string, orgId: string, systemId: string): Promise<{ aggiunti: number }> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    const tipo = await dbCorrente().select().from(gdprDocumentoTipo).where(eq(gdprDocumentoTipo.setId, s.contentSetId)).orderBy(asc(gdprDocumentoTipo.ordine));
    const base = await prossimoOrdine(tx, gdprDocumento, orgId, systemId);
    const nuovi = await tx
      .insert(gdprDocumento)
      .values(tipo.map((d, i) => ({ id: randomUUID(), organizationId: orgId, systemId, tipoKey: d.key, tipo: d.tipo, oggetto: d.oggetto, ordine: base + i })))
      .onConflictDoNothing({ target: [gdprDocumento.systemId, gdprDocumento.tipoKey] })
      .returning({ id: gdprDocumento.id });
    if (nuovi.length) {
      await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.documenti.tipo", entita: "gdpr_system", entitaId: systemId, dettagli: { aggiunti: nuovi.length } });
    }
    return { aggiunti: nuovi.length };
  });
}

/** Carica il piano tipo. Idempotente come l'elenco dei documenti. */
export async function caricaPianoTipo(userId: string, orgId: string, systemId: string): Promise<{ aggiunti: number }> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const s = await pretendiSistema(tx, orgId, systemId, { nuovaRiga: true });
    const tipo = await dbCorrente().select().from(gdprAttivitaTipo).where(eq(gdprAttivitaTipo.setId, s.contentSetId)).orderBy(asc(gdprAttivitaTipo.ordine));
    const base = await prossimoOrdine(tx, gdprAttivita, orgId, systemId);
    const nuovi = await tx
      .insert(gdprAttivita)
      .values(tipo.map((a, i) => ({ id: randomUUID(), organizationId: orgId, systemId, tipoKey: a.key, mese: a.mese, riferimento: a.riferimento, attivita: a.attivita, ordine: base + i })))
      .onConflictDoNothing({ target: [gdprAttivita.systemId, gdprAttivita.tipoKey] })
      .returning({ id: gdprAttivita.id });
    if (nuovi.length) {
      await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.piano.tipo", entita: "gdpr_system", entitaId: systemId, dettagli: { aggiunti: nuovi.length } });
    }
    return { aggiunti: nuovi.length };
  });
}

async function prossimoOrdine(tx: Tx, t: typeof gdprDocumento | typeof gdprAttivita, orgId: string, systemId: string): Promise<number> {
  const [{ prossimo }] = await tx
    .select({ prossimo: sql<number>`coalesce(max(${t.ordine}), -1) + 1` })
    .from(t)
    .where(and(eq(t.systemId, systemId), eq(t.organizationId, orgId)));
  return Number(prossimo);
}

/**
 * Il confine di tenant per le righe figlie: la radice, filtrata per organizzazione.
 *
 * ⚠️ `nuovaRiga`: le figlie non portano `company_id`, quindi il trigger
 * `azienda_scrivibile` (0061) non le vede. Su un'azienda archiviata il lavoro NUOVO si
 * ferma qui, con la stessa frase del database; gli aggiornamenti delle righe esistenti
 * restano liberi, come stabilisce la 0061 per le tabelle che il trigger copre.
 */
async function pretendiSistema(tx: Tx, orgId: string, systemId: string, opzioni: { nuovaRiga?: boolean } = {}) {
  const [row] = await tx
    .select({
      id: gdprSystem.id,
      companyId: gdprSystem.companyId,
      contentSetId: gdprSystem.contentSetId,
      paramAlto: gdprSystem.paramAlto,
      paramMedio: gdprSystem.paramMedio,
      statoAzienda: company.stato,
    })
    .from(gdprSystem)
    .innerJoin(company, eq(company.id, gdprSystem.companyId))
    .where(and(eq(gdprSystem.id, systemId), eq(gdprSystem.organizationId, orgId), eq(company.organizationId, orgId)));
  if (!row) throw new Error("Percorso inesistente o di un altro studio");
  if (opzioni.nuovaRiga && row.statoAzienda !== "active") {
    throw new Error("L'azienda è archiviata: ripristinala dal portafoglio per riprendere il lavoro.");
  }
  return row;
}
