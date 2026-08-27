import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";
import { inviaCandidaturaFondatori } from "@/lib/email";

export const dynamic = "force-dynamic";

// La candidatura al Programma Fondatori.
//
// ⚠️ E' una ROTTA e non una server action, di proposito. La pagina `/prezzi` deve restare
// statica — `pagine-statiche-pure.test.ts` segue gli import a partire da lei — e un'azione
// che legge le intestazioni della richiesta finirebbe nel suo albero di import. Una rotta
// vive per conto proprio: il modulo la chiama con `fetch`, e la pagina resta prerendibile.
//
// ⚠️ NON SI SALVA NIENTE NEL DATABASE. La candidatura diventa un'email e basta: sono dati
// personali di persone che non sono clienti, e conservarli significherebbe un titolare, una
// base giuridica, una conservazione e una riga nell'informativa. Per una manciata di
// candidature l'email è la risposta giusta, e il dato vive dove vive già la corrispondenza.

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  studio: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email().max(200),
  telefono: z.string().trim().max(40).optional().default(""),
  messaggio: z.string().trim().max(2000).optional().default(""),
  // ⚠️ Trappola per i robot: un campo che un umano non vede e non compila mai. Se arriva
  // pieno si risponde 200 e non si manda niente — dire «sei un robot» insegna a chi
  // scrive i robot come non sembrarlo.
  sito: z.string().max(200).optional().default(""),
});

/** Cinque candidature all'ora dallo stesso indirizzo. */
const FINESTRA_MS = 3_600_000;
const MASSIMO = 5;

/**
 * Il freno, sul DATABASE e non in memoria.
 *
 * ⚠️ Su Vercel ogni istanza ha la propria memoria: un contatore che si azzera a ogni
 * avvio a freddo non ferma nessuno, basta che i tentativi cadano su istanze diverse.
 * È la stessa ragione per cui il limite sulle rotte di autenticazione usa questa tabella.
 */
async function frenato(indirizzo: string): Promise<boolean> {
  const key = `${indirizzo}|/api/fondatori`;
  const adesso = Date.now();
  const [riga] = await db.select().from(rateLimit).where(eq(rateLimit.key, key)).limit(1);

  if (!riga || adesso - riga.lastRequest > FINESTRA_MS) {
    if (riga) {
      await db.update(rateLimit).set({ count: 1, lastRequest: adesso }).where(eq(rateLimit.key, key));
    } else {
      await db.insert(rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: adesso });
    }
    return false;
  }
  if (riga.count >= MASSIMO) return true;
  await db
    .update(rateLimit)
    .set({ count: riga.count + 1 })
    .where(and(eq(rateLimit.key, key), eq(rateLimit.id, riga.id)));
  return false;
}

export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ ok: false, errore: "Controlla i campi e riprova." }, { status: 400 });
  }

  // Robot: si ringrazia e non si manda niente.
  if (p.data.sito) return NextResponse.json({ ok: true });

  const indirizzo = (req.headers.get("x-forwarded-for") ?? "ignoto").split(",")[0]!.trim();
  if (await frenato(indirizzo)) {
    return NextResponse.json(
      { ok: false, errore: "Hai già inviato più candidature. Scrivici a info@evalisdeck.it." },
      { status: 429 },
    );
  }

  const { sent } = await inviaCandidaturaFondatori(p.data);
  if (!sent) {
    // ⚠️ Non si dice «inviata» quando non è partita. Chi candida a un programma a posti
    // limitati aspetterebbe una risposta che non arriverà mai, e non avrebbe modo di
    // sapere che il messaggio si è perso per colpa nostra.
    return NextResponse.json(
      { ok: false, errore: "Non siamo riusciti a inviare: scrivici a info@evalisdeck.it." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
