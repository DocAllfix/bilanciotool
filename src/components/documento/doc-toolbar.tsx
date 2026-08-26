"use client";

import { Button } from "@/components/ui/button";
import { etichettaDocumento, nomeFileDocumento, type TipoDocumento } from "@/features/documents/tipi";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DocToolbar({
  snapshotId,
  tipo,
  anno,
  versione,
}: {
  snapshotId: string;
  tipo: TipoDocumento;
  anno: number;
  versione: number;
}) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);
  return (
    <div className="doc-toolbar noprint">
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-3.5" /> Torna al percorso
      </Button>
      <span className="text-sm" style={{ color: "var(--doc-muted)" }}>
        {etichettaDocumento(tipo, anno, true)} · versione {versione}
      </span>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Stampa
        </Button>
        <Button
          size="sm"
          disabled={inCorso}
          onClick={async () => {
            setInCorso(true);
            try {
              const res = await fetch(`/api/documenti/${snapshotId}/pdf`);
              if (!res.ok) {
                const j = (await res.json().catch(() => null)) as { errore?: string } | null;
                // ⚠️ Non `alert()`: alcuni browser lo SOPPRIMONO, e un errore riferito
                // cosi' puo' non arrivare mai a chi lo deve leggere — proprio qui, dove
                // il messaggio spiega perche' il documento non e' arrivato.
                toast.error(j?.errore ?? "Generazione PDF non riuscita");
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = nomeFileDocumento(tipo, anno, versione);
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            } finally {
              setInCorso(false);
            }
          }}
        >
          <FileDown className="size-3.5" /> {inCorso ? "Generazione…" : "Scarica PDF"}
        </Button>
      </div>
    </div>
  );
}
