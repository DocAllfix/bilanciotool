import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIPI_DOCUMENTO } from "@/features/documents/tipi";

// Il fascicolo di una segnalazione NON è un documento pubblicabile, e non deve
// diventarlo per distrazione.
//
// ⚠️ La ragione decisiva è misurata e sta nel codice: `creaCollegamento` genera un
// collegamento **per azienda, non per documento**, e `/documenti-cliente/[token]` non
// chiede nessuna sessione. Un tipo di documento nuovo comparirebbe quindi **da solo**
// dentro i collegamenti già consegnati, senza che nessuno prema niente: l'esposizione
// non richiederebbe un errore dell'utente, la produrrebbe l'aggiunta del tipo.
//
// ⚠️ Questo controllo è a livello di SORGENTE e non di dati, ed è deliberato. Un test che
// pubblicasse un fascicolo e verificasse che non compare proverebbe il comportamento di
// oggi; questo impedisce che qualcuno lo renda pubblicabile domani, che è il momento in
// cui il danno si crea. Il costo di sbagliare qui non è un difetto: è la rivelazione
// dell'identità di una persona che si è esposta.

const RADICE = join(process.cwd(), "src");

describe("il fascicolo di una segnalazione resta fuori dai documenti pubblicabili", () => {
  it("nessun tipo di documento riguarda il singolo fascicolo", () => {
    // I nomi che qualcuno userebbe aggiungendolo. Non è un elenco di parole vietate: è
    // la forma che avrebbe il tipo, e serve a far fallire il test *insieme* al commento
    // qui sopra, che è la parte che va letta.
    const sospetti = TIPI_DOCUMENTO.filter((t) => /fascicolo|segnalazione(?!.*periodic)/i.test(t));
    expect(
      sospetti,
      "Un fascicolo non può essere un tipo di documento: comparirebbe dentro i " +
        "collegamenti del portale cliente già consegnati, che sono per azienda e non " +
        "per documento, e sono pubblici senza sessione. Si stampa invece: vedi " +
        "`app/(document)/fascicolo/[companyId]/[reportId]`.\n\n",
    ).toEqual([]);
  });

  it("la relazione periodica invece c'è, ed è quella aggregata", () => {
    // Il controllo sopra non deve diventare «niente che riguardi le segnalazioni»: la
    // relazione periodica è aggregata, non contiene identità, e va pubblicata.
    expect(TIPI_DOCUMENTO).toContain("relazione_wb");
  });

  it("la stampa del fascicolo non passa dall'archivio dei PDF", () => {
    const rotta = readFileSync(
      join(RADICE, "app", "api", "fascicolo", "[companyId]", "[reportId]", "pdf", "route.ts"),
      "utf8",
    );
    // ⚠️ `uploadObject` è ciò che mette un PDF nell'archivio, e il portale cliente serve
    // i PDF archiviati. Un fascicolo che ci finisse sarebbe raggiungibile da lì.
    expect(rotta).not.toMatch(/uploadObject|pdfStorageKey/);
    // E pretende `export`, non `generate_pdf`: portare fuori un fascicolo è
    // un'esportazione di dati riservati, e chi è in prova non la fa.
    expect(rotta).toMatch(/requireEntitlement\([^)]*"export"\)/);
  });

  it("la pagina di stampa registra l'accesso, perché la lettura È la garanzia", () => {
    const pagina = readFileSync(
      join(RADICE, "app", "(document)", "fascicolo", "[companyId]", "[reportId]", "page.tsx"),
      "utf8",
    );
    // `getFascicolo` scrive l'audit nella stessa transazione della lettura: se l'audit
    // fallisce, il fascicolo non si apre. Un registro compilato solo dopo la
    // contestazione non ha valore probatorio.
    expect(pagina).toMatch(/getFascicolo/);
    // E non è indicizzabile, come il portale cliente.
    expect(pagina).toMatch(/robots:\s*\{\s*index:\s*false/);
  });
});
