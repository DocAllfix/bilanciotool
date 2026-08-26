import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSnapshot, resolveSnapshotImages } from "@/features/documents/snapshot";
import { Colophon } from "@/components/documento/colophon";
import { codiceDelloSnapshot } from "@/features/documents/codice";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOCUMENTI } from "@/features/documents/tipi";
import { DocumentoGhg } from "@/components/documento/documento-ghg";
import { DocumentoBilancio } from "@/components/documento/documento-bilancio";
import { DocumentoEnergetico } from "@/components/documento/documento-energetico";
import { DocumentoAttestato } from "@/components/documento/documento-attestato";
import { DocumentoSoa } from "@/components/documento/documento-soa";
import { DocumentoRelazionePc } from "@/components/documento/documento-relazione-pc";
import { DocumentoMatricePc } from "@/components/documento/documento-matrice-pc";
import { DocumentoMatrice231 } from "@/components/documento/documento-matrice-231";
import { DocumentoRegistroFirmato } from "@/components/documento/documento-registro-firmato";
import { DocumentoSgesg } from "@/components/documento/documento-sgesg";
import { DocumentoDichiarazioneFiliera } from "@/components/documento/documento-dichiarazione-filiera";
import { DocumentoManualeSa8000 } from "@/components/documento/documento-manuale-sa8000";
import { DocumentoRiesameQas } from "@/components/documento/documento-riesame-qas";
import { DocumentoRelazioneWb } from "@/components/documento/documento-relazione-wb";
import { DocumentoRelazioneOdv } from "@/components/documento/documento-relazione-odv";
import { DocToolbar } from "@/components/documento/doc-toolbar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documento" };

// Vista documento (web = PDF, stesso template). Renderizza SOLO dallo snapshot.
export default async function DocumentoPage({ params }: { params: Promise<{ snapshotId: string }> }) {
  const { snapshotId } = await params;
  const s = await requireConsultant();
  const snap = await getSnapshot(s.userId, s.orgId, snapshotId);
  if (!snap) notFound();

  const dati = snap.dati as never;
  const codice = await codiceDelloSnapshot(s.userId, s.orgId, snap.id);
  const urlVerifica = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/verifica`.replace(
    /^https?:\/\//,
    "",
  );
  // Gli URL firmati si generano solo per i documenti che portano immagini nello snapshot.
  const imageUrls = DOCUMENTI[snap.tipo].haMedia
    ? await resolveSnapshotImages(s.orgId, snap.dati as never)
    : new Map<string, string>();

  // Switch esaustivo: aggiungendo un tipo in TIPI_DOCUMENTO senza il suo template,
  // il compilatore fallisce qui invece di rendere silenziosamente il template sbagliato.
  const corpo = (() => {
    switch (snap.tipo) {
      case "ghg":
        return <DocumentoGhg dati={dati} />;
      case "bilancio":
        return <DocumentoBilancio dati={dati} imageUrls={imageUrls} />;
      case "energetico":
        return <DocumentoEnergetico dati={dati} imageUrls={imageUrls} />;
      case "soa":
        return <DocumentoSoa dati={dati} />;
      case "relazione_pc":
        return <DocumentoRelazionePc dati={dati} />;
      case "matrice_pc":
        return <DocumentoMatricePc dati={dati} />;
      case "matrice_231":
        return <DocumentoMatrice231 dati={dati} />;
      case "relazione_odv":
        return <DocumentoRelazioneOdv dati={dati} />;
      case "relazione_wb":
        return <DocumentoRelazioneWb dati={dati} />;
      case "riesame_qas":
        return <DocumentoRiesameQas dati={dati} />;
      case "analisi_ambientale": {
        const d = snap.dati as never as {
          aspetti: { riferimento: string | null; dati: Record<string, unknown>; significativita: string | null }[];
        };
        return (
          <DocumentoRegistroFirmato
            dati={{ ...(snap.dati as never as object), righe: d.aspetti.map((a) => ({ ...a, verdetto: a.significativita })) } as never}
            titolo="Analisi ambientale"
            kicker="Analisi ambientale iniziale"
            norma="ISO 14001:2015 · aspetti e impatti ambientali"
            colonne={["att", "fase", "asp", "cond"]}
            etichettaVerdetto="Significatività"
            gravi={["Significativo"]}
            firme={["Alta direzione", "Responsabile del sistema di gestione ambientale"]}
            premessa={
              <p>
                Il presente documento riporta l&apos;identificazione e la valutazione degli aspetti
                ambientali delle attività dell&apos;Organizzazione, nelle condizioni normali, anomale e di
                emergenza. Un aspetto è <strong>significativo</strong> quando il prodotto di gravità,
                frequenza e sensibilità del contesto raggiunge la soglia, <strong>oppure</strong> quando
                ricorre una prescrizione legale non pienamente presidiata, un&apos;esposizione della
                popolazione o un superamento di limiti: queste tre sono fatti dichiarati, non gradini di una
                scala, e valgono anche prima che la scala sia stata compilata.
              </p>
            }
          />
        );
      }
      case "valutazione_ssl": {
        const d = snap.dati as never as {
          pericoli: { riferimento: string | null; dati: Record<string, unknown>; livello: string | null }[];
        };
        return (
          <DocumentoRegistroFirmato
            dati={{ ...(snap.dati as never as object), righe: d.pericoli.map((p) => ({ ...p, verdetto: p.livello })) } as never}
            titolo="Valutazione dei rischi"
            kicker="Valutazione dei rischi per la salute e la sicurezza"
            norma="ISO 45001:2018 · D.Lgs. 81/2008"
            colonne={["area", "att", "per", "danno"]}
            etichettaVerdetto="Livello di rischio"
            gravi={["Critico", "Alto"]}
            firme={[
              "Datore di lavoro",
              "Responsabile del servizio di prevenzione e protezione",
              "Medico competente",
              "Rappresentante dei lavoratori per la sicurezza",
            ]}
            premessa={
              <p>
                Il presente documento riporta l&apos;individuazione dei pericoli e la valutazione dei rischi
                per la salute e la sicurezza dei lavoratori. Il livello di rischio è il prodotto di
                probabilità e gravità del danno. Un pericolo per cui uno dei due non è stato determinato{" "}
                <strong>non è un rischio basso</strong>: resta non valutato, ed è dichiarato come tale.
              </p>
            }
          />
        );
      }
      case "dichiarazione_filiera":
      return <DocumentoDichiarazioneFiliera dati={snap.dati as never} />;
    case "manuale_sa8000":
        return <DocumentoManualeSa8000 dati={dati} />;
      // ⚠️ I quattro del metodo ESG condividono il template: il loro contenuto e' il
      // compilato di schede diverse, gia' congelato nello snapshot con titolo, kicker e
      // avvertenza. Il template non deve sapere quale dei quattro sta rendendo.
      case "offerta_esg":
      case "verbale_avvio":
      case "diagnosi_esg":
      case "dossier_finale":
        return <DocumentoSgesg dati={snap.dati as never} />;
      case "attestato":
        // Il codice di verifica si ricava dall'identità dello snapshot: è
        // stabile per la revisione pubblicata e non va conservato nei dati.
        return <DocumentoAttestato dati={dati} snapshotId={snap.id} versione={snap.versione} />;
      default: {
        const mai: never = snap.tipo;
        throw new Error(`Tipo di documento senza template: ${String(mai)}`);
      }
    }
  })();

  return (
    <div className="px-4 py-4">
      <DocToolbar snapshotId={snap.id} tipo={snap.tipo} anno={snap.anno} versione={snap.versione} />
      <article className="doc-pagina">
        {corpo}
        {/* ⚠️ Il colophon si aggiunge QUI, una volta per tutti i documenti: e' la stessa
            strozzatura del marchio congelato. Nei dodici template si dimenticherebbe nel
            tredicesimo, e un documento senza codice non potra' mai averne uno. */}
        <Colophon
          codice={codice}
          emittente={marchioDelloSnapshot(snap.dati as never).nome}
          tipo={snap.tipo}
          anno={snap.anno}
          versione={snap.versione}
          edizione={(snap.dati as { edizione?: string }).edizione ?? null}
          pubblicatoIl={snap.publishedAt.toISOString()}
          urlVerifica={urlVerifica}
        />
      </article>
    </div>
  );
}
