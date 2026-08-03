// Codice di verifica e validità dell'attestato.
//
// Il codice serve a una cosa sola: permettere al committente che riceve il PDF
// di chiedere allo studio "confermami che l'attestato SR-XXXXXXX è quello che
// avete emesso". Non è una firma e non protegge da nulla: è un identificativo
// breve, leggibile a voce e trascrivibile senza errori.
//
// FNV-1a e non `node:crypto`: questo modulo sta in `src/lib/calc`, che gira
// anche nel browser per le anteprime, e un import di crypto lo spezzerebbe.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

/** Codice dell'attestato, stabile a parità di documento pubblicato.
 *  Cambia se cambia lo snapshot, l'azienda, l'indice o la revisione: due
 *  attestati diversi non possono portare lo stesso codice. */
export function codiceVerifica(
  snapshotId: string,
  companyId: string,
  indice: number,
  versione: number,
): string {
  const seme = `${snapshotId}|${companyId}|${indice}|${versione}`;
  return "SR-" + fnv1a(seme).toString(36).toUpperCase().padStart(7, "0").slice(-7);
}

/** Validità convenzionale di dodici mesi dall'emissione, in ISO `YYYY-MM-DD`.
 *  Il 29 febbraio non esiste nell'anno successivo: JavaScript lo normalizza al
 *  1° marzo, e va bene — la data di rinnovo non deve saltare un giorno. */
export function validoFino(emessoIl: string | Date): string {
  const d = new Date(emessoIl);
  const scadenza = new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
  return scadenza.toISOString().slice(0, 10);
}
