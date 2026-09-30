/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

// La copertina dei documenti, in un posto solo.
//
// ⚠️ ERA RICOPIATA A MANO IN DICIASSETTE PUNTI, sedici template più il secondo della NIS2,
// sempre con la stessa ossatura: occhiello, nome, riga di sede, una o due note. Solo
// quella del bilancio sapeva mostrare logo e fotografia; il GHG una copertina non ce
// l'aveva affatto. Dare logo e copertina a tutti i documenti significava toccarle tutte
// comunque: farlo in diciassette posti avrebbe prodotto diciassette versioni, e la prima
// correzione successiva le avrebbe fatte divergere.
//
// ⚠️ LE IMMAGINI SONO UN PARAMETRO OBBLIGATORIO, e non un contesto nascosto: così il
// compilatore impedisce a un template futuro di dimenticarle. Chi non ne ha — il fascicolo
// di una segnalazione, che non si pubblica — passa `SENZA_IMMAGINI` e lo dice.

export type ImmaginiCopertina = {
  logoUrl: string | null;
  coverUrl: string | null;
  /**
   * 'foto': la copertina è una fotografia sopra il titolo del documento.
   * 'pagina': la copertina È la pagina, già impaginata con titolo e loghi.
   */
  modo: "foto" | "pagina";
};

export const SENZA_IMMAGINI: ImmaginiCopertina = { logoUrl: null, coverUrl: null, modo: "foto" };

export function Copertina({
  kicker,
  titolo,
  sotto,
  immagini,
  children,
}: {
  kicker: ReactNode;
  titolo: ReactNode;
  /**
   * La riga sotto il nome: sede e settore. Passata vuota si rende vuota, come è sempre
   * stato; OMESSA non si rende affatto — la copertina del sistema NIS2 non l'ha mai avuta,
   * e aggiungerle una riga vuota sposterebbe la nota.
   */
  sotto?: ReactNode;
  immagini: ImmaginiCopertina;
  /** Le note in coda, una `NotaCopertina` ciascuna: il riferimento normativo, la revisione. */
  children?: ReactNode;
}) {
  // ⚠️ LA COPERTINA A PAGINA INTERA NON SI TAGLIA E NON CI SI SCRIVE SOPRA.
  //
  // Il difetto segnalato dal committente: caricata una copertina A4 già impaginata, usciva
  // ridotta a una fascia di 118 mm presa dal centro (`object-fit: cover`), senza testata e
  // senza fondo, col nostro titolo scritto sotto. Qui l'immagine occupa il foglio intero e
  // si adatta senza perdere un millimetro (`contain`): se le proporzioni non sono
  // esattamente quelle di un A4 restano due bordi bianchi, che sono un margine — un logo
  // tagliato a metà sarebbe un difetto.
  //
  // Il titolo resta nel documento, nascosto alla vista: lo leggono i lettori di schermo e
  // lo trova la ricerca dentro il PDF. Un documento il cui titolo esiste solo come pixel
  // di un'immagine non si ritrova in un archivio.
  if (immagini.modo === "pagina" && immagini.coverUrl) {
    return (
      <div className="doc-cover doc-cover-pagina" data-copertina="pagina">
        <img src={immagini.coverUrl} alt="" />
        <div className="doc-sr">
          <p>{kicker}</p>
          <h1>{titolo}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-cover" data-copertina="foto">
      {immagini.logoUrl && (
        <div className="logo">
          <img src={immagini.logoUrl} alt="" />
        </div>
      )}
      {immagini.coverUrl && (
        <div className="foto">
          <img src={immagini.coverUrl} alt="" />
        </div>
      )}
      <div className="testo">
        <p className="kicker">{kicker}</p>
        <h1>{titolo}</h1>
        {sotto !== undefined && <p className="sotto">{sotto}</p>}
        {children}
      </div>
      <div className="filo" />
    </div>
  );
}

/** Una riga di nota in coda alla copertina: più piccola, più tenue, staccata dalla sede. */
export function NotaCopertina({ children }: { children: ReactNode }) {
  return (
    <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
      {children}
    </p>
  );
}
