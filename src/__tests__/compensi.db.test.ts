import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { compenso, compensoIncasso, documentSnapshot, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  creaCompenso,
  elencaCompensi,
  eliminaIncasso,
  registraIncasso,
  riepilogo,
  setCampoCompenso,
} from "@/features/compensi";
import { creaCollegamento, apriCollegamento } from "@/features/condivisione";

// I compensi, e la cosa che conta piu' di tutte: che non escano dallo studio.
//
// ⚠️ Il collegamento del portale cliente e' per AZIENDA, non per documento, e si apre
// senza sessione. Un importo che ci arrivasse sarebbe il prezzo che uno studio ha chiesto,
// visibile al cliente che lo paga. L'ultimo `describe` prova che non ci arriva, e lo prova
// in due modi: guardando cosa il portale restituisce, e guardando quali file lo nominano.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let compA = "";

async function pulisci(orgId: string) {
  await db.delete(compensoIncasso).where(eq(compensoIncasso.organizationId, orgId));
  await db.delete(compenso).where(eq(compenso.organizationId, orgId));
  await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
}

beforeAll(async () => {
  A = await creaStudio({ prefisso: "cmp-a", run: RUN, nomeAzienda: "Azienda A" });
  B = await creaStudio({ prefisso: "cmp-b", run: RUN, nomeAzienda: "Azienda B" });
  for (const s of [A, B]) await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  compA = await creaCompenso(A.userId, A.orgId, {
    companyId: A.companyId,
    descrizione: "Bilancio di sostenibilità 2025",
    importo: 450000, // 4.500,00 €
    scadenza: "2026-09-30",
  });
});

afterAll(async () => {
  for (const s of [A, B]) {
    await pulisci(s.orgId);
    await pulisciStudio(s.orgId, s.userId);
  }
});

describe("compensi", () => {
  it("nasce con importo, azienda e residuo pari al concordato", async () => {
    const v = await elencaCompensi(A.userId, A.orgId);
    expect(v).toHaveLength(1);
    expect(v[0].importo).toBe(450000);
    expect(v[0].companyNome).toBe("Azienda A");
    expect(v[0].incassato).toBe(0);
    expect(v[0].residuo).toBe(450000);
  });

  it("gli acconti sono RIGHE, e il secondo non cancella il primo", async () => {
    // ⚠️ Un campo `incassato` da aggiornare a ogni versamento sarebbe un
    // read-modify-write su un numero: lo stesso difetto che questo progetto ha gia'
    // pagato tre volte in altre forme.
    await registraIncasso(A.userId, A.orgId, compA, { importo: 150000, data: "2026-07-01" });
    await registraIncasso(A.userId, A.orgId, compA, { importo: 150000, data: "2026-08-01" });
    const [v] = await elencaCompensi(A.userId, A.orgId);
    expect(v.incassi).toHaveLength(2);
    expect(v.incassato).toBe(300000);
    expect(v.residuo).toBe(150000);
  });

  it("togliere un acconto rimette il residuo com'era", async () => {
    const [v] = await elencaCompensi(A.userId, A.orgId);
    await eliminaIncasso(A.userId, A.orgId, v.incassi[1].id);
    const [dopo] = await elencaCompensi(A.userId, A.orgId);
    expect(dopo.incassato).toBe(150000);
    expect(dopo.residuo).toBe(300000);
    // Si rimette, per i controlli seguenti.
    await registraIncasso(A.userId, A.orgId, compA, { importo: 150000, data: "2026-08-01" });
  });

  it("un acconto di zero o negativo viene rifiutato", async () => {
    for (const importo of [0, -100]) {
      await expect(
        registraIncasso(A.userId, A.orgId, compA, { importo, data: "2026-08-02" }),
      ).rejects.toThrow();
    }
    const [v] = await elencaCompensi(A.userId, A.orgId);
    expect(v.incassi).toHaveLength(2);
  });

  it("una data inesistente viene rifiutata, non fatta scivolare", async () => {
    await expect(
      registraIncasso(A.userId, A.orgId, compA, { importo: 100, data: "2026-02-31" }),
    ).rejects.toThrow(/AAAA-MM-GG/);
  });

  it("l'importo si modifica scrivendolo nella forma italiana", async () => {
    await setCampoCompenso(A.userId, A.orgId, compA, "importo", "5.000,00");
    const [v] = await elencaCompensi(A.userId, A.orgId);
    expect(v.importo).toBe(500000);
    expect(v.residuo).toBe(200000);
  });

  it("il riepilogo conta in ritardo solo chi ha residuo E scadenza passata", async () => {
    const v = await elencaCompensi(A.userId, A.orgId);
    expect(riepilogo(v, "2026-08-01").inRitardo).toBe(0);
    expect(riepilogo(v, "2026-12-01").inRitardo).toBe(1);
  });
});

describe("il portale cliente non puo' vedere un compenso", () => {
  it("il collegamento restituisce SOLO documenti, e nessun importo", async () => {
    // Si pubblica un documento vero e si apre il portale come farebbe il cliente.
    const snapId = randomUUID();
    await db.insert(documentSnapshot).values({
      id: snapId,
      organizationId: A.orgId,
      companyId: A.companyId,
      tipo: "ghg",
      anno: 2025,
      versione: 1,
      dati: { prova: true },
      publishedBy: A.userId,
    });

    const { token } = await creaCollegamento(A.userId, A.orgId, A.companyId, { giorni: 7 });
    const apertura = await apriCollegamento(token);
    expect(apertura.esito).toBe("ok");

    // ⚠️ La prova non e' che non ci sia scritto «compenso»: e' che l'oggetto restituito
    // non contenga NESSUNO degli importi, comunque lo si guardi. Si serializza tutto e
    // si cercano le cifre.
    const testo = JSON.stringify(apertura);
    for (const cifra of ["500000", "450000", "150000", "5.000", "4.500"]) {
      expect(testo, `il portale espone ${cifra}`).not.toContain(cifra);
    }
    expect(testo).not.toMatch(/compenso|incasso|importo/i);
    // E i documenti ci sono davvero: senza, questo controllo passerebbe su un portale
    // vuoto senza provare niente.
    const doc = (apertura as { documenti?: unknown[] }).documenti ?? [];
    expect(doc.length).toBeGreaterThan(0);
  });

  it("nessun file del portale NOMINA le tabelle dei compensi", () => {
    // ⚠️ Il controllo strutturale, ed e' quello che regge nel tempo. Il primo prova
    // com'e' il portale oggi; questo impedisce che domani qualcuno ci aggiunga un join
    // «per comodita'». Un pericolo si evita, non si filtra.
    const sospetti = [
      "src/features/condivisione",
      "src/app/api/condivisione",
      // ⚠️ Il portale sta nel gruppo `(marketing)` e non in uno `(public)`: una prima
      // versione di questo controllo scandiva un percorso che non esiste, e passava
      // guardando zero file. E' la trappola del test verde perche' non guarda niente.
      "src/app/(marketing)/documenti-cliente",
    ];
    const trovati: string[] = [];
    let quantiFile = 0;
    const scorri = (dir: string) => {
      for (const v of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, v.name);
        if (v.isDirectory()) scorri(p);
        else if (/\.(ts|tsx)$/.test(v.name)) {
          quantiFile++;
          const testo = readFileSync(p, "utf8");
          if (/\bcompensoIncasso\b|\bcompenso\b|features\/compensi/.test(testo)) trovati.push(p);
        }
      }
    };
    // ⚠️ Nessun `try/catch`: se una cartella cambia nome, questo controllo deve MORIRE
    // rumorosamente invece di continuare a dire verde su un perimetro che non guarda
    // piu' niente. Un percorso che sparisce e' proprio il momento in cui serve.
    for (const d of sospetti) scorri(d);
    expect(quantiFile, "il controllo non sta guardando nessun file").toBeGreaterThan(3);
    expect(trovati).toEqual([]);
  });
});

describe("confine fra studi", () => {
  it("lo studio B non vede, non tocca e non cancella i compensi di A", async () => {
    expect(await elencaCompensi(B.userId, B.orgId)).toEqual([]);
    await expect(
      setCampoCompenso(B.userId, B.orgId, compA, "importo", "1,00"),
    ).rejects.toThrow(/altro studio/i);
    await expect(
      registraIncasso(B.userId, B.orgId, compA, { importo: 100, data: "2026-08-03" }),
    ).rejects.toThrow(/altro studio/i);

    // ⚠️ La prova e' la riga che non e' cambiata, non il messaggio.
    const [r] = await db.select().from(compenso).where(eq(compenso.id, compA));
    expect(r.importo).toBe(500000);
    expect(r.organizationId).toBe(A.orgId);
  });

  it("lo studio B non registra un compenso su un'azienda dello studio A", async () => {
    await expect(
      creaCompenso(B.userId, B.orgId, { companyId: A.companyId, descrizione: "Intruso", importo: 100 }),
    ).rejects.toThrow(/altro studio/i);
    expect(await db.select().from(compenso).where(eq(compenso.organizationId, B.orgId))).toEqual([]);
  });
});
