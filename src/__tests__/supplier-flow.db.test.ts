import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, supplierAnswer } from "@/lib/db/schema";
import { createAssessment, listAnswers, setAnswerField, setSoglia, updateProfilo } from "@/features/supplier/assessments";
import { getSupplierData } from "@/features/supplier/queries";
import { publishSupplierSnapshot, getSnapshot } from "@/features/documents/snapshot";
import { documentSnapshot } from "@/lib/db/schema";

// Ciclo completo dell'autovalutazione fornitore sui fatti del database: quello
// che il motore calcola in memoria deve risultare identico partendo dalle righe
// realmente scritte, sul dataset di esempio del prototipo.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-sup-${RUN}`;
const userId = `user-sup-${RUN}`;
let companyId = "";
let assessmentId = "";

const SI = ["B1", "B4", "E1", "E5", "E7", "S1", "S3", "S4", "G1", "G6", "P2"];
const PARZIALE = ["B2", "E2", "S2", "S5", "G3", "P1"];
const NO = ["E4", "E8", "S6", "S7", "G2", "G4", "P4"];

describe.skipIf(!url)("modulo fornitori — ciclo completo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente Fornitori", email: `sup-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Fornitori", slug: `sup-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Carpenteria di prova S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("crea la valutazione, una sola per azienda", async () => {
    assessmentId = await createAssessment(userId, orgId, { companyId });
    await updateProfilo(userId, orgId, assessmentId, {
      settore: "Carpenteria metallica",
      dipendenti: "42",
      committente: "Capofila di filiera",
    });
    // La seconda tentata sulla stessa azienda viola l'unicità.
    await expect(createAssessment(userId, orgId, { companyId })).rejects.toThrow();
  });

  it("risposte per singolo campo: annotare non cancella la risposta", async () => {
    await setAnswerField(userId, orgId, assessmentId, "B1", "risposta", "si");
    await setAnswerField(userId, orgId, assessmentId, "B1", "nota", "Politica approvata dal CdA a marzo.");
    const [b1] = (await listAnswers(userId, orgId, assessmentId)).filter((r) => r.questionKey === "B1");
    expect(b1.risposta).toBe("si");
    expect(b1.nota).toBe("Politica approvata dal CdA a marzo.");

    // Svuotare un campo lascia la riga finché resta qualcosa d'altro.
    await setAnswerField(userId, orgId, assessmentId, "B1", "nota", null);
    const [ancora] = (await listAnswers(userId, orgId, assessmentId)).filter((r) => r.questionKey === "B1");
    expect(ancora.risposta).toBe("si");
    expect(ancora.nota).toBeNull();

    // Svuotato l'ultimo campo, la riga sparisce: una domanda mai toccata non
    // deve risultare "valutata".
    await setAnswerField(userId, orgId, assessmentId, "B1", "risposta", null);
    expect((await listAnswers(userId, orgId, assessmentId)).some((r) => r.questionKey === "B1")).toBe(false);
  });

  it("riproduce il golden del prototipo partendo dalle righe scritte", async () => {
    for (const k of SI) await setAnswerField(userId, orgId, assessmentId, k, "risposta", "si");
    for (const k of PARZIALE) await setAnswerField(userId, orgId, assessmentId, k, "risposta", "parziale");
    for (const k of NO) await setAnswerField(userId, orgId, assessmentId, k, "risposta", "no");

    const d = (await getSupplierData(userId, orgId, companyId))!;
    expect(d.catalogo!.domande.length).toBe(37);
    expect(d.esito!.indice).toBe(58);
    expect(d.esito!.perArea.base.punteggio).toBe(83);
    expect(d.esito!.perArea.env.punteggio).toBe(58);
    expect(d.esito!.perArea.soc.punteggio).toBe(59);
    expect(d.esito!.perArea.eth.punteggio).toBe(50);
    expect(d.esito!.perArea.proc.punteggio).toBe(50);
    expect(d.esito!.valutate).toBe(24);
    expect(d.esito!.fascia.key).toBe("in_avvio");
  });

  it("il piano ordina le lacune per punti guadagnati al giorno", async () => {
    const d = (await getSupplierData(userId, orgId, companyId))!;
    expect(d.stato!.piano.length).toBe(13);
    expect(d.stato!.piano[0].key).toBe("P4");
    expect(d.esito!.puntiRecuperabili).toBe(42.7);
    // L'azione proposta cita l'evidenza attesa dalla domanda, non un testo generico.
    expect(d.stato!.piano[0].azione).toContain("Mappa rischi filiera");
  });

  it("«non applicabile» conta come valutata ma non abbassa il punteggio", async () => {
    const prima = (await getSupplierData(userId, orgId, companyId))!.esito!;
    await setAnswerField(userId, orgId, assessmentId, "E9", "risposta", "na");
    const dopo = (await getSupplierData(userId, orgId, companyId))!.esito!;
    expect(dopo.valutate).toBe(prima.valutate + 1);
    expect(dopo.risposteDiMerito).toBe(prima.risposteDiMerito);
    expect(dopo.perArea.env.punteggio).toBe(prima.perArea.env.punteggio);
    await setAnswerField(userId, orgId, assessmentId, "E9", "risposta", null);
  });

  it("la soglia la fissa il committente e determina lo scarto", async () => {
    await setSoglia(userId, orgId, assessmentId, 75);
    const d = (await getSupplierData(userId, orgId, companyId))!;
    expect(d.valutazione!.sogliaRichiesta).toBe(75);
    expect(d.esito!.scartoDallaSoglia).toBe(58 - 75);
    await setSoglia(userId, orgId, assessmentId, 60);
  });

  it("il piano d'azione vive sulla riga della domanda", async () => {
    await setAnswerField(userId, orgId, assessmentId, "P4", "responsabile", "Direzione acquisti");
    await setAnswerField(userId, orgId, assessmentId, "P4", "scadenza", "2026-06-30");
    await setAnswerField(userId, orgId, assessmentId, "P4", "statoAzione", "in_corso");
    const d = (await getSupplierData(userId, orgId, companyId))!;
    const voce = d.stato!.piano.find((v) => v.key === "P4")!;
    expect(voce.responsabile).toBe("Direzione acquisti");
    expect(voce.scadenza).toBe("2026-06-30");
    expect(voce.statoAzione).toBe("in_corso");
    // La risposta non è stata toccata dagli aggiornamenti del piano.
    expect(d.stato!.risposte.find((r) => r.questionKey === "P4")!.risposta).toBe("no");
  });

  it("valori fuori dominio respinti dal codice E dal database", async () => {
    // Il livello che scrive rifiuta il valore, non solo l'azione.
    await expect(
      setAnswerField(userId, orgId, assessmentId, "B2", "risposta", "forse"),
    ).rejects.toThrow(/non ammesso/i);
    await expect(
      setAnswerField(userId, orgId, assessmentId, "B2", "statoAzione", "quasi"),
    ).rejects.toThrow(/non ammesso/i);

    // E il database lo rifiuta comunque, anche scavalcando il codice: Drizzle
    // non genera CHECK per text(enum), quindi il vincolo è scritto a mano.
    await expect(
      db.insert(supplierAnswer).values({
        id: randomUUID(),
        organizationId: orgId,
        assessmentId,
        questionKey: "ZZ",
        risposta: "forse" as never,
      }),
    ).rejects.toThrow();

    const righe = await db.select().from(supplierAnswer).where(eq(supplierAnswer.assessmentId, assessmentId));
    expect(righe.every((r) => r.risposta === null || ["si", "parziale", "no", "na"].includes(r.risposta))).toBe(true);
  });

  it("l'attestato si congela e si RIGENERA coi dati nuovi", async () => {
    type Dati = { esito: { indice: number; valutate: number }; risposte: { questionKey: string }[] };
    const snapId = await publishSupplierSnapshot(userId, orgId, companyId);
    const v1 = (await getSnapshot(userId, orgId, snapId))!;
    expect(v1.tipo).toBe("attestato");
    expect(v1.versione).toBe(1);
    // Non ha esercizio: l'anno convenzionale è zero.
    expect(v1.anno).toBe(0);
    const indiceCongelato = (v1.dati as Dati).esito.indice;
    expect(indiceCongelato).toBe(58);

    // Il questionario cambia: due "no" diventano "si".
    await setAnswerField(userId, orgId, assessmentId, "E4", "risposta", "si");
    await setAnswerField(userId, orgId, assessmentId, "G2", "risposta", "si");
    const vivo = (await getSupplierData(userId, orgId, companyId))!.esito!;
    expect(vivo.indice).toBeGreaterThan(58);

    // L'attestato già consegnato NON cambia.
    const rilettura = (await getSnapshot(userId, orgId, snapId))!;
    expect((rilettura.dati as Dati).esito.indice).toBe(58);

    // La nuova revisione porta il punteggio aggiornato, identico a quello vivo.
    const snapId2 = await publishSupplierSnapshot(userId, orgId, companyId);
    const v2 = (await getSnapshot(userId, orgId, snapId2))!;
    expect(v2.versione).toBe(2);
    expect((v2.dati as Dati).esito.indice).toBe(vivo.indice);
    expect((v2.dati as Dati).esito.indice).not.toBe(indiceCongelato);

    // E l'update dello snapshot resta impossibile, anche da connessione privilegiata.
    await expect(
      db.update(documentSnapshot).set({ dati: { manomesso: true } }).where(eq(documentSnapshot.id, snapId)),
    ).rejects.toThrow();

    await setAnswerField(userId, orgId, assessmentId, "E4", "risposta", "no");
    await setAnswerField(userId, orgId, assessmentId, "G2", "risposta", "no");
  });

  it("account expired: scrittura bloccata, lettura consentita", async () => {
    await db.update(orgEntitlement).set({ status: "expired" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(
      setAnswerField(userId, orgId, assessmentId, "B3", "risposta", "si"),
    ).rejects.toMatchObject({ code: "read_only" });
    await expect(getSupplierData(userId, orgId, companyId)).resolves.toBeDefined();
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
