import { z } from "zod";

// I campi che tutti i moduli validano allo stesso modo.
//
// Erano ricopiati: `companyId` sette volte, `anno` cinque, stringa identica ogni volta.
// Non è un problema di righe — sono due — ma di verità: il giorno in cui l'intervallo
// degli esercizi cambia, o si decide che l'identificativo dev'essere un UUID, si tocca un
// posto invece di andarne a cercare dodici e accorgersi del dodicesimo da un difetto.
//
// Qui stanno SOLO i campi il cui significato non cambia da un modulo all'altro. Tutto
// quello che è specifico — le soglie della SoA, i vettori energetici, i temi di
// materialità — resta nel `validation.ts` del suo modulo: un file di campi comuni che
// accoglie anche i campi speciali smette di essere comune e diventa un secondo posto in
// cui cercare.

/** Identificativo di un'azienda cliente. Arriva sempre dal client. */
export const companyIdSchema = z.string().min(1);

/**
 * L'esercizio rendicontato.
 *
 * L'intervallo non è decorativo: `1990` è l'anno base del Protocollo di Kyoto, sotto il
 * quale un inventario GHG non ha senso, e `2100` ferma i refusi di battitura prima che
 * diventino una riga nel database.
 *
 * ⚠️ `import/parser.ts` usa di proposito un `anno` SENZA intervallo: legge archivi
 * prodotti da un altro programma, e rifiutare un file intero per un anno strano
 * significherebbe far fallire una migrazione che si può invece completare.
 */
export const annoSchema = z.coerce.number().int().min(1990).max(2100);

/**
 * Una data ISO `aaaa-mm-gg`, oppure la stringa vuota.
 *
 * ⚠️ Non basta che `new Date(v)` non sia invalida: **JavaScript fa scivolare le date
 * impossibili**. `new Date("2026-02-31")` non lancia e non e' `Invalid Date` — diventa
 * il 3 marzo. Un 31 febbraio accettato si trasforma in un'altra data senza che nessuno
 * lo veda, e su un documento dove la data e' l'oggetto della prova (la delibera di
 * adozione di un Modello 231 dev'essere «di data certa e anteriore ai fatti») e' peggio
 * di un rifiuto.
 *
 * Quindi si ricompone la data dai pezzi e si confronta con l'originale: se il giorno
 * e' scivolato, non era una data.
 *
 * Sta qui e non in ogni modulo perche' era gia' stata scritta due volte, sbagliata
 * entrambe le volte allo stesso modo.
 */
export const dataIsoSchema = z
  .string()
  .trim()
  .max(10)
  .refine(
    (v) => {
      if (v === "") return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 10) === v;
    },
    { message: "Data non valida: usa il formato gg/mm/aaaa" },
  );

// ─── Primitive dei campi a valore singolo ──────────────────────────────────
//
// Nate nel percorso GDPR e servite identiche alla PAS 24000: la seconda volta che la stessa
// astrazione nasce, le si da' una casa. Sono primitive senza significato di dominio — testo
// libero, voce di un elenco, numero scritto all'italiana — e per questo stanno qui: il
// significato di un campo lo decide il `validation.ts` del modulo che le compone.

const vuotoANull = (v: string) => (v === "" ? null : v);

/** Testo libero; vuoto = `null`. */
export const testo = (max: number) => z.string().trim().max(max, `Massimo ${max} caratteri`).transform(vuotoANull);

/** Una voce di un elenco chiuso; vuoto = `null`. */
export const scelta = (valori: readonly string[]) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || valori.includes(v), "Valore non ammesso")
    .transform(vuotoANull);

/** Una voce obbligatoria di un elenco chiuso. */
export const sceltaObbligatoria = (valori: readonly string[]) =>
  z.string().refine((v) => valori.includes(v), "Valore non ammesso");

/** Una data, oppure vuoto = `null`. */
export const dataOpzionale = dataIsoSchema.transform(vuotoANull);

/** Un intero non negativo, opzionale; vuoto = `null`. Mai la virgola italiana scambiata. */
export const interoNonNegativo = (max = 10_000_000) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      if (!/^\d+$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "Serve un numero intero" });
        return z.NEVER;
      }
      const n = Number(v);
      if (n > max) {
        ctx.addIssue({ code: "custom", message: "Numero troppo grande" });
        return z.NEVER;
      }
      return n;
    });

/**
 * Un numero decimale non negativo, scritto come lo scrive un italiano o un browser.
 *
 * ⚠️ «1.234,5» è milleduecentotrentaquattro e mezzo, non «uno virgola duecento…»: il
 * prototipo leggeva con `parseFloat`, che si ferma al punto. Qui il punto delle migliaia
 * si toglie SOLO se c'è anche la virgola decimale, o se divide gruppi di tre cifre; un
 * numero ambiguo si rifiuta invece di indovinarlo.
 */
export const decimale = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    let s = v.replace(/\s/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(s)) {
      ctx.addIssue({ code: "custom", message: "Serve un numero non negativo" });
      return z.NEVER;
    }
    return s;
  });

/** Il valore di un campo, validato con lo schema di quel campo. Solleva se il campo non c'è. */
export function validaCampo<C extends Record<string, z.ZodType>>(campi: C, campo: string, valore: unknown): unknown {
  if (!Object.hasOwn(campi, campo)) throw new Error("Campo non modificabile");
  return (campi[campo] as z.ZodType).parse(valore);
}
