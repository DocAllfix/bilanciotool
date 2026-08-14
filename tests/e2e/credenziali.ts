import { randomUUID } from "node:crypto";

// Vedi `scripts/comune-credenziali.mjs`: stessa ragione, stessa regola.
// Gli e2e girano su `localhost`, ma la password non deve comunque stare nel
// repository — un file si copia, e il giorno in cui uno di questi punta a un
// ambiente vero la stringa e' gia' pubblica.
export const PWD_COLLAUDO = process.env.PWD_COLLAUDO?.trim() || `Collaudo-${randomUUID()}!`;
