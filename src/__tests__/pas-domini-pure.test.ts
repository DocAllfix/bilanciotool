import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import domini from "@/lib/db/seeds/data/pas-domini.json";
import gruppi from "@/lib/db/seeds/data/pas-gruppi.json";
import politica from "@/lib/db/seeds/data/pas-politica.json";
import rischiTipo from "@/lib/db/seeds/data/pas-rischi-tipo.json";
import { AMBITI, STATI_REQUISITO } from "@/lib/calc/pas/tipi";

// Tre posti dicono quali valori ammette un campo: il prototipo (estratto in JSON), il
// motore (costanti TypeScript) e la migrazione (CHECK). Se divergono, l'interfaccia propone
// un valore che il database rifiuta, e lo si scopre al primo salvataggio di un cliente.
// Qui si confrontano, come in `gdpr-domini-pure`.

const MIGRAZIONE = readFileSync("src/lib/db/migrations/0066_pas_rls.sql", "utf8").replace(/\r\n/g, "\n");
const reg = domini.registri;

/** Le stringhe del vincolo `nome`, lette dalla migrazione. */
function nelVincolo(nome: string): string[] {
  const riga = MIGRAZIONE.split("\n").find((l) => l.includes(`${nome}_ck CHECK`));
  if (!riga) throw new Error(`Vincolo ${nome} non trovato nella migrazione`);
  return [...riga.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replaceAll("''", "'"));
}

const allegato = gruppi.filter((g) => g.natura === "allegato").map((g) => g.key);

describe("PAS 24000: i domini chiusi coincidono fra prototipo, motore e database", () => {
  it("il motore usa le stesse chiavi del prototipo", () => {
    expect([...STATI_REQUISITO]).toEqual(domini.stati.map((s) => s.key));
    expect([...AMBITI]).toEqual(domini.ambiti.map((a) => a.key));
  });

  it("i CHECK della migrazione elencano esattamente le etichette del prototipo", () => {
    expect(nelVincolo("pas_fattore_tipo")).toEqual(domini.tipiFattore);
    expect(nelVincolo("pas_fattore_effetto")).toEqual(domini.effettiFattore);
    expect(nelVincolo("pas_requisito_stato_stato")).toEqual(domini.stati.map((s) => s.key));
    expect(nelVincolo("pas_rischio_ambito")).toEqual(domini.ambiti.map((a) => a.key));
    expect(nelVincolo("pas_fornitore_categoria")).toEqual(domini.categorieFornitore);
    expect(nelVincolo("pas_fornitore_rischio")).toEqual(domini.rischiFornitore);
    expect(nelVincolo("pas_fornitore_esito")).toEqual(domini.esitiFornitore);
    expect(nelVincolo("pas_obiettivo_stato")).toEqual(domini.statiObiettivo);
    expect(nelVincolo("pas_attivita_stato")).toEqual(domini.statiAttivita);
    expect(nelVincolo("pas_reclamo_canale")).toEqual(reg.reclamoCanale);
    expect(nelVincolo("pas_reclamo_provenienza")).toEqual(reg.reclamoProvenienza);
    expect(nelVincolo("pas_reclamo_esito")).toEqual(reg.reclamoEsito);
    expect(nelVincolo("pas_reclamo_area")).toEqual(allegato);
    expect(nelVincolo("pas_non_conformita_origine")).toEqual(reg.ncOrigine);
    expect(nelVincolo("pas_non_conformita_efficacia")).toEqual(reg.ncEfficacia);
    expect(nelVincolo("pas_emergenza_tipo")).toEqual(reg.emergenzaTipo);
    expect(nelVincolo("pas_comunicazione_tipo")).toEqual(reg.comunicazioneTipo);
    expect(nelVincolo("pas_consultazione_forma")).toEqual(reg.consultazioneForma);
    expect(nelVincolo("pas_audit_stato")).toEqual(reg.auditStato);
    expect(nelVincolo("pas_system_politica_contenuti")).toEqual(politica.contenuti.map((c) => c.key));
  });

  it("rischi e obiettivi accettano le aree dell'Allegato A più C5, e i rischi tipo ci stanno dentro", () => {
    const aree = [...allegato, "C5"];
    expect(nelVincolo("pas_rischio_area")).toEqual(aree);
    expect(nelVincolo("pas_obiettivo_area")).toEqual(aree);
    // Il catalogo dei rischi tipo che l'avvio copia: un'area fuori elenco farebbe fallire
    // l'avvio del percorso al primo cliente, con un errore di vincolo.
    for (const r of rischiTipo) expect(aree, r.key).toContain(r.area);
  });

  it("le lettere accentate arrivano intatte", () => {
    // «Opportunità» con un accento rovinato e il primo fattore positivo non si salva.
    expect(MIGRAZIONE).toContain("'Opportunità'");
  });

  it("la migrazione porta RLS, il trigger e il dominio del content set", () => {
    expect(MIGRAZIONE).toContain("'pas_system', 'pas_fattore'");
    expect(MIGRAZIONE).toContain("t || '_tenant_rls'");
    expect(MIGRAZIONE).toContain("ON pas_system\n  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro')");
    // Riscritto INTERO: un dominio perso qui farebbe fallire la migrazione sulle righe esistenti.
    expect(MIGRAZIONE).toMatch(/'ghg','report','energy','supplier','soa','mog231',\s*'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr','pas'\]\)\);/);
  });

  it("le diciassette tabelle tenant dello schema stanno tutte nel ciclo RLS", () => {
    const schema = readFileSync("src/lib/db/schema/pas.ts", "utf8");
    const tabelle = [...schema.matchAll(/pgTable\(\s*"(pas_[a-z_]+)"/g)].map((m) => m[1]);
    expect(tabelle).toHaveLength(27);
    for (const t of tabelle) expect(MIGRAZIONE, t).toContain(`'${t}'`);
  });
});
