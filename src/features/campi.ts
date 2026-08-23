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
