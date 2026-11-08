import { NextResponse } from "next/server";
import { z } from "zod";
import { frenato as oltreIlLimite } from "@/lib/freno";
import { inviaRichiestaEnterprise } from "@/lib/email";

export const dynamic = "force-dynamic";

// La richiesta di contatto per Enterprise (6 novembre 2026). Prende il posto della
// candidatura al Programma Fondatori, ritirato: stesso meccanismo, stesse difese.
//
// ⚠️ E' una ROTTA e non una server action, di proposito. La pagina `/prezzi` deve restare
// statica — `pagine-statiche-pure.test.ts` segue gli import a partire da lei — e un'azione
// che legge le intestazioni della richiesta finirebbe nel suo albero di import.
//
// ⚠️ NON SI SALVA NIENTE NEL DATABASE. La richiesta diventa un'email e basta: sono dati
// personali di persone che non sono clienti, e conservarli significherebbe un titolare,
// una base giuridica, una conservazione e una riga nell'informativa. Il dato vive dove
// vive già la corrispondenza.

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  organizzazione: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  telefono: z.string().trim().max(40).optional().default(""),
  aziende: z.string().trim().max(20).optional().default(""),
  messaggio: z.string().trim().max(2000).optional().default(""),
  // ⚠️ Trappola per i robot: un campo che un umano non vede e non compila mai. Se arriva
  // pieno si risponde 200 e non si manda niente — dire «sei un robot» insegna a chi
  // scrive i robot come non sembrarlo.
  sito: z.string().max(200).optional().default(""),
});

/** Cinque richieste all'ora dallo stesso indirizzo. */
const FINESTRA_MS = 3_600_000;
const MASSIMO = 5;

/**
 * Il freno, sul DATABASE e non in memoria, e in UNA istruzione sola (`src/lib/freno.ts`):
 * su Vercel ogni istanza ha la propria memoria, e un «leggi, confronta, scrivi» lascerebbe
 * partire insieme trenta richieste arrivate insieme — ognuna con la sua email. È l'unica
 * rotta del prodotto che manda posta su richiesta di un anonimo.
 */
async function frenato(indirizzo: string): Promise<boolean> {
  return oltreIlLimite(`contatto:${indirizzo}`, FINESTRA_MS, MASSIMO);
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
      { ok: false, errore: "Hai già inviato più richieste. Scrivici a info@evalisdeck.it." },
      { status: 429 },
    );
  }

  const { sent } = await inviaRichiestaEnterprise(p.data);
  if (!sent) {
    // ⚠️ Non si dice «inviata» quando non è partita: chi scrive aspetterebbe una risposta
    // che non arriverà mai, e non saprebbe che il messaggio si è perso per colpa nostra.
    return NextResponse.json(
      { ok: false, errore: "Non siamo riusciti a inviare: scrivici a info@evalisdeck.it." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
