import { ImageResponse } from "next/og";
import { CHIAVI_PIANO, PIANI, euro, prezzoDiVendita } from "@/lib/prezzi";

// L'anteprima della pagina prezzi, quella che si vede quando qualcuno incolla il link
// in una chat per far vedere a un socio quanto costa.
//
// ⚠️ GLI IMPORTI SI DERIVANO DAL LISTINO, non si scrivono qui. Un'immagine col prezzo
// ricopiato a mano è una seconda verità sullo stesso numero, e sarebbe la peggiore delle
// due da correggere: nessuno la rilegge, vive nelle cache dei social per settimane, e
// quando diverge dal sito la vede solo chi sta decidendo se comprare.
//
// È la stessa ragione per cui `prezzoDiVendita` restituisce importo e chiave Stripe
// insieme: ciò che si mostra e ciò che si addebita escono da un posto solo.

export const alt = "EvalisDeck · un abbonamento solo, tre fasce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// I colori del marchio in esadecimale: `ImageResponse` non conosce le variabili CSS.
const INCHIOSTRO = "#13212b";
const PETROLIO = "#2f8f7f";
const CHIARO = "#eef2f3";

export default function Immagine() {
  const fasce = CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa).map((k) => ({
    nome: PIANI[k].nome,
    prezzo: euro(prezzoDiVendita(PIANI[k], "anno1")!.importo),
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INCHIOSTRO,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: PETROLIO, fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>EVALISDECK</div>
          <div
            style={{
              color: "#fff",
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              marginTop: 18,
            }}
          >
            Un abbonamento solo.
          </div>
          <div style={{ color: "#fff", fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Tre fasce.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {fasce.map((f) => (
            <div
              key={f.nome}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: "1px solid rgba(238,242,243,0.22)",
                borderRadius: 16,
                padding: "22px 24px",
              }}
            >
              <div style={{ color: CHIARO, fontSize: 21, opacity: 0.75 }}>{f.nome}</div>
              <div style={{ color: "#fff", fontSize: 42, fontWeight: 800, marginTop: 8 }}>{f.prezzo}</div>
              <div style={{ color: CHIARO, fontSize: 18, opacity: 0.55, marginTop: 4 }}>l&apos;anno</div>
            </div>
          ))}
        </div>

        <div style={{ color: CHIARO, fontSize: 22, opacity: 0.7 }}>
          Tutti i percorsi, accessi e marchio dello studio compresi. Si sceglie solo la capienza.
        </div>
      </div>
    ),
    size,
  );
}
