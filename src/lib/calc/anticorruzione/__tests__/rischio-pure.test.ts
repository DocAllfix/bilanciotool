import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import { livello, livelloDueDiligence, frequenzaDueDiligence, punteggio, superiore } from "../rischio";
import { obblighiDi, obblighiAperti } from "../obblighi";
import { livelloScenario } from "../scenari";
import type { SocioInAffari } from "../tipi";

// Il golden e' estratto ESEGUENDO il prototipo (`scripts/golden-anticorruzione.mjs`),
// non ricavato a mano. Qui si prova che il nostro motore dice le stesse cose, tranne
// dove diverge di proposito — e le divergenze sono elencate, non nascoste.

/** Dal caso del prototipo (chiavi abbreviate) alla nostra forma. */
function daPrototipo(p: Record<string, unknown>): SocioInAffari {
  const num = (x: unknown) => (typeof x === "number" ? x : null);
  const str = (x: unknown) => (typeof x === "string" && x ? x : null);
  return {
    paese: num(p.d_paese),
    pubbliciUfficiali: num(p.d_pu),
    natura: num(p.d_nat),
    valore: num(p.d_val),
    remunerazioneSuccesso: !!p.f_succ,
    impostoDalCliente: !!p.f_cli,
    titolaritaOpaca: !!p.f_te,
    precedenti: !!p.f_prec,
    legamiPubblici: !!p.f_leg,
    pagamentiATerzi: !!p.f_pag,
    dueDiligenceIl: str(p.dd_data),
    politicaComunicata: str(p.pol_com),
    impegni: str(p.imp),
    clausole: str(p.clausole),
    controlli: str(p.ctrl),
    formazioneIl: str(p.form_data),
    verificaCorrispettivo: str(p.pag_ver),
    remunerazione: str(p.remun),
    controllata: str(p.controllata),
    adeguamento: str(p.adeg),
    stato: str(p.stato) ?? "Attivo",
  } as SocioInAffari;
}

// Il golden e' stato estratto con date lontanissime perche' `scaduta()` legge
// l'orologio: qui l'oggi si passa esplicitamente, e resta dentro quella finestra.
const OGGI = new Date("2026-08-22T00:00:00Z");

const casi = golden.casi as Record<string, Record<string, unknown>>;
const attesi = golden.soci as Record<string, {
  punteggio: number; livello: string; superiore: boolean; livelloDD: number;
  frequenzaDD: number; obblighi: string[]; aperti: string[];
}>;

// ⚠️ LE DUE DIVERGENZE VOLUTE. Documentate in docs/politica-arrotondamento.md.
const DIVERGENZE: Record<string, { aperti?: string[]; obblighi?: string[]; perche: string }> = {
  // B3: «Non applicabile» sulle clausole e' una risposta, non un'omissione. Il
  // prototipo la contava come inadempienza nella scheda del socio e come assolvimento
  // nell'indicatore: lo stesso socio con due verdetti opposti. Ci si allinea
  // all'assolvimento, come gia' fanno `imp` e `ctrl` per la non fattibilita' motivata.
  clausoleNonApplicabili: { aperti: [], perche: "«Non applicabile» assolve, come per impegni e controlli" },
  // La verifica di proporzionalita' deve scattare anche quando la provvigione e'
  // dichiarata nel campo strutturato: il prototipo guardava SOLO il flag, quindi chi
  // sceglieva «A provvigione» senza spuntarlo non aveva l'obbligo. E' un obbligo che
  // manca, non uno di troppo.
  provvigioneSenzaFlag: { obblighi: ["dd", "pol", "imp", "clau", "ctrl", "pag"], aperti: ["dd", "pol", "imp", "clau", "ctrl", "pag"], perche: "la provvigione dichiarata nel campo fa scattare la verifica" },
};

describe("motore ISO 37001: fedelta' al prototipo", () => {
  for (const nome of Object.keys(casi)) {
    it(`«${nome}» dice quello che dice il prototipo`, () => {
      const s = daPrototipo(casi[nome]!);
      const a = attesi[nome]!;
      const d = DIVERGENZE[nome];

      expect(Number(punteggio(s).toFixed(6))).toBe(a.punteggio);
      expect(livello(s)).toBe(a.livello === "" ? null : a.livello);
      expect(superiore(s)).toBe(a.superiore);
      expect(livelloDueDiligence(s)).toBe(a.livelloDD);
      expect(frequenzaDueDiligence(s)).toBe(a.frequenzaDD);

      expect(obblighiDi(s).map((o) => o.chiave).sort()).toEqual([...(d?.obblighi ?? a.obblighi)].sort());
      expect(obblighiAperti(s, OGGI).map((o) => o.chiave).sort()).toEqual([...(d?.aperti ?? a.aperti)].sort());
    });
  }
});

describe("rischio degli scenari", () => {
  for (const [combinazione, atteso] of Object.entries(golden.scenari as Record<string, string>)) {
    it(`${combinazione} -> ${atteso || "(nessun livello)"}`, () => {
      const [prob, cons] = combinazione.split(" x ").map((x) => (x === "(vuoto)" ? "" : x));
      expect(livelloScenario(prob!, cons!)).toBe(atteso === "" ? null : atteso);
    });
  }
});
