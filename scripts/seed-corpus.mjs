// Semina del CORPUS DOCUMENTALE dei sei moduli di conformità.
//
// 447 documenti e 6.489 blocchi, condivisi da tutti gli studi: contenuto di piattaforma,
// nessun `organization_id`. Copiarlo per azienda sarebbe insostenibile — il solo
// SA8000/2026 pesa 555 KB di testo.
//
// ── L'IMMUTABILITÀ DI UN CONTENT SET ─────────────────────────────────────────
//
// Le chiavi dei blocchi si derivano dal CONTENUTO: correggere un refuso cambia la chiave,
// e un cliente che aveva personalizzato quel blocco si ritroverebbe il testo su misura
// appeso a una chiave che non esiste più.
//
// Per questo un content set, una volta seminato, non si modifica: si pubblica una
// versione nuova. Il seed lo verifica e SI RIFIUTA invece di riscrivere, perché il danno
// sarebbe silenzioso — nessun errore, solo il testo di qualcuno che sparisce.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { segnaposti } from "./segnaposto.mjs";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "db", "seeds", "data");
const load = (f) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));

/** I sei domini, col nome del set e la nota di provenienza. */
export const MODULI_CORPUS = [
  { dom: "mog231", set: "mog231-v1", nota: "Estratto dal prototipo mog-231-v1.html" },
  { dom: "iso37001", set: "iso37001-v1", nota: "Estratto dal prototipo sgpc-iso37001-v1.html" },
  { dom: "sgiqas", set: "sgiqas-v1", nota: "Estratto dal prototipo sgi-qas-v1.html" },
  { dom: "sa8000", set: "sa8000-v1", nota: "Estratto dal prototipo sgs-sa8000-2026-v1.html" },
  { dom: "filiera", set: "filiera-v1", nota: "Estratto dal prototipo due-diligence-filiera-v1.html" },
  { dom: "wb", set: "wb-v1", nota: "Estratto dal prototipo whistleblowing-v1.html" },
];

/** Inserisce a blocchi: 6.489 istruzioni singole sarebbero minuti di andirivieni. */
async function aGruppi(sql, righe, dimensione, fn) {
  for (let i = 0; i < righe.length; i += dimensione) {
    await fn(righe.slice(i, i + dimensione));
  }
}

export async function seedCorpus(sql) {
  let documenti = 0;
  let blocchi = 0;
  let forme = 0;
  let registri = 0;
  let colonneReg = 0;

  for (const m of MODULI_CORPUS) {
    const procedure = load(`${m.dom}-procedures.json`);
    const moduli = load(`${m.dom}-modules.json`);
    const docs = [
      ...procedure.map((d) => ({ ...d, tipo: "procedura" })),
      ...moduli.map((d) => ({ ...d, tipo: "modulo" })),
    ];

    // ⚠️ Il controllo che protegge le personalizzazioni dei clienti.
    const [{ n: gia }] = await sql`
      select count(*)::int n from corpus_block where content_set_id = ${m.set}`;
    if (gia > 0) {
      const attesi = docs.reduce((a, d) => a + d.blocks.length, 0);
      const [{ n: uguali }] = await sql`
        select count(*)::int n from corpus_block
        where content_set_id = ${m.set}
          and block_id in ${sql(docs.flatMap((d) => d.blocks.map((b) => b.id)))}`;
      if (gia !== attesi || uguali !== attesi) {
        throw new Error(
          `Il content set «${m.set}» esiste già con un contenuto DIVERSO ` +
            `(${gia} blocchi nel database, ${attesi} da seminare, ${uguali} coincidenti).\n` +
            `Un content set non si modifica: le chiavi dei blocchi ancorano il testo su misura ` +
            `dei clienti, e riscriverle lo farebbe sparire in silenzio. Pubblica una versione nuova.`,
        );
      }
    }

    await sql`
      insert into content_set (id, dominio, versione, note)
      values (${m.set}, ${m.dom}, 1, ${m.nota})
      on conflict (id) do update set note = excluded.note`;

    await aGruppi(sql, docs, 100, async (gruppo) => {
      await sql`
        insert into corpus_document ${sql(
          gruppo.map((d) => ({
            content_set_id: m.set,
            code: d.code,
            tipo: d.tipo,
            titolo: d.titolo ?? d.code,
            fase: d.fase ?? null,
            rif: d.rif ?? null,
            pro_code: d.pro ?? null,
            ordine: d.ordine,
          })),
        )}
        on conflict (content_set_id, code) do update set
          tipo = excluded.tipo, titolo = excluded.titolo, fase = excluded.fase,
          rif = excluded.rif, pro_code = excluded.pro_code, ordine = excluded.ordine`;
    });
    documenti += docs.length;

    const righeBlocchi = docs.flatMap((d) =>
      d.blocks.map((b, i) => {
        const { id, k, ...carico } = b;
        return {
          content_set_id: m.set,
          doc_code: d.code,
          block_id: id,
          ordine: i + 1,
          tipo: k,
          contenuto: sql.json(carico),
        };
      }),
    );
    await aGruppi(sql, righeBlocchi, 500, async (gruppo) => {
      await sql`
        insert into corpus_block ${sql(gruppo)}
        on conflict (content_set_id, doc_code, block_id) do update set
          ordine = excluded.ordine, tipo = excluded.tipo, contenuto = excluded.contenuto`;
    });
    blocchi += righeBlocchi.length;

    // I registri: definizione e colonne. Le righe le scrive il cliente, non il seed.
    const regs = load(`${m.dom}-registri.json`);
    if (regs.length) {
      await sql`
        insert into corpus_register ${sql(
          regs.map((r) => ({
            content_set_id: m.set,
            register_id: r.registerId,
            nome: r.nome,
            descrizione: r.descrizione,
            mod_code: r.modCode,
            pro_code: r.proCode,
            capitolo: r.capitolo,
            ordine: r.ordine,
          })),
        )}
        on conflict (content_set_id, register_id) do update set
          nome = excluded.nome, descrizione = excluded.descrizione, mod_code = excluded.mod_code,
          pro_code = excluded.pro_code, capitolo = excluded.capitolo, ordine = excluded.ordine`;

      const colonne = regs.flatMap((r) =>
        r.colonne.map((c) => ({
          content_set_id: m.set,
          register_id: r.registerId,
          chiave: c.chiave,
          etichetta: c.etichetta,
          tipo: c.tipo,
          in_tabella: c.inTabella,
          larghezza: c.larghezza,
          opzioni: c.opzioni ? sql.json(c.opzioni) : null,
          prefisso_auto: c.prefissoAuto,
          hint: c.hint,
          ordine: c.ordine,
        })),
      );
      await aGruppi(sql, colonne, 300, async (gruppo) => {
        await sql`
          insert into corpus_register_column ${sql(gruppo)}
          on conflict (content_set_id, register_id, chiave) do update set
            etichetta = excluded.etichetta, tipo = excluded.tipo, in_tabella = excluded.in_tabella,
            larghezza = excluded.larghezza, opzioni = excluded.opzioni,
            prefisso_auto = excluded.prefisso_auto, hint = excluded.hint, ordine = excluded.ordine`;
      });
      registri += regs.length;
      colonneReg += colonne.length;
    }

    const sp = segnaposti(m.dom).map((r) => ({
      content_set_id: m.set,
      forma: r.forma,
      genere: r.genere,
      fonte: r.fonte,
      campo: r.campo,
    }));
    if (sp.length) {
      await sql`
        insert into corpus_placeholder ${sql(sp)}
        on conflict (content_set_id, forma) do update set
          genere = excluded.genere, fonte = excluded.fonte, campo = excluded.campo`;
      forme += sp.length;
    }
  }

  return { documenti, blocchi, forme, registri, colonneReg };
}
