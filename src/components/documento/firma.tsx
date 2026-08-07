import { marchioDelloSnapshot } from "@/features/documents/marchio";

// Il piede firmato di Rapporto GHG e Bilancio.
//
// Il monogramma compare SOLO quando il marchio è il nostro: dello studio abbiamo il
// nome, non il logo, e mettere il nostro simbolo accanto al nome di un altro sarebbe
// il contrario di quello che l'estensione white-label vende.

export function FirmaDocumento({ dati }: { dati: unknown }) {
  const m = marchioDelloSnapshot(dati);
  return (
    <p className="doc-meta" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {m.nostro && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/derivati/monogramma.svg" alt="" style={{ height: "14px", width: "auto" }} />
      )}
      Redatto con {m.nome}
    </p>
  );
}
