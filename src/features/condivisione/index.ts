import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { companyShareLink, company, documentSnapshot } from "@/lib/db/schema";
import { TIPI_RISERVATI } from "@/features/documents/tipi";
import { and, desc, eq, sql, notInArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { DOCUMENTI } from "@/features/documents/tipi";
import {
  generaToken,
  improntaToken,
  formaValida,
  statoCollegamento,
  scadenzaFraGiorni,
  type StatoCollegamento,
} from "./token";

// Il portale del cliente: lo studio genera un collegamento, l'azienda scarica i suoi
// documenti. Nessun account, nessuna password, nessun utente in più da contare nei limiti.

export type Collegamento = {
  id: string;
  nota: string | null;
  creatoIl: Date;
  scadeIl: Date;
  revocatoIl: Date | null;
  aperture: number;
  ultimaApertura: Date | null;
  stato: StatoCollegamento;
};

/**
 * Crea un collegamento e restituisce il token **in chiaro una volta sola**.
 *
 * Non è recuperabile dopo: nel database c'è solo l'impronta. Se lo studio lo perde, ne
 * genera un altro e revoca il vecchio — che è esattamente il comportamento che vogliamo,
 * perché un collegamento rileggibile a piacere è un collegamento che gira.
 */
export async function creaCollegamento(
  userId: string,
  orgId: string,
  companyId: string,
  opts: { giorni: number; nota?: string },
): Promise<{ token: string; id: string; scadeIl: Date }> {
  // DUE capacita', perche' generare un collegamento e' due cose insieme: si scrive una
  // credenziale nuova (`write_data`) e si consegnano documenti fuori dal prodotto
  // (`export`).
  //
  // Con il solo `write_data` — com'era — il collaudo in produzione ha visto un conto in
  // PROVA creare un indirizzo pubblico ai documenti di un'azienda: la prova sta nel
  // database, non nell'interfaccia, perche' il prodotto non mostrava nessun rifiuto.
  //
  // Con il solo `export` passerebbe anche il conto SCADUTO, che oggi non deve: per lui
  // l'esporto resta aperto (i dati sono suoi) ma un collegamento nuovo vivrebbe fino a
  // novanta giorni oltre l'abbonamento. Quella scelta e' gia' presa e difesa da un test:
  // qui si corregge il difetto provato, non si ribalta di nascosto una decisione.
  await requireEntitlement(userId, orgId, "write_data");
  await requireEntitlement(userId, orgId, "export");

  const token = generaToken();
  const id = randomUUID();
  const scadeIl = scadenzaFraGiorni(opts.giorni);

  await withTenant({ userId, orgId }, async (tx) => {
    // L'azienda deve essere di questo studio: il filtro esplicito difende anche dove RLS
    // gia' difende, ed e' il controllo che impedisce di condividere l'azienda di un altro.
    const azienda = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
      .limit(1);
    if (!azienda.length) throw new Error("Azienda inesistente o di un altro studio");

    await tx.insert(companyShareLink).values({
      id,
      organizationId: orgId,
      companyId,
      tokenHash: improntaToken(token),
      nota: opts.nota?.trim() || null,
      creatoDa: userId,
      expiresAt: scadeIl,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "condivisione.create",
      entita: "company",
      entitaId: companyId,
    });
  });

  return { token, id, scadeIl };
}

export async function elencaCollegamenti(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<Collegamento[]> {
  const righe = await withTenant({ userId, orgId }, async (tx) =>
    tx
      .select({
        id: companyShareLink.id,
        nota: companyShareLink.nota,
        creatoIl: companyShareLink.createdAt,
        scadeIl: companyShareLink.expiresAt,
        revocatoIl: companyShareLink.revokedAt,
        aperture: companyShareLink.aperture,
        ultimaApertura: companyShareLink.lastOpenedAt,
      })
      .from(companyShareLink)
      .where(
        and(eq(companyShareLink.companyId, companyId), eq(companyShareLink.organizationId, orgId)),
      )
      .orderBy(desc(companyShareLink.createdAt)),
  );
  return righe.map((r) => ({
    ...r,
    stato: statoCollegamento({ revokedAt: r.revocatoIl, expiresAt: r.scadeIl }),
  }));
}

// La revoca NON chiede nessuna capacita', ed e' voluto: e' l'unica eccezione alla regola
// «nessuna mutazione senza entitlement», e la ragione va scritta perche' non sembri una
// dimenticanza. Spegnere un collegamento puo' solo RIDURRE l'esposizione. Legarla
// all'abbonamento significherebbe che uno studio scaduto si ritrova un indirizzo pubblico
// ai documenti di un cliente e non ha modo di chiuderlo — cioe' un freno sulla sicurezza
// che va nel verso sbagliato.
export async function revocaCollegamento(userId: string, orgId: string, id: string): Promise<void> {
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(companyShareLink)
      .set({ revokedAt: new Date() })
      .where(and(eq(companyShareLink.id, id), eq(companyShareLink.organizationId, orgId)))
      .returning({ id: companyShareLink.id });
    if (!agg.length) throw new Error("Collegamento inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "condivisione.revoke",
      entita: "company_share_link",
      entitaId: id,
    });
  });
}

export type DocumentoCondiviso = {
  id: string;
  tipo: string;
  nome: string;
  anno: number;
  mostraAnno: boolean;
  versione: number;
  pubblicatoIl: Date;
};

/** I modi in cui un collegamento NON si apre. «valido» non è fra questi di proposito: se lo
 *  è, l'esito è "ok" — e il tipo deve rendere irrappresentabile lo stato impossibile,
 *  invece di costringere chi legge a gestire un caso che non può accadere. */
export type MotivoRifiuto = Exclude<StatoCollegamento, "valido"> | "inesistente";

export type AperturaCollegamento =
  | { esito: "ok"; azienda: string; scadeIl: Date; documenti: DocumentoCondiviso[] }
  | { esito: MotivoRifiuto };

/**
 * Apre un collegamento. Rotta PUBBLICA: nessuna sessione, nessuna organizzazione.
 *
 * La lettura passa dalla valvola `platformAdmin` perché non c'è nessun tenant da cui
 * partire — ma solo **dopo** aver riconosciuto l'impronta, che è l'unico modo per sapere di
 * quale organizzazione si tratta. L'ordine è tutto: prima si dimostra di avere la
 * credenziale, poi si apre la porta.
 */
export async function apriCollegamento(token: string): Promise<AperturaCollegamento> {
  // Un indirizzo storto non deve costare una query.
  if (!formaValida(token)) return { esito: "inesistente" };
  const impronta = improntaToken(token);

  return withTenant({ platformAdmin: true }, async (tx) => {
    const righe = await tx
      .select({
        id: companyShareLink.id,
        organizationId: companyShareLink.organizationId,
        companyId: companyShareLink.companyId,
        scadeIl: companyShareLink.expiresAt,
        revocatoIl: companyShareLink.revokedAt,
      })
      .from(companyShareLink)
      .where(eq(companyShareLink.tokenHash, impronta))
      .limit(1);

    const link = righe[0];
    if (!link) return { esito: "inesistente" };

    const stato = statoCollegamento({ revokedAt: link.revocatoIl, expiresAt: link.scadeIl });
    if (stato !== "valido") return { esito: stato };

    const azienda = await tx
      .select({ nome: company.nome })
      .from(company)
      .where(eq(company.id, link.companyId))
      .limit(1);

    const documenti = await tx
      .select({
        id: documentSnapshot.id,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        pubblicatoIl: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      // Solo i documenti di QUELLA azienda: un collegamento apre una porta sola.
      //
      // ⚠️ E MAI i tipi riservati. Il collegamento è per AZIENDA, non per documento:
      // senza questo filtro, il giorno in cui si aggiunge un tipo che contiene
      // l'identità di chi ha segnalato, quel documento comparirebbe da solo dentro i
      // collegamenti già consegnati. Il filtro sta qui e non nell'interfaccia, e non al
      // momento della pubblicazione: quello varrebbe solo per i documenti futuri.
      //
      // Vedi `TIPI_RISERVATI` in `features/documents/tipi.ts` per la ragione di legge.
      .where(
        and(
          eq(documentSnapshot.companyId, link.companyId),
          eq(documentSnapshot.organizationId, link.organizationId),
          TIPI_RISERVATI.length ? notInArray(documentSnapshot.tipo, [...TIPI_RISERVATI]) : undefined,
        ),
      )
      .orderBy(desc(documentSnapshot.publishedAt));

    // Il contatore serve allo studio per sapere se il cliente l'ha usato, senza chiedere.
    await tx
      .update(companyShareLink)
      .set({ aperture: sql`${companyShareLink.aperture} + 1`, lastOpenedAt: new Date() })
      .where(eq(companyShareLink.id, link.id));

    return {
      esito: "ok" as const,
      azienda: azienda[0]?.nome ?? "",
      scadeIl: link.scadeIl,
      documenti: documenti.map((d) => ({
        ...d,
        nome: DOCUMENTI[d.tipo].nome,
        mostraAnno: DOCUMENTI[d.tipo].mostraAnno,
      })),
    };
  });
}

/** L'azienda a cui appartiene un documento, per il download dal portale. `null` se il
 *  collegamento non è valido o il documento non è di quella azienda. */
export async function documentoCondiviso(token: string, snapshotId: string): Promise<string | null> {
  const apertura = await apriCollegamento(token);
  if (apertura.esito !== "ok") return null;
  return apertura.documenti.some((d) => d.id === snapshotId) ? snapshotId : null;
}
