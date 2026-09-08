import { describe, it, expect } from "vitest";

import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { corsoDelModulo, TRASVERSALI } from "@/features/formazione";
import type { Sezione } from "@/features/formazione/tipi";

// LE VERIFICHE, CONTROLLATE ALLA FONTE.
//
// ⚠️ Una domanda malformata non produce nessun errore: produce un quiz in cui la risposta
// giusta non è nessuna delle opzioni, e chi lo fa conclude di non aver capito. Il server
// conta con `v.scelte[i] === d.corretta`, quindi un indice fuori dalle opzioni non
// solleva — restituisce zero punti a chiunque, per sempre.
//
// ⚠️ E `minime` più grande del numero di domande sarebbe una verifica IMPOSSIBILE da
// superare. Nessun collaudo funzionale la distingue da una difficile: la pagina si apre,
// le risposte si danno, l'esito dice «non superata» ed è tecnicamente corretto.

function tutteLeSezioni(): { corso: string; sezione: Sezione }[] {
  const righe: { corso: string; sezione: Sezione }[] = [];
  for (const m of MODULI_AZIENDA) {
    for (const s of corsoDelModulo(m.href).sezioni) righe.push({ corso: m.href, sezione: s });
  }
  for (const [chiave, c] of Object.entries(TRASVERSALI)) {
    for (const s of c.sezioni) righe.push({ corso: chiave, sezione: s });
  }
  return righe;
}

describe("le domande di verifica", () => {
  const conVerifica = tutteLeSezioni().filter((r) => r.sezione.verifica);

  it("ci sono, altrimenti questa guardia non prova niente", () => {
    // ⚠️ Un test che scandisce un elenco vuoto passa sempre. È già successo in questo
    // progetto: un controllo strutturale puntava a una cartella inesistente e guardava
    // zero file. Qui si pretende un minimo.
    expect(conVerifica.length).toBeGreaterThanOrEqual(10);
  });

  it("hanno l'indice della risposta giusta DENTRO le opzioni", () => {
    for (const { corso, sezione } of conVerifica) {
      for (const [i, d] of sezione.verifica!.domande.entries()) {
        const dove = `${corso}/${sezione.id} domanda ${i + 1}`;
        expect(d.opzioni.length, dove).toBeGreaterThanOrEqual(2);
        expect(d.corretta, dove).toBeGreaterThanOrEqual(0);
        expect(d.corretta, dove).toBeLessThan(d.opzioni.length);
      }
    }
  });

  it("hanno opzioni distinte: due identiche renderebbero la scelta arbitraria", () => {
    for (const { corso, sezione } of conVerifica) {
      for (const [i, d] of sezione.verifica!.domande.entries()) {
        const dove = `${corso}/${sezione.id} domanda ${i + 1}`;
        expect(new Set(d.opzioni).size, dove).toBe(d.opzioni.length);
      }
    }
  });

  it("spiegano sempre, anche la risposta giusta", () => {
    // È la parte che insegna: un quiz che dice solo «sbagliato» insegna che hai sbagliato.
    for (const { corso, sezione } of conVerifica) {
      for (const [i, d] of sezione.verifica!.domande.entries()) {
        const dove = `${corso}/${sezione.id} domanda ${i + 1}`;
        expect(d.testo.trim().length, dove).toBeGreaterThan(10);
        expect(d.spiegazione.trim().length, dove).toBeGreaterThan(20);
      }
    }
  });

  it("chiedono una soglia raggiungibile e non banale", () => {
    for (const { corso, sezione } of conVerifica) {
      const v = sezione.verifica!;
      const dove = `${corso}/${sezione.id}`;
      expect(v.domande.length, dove).toBeGreaterThan(0);
      expect(v.minime, dove).toBeGreaterThan(0);
      expect(v.minime, dove).toBeLessThanOrEqual(v.domande.length);
    }
  });
});
