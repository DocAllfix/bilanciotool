import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSnapshot, resolveSnapshotImages } from "@/features/documents/snapshot";
import { DOCUMENTI } from "@/features/documents/tipi";
import { DocumentoGhg } from "@/components/documento/documento-ghg";
import { DocumentoBilancio } from "@/components/documento/documento-bilancio";
import { DocumentoEnergetico } from "@/components/documento/documento-energetico";
import { DocumentoAttestato } from "@/components/documento/documento-attestato";
import { DocumentoSoa } from "@/components/documento/documento-soa";
import { DocumentoRelazionePc } from "@/components/documento/documento-relazione-pc";
import { DocumentoMatricePc } from "@/components/documento/documento-matrice-pc";
import { DocumentoMatrice231 } from "@/components/documento/documento-matrice-231";
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
      <article className="doc-pagina">{corpo}</article>
    </div>
  );
}
