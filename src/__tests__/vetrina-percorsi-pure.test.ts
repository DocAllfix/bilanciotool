import { describe, it, expect } from "vitest";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { MODULI_AZIENDA, MODULI_PER_AREA } from "@/features/companies/moduli";

// LA VETRINA DICE LE STESSE COSE DELL'APP.
//
// ⚠️ Nasce da due difetti trovati insieme il 27 agosto, vivi in produzione e invisibili a
// tutti i collaudi:
//
//   1. il dodicesimo percorso non era in vetrina — il prodotto ne aveva dodici, la pagina
//      pubblica ne mostrava undici, da due giorni;
//   2. l'autovalutazione si chiamava «Autovalutazione ESG del fornitore» sulla landing e
//      «Autovalutazione ESG» nell'app: due nomi per la stessa cosa, a un clic di distanza.
//
// Nessun collaudo poteva vederli, ed è la parte che conta: `visual-check-landing.mjs`
// contava i percorsi LEGGENDO IL FILE DELLA VETRINA, cioè verificava la pagina contro se
// stessa. Un elenco confrontato con la propria copia è sempre d'accordo.
//
// La completezza ora la pretende il COMPILATORE (`RACCONTO` è un `Record<ModuloAzienda,…>`).
// Qui restano le cose che il compilatore non può vedere: che i nomi coincidano davvero, e
// che la citazione della norma sia più precisa di quella del registro e non un'altra norma.

const inVetrina = AREE_VETRINA.flatMap((a) => a.percorsi);

describe("la vetrina e il registro dei moduli", () => {
  it("mostra TUTTI i percorsi del prodotto, non uno di meno", () => {
    expect(QUANTI_PERCORSI).toBe(MODULI_AZIENDA.length);
  });

  it("li chiama con lo stesso nome dell'app", () => {
    // Chi legge un nome sulla vetrina deve ritrovarlo nel prodotto. Quando divergono non
    // si rompe niente — entrambe le pagine si aprono, i collegamenti funzionano — e la
    // persona semplicemente non trova quello che sta cercando.
    expect(inVetrina.map((p) => p.titolo).sort()).toEqual(MODULI_AZIENDA.map((m) => m.nome).sort());
  });

  it("i gruppi sono quelli del registro, nello stesso ordine", () => {
    expect(AREE_VETRINA.map((a) => a.nome)).toEqual(MODULI_PER_AREA.map((g) => g.nome));
  });

  it("⚠️ cita la norma del registro — più precisa sì, diversa no", () => {
    // In pagina serve l'anno e il punto della norma; nel fascicolo dell'app basta la
    // sigla. È legittimo, purché la citazione pubblica CONTENGA quella del registro: così
    // «ISO/IEC 27001» può diventare «ISO/IEC 27001:2022 §6.1.3 d)», ma non può diventare
    // un'altra norma senza che questo test se ne accorga.
    for (const gruppo of MODULI_PER_AREA) {
      for (const m of gruppo.moduli) {
        const p = inVetrina.find((x) => x.titolo === m.nome);
        expect(p, `«${m.nome}» non è in vetrina`).toBeDefined();
        for (const pezzo of m.norma.split("·").map((s) => s.trim())) {
          expect(p!.norma, `${m.nome}: la citazione pubblica non contiene «${pezzo}»`).toContain(pezzo);
        }
      }
    }
  });

  it("ogni tratto di gruppo è una classe scritta per esteso", () => {
    // ⚠️ Tailwind genera le utility scandendo il TESTO dei sorgenti: una classe costruita
    // con un template literal non esiste, e il tratto resta invisibile. Il compilatore non
    // lo vede (le stringhe sono valide) e i collaudi funzionali nemmeno (la pagina si apre).
    for (const a of AREE_VETRINA) {
      expect(a.tratto, `il gruppo «${a.nome}» ha un tratto sospetto`).toMatch(/^bg-area-[a-z]+$/);
    }
  });

  it("ogni percorso porta i suoi passi e il suo punto", () => {
    for (const p of inVetrina) {
      expect(p.passi.length, `«${p.titolo}» non ha passi`).toBeGreaterThan(2);
      expect(p.punto.length, `«${p.titolo}» non ha un punto`).toBeGreaterThan(40);
    }
  });
});
