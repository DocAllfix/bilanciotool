import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgEntitlement, sgesgFase, sgesgProgramma, sgesgSchedaDato, sgesgSchedaDef } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import { creaProgramma } from "@/features/sgesg/programma";
import {
  elencaSchede,
  getScheda,
  riepilogoSchede,
  setCampoScheda,
  setStatoScheda,
} from "@/features/sgesg/schede";

// Le 63 schede: catalogo, compilazione per campo, confine di tenant.
//
// ⚠️ Il test che conta di piu' e' quello sulla scrittura ATOMICA: due campi salvati uno
// dopo l'altro devono coesistere. E' il difetto che questo progetto ha incontrato tre
// volte — salvare il costo azzerava la quantita' — e su un JSONB si ripresenterebbe
// identico se qualcuno sostituisse `jsonb_set` con «leggi, modifica, riscrivi».

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let progA = "";
let progB = "";

async function pulisci(orgId: string) {
  await db.delete(sgesgSchedaDato).where(eq(sgesgSchedaDato.organizationId, orgId));
  await db.delete(sgesgFase).where(eq(sgesgFase.organizationId, orgId));
  await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, orgId));
}

beforeAll(async () => {
  A = await creaStudio({ prefisso: "sch-a", run: RUN, nomeAzienda: "Azienda A" });
  B = await creaStudio({ prefisso: "sch-b", run: RUN, nomeAzienda: "Azienda B" });
  for (const s of [A, B]) await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  progA = await creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: 2025 });
  progB = await creaProgramma(B.userId, B.orgId, { companyId: B.companyId, anno: 2025 });
});

afterAll(async () => {
  for (const s of [A, B]) {
    await pulisci(s.orgId);
    await pulisciStudio(s.orgId, s.userId);
  }
});

describe("catalogo delle schede", () => {
  it("sono 63, distribuite sulle otto fasi come il metodo d'origine", async () => {
    const righe = await db.select().from(sgesgSchedaDef).where(eq(sgesgSchedaDef.setId, "sgesg-v1"));
    expect(righe).toHaveLength(63);
    const perFase = new Map<string, number>();
    for (const r of righe) perFase.set(r.faseKey, (perFase.get(r.faseKey) ?? 0) + 1);
    // ⚠️ I conteggi sono quelli di `esg-nexus-v2`, verificati dall'estrazione: 7+8+8+8+7+8+9+8.
    // Un numero diverso significa che l'estrattore ha perso una scheda per strada.
    expect([...perFase.entries()].sort()).toEqual([
      ["proc00", 7], ["proc01", 8], ["proc02", 8], ["proc03", 8],
      ["proc04", 7], ["proc05", 8], ["proc06", 9], ["proc07", 8],
    ]);
  });

  it("ventuno hanno logica e nessun campo compilabile, le altre ne hanno", async () => {
    const righe = await db.select().from(sgesgSchedaDef).where(eq(sgesgSchedaDef.setId, "sgesg-v1"));
    const conLogica = righe.filter((r) => r.haLogica);
    expect(conLogica).toHaveLength(21);
    // ⚠️ Il fatto che conta: una scheda con logica NON deve portare campi, o
    // l'interfaccia ne mostrerebbe una parte facendo credere che sia tutta li'.
    for (const r of conLogica) {
      const campi = ((r.sezioni ?? []) as { c: unknown[] }[]).reduce((n, z) => n + z.c.length, 0);
      expect(campi, `${r.key} ha logica ma porta campi`).toBe(0);
    }
    const dichiarative = righe.filter((r) => !r.haLogica);
    expect(dichiarative).toHaveLength(42);
    for (const r of dichiarative) {
      const campi = ((r.sezioni ?? []) as { c: unknown[] }[]).reduce((n, z) => n + z.c.length, 0);
      expect(campi, `${r.key} e' dichiarativa ma non ha campi`).toBeGreaterThan(0);
    }
  });

  it("nessuna scheda ha due campi con la stessa chiave", async () => {
    // Si sovrascriverebbero dentro il JSONB, e il secondo cancellerebbe il primo in
    // silenzio. E' il controllo che ha classificato `05A` come scheda con logica.
    const righe = await db.select().from(sgesgSchedaDef).where(eq(sgesgSchedaDef.setId, "sgesg-v1"));
    for (const r of righe) {
      const chiavi = ((r.sezioni ?? []) as { c: { k: string }[] }[]).flatMap((z) => z.c.map((c) => c.k));
      expect(new Set(chiavi).size, `chiavi doppie in ${r.key}`).toBe(chiavi.length);
    }
  });
});

describe("compilazione", () => {
  it("elenca le schede di una fase con lo stato di ciascuna", async () => {
    const v = await elencaSchede(A.userId, A.orgId, progA, "proc00");
    expect(v).toHaveLength(7);
    expect(v[0].codice).toBe("FORM-00A");
    expect(v.every((s) => s.stato === "non_aperta")).toBe(true);
    expect(v.every((s) => s.compilati === 0)).toBe(true);
  });

  it("una scheda esiste solo quando la si compila", async () => {
    expect(await db.select().from(sgesgSchedaDato).where(eq(sgesgSchedaDato.programId, progA))).toHaveLength(0);
    await setCampoScheda(A.userId, A.orgId, progA, "00A", "consulente_assegnato", "Silvia Marino");
    expect(await db.select().from(sgesgSchedaDato).where(eq(sgesgSchedaDato.programId, progA))).toHaveLength(1);
  });

  it("salvare un secondo campo NON azzera il primo", async () => {
    // ⚠️ Il test che vale piu' di tutti gli altri di questo file.
    await setCampoScheda(A.userId, A.orgId, progA, "00A", "canale", "Passaparola / Referral");
    const s = (await getScheda(A.userId, A.orgId, progA, "00A"))!;
    expect(s.dati.consulente_assegnato).toBe("Silvia Marino");
    expect(s.dati.canale).toBe("Passaparola / Referral");
  });

  it("svuotare un campo TOGLIE la chiave, non lascia una stringa vuota", async () => {
    await setCampoScheda(A.userId, A.orgId, progA, "00A", "canale", "");
    const s = (await getScheda(A.userId, A.orgId, progA, "00A"))!;
    expect("canale" in s.dati).toBe(false);
    expect(s.dati.consulente_assegnato).toBe("Silvia Marino");
  });

  it("un campo che il catalogo non conosce viene RIFIUTATO", async () => {
    await expect(
      setCampoScheda(A.userId, A.orgId, progA, "00A", "campo_inventato", "x"),
    ).rejects.toThrow(/non riconosciuto/i);
    const s = (await getScheda(A.userId, A.orgId, progA, "00A"))!;
    expect("campo_inventato" in s.dati).toBe(false);
  });

  it("una scheda con logica non si compila da qui", async () => {
    const [conLogica] = await db
      .select()
      .from(sgesgSchedaDef)
      .where(and(eq(sgesgSchedaDef.setId, "sgesg-v1"), eq(sgesgSchedaDef.haLogica, true)))
      .limit(1);
    await expect(
      setCampoScheda(A.userId, A.orgId, progA, conLogica.key, "qualunque", "x"),
    ).rejects.toThrow(/non si compila/i);
  });

  it("lo stato della scheda e' dichiarato, non dedotto dal riempimento", async () => {
    // Una scheda si puo' considerare chiusa con campi facoltativi vuoti: e' un giudizio
    // del consulente, e il prodotto non deve indovinarlo al posto suo.
    await setStatoScheda(A.userId, A.orgId, progA, "00A", "completata");
    const v = await elencaSchede(A.userId, A.orgId, progA, "proc00");
    const a = v.find((s) => s.key === "00A")!;
    expect(a.stato).toBe("completata");
    expect(a.compilati).toBe(1);
    expect(a.campi).toBeGreaterThan(1);
  });

  it("il riepilogo conta le completate per fase", async () => {
    const r = await riepilogoSchede(A.userId, A.orgId, progA);
    expect(r.get("proc00")).toEqual({ totali: 7, completate: 1 });
    expect(r.get("proc07")).toEqual({ totali: 8, completate: 0 });
  });
});

describe("confine fra studi", () => {
  it("lo studio B non legge ne' scrive le schede del programma di A", async () => {
    await expect(elencaSchede(B.userId, B.orgId, progA, "proc00")).rejects.toThrow(/altro studio/i);
    await expect(getScheda(B.userId, B.orgId, progA, "00A")).rejects.toThrow(/altro studio/i);
    await expect(
      setCampoScheda(B.userId, B.orgId, progA, "00A", "consulente_assegnato", "Rubato"),
    ).rejects.toThrow(/altro studio/i);

    // ⚠️ La prova e' la riga che non e' cambiata, non il messaggio.
    const [d] = await db
      .select()
      .from(sgesgSchedaDato)
      .where(and(eq(sgesgSchedaDato.programId, progA), eq(sgesgSchedaDato.schedaKey, "00A")));
    expect((d.dati as Record<string, unknown>).consulente_assegnato).toBe("Silvia Marino");
    expect(d.organizationId).toBe(A.orgId);
  });

  it("ognuno vede il proprio compilato, e sono indipendenti", async () => {
    await setCampoScheda(B.userId, B.orgId, progB, "00A", "consulente_assegnato", "Altro Studio");
    const a = (await getScheda(A.userId, A.orgId, progA, "00A"))!;
    const b = (await getScheda(B.userId, B.orgId, progB, "00A"))!;
    expect(a.dati.consulente_assegnato).toBe("Silvia Marino");
    expect(b.dati.consulente_assegnato).toBe("Altro Studio");
  });
});
