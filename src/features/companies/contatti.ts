import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { company, companyContact } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";

// La rubrica dell'azienda cliente: chi si chiama quando serve un dato.
//
// ⚠️ Ogni select porta il FILTRO ESPLICITO sull'organizzazione oltre a RLS, e non e'
// ridondanza: in sviluppo la connessione e' privilegiata e le policy non scattano, quindi
// una query senza filtro qui funzionerebbe e mostrerebbe i contatti di TUTTI gli studi,
// mentre in produzione RLS coprirebbe il difetto lasciandolo li'. E' successo con lo
// scadenzario. La difesa sta in tutti e due gli strati.
//
// ⚠️ E il filtro sull'organizzazione va anche sull'`update` e sul `delete`: senza, chi
// conoscesse l'identificativo di un contatto di un altro studio potrebbe toccarlo, e in
// sviluppo nessun test se ne accorgerebbe.

export type Contatto = typeof companyContact.$inferSelect;

export type DatiContatto = {
  nome: string;
  ruolo?: string | null;
  email?: string | null;
  telefono?: string | null;
  note?: string | null;
  principale?: boolean;
};

/** Verifica che l'azienda sia dello studio, dentro la transazione in corso. */
async function pretendiAzienda(tx: Parameters<Parameters<typeof withTenant>[1]>[0], orgId: string, companyId: string) {
  const [az] = await tx
    .select({ id: company.id })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
    .limit(1);
  if (!az) throw new Error("Azienda inesistente o di un altro studio");
}

/** I contatti dell'azienda: il principale per primo, poi i piu' recenti. */
export async function elencaContatti(userId: string, orgId: string, companyId: string): Promise<Contatto[]> {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(companyContact)
      .where(and(eq(companyContact.companyId, companyId), eq(companyContact.organizationId, orgId)))
      .orderBy(desc(companyContact.principale), asc(companyContact.nome)),
  );
}

export async function creaContatto(
  userId: string,
  orgId: string,
  companyId: string,
  dati: DatiContatto,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiAzienda(tx, orgId, companyId);

    // ⚠️ CHI SIA IL PRIMO LO DECIDE IL SERVER, contando dentro la transazione.
    //
    // La prima versione lasciava decidere al client, che passava `principale` guardando
    // quanti contatti aveva ricevuto nelle props. E' lo stesso difetto che questo
    // progetto ha gia' pagato tre volte: le props sono di un istante fa, e fra il
    // salvataggio del primo contatto e l'aggiunta del secondo il rinfresco puo' non
    // essere ancora atterrato. Il collaudo l'ha colto subito — aggiungendone due in
    // fretta, il secondo si dichiarava riferimento e scalzava il primo.
    //
    // Contare qui costa una riga e non puo' sbagliare: il conteggio e' quello vero, nella
    // stessa transazione che inserisce.
    let principale = dati.principale === true;
    if (dati.principale === undefined) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(companyContact)
        .where(and(eq(companyContact.companyId, companyId), eq(companyContact.organizationId, orgId)));
      principale = n === 0;
    }

    // Se nasce principale, il precedente si spegne NELLA STESSA TRANSAZIONE: l'indice
    // parziale respinge il secondo, quindi non e' una cortesia, e' l'unico modo di
    // riuscire. La convenzione la impone il database, non questa funzione.
    if (principale) await spegniPrincipale(tx, orgId, companyId, null);
    await tx.insert(companyContact).values({
      id,
      organizationId: orgId,
      companyId,
      nome: dati.nome.trim(),
      ruolo: dati.ruolo ?? null,
      email: dati.email ?? null,
      telefono: dati.telefono ?? null,
      note: dati.note ?? null,
      principale,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company_contact.create",
      entita: "company_contact",
      entitaId: id,
    });
  });
  return id;
}

/**
 * Aggiorna UN campo per volta, e rilegge il valore precedente dal database.
 *
 * ⚠️ E' la regola nata in Fase 12 e ripetuta in F7 e F13, dopo tre difetti dello stesso
 * segno: mandare la riga intera da props stantie azzera i campi che qualcun altro — o lo
 * stesso utente in un altro riquadro — ha appena salvato. Salvare il costo azzerava la
 * quantita'; impostare la rilevanza finanziaria azzerava l'impatto. Qui il client manda
 * il nome del campo e il suo valore, e nient'altro.
 */
export async function aggiornaCampoContatto(
  userId: string,
  orgId: string,
  contattoId: string,
  campo: "nome" | "ruolo" | "email" | "telefono" | "note",
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const pulito = campo === "nome" ? (valore ?? "").trim() : (valore?.trim() || null);
    if (campo === "nome" && !pulito) throw new Error("Il nome del contatto non puo' essere vuoto");
    const tocca = await tx
      .update(companyContact)
      .set({ [campo]: pulito })
      .where(and(eq(companyContact.id, contattoId), eq(companyContact.organizationId, orgId)))
      .returning({ id: companyContact.id });
    // ⚠️ `.returning()` e non un update muto: senza, un aggiornamento che non tocca
    // nessuna riga — identificativo di un altro studio, riga cancellata nel frattempo —
    // riuscirebbe in silenzio, e l'audit scriverebbe «aggiornato» di una cosa che non e'
    // successa. E' il difetto trovato nell'entitlement il 15 agosto.
    if (!tocca.length) throw new Error("Contatto inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company_contact.update",
      entita: "company_contact",
      entitaId: contattoId,
      dettagli: { campo },
    });
  });
}

/** Spegne il principale corrente, escluso `tranne` se indicato. */
async function spegniPrincipale(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  orgId: string,
  companyId: string,
  tranne: string | null,
) {
  const dove = [
    eq(companyContact.companyId, companyId),
    eq(companyContact.organizationId, orgId),
    eq(companyContact.principale, true),
  ];
  if (tranne) dove.push(ne(companyContact.id, tranne));
  await tx.update(companyContact).set({ principale: false }).where(and(...dove));
}

/** Promuove un contatto a principale, spegnendo il precedente nella stessa transazione. */
export async function promuoviContatto(userId: string, orgId: string, contattoId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const [c] = await tx
      .select({ companyId: companyContact.companyId })
      .from(companyContact)
      .where(and(eq(companyContact.id, contattoId), eq(companyContact.organizationId, orgId)))
      .limit(1);
    if (!c) throw new Error("Contatto inesistente o di un altro studio");
    await spegniPrincipale(tx, orgId, c.companyId, contattoId);
    await tx
      .update(companyContact)
      .set({ principale: true })
      .where(and(eq(companyContact.id, contattoId), eq(companyContact.organizationId, orgId)));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company_contact.promote",
      entita: "company_contact",
      entitaId: contattoId,
    });
  });
}

export async function eliminaContatto(userId: string, orgId: string, contattoId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const tolto = await tx
      .delete(companyContact)
      .where(and(eq(companyContact.id, contattoId), eq(companyContact.organizationId, orgId)))
      .returning({ id: companyContact.id });
    if (!tolto.length) throw new Error("Contatto inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company_contact.delete",
      entita: "company_contact",
      entitaId: contattoId,
    });
  });
}

// ─── anagrafica dell'azienda ─────────────────────────────────────────────────

export type CampoAnagrafica = "piva" | "settore" | "ateco" | "sede" | "nazione" | "sitoWeb" | "dipendenti" | "fatturato";

/**
 * Un campo dell'anagrafica per volta, come per i contatti e per la stessa ragione.
 *
 * ⚠️ `nazione` si normalizza in MAIUSCOLO qui, perche' il CHECK del database pretende
 * due lettere maiuscole. Normalizzare e' giusto — «it» e «IT» sono la stessa cosa — ma
 * NON si indovina: una stringa che non sia gia' un codice a due lettere viene respinta,
 * non convertita. Convertire «Italia» in «IT» sembra gentile e apre la porta a
 * convertire «Irlanda» in «IR», che e' l'Iran.
 */
export async function aggiornaAnagrafica(
  userId: string,
  orgId: string,
  companyId: string,
  campo: CampoAnagrafica,
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const grezzo = valore?.trim() || null;

  let pulito: string | number | null = grezzo;
  if (campo === "nazione" && grezzo) {
    const su = grezzo.toUpperCase();
    if (!/^[A-Z]{2}$/.test(su)) throw new Error("La nazione va indicata col codice a due lettere (es. IT, DE, FR)");
    pulito = su;
  }
  if (campo === "dipendenti" && grezzo) {
    const n = Number(grezzo);
    if (!Number.isInteger(n) || n < 0) throw new Error("I dipendenti sono un numero intero non negativo");
    pulito = n;
  }
  if (campo === "fatturato" && grezzo) {
    const n = Number(grezzo.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) throw new Error("Il fatturato e' un numero non negativo");
    // NUMERIC come STRINGA: passare un float a Drizzle per una colonna numeric fa
    // rientrare dalla finestra l'aritmetica binaria che questo progetto tiene fuori
    // dalla porta da dodici fasi.
    pulito = n.toFixed(2);
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const tocca = await tx
      .update(company)
      .set({ [campo]: pulito })
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
      .returning({ id: company.id });
    if (!tocca.length) throw new Error("Azienda inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company.update",
      entita: "company",
      entitaId: companyId,
      dettagli: { campo },
    });
  });
}
