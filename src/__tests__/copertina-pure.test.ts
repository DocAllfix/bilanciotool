import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Copertina, NotaCopertina, SENZA_IMMAGINI } from "@/components/documento/copertina";

// La copertina comune dei ventidue documenti.
//
// ⚠️ IL DIFETTO SEGNALATO DAL COMMITTENTE. Caricata una copertina A4 già impaginata — titolo,
// loghi e anno dentro — usciva ridotta a una fascia alta 118 mm presa dal centro
// (`object-fit: cover`), senza testata e senza fondo, col nostro titolo scritto sotto. Ora
// chi carica sceglie: fotografia sopra il titolo, come prima, o pagina intera.

const LOGO = "https://archivio.test/logo.png";
const COVER = "https://archivio.test/cover.jpg";

function rendi(immagini: Parameters<typeof Copertina>[0]["immagini"], sotto: string | undefined = "Bari · Meccanica") {
  return renderToStaticMarkup(
    h(Copertina, { kicker: "Relazione", titolo: "Alfa S.r.l.", sotto, immagini }, h(NotaCopertina, null, "D.Lgs. 231/2001")),
  );
}

describe("la copertina", () => {
  it("⚠️ a PAGINA INTERA mostra l'immagine e non ci scrive sopra niente", () => {
    const html = rendi({ logoUrl: LOGO, coverUrl: COVER, modo: "pagina" });
    expect(html).toContain('data-copertina="pagina"');
    expect(html).toContain(`src="${COVER}"`);
    // Niente testo visibile, niente fascia, niente filo: la copertina è già impaginata.
    expect(html).not.toContain('class="testo"');
    expect(html).not.toContain('class="foto"');
    expect(html).not.toContain('class="filo"');
    // E niente logo sovrapposto: la copertina finita i suoi loghi li ha già.
    expect(html).not.toContain(`src="${LOGO}"`);
  });

  it("⚠️ a pagina intera il titolo resta nel documento, per chi non vede e per la ricerca", () => {
    // Un documento il cui titolo esiste solo come pixel di un'immagine non si ritrova in un
    // archivio, e un lettore di schermo annuncerebbe una pagina muta.
    const html = rendi({ logoUrl: null, coverUrl: COVER, modo: "pagina" });
    expect(html).toMatch(/class="doc-sr"[^]*<h1>Alfa S\.r\.l\.<\/h1>/);
  });

  it("a pagina intera SENZA immagine torna alla copertina normale, non a una pagina vuota", () => {
    const html = rendi({ logoUrl: null, coverUrl: null, modo: "pagina" });
    expect(html).toContain('data-copertina="foto"');
    expect(html).toContain("<h1>Alfa S.r.l.</h1>");
  });

  it("come FOTOGRAFIA mostra logo, fascia e testo, come ha sempre fatto il bilancio", () => {
    const html = rendi({ logoUrl: LOGO, coverUrl: COVER, modo: "foto" });
    expect(html).toContain('class="logo"');
    expect(html).toContain('class="foto"');
    expect(html).toContain('<p class="kicker">Relazione</p>');
    expect(html).toContain("<h1>Alfa S.r.l.</h1>");
  });

  it("⚠️ senza immagini rende ESATTAMENTE la copertina di prima", () => {
    // Diciassette copertine scritte a mano sono diventate questa: per chi non carica niente
    // non deve cambiare un carattere, altrimenti il passaggio al componente comune avrebbe
    // cambiato l'aspetto di ogni documento pubblicato da domani.
    const html = rendi(SENZA_IMMAGINI);
    expect(html).toBe(
      '<div class="doc-cover" data-copertina="foto"><div class="testo">' +
        '<p class="kicker">Relazione</p><h1>Alfa S.r.l.</h1><p class="sotto">Bari · Meccanica</p>' +
        '<p class="sotto" style="margin-top:8px;opacity:0.7">D.Lgs. 231/2001</p>' +
        '</div><div class="filo"></div></div>',
    );
  });

  it("la riga di sede vuota si rende vuota; OMESSA non si rende affatto", () => {
    // La copertina del sistema NIS2 non l'ha mai avuta: una riga vuota sposterebbe la nota.
    expect(rendi(SENZA_IMMAGINI, "")).toContain('<p class="sotto"></p>');
    expect(rendi(SENZA_IMMAGINI, undefined)).not.toContain('<p class="sotto"></p>');
  });
});

describe("⚠️ nessuna copertina torna a essere scritta a mano", () => {
  const CARTELLA = "src/components/documento";
  const file = readdirSync(CARTELLA).filter((f) => f.startsWith("documento-") && f.endsWith(".tsx"));

  it("la scansione guarda davvero i template", () => {
    expect(file.length).toBeGreaterThan(15);
  });

  it("ogni template usa la copertina comune, e le passa le immagini", () => {
    // Diciassette copertine ricopiate a mano: dare logo e copertina a tutti i documenti
    // avrebbe significato diciassette versioni, e la prima correzione le avrebbe fatte
    // divergere. Una copertina scritta a mano in un template nuovo uscirebbe senza logo.
    const aMano = file.filter((f) => readFileSync(join(CARTELLA, f), "utf8").includes('className="doc-cover"'));
    expect(aMano, "copertine scritte a mano invece di <Copertina>").toEqual([]);
    const senzaCopertina = file.filter((f) => !readFileSync(join(CARTELLA, f), "utf8").includes("<Copertina"));
    expect(senzaCopertina, "template senza copertina").toEqual([]);
  });

  it("⚠️ il CSS della pagina intera non torna mai a tagliare", () => {
    // La causa del difetto stava in una riga sola: `object-fit: cover` sulla copertina.
    // Senza i commenti: quello che spiega di non usare `cover` lo nomina, e un controllo
    // che legge la prosa invece del codice diventerebbe rosso proprio per la spiegazione.
    const css = readFileSync("src/app/(document)/documento.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const regole = css.match(/[^}]*doc-cover-pagina[^{]*\{[^}]*\}/g) ?? [];
    expect(regole.length, "nessuna regola per la copertina a pagina intera").toBeGreaterThan(1);
    for (const r of regole) expect(r, r).not.toMatch(/object-fit:\s*cover/);
    // ⚠️ E non si allarga oltre l'area stampabile: con `width: 210mm` Chromium impaginava
    // tutto il documento su quella larghezza e ritagliava il testo di ogni pagina ai
    // margini. Trovato guardando il PDF, con tutti i controlli verdi.
    for (const r of regole) expect(r, r).not.toMatch(/width:\s*210mm|page:\s*copertina/);
  });
});
