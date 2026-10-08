import { contaColpo } from "@/lib/freno";

// Il freno della pagina pubblica di verifica.
//
// ⚠️ Serve, e la ragione non è il carico: è che questa è l'unica rotta del prodotto che
// risponde «sì, questo documento esiste» a chiunque, senza sessione. Senza freno diventa
// un oracolo che si può interrogare a raffica — e anche se lo spazio dei codici è di
// venticinque simboli su otto posizioni (circa 1,5 × 10¹¹), un oracolo gratuito è il tipo
// di cosa che va chiusa quando costa poco, non quando qualcuno la usa.
//
// ⚠️ Il contatore sta sul DATABASE e non in memoria. Su Vercel ogni istanza ha la
// propria memoria: un contatore che si azzera a ogni avvio a freddo non ferma nessuno,
// basta che le richieste cadano su istanze diverse. È la stessa lezione già pagata dal
// freno dell'autenticazione, e la tabella è la stessa — con una chiave che non può
// collidere con le sue.

const FINESTRA_MS = 60_000;
/** Trenta al minuto: chi verifica a mano ne digita uno, chi sonda ne prova migliaia. */
const MASSIMO = 30;

export type EsitoFreno = { passa: true } | { passa: false; riprovaFra: number };

/**
 * Consuma un colpo per questo indirizzo.
 *
 * ⚠️ Non solleva mai. Se il database non risponde, la verifica **passa**: negare la
 * conferma di autenticità perché il nostro contatore è rotto sarebbe il danno peggiore
 * dei due — chi ha in mano il PDF concluderebbe che è falso.
 */
export async function consumaColpo(indirizzo: string): Promise<EsitoFreno> {
  const adesso = Date.now();
  try {
    // Un'istruzione sola: contare e confrontare in tre passi lasciava passare qualunque
    // raffica arrivata insieme, che è esattamente il modo in cui si sonda un oracolo.
    const colpo = await contaColpo(`verifica:${indirizzo}`, FINESTRA_MS, adesso);
    if (colpo.conteggio > MASSIMO) {
      return { passa: false, riprovaFra: Math.max(1, Math.ceil((FINESTRA_MS - (adesso - colpo.inizio)) / 1000)) };
    }
    return { passa: true };
  } catch {
    return { passa: true };
  }
}
