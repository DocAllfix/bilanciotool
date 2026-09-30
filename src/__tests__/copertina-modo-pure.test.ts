import { describe, it, expect } from "vitest";
import { dimensioniImmagine, immaginiCambiate, modoPerProporzioni } from "@/lib/copertina-modo";

// Le intestazioni si costruiscono byte per byte, come le scrive chi produce il file: un test
// che passasse le misure già estratte non proverebbe la parte che può sbagliare.

function png(w: number, h: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}

function jpeg(w: number, h: number, { conExif = true } = {}) {
  const parti: number[] = [0xff, 0xd8];
  // Un APP1 (Exif) prima del SOF, come nei file veri da fotocamera e da esportazione.
  if (conExif) parti.push(0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00);
  // Una tabella di Huffman (0xC4) PRIMA del SOF: sta nell'intervallo dei SOF e non lo è.
  parti.push(0xff, 0xc4, 0x00, 0x04, 0x00, 0x00);
  // SOF2 (progressivo): lunghezza, precisione, altezza, larghezza.
  parti.push(0xff, 0xc2, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03);
  parti.push(...new Array(12).fill(0));
  return new Uint8Array(parti);
}

function gif(w: number, h: number) {
  return new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 0xff, w >> 8, h & 0xff, h >> 8, 0, 0]);
}

function webpVp8x(w: number, h: number) {
  const b = new Uint8Array(30);
  b.set(new TextEncoder().encode("RIFF"), 0);
  b.set(new TextEncoder().encode("WEBPVP8X"), 8);
  const a = w - 1;
  const c = h - 1;
  b.set([a & 0xff, (a >> 8) & 0xff, (a >> 16) & 0xff], 24);
  b.set([c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff], 27);
  return b;
}

describe("dimensioniImmagine", () => {
  it("legge PNG, JPEG, GIF e WebP", () => {
    expect(dimensioniImmagine(png(1754, 2480))).toEqual({ larghezza: 1754, altezza: 2480 });
    expect(dimensioniImmagine(jpeg(1754, 2480))).toEqual({ larghezza: 1754, altezza: 2480 });
    expect(dimensioniImmagine(gif(300, 200))).toEqual({ larghezza: 300, altezza: 200 });
    expect(dimensioniImmagine(webpVp8x(2480, 1654))).toEqual({ larghezza: 2480, altezza: 1654 });
  });

  it("nel JPEG salta i segmenti che non sono il fotogramma, compresa la tabella 0xC4", () => {
    // Se prendesse la 0xC4 per un SOF leggerebbe misure fatte di zeri.
    expect(dimensioniImmagine(jpeg(2480, 1395, { conExif: false }))).toEqual({ larghezza: 2480, altezza: 1395 });
  });

  it("un file che non riconosce restituisce null, e non misure inventate", () => {
    expect(dimensioniImmagine(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(dimensioniImmagine(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(dimensioniImmagine(new Uint8Array(0))).toBeNull();
  });
});

describe("modoPerProporzioni", () => {
  it("una locandina A4 o Letter verticale va a pagina intera", () => {
    expect(modoPerProporzioni(1754, 2480)).toBe("pagina"); // A4, 1,414
    expect(modoPerProporzioni(2550, 3300)).toBe("pagina"); // Letter, 1,294
    expect(modoPerProporzioni(1654, 2480)).toBe("pagina"); // 2:3, 1,5
  });

  it("una fotografia orizzontale, quadrata o molto allungata resta fotografia", () => {
    expect(modoPerProporzioni(2480, 1654)).toBe("foto"); // 3:2 orizzontale
    expect(modoPerProporzioni(2000, 2000)).toBe("foto");
    expect(modoPerProporzioni(1080, 1350)).toBe("foto"); // 4:5, il verticale delle foto per i social
    expect(modoPerProporzioni(1080, 1920)).toBe("foto"); // 9:16, una storia da telefono
  });

  it("misure non valide non promuovono niente", () => {
    expect(modoPerProporzioni(0, 100)).toBe("foto");
    expect(modoPerProporzioni(Number.NaN, 100)).toBe("foto");
  });
});

describe("immaginiCambiate", () => {
  // Le chiavi sono quelle vere della produzione, 30 settembre: la v7 congelata col modo
  // «foto», e due minuti dopo l'azienda passata a «pagina».
  const org = "c5e42bf4";
  const azienda = {
    logoKey: `${org}/companies/70f4/logo-1790690613019.png`,
    coverKey: `${org}/companies/70f4/cover-1790759676248.jpg`,
    modo: "pagina" as const,
  };
  const v7 = {
    logoKey: `${org}/snapshot/dee8/0-logo-1790690613019.png`,
    coverKey: `${org}/snapshot/dee8/1-cover-1790759676248.jpg`,
    modo: "foto" as const,
  };

  it("il caso vero: stessi file, modo cambiato dopo la pubblicazione", () => {
    expect(immaginiCambiate(v7, azienda)).toBe(true);
  });

  it("stessi file e stesso modo: la copia nella cartella del documento non conta come cambio", () => {
    expect(immaginiCambiate({ ...v7, modo: "pagina" }, azienda)).toBe(false);
  });

  it("un logo o una copertina nuovi, aggiunti o tolti, sono un cambio", () => {
    expect(immaginiCambiate({ ...v7, modo: "pagina" }, { ...azienda, logoKey: `${org}/companies/70f4/logo-1790800000000.png` })).toBe(true);
    expect(immaginiCambiate({ ...v7, modo: "pagina" }, { ...azienda, coverKey: null })).toBe(true);
    expect(immaginiCambiate({ logoKey: null, coverKey: null, modo: "foto" }, { ...azienda, modo: "foto" })).toBe(true);
  });

  it("senza copertina il modo non conta: a stampa non cambia niente", () => {
    const senza = { logoKey: null, coverKey: null };
    expect(immaginiCambiate({ ...senza, modo: "foto" }, { ...senza, modo: "pagina" })).toBe(false);
  });
});
