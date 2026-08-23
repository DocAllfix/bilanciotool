import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wbChannel, wbReport, wbSystem } from "@/lib/db/schema";
import { latestSetId } from "@/features/content-set";
import { creaStudio, pulisciStudio } from "./comune";

// I domini chiusi delle Segnalazioni, provati ROMPENDOLI.
//
// Non è un test di stile: i CHECK di questa migrazione sono l'unico strato che vale
// anche per una scrittura che non passa dalle server action — uno script, una
// migrazione futura, una correzione a mano su un fascicolo. Un CHECK che nessuno ha
// visto rifiutare non si sa se rifiuta: la migrazione 0027 ne scrive venti in un ciclo
// `EXECUTE format(...)`, e un errore di quoting li creerebbe sul nome sbagliato senza
// che nulla si lamenti.
//
// Ogni caso qui ha la coppia: il valore giusto DEVE entrare, quello sbagliato DEVE
// essere respinto. Solo il secondo proverebbe che il vincolo esiste; solo il primo
// proverebbe che non è troppo stretto.

const RUN = Date.now();
let studio: Awaited<ReturnType<typeof creaStudio>>;
let systemId: string;

/** Il messaggio del vincolo, oppure `null` se l'istruzione è riuscita. */
async function respinto(esegui: () => Promise<unknown>): Promise<string | null> {
  try {
    await esegui();
    return null;
  } catch (e) {
    // ⚠️ Drizzle incapsula gli errori di Postgres: il nome del vincolo sta nella
    // `cause`, non nel messaggio esterno. Guardarne uno solo fa passare per «non
    // bloccato» qualcosa che è stato bloccato davvero.
    const err = e as { message?: string; cause?: { message?: string; constraint_name?: string } };
    return err.cause?.constraint_name ?? err.cause?.message ?? err.message ?? "errore senza messaggio";
  }
}

async function nuovoFascicolo(campi: Record<string, unknown>, numero: number) {
  return db.insert(wbReport).values({
    id: randomUUID(),
    organizationId: studio.orgId,
    systemId,
    numero,
    ...campi,
  });
}

beforeAll(async () => {
  studio = await creaStudio({ prefisso: "wbvinc", run: RUN, nomeAzienda: "Officine Sannite S.r.l." });
  systemId = randomUUID();
  await db.insert(wbSystem).values({
    id: systemId,
    organizationId: studio.orgId,
    companyId: studio.companyId,
    contentSetId: await latestSetId("wb", "Catalogo delle segnalazioni non disponibile"),
  });
});

afterAll(async () => {
  await db.delete(wbReport).where(sql`${wbReport.organizationId} = ${studio.orgId}`);
  await db.delete(wbChannel).where(sql`${wbChannel.organizationId} = ${studio.orgId}`);
  await db.delete(wbSystem).where(sql`${wbSystem.organizationId} = ${studio.orgId}`);
  await pulisciStudio(studio.orgId, studio.userId);
});

describe("il canale: le tre forme di legge, e nient'altro", () => {
  it("accetta le tre forme dell'art. 4 c. 1", async () => {
    for (const forma of ["Scritta", "Orale", "Incontro diretto"]) {
      await db.insert(wbChannel).values({
        id: randomUUID(),
        organizationId: studio.orgId,
        systemId,
        forma,
        attiva: true,
      });
    }
    const righe = await db.select().from(wbChannel).where(sql`${wbChannel.systemId} = ${systemId}`);
    expect(righe.length).toBe(3);
  });

  it("rifiuta una quarta forma inventata", async () => {
    // Se la forma fosse testo libero, «orale telefonico» e «Orale» sarebbero due cose
    // diverse per il database, e il controllo di completezza direbbe che manca la forma
    // orale a chi ce l'ha.
    const errore = await respinto(() =>
      db.insert(wbChannel).values({
        id: randomUUID(),
        organizationId: studio.orgId,
        systemId,
        forma: "orale telefonico",
      }),
    );
    expect(errore).toContain("wb_channel_forma_ck");
  });
});

describe("il fascicolo: i domini del decreto", () => {
  it("accetta i valori del prototipo e respinge quelli fuori elenco", async () => {
    const casi: ReadonlyArray<readonly [string, string, string, string]> = [
      // colonna, valore buono, valore cattivo, nome del vincolo
      //
      // ⚠️ Il nome del vincolo si scrive per esteso perché è la sola prova che sia
      // scattato QUELLO e non un altro. E non si deduce dal nome della colonna: i
      // vincoli scritti a mano nella migrazione usano abbreviazioni
      // (`wb_report_penale_ck`, non `wb_report_rilevanza_penale_ck`), quelli generati
      // dal ciclo no. Indovinarli fa fallire il test su una cosa che funziona.
      ["stato", "In istruttoria", "Aperta", "wb_report_stato_ck"],
      ["esito", "Parzialmente fondata", "Fondata in parte", "wb_report_esito_ck"],
      ["canale", "Canale esterno ANAC", "PEC", "wb_report_canale_ck"],
      ["qualita", "Ex dipendente", "Consulente", "wb_report_qualita_ck"],
      ["ambito", "Tutela dell'ambiente", "Ambiente", "wb_report_ambito_ck"],
      ["altrove", "Sì, ad ANAC", "Sì", "wb_report_altrove_ck"],
      ["rilevanzaPenale", "Sì, denuncia effettuata", "Sì", "wb_report_penale_ck"],
      ["consensoRivelazione", "Non necessario", "Non applicabile", "wb_report_cons_riv_ck"],
    ];

    let n = 100;
    for (const [colonna, buono, cattivo, vincolo] of casi) {
      // Il valore buono deve passare: un vincolo troppo stretto è un difetto quanto uno
      // assente, e si manifesterebbe la prima volta che un consulente sceglie
      // dall'elenco e il salvataggio fallisce.
      await expect(nuovoFascicolo({ [colonna]: buono }, n++)).resolves.toBeDefined();
      const errore = await respinto(() => nuovoFascicolo({ [colonna]: cattivo }, n++));
      expect(errore, `«${cattivo}» è entrato in ${colonna}`).toContain(vincolo);
    }
  });

  it("i diciassette campi a due valori sono davvero a due valori", async () => {
    // Sono scritti in un ciclo `EXECUTE format(...)` nella migrazione: è comodo, e per
    // questo va verificato che il ciclo li abbia creati tutti e sul nome giusto.
    const colonne = [
      "ammOggetto", "ammLegittimato", "ammContesto", "ammElementi", "ammNonPersonale",
      "ritIdentitaConoscibile", "ritSovraordinato", "ritContestoRistretto",
      "ritPrecedenti", "ritRapportoPrecario", "ritGiaEsposto",
      "recapito", "conflitto", "monitoraggioAperto", "identitaRivelata", "cancellata",
    ] as const;

    let n = 300;
    for (const c of colonne) {
      await expect(nuovoFascicolo({ [c]: "Sì" }, n++)).resolves.toBeDefined();
      await expect(nuovoFascicolo({ [c]: "No" }, n++)).resolves.toBeDefined();
      const errore = await respinto(() => nuovoFascicolo({ [c]: "Forse" }, n++));
      expect(errore, `${c} accetta un terzo valore`).toMatch(/_ck$/);
    }
  });

  it("⚠️ «non ancora valutato» resta ammesso, ed è il terzo stato", async () => {
    // NULL non è «No». Nei cinque elementi dell'ammissibilità e nei sei fattori di
    // ritorsione il vuoto produce un esito NULL e non un esito negativo: è lo
    // scostamento dal prototipo che `valutazione.ts` documenta, e un CHECK `NOT NULL`
    // scritto per zelo lo cancellerebbe.
    await expect(
      nuovoFascicolo({ ammOggetto: null, ritPrecedenti: null, recapito: null }, 500),
    ).resolves.toBeDefined();
  });

  it("le quattro date dei termini rifiutano il formato italiano", async () => {
    // Il vincolo controlla la FORMA. Il 31 febbraio lo ferma `dataIsoSchema`, che
    // ricompone la data e la confronta: qui si ferma ciò che al validatore non arriva
    // mai, perché non passa da lui.
    await expect(nuovoFascicolo({ dataRicezione: "2026-03-25" }, 600)).resolves.toBeDefined();
    const errore = await respinto(() => nuovoFascicolo({ dataRicezione: "25/03/2026" }, 601));
    expect(errore).toContain("wb_report_data_ricezione_fmt_ck");
  });

  it("il numero progressivo non si può ripetere", async () => {
    // Il prototipo lo ricavava da `righe.length + 1`: dopo una cancellazione due
    // fascicoli ricevevano lo stesso numero, e i registri che vi rimandano — ritorsioni,
    // accessi, eventi di riservatezza — finivano a puntare a due cose.
    await expect(nuovoFascicolo({}, 700)).resolves.toBeDefined();
    const errore = await respinto(() => nuovoFascicolo({}, 700));
    expect(errore).toContain("wb_report_numero_uq");
  });

  it("un numero di audizioni negativo non esiste", async () => {
    await expect(nuovoFascicolo({ audizioni: 0 }, 800)).resolves.toBeDefined();
    const errore = await respinto(() => nuovoFascicolo({ audizioni: -1 }, 801));
    expect(errore).toContain("wb_report_audizioni_ck");
  });
});

describe("l'assetto", () => {
  it("il titolo dell'obbligo è uno dei cinque, e il 231 non è l'unico", async () => {
    // Il campo che decide il perimetro del modulo: un ente con ottanta dipendenti e
    // nessun Modello 231 è pienamente obbligato.
    await db.update(wbSystem).set({ obbligo: "Almeno 50 lavoratori subordinati" })
      .where(sql`${wbSystem.id} = ${systemId}`);
    const errore = await respinto(() =>
      db.update(wbSystem).set({ obbligo: "Obbligato" }).where(sql`${wbSystem.id} = ${systemId}`),
    );
    expect(errore).toContain("wb_system_obbligo_ck");
  });
});
