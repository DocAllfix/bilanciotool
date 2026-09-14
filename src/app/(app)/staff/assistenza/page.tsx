import type { Metadata } from "next";
import Link from "next/link";
import { sessioneStaff } from "../guardia";
import { codaStaff, type StatoTicket } from "@/features/assistenza";
import { Badge } from "@/components/ui/badge";
import { fmtDataBreve } from "@/lib/format";
import { STATO_PER_STAFF } from "@/features/assistenza/etichette";

// LA CODA DELLO STAFF.
//
// ⚠️ Esiste perché senza di lei la notifica all'amministratore porterebbe a un
// collegamento che non porta da nessuna parte. Prima di questa pagina il ruolo staff
// c'era e l'area no: `requirePlatformAdmin` era una guardia senza chiamanti.
//
// ⚠️ Per chi non è staff l'area NON ESISTE: `sessioneStaff` risponde «non trovata». Un
// «riservato allo staff» confermerebbe che c'è, e con `requirePlatformAdmin` sarebbe stato
// peggio — quella solleva, e dentro un componente server un'eccezione è un errore 500.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coda assistenza" };

export default async function CodaPage() {
  const s = await sessioneStaff();
  const coda = await codaStaff(s.userId);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8" data-coda-staff>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Coda assistenza</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Le richieste non chiuse, dalla più recente. {coda.length} in coda.
        </p>
      </header>

      {coda.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nessuna richiesta aperta.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {coda.map((t) => (
            <li key={t.id}>
              <Link
                href={`/staff/assistenza/${t.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                data-ticket={t.id}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.oggetto}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {t.nome} · {t.studio} · {fmtDataBreve(t.updatedAt)}
                  </span>
                </span>
                <Badge variant={t.stato === "aperto" ? "secondary" : "outline"}>
                  {STATO_PER_STAFF[t.stato as StatoTicket]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
