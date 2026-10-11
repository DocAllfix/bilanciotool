import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { PoweredByAxialoop } from "@/components/landing/axialoop";

// Il «powered by Axialoop» è un collegamento DOFOLLOW per specifica: la cosa da
// difendere è proprio che nessuno ci rimetta un nofollow o un noreferrer «per prudenza».
describe("powered by Axialoop", () => {
  const html = renderToStaticMarkup(h(PoweredByAxialoop));

  it("punta ad axialoop.com/it con il solo rel=noopener", () => {
    expect(html).toContain('href="https://www.axialoop.com/it"');
    const rel = html.match(/rel="([^"]*)"/)?.[1];
    expect(rel).toBe("noopener");
  });

  it("ha testo scritto, nome accessibile e logo inline senza richieste esterne", () => {
    expect(html.replace(/<[^>]+>/g, "")).toContain("powered by Axialoop");
    // WCAG 2.5.3: il nome accessibile comincia col testo che si vede.
    const etichetta = html.match(/aria-label="([^"]*)"/)?.[1] ?? "";
    expect(etichetta.startsWith("powered by Axialoop")).toBe(true);
    expect(etichetta).toContain("nuova scheda");
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/<img|src=/);
  });

  it("compare nel piede delle pagine pubbliche e nelle pagine legali", () => {
    for (const f of ["src/components/landing/piede.tsx", "src/components/landing/pagina-legale.tsx"]) {
      expect(readFileSync(f, "utf8"), f).toContain("<PoweredByAxialoop");
    }
  });
});
