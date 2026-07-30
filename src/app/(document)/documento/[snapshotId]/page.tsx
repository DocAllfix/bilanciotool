import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSnapshot, resolveSnapshotImages } from "@/features/documents/snapshot";
import { DocumentoGhg } from "@/components/documento/documento-ghg";
import { DocumentoBilancio } from "@/components/documento/documento-bilancio";
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
  const imageUrls =
    snap.tipo === "bilancio" ? await resolveSnapshotImages(s.orgId, snap.dati as never) : new Map<string, string>();

  return (
    <div className="px-4 py-4">
      <DocToolbar snapshotId={snap.id} tipo={snap.tipo} anno={snap.anno} versione={snap.versione} />
      <article className="doc-pagina">
        {snap.tipo === "ghg" ? <DocumentoGhg dati={dati} /> : <DocumentoBilancio dati={dati} imageUrls={imageUrls} />}
      </article>
    </div>
  );
}
