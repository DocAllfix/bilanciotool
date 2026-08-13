import { ImageResponse } from "next/og";

// L'anteprima che si vede quando qualcuno incolla il link in una chat o su LinkedIn.
//
// Prima non c'era: il prodotto si passa per messaggio, e chi lo riceveva vedeva un
// riquadro spoglio col solo indirizzo. Un'anteprima muta fa sembrare provvisorio un
// prodotto che si vende a quattro cifre.
//
// Si genera qui e non come file: un'immagine statica andrebbe rifatta a mano a ogni
// cambio di nome o di promessa, e la prima volta che diverge dal sito nessuno se ne
// accorge — perché chi la vede non è chi la controlla.

export const alt = "EvalisDeck — cinque documenti di rendicontazione, un solo strumento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// I colori del marchio in esadecimale: `ImageResponse` non conosce le variabili CSS.
const INCHIOSTRO = "#13212b";
const PETROLIO = "#2f8f7f";
const CHIARO = "#eef2f3";

export default function Immagine() {
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
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 3, background: PETROLIO }} />
          <div
            style={{
              color: PETROLIO,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            EvalisDeck
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#fff", fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Dalla raccolta dati
          </div>
          <div style={{ color: "#fff", fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            al documento firmato.
          </div>
          <div style={{ color: PETROLIO, fontSize: 34, fontWeight: 700, marginTop: 14 }}>
            Un solo strumento.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["ISO 14064-1", "GRI · ESRS VSME", "UNI CEI EN 16247", "ISO/IEC 27001", "ISO 20400"].map((n) => (
            <div
              key={n}
              style={{
                color: CHIARO,
                fontSize: 21,
                border: "1px solid rgba(238,242,243,0.28)",
                borderRadius: 999,
                padding: "8px 18px",
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
