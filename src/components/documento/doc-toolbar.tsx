"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DocToolbar({ snapshotId, tipo, anno, versione }: { snapshotId: string; tipo: string; anno: number; versione: number }) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);
  return (
    <div className="doc-toolbar noprint">
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-3.5" /> Torna al percorso
      </Button>
      <span className="text-sm" style={{ color: "var(--doc-muted)" }}>
        {tipo === "ghg" ? "Rapporto GHG" : "Bilancio di sostenibilità"} {anno} · versione {versione}
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
                alert(j?.errore ?? "Generazione PDF non riuscita");
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${tipo === "ghg" ? "rapporto-ghg" : "bilancio-sostenibilita"}-${anno}-v${versione}.pdf`;
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
