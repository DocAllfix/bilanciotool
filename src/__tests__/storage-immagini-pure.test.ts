import { describe, it, expect } from "vitest";
import { immagineValida, parseDataUrl } from "@/lib/storage";

// Che cosa accettiamo come immagine.
//
// Il controllo era `contentType.startsWith("image/")`, e il `contentType` lo scrive il
// browser dentro il dataURL — cioè chiunque. Ci passava `image/svg+xml`, e un SVG è un
// documento eseguibile: contiene `<script>`. Quel tipo finiva poi nell'header con cui
// l'archivio restituisce il file, quindi l'indirizzo firmato serviva contenuto attivo.
//
// Qui si prova che il tipo DICHIARATO non basta: contano i primi byte.

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const wav = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "utf8");

describe("immagineValida: i primi byte, non le parole del client", () => {
  it("accetta i formati raster veri", () => {
    expect(immagineValida(png, "image/png")).toEqual({ contentType: "image/png", ext: "png" });
    expect(immagineValida(jpeg, "image/jpeg")).toEqual({ contentType: "image/jpeg", ext: "jpg" });
    expect(immagineValida(gif, "image/gif")).toEqual({ contentType: "image/gif", ext: "gif" });
    expect(immagineValida(webp, "image/webp")).toEqual({ contentType: "image/webp", ext: "webp" });
  });

  it("RESPINGE l'SVG, che è un documento eseguibile", () => {
    expect(immagineValida(svg, "image/svg+xml")).toBeNull();
    // E anche se qualcuno lo traveste da PNG: i byte non mentono.
    expect(immagineValida(svg, "image/png")).toBeNull();
  });

  it("respinge un tipo inventato che comincia per «image/»", () => {
    // `startsWith("image/")` accettava qualunque sottotipo, anche mai esistito.
    expect(immagineValida(png, "image/qualunque-cosa")).toBeNull();
    expect(immagineValida(png, "image/")).toBeNull();
  });

  it("respinge il MIME mentito: PNG dichiarato, byte JPEG", () => {
    expect(immagineValida(jpeg, "image/png")).toBeNull();
    expect(immagineValida(png, "image/jpeg")).toBeNull();
  });

  it("non scambia un WAV per un WebP: «RIFF» da solo non basta", () => {
    // Entrambi cominciano con «RIFF»: la differenza è all'ottavo byte.
    expect(immagineValida(wav, "image/webp")).toBeNull();
    expect(immagineValida(webp, "image/webp")).not.toBeNull();
  });

  it("regge un buffer più corto della firma senza esplodere", () => {
    expect(immagineValida(Buffer.from([0x89, 0x50]), "image/png")).toBeNull();
    expect(immagineValida(Buffer.alloc(0), "image/png")).toBeNull();
    expect(immagineValida(Buffer.from([0x52, 0x49, 0x46, 0x46]), "image/webp")).toBeNull();
  });

  it("accetta «image/jpg», che non è il nome ufficiale ma qualcuno lo scrive", () => {
    expect(immagineValida(jpeg, "image/jpg")).toEqual({ contentType: "image/jpeg", ext: "jpg" });
  });

  it("l'estensione viene dalla whitelist, non dalla stringa del client", () => {
    // `contentType.split("/")[1]` su `image/svg+xml` produceva «svg+xml» come estensione.
    const v = immagineValida(png, "image/png");
    expect(v!.ext).toBe("png");
    expect(v!.ext).not.toContain("+");
  });

  it("il dataURL di un SVG si decodifica ma non passa il controllo", () => {
    // I due passaggi sono distinti: `parseDataUrl` legge, `immagineValida` giudica.
    const dataUrl = `data:image/svg+xml;base64,${svg.toString("base64")}`;
    const p = parseDataUrl(dataUrl);
    expect(p).not.toBeNull();
    expect(immagineValida(p!.buffer, p!.contentType)).toBeNull();
  });
});
