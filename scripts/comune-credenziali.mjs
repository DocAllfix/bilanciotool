import { randomUUID } from "node:crypto";

// La password dei conti che i collaudi creano.
//
// Era la stessa stringa, scritta in chiaro in trentadue file di una repository, e
// diversi collaudi hanno `https://evalisdeck.it` come indirizzo predefinito: creavano
// conti VERI in produzione, con una password pubblicata e un indirizzo dallo schema
// prevedibile (`tutto-attivo-<marca temporale>@example.com`). Chiunque avesse letto il
// repository poteva entrare in uno di quegli studi.
//
// Ora e' diversa a ogni esecuzione. Resta pero' sovrascrivibile da `PWD_COLLAUDO`, e non
// e' una comodita': alcuni collaudi RIUSANO un conto gia' creato (`CONTO=...`), e con una
// password nuova a ogni giro non riuscirebbero piu' a entrare. Chi riusa un conto passa
// la stessa password con cui l'ha creato.
// `?.trim() ||` e non `??`: una variabile IMPOSTATA A VUOTO -- il caso normale in CI,
// dove i segreti si dichiarano sempre e si valorizzano a volte -- darebbe una password
// vuota, e la registrazione fallirebbe con un messaggio che non c'entra niente.
export const PWD_COLLAUDO = process.env.PWD_COLLAUDO?.trim() || `Collaudo-${randomUUID()}!`;
