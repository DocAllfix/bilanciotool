// Le voci GHG si trovano da sole: dal codice ATECO dell'azienda all'inventario, senza un clic.
//
//   npm run qa -- ghg-proposte
//
// ⚠️ Le prove che contano difendono il lavoro del consulente: una voce toccata resta, un
// numero scritto non sparisce, cambiare ATECO non cancella niente che qualcuno abbia
// guardato. E una proposta mai toccata non entra nel documento pubblicato. Ogni esito si
// legge dal DATABASE.

import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { attendi, attraversaProtezione, contatore, pretendiServerAggiornato, spegniTour, strumenta } from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `ghg-proposte-${RUN}@example.com`;
const NOME = `Torneria Prova ${String(RUN).slice(-6)} S.r.l.`;
const ANNO = 2025;

console.log(`\nGHG — voci proposte — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await attraversaProtezione(page);
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

let companyId;
const inventario = async () => (await sql`select * from ghg_inventory where company_id=${companyId} and anno=${ANNO}`)[0] ?? null;
const righe = async () => {
  const i = await inventario();
  return i ? sql`select * from ghg_activity_row where inventory_id=${i.id} order by created_at` : [];
};
const proposte = async () => (await righe()).filter((r) => r.proposta_motivo);

try {
  const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Proposte", email, pwd: PWD_COLLAUDO });
  await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);

  await agisci("l'azienda nasce con partita IVA, ATECO e sede", async () => {
    await page.click('[data-tour="nuova-azienda"]');
    await page.fill("#na-nome", NOME);
    await page.fill("#na-settore", "Lavorazioni meccaniche");
    await page.fill("#na-piva", "07481930726");
    await page.fill("#na-ateco", "25.62");
    await page.click('button[type="submit"]:has-text("Crea azienda")');
    await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
    companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
    await sql`update company set sede='Bari', dipendenti=48 where id=${companyId}`;
  });

  await agisci("creato l'inventario, i confini partono dall'anagrafica", async () => {
    await page.goto(`${BASE}/aziende/${companyId}/ghg`, { waitUntil: "domcontentloaded" });
    await spegniTour(page);
    await page.fill("#ci-anno", String(ANNO));
    await page.click('button[type="submit"]:has-text("Crea")');
    await page.waitForURL(`**/ghg/${ANNO}**`, { timeout: 30_000 });
    const i = await inventario();
    if (i.boundaries.ateco !== "25.62" || i.boundaries.piva !== "07481930726" || i.boundaries.sede !== "Bari") {
      throw new Error(`confini: ${JSON.stringify(i.boundaries)}`);
    }
    if (Number(i.fte) !== 48) throw new Error(`addetti ${i.fte}`);
    // E a schermo, nel campo: un campo copiato nel database e vuoto a schermo sarebbe peggio.
    if ((await page.locator("#b-ateco").inputValue()) !== "25.62") throw new Error("il campo ATECO è vuoto a schermo");
  });

  await agisci("…e le voci tipiche del codice ATECO ci sono già, a quantità zero", async () => {
    const p = await proposte();
    if (p.length < 5) throw new Error(`solo ${p.length} proposte`);
    if (p.some((r) => Number(r.quantita) !== 0)) throw new Error("una proposta ha già una quantità");
    if (!p.some((r) => r.factor_key === "acciaio")) throw new Error("manca l'acciaio, materia tipica della divisione 25");
  });

  await agisci("nei dati di attività ogni proposta porta la marca e il motivo", async () => {
    await page.click('[data-tour="ghg-passo-3"]');
    await page.waitForURL(/passo=3/, { timeout: 30_000 });
    await page.locator("[data-proposte]").waitFor({ timeout: 20_000 });
    const n = Number(await page.locator("[data-proposte]").getAttribute("data-proposte"));
    if (n !== (await proposte()).length) throw new Error(`a schermo ${n}, nel database ${(await proposte()).length}`);
    const motivo = await page.locator("[data-motivo]").first().innerText();
    if (!/Proposta dal codice ATECO/.test(motivo)) throw new Error(`motivo: ${motivo}`);
  });

  await agisci("compilare la quantità di una proposta la rende del consulente", async () => {
    const riga = page.getByRole("row").filter({ hasText: "Acciaio" });
    await riga.getByRole("button", { name: "Modifica" }).click();
    await page.fill("#v-q", "12000");
    await page.getByRole("button", { name: "Salva voce" }).click();
    await attendi(async () => {
      const [r] = (await righe()).filter((x) => x.factor_key === "acciaio");
      return Number(r?.quantita) === 12000 && r.proposta_motivo === null;
    }, { cosa: "acciaio compilato e non più proposta" });
  });

  await agisci("«Conferma» toglie la marca a una voce senza cambiarla", async () => {
    const [v] = (await proposte()).filter((x) => x.factor_key === "ee_loc");
    await page.getByRole("button", { name: `Conferma la voce «${v.descrizione}»` }).click();
    await attendi(async () => (await righe()).find((x) => x.id === v.id)?.proposta_motivo === null, { cosa: "elettricità confermata" });
  });

  await agisci("«Aggiungi voce» parte da una sorgente inclusa e dalla sede dei confini", async () => {
    await page.getByRole("button", { name: /Aggiungi voce/ }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.waitFor();
    // La sorgente scelta dal dialogo deve essere una di quelle INCLUSE nell'inventario: prima
    // partiva sempre da «Combustione fissa», qualunque fosse l'azienda.
    const i = await inventario();
    const incluse = await sql`select t.nome from ghg_source_selection s
      join ghg_source_type t on t.key = s.source_type_key and t.set_id = ${i.content_set_id}
      where s.inventory_id = ${i.id} and s.stato = 'in'`;
    const testo = await dialogo.innerText();
    if (!incluse.some((x) => testo.includes(x.nome))) throw new Error(`nessuna sorgente inclusa nel dialogo (${incluse.length} incluse)`);
    await page.keyboard.press("Escape");
  });

  await agisci("⚠️ cambiando ATECO, la voce scritta e quella confermata RESTANO", async () => {
    await page.click('[data-tour="ghg-passo-1"]');
    await page.waitForURL(/passo=1/, { timeout: 30_000 });
    await page.locator("#b-ateco").fill("69.20");
    await page.locator("#b-ateco").blur();
    await attendi(async () => (await proposte()).some((r) => /professionali/.test(r.proposta_motivo)), { cosa: "proposte del profilo nuovo" });
    const tutte = await righe();
    if (Number(tutte.find((r) => r.factor_key === "acciaio")?.quantita) !== 12000) throw new Error("la voce compilata è sparita");
    if (!tutte.some((r) => r.factor_key === "ee_loc" && r.proposta_motivo === null)) throw new Error("la voce confermata è sparita");
    if ((await proposte()).some((r) => /Metallurgia/.test(r.proposta_motivo))) throw new Error("resta una proposta col motivo del profilo vecchio");
  });

  await agisci("la verifica avvisa che le proposte non entrano nel documento", async () => {
    await page.click('[data-tour="ghg-passo-7"]');
    await page.waitForURL(/passo=7/, { timeout: 30_000 });
    await page.locator("[data-proposte-aperte]").waitFor({ timeout: 20_000 });
  });

  await agisci("⚠️ il documento pubblicato NON contiene le proposte mai toccate", async () => {
    const i = await inventario();
    await page.goto(`${BASE}/aziende/${companyId}/ghg/${ANNO}?passo=8`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Pubblica/ }).first().click();
    await attendi(async () => (await sql`select 1 from document_snapshot where company_id=${companyId} and tipo='ghg'`).length > 0, { cosa: "snapshot" });
    const [snap] = await sql`select dati from document_snapshot where company_id=${companyId} and tipo='ghg' order by versione desc limit 1`;
    const voci = snap.dati.righe;
    const aperte = (await righe()).filter((r) => r.proposta_motivo).map((r) => r.id);
    if (voci.some((r) => aperte.includes(r.id))) throw new Error("una proposta aperta è finita nel documento");
    if (voci.some((r) => "propostaMotivo" in r)) throw new Error("il motivo della proposta si è congelato nello snapshot");
    if (!voci.some((r) => r.factorKey === "acciaio")) throw new Error("la voce compilata manca dal documento");
    void i;
  });
} finally {
  var esito = riepilogo("GHG — voci proposte");
  await browser.close();
  await sql.end();
}
// `riepilogo` restituisce quanti ROSSI ci sono: con dei falliti si esce con 1.
process.exit(esito ? 1 : 0);
