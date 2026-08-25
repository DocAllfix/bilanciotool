"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampoTesto } from "@/components/comune/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, UserPlus } from "lucide-react";
import type { Contatto } from "@/features/companies/contatti";
import {
  aggiornaAnagraficaAction,
  aggiornaCampoContattoAction,
  creaContattoAction,
  eliminaContattoAction,
  promuoviContattoAction,
} from "@/features/companies/contatti-actions";

// La scheda del cliente: anagrafica e rubrica, dentro il fascicolo dell'azienda.
//
// ⚠️ Sta nel FASCICOLO e non in una pagina sua. Il fascicolo e' gia' il posto dove si
// guarda un'azienda per intero; una pagina «Anagrafica» in piu' vorrebbe dire una voce in
// piu' nella barra laterale — cioe' proprio la cosa che la Fase 1 e' servita a togliere.
//
// ⚠️ Ogni campo salva DA SOLO e manda solo se stesso: `CampoTesto` porta gia' le tre
// regole pagate da questo progetto (mai la riga intera, comando ottimistico, campo
// controllato solo dove serve). Riscriverne una copia qui avrebbe significato correggere
// due volte il prossimo difetto.

type Props = {
  companyId: string;
  azienda: {
    piva: string | null;
    settore: string | null;
    ateco: string | null;
    sede: string | null;
    nazione: string | null;
    sitoWeb: string | null;
    dipendenti: number | null;
    fatturato: string | null;
  };
  contatti: Contatto[];
  /** In sola lettura: account scaduto o in prova. I comandi non compaiono. */
  soloLettura?: boolean;
};

export function SchedaCliente({ companyId, azienda, contatti, soloLettura }: Props) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [nuovo, setNuovo] = useState(false);
  const [erroreRubrica, setErroreRubrica] = useState<string | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);

  // ⚠️ `router.refresh()` in un EFFETTO e non dentro la richiamata di `useTransition`.
  // Non e' un ritardo piu' lungo, e' un momento diverso: dopo il commit non c'e' una
  // transizione a cui l'aggiornamento possa restare appeso. Il portafoglio ha perso
  // quattro aggiornamenti su otto prima che questa distinzione fosse chiara.
  if (daAggiornare && !inCorso) {
    setDaAggiornare(false);
    router.refresh();
  }

  const anagrafica = (campo: Parameters<typeof aggiornaAnagraficaAction>[1]) => async (v: string | null) => {
    const esito = await aggiornaAnagraficaAction(companyId, campo, v);
    if (esito.ok) setDaAggiornare(true);
    return esito;
  };

  async function aggiungi(form: FormData) {
    setErroreRubrica(null);
    const esito = await creaContattoAction(companyId, {
      nome: String(form.get("nome") ?? ""),
      ruolo: String(form.get("ruolo") ?? ""),
      email: String(form.get("email") ?? ""),
      telefono: String(form.get("telefono") ?? ""),
      // ⚠️ NON si passa `principale`. Chi sia il primo lo conta il server dentro la
      // transazione: qui `contatti` viene dalle props, che sono di un istante fa, e
      // aggiungendone due in fretta il secondo si dichiarava riferimento scalzando il
      // primo. E' lo stesso difetto delle props stantie, per la quarta volta.
    });
    if (!esito.ok) {
      setErroreRubrica(esito.errore);
      return;
    }
    setNuovo(false);
    setDaAggiornare(true);
  }

  return (
    <section className="mt-10" aria-labelledby="scheda-cliente">
      <h2 id="scheda-cliente" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Scheda cliente
      </h2>

      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4" data-scheda-cliente="">
        <CampoTesto id="cl-piva" etichetta="Partita IVA" valore={azienda.piva} salva={anagrafica("piva")} />
        <CampoTesto id="cl-settore" etichetta="Settore" valore={azienda.settore} salva={anagrafica("settore")} />
        <CampoTesto id="cl-ateco" etichetta="ATECO" valore={azienda.ateco} salva={anagrafica("ateco")} />
        <CampoTesto id="cl-sede" etichetta="Sede" valore={azienda.sede} salva={anagrafica("sede")} />
        <CampoTesto
          id="cl-nazione"
          etichetta="Nazione"
          valore={azienda.nazione}
          aiuto="Codice a due lettere: IT, DE, FR"
          salva={anagrafica("nazione")}
        />
        <CampoTesto
          id="cl-dipendenti"
          etichetta="Dipendenti"
          valore={azienda.dipendenti === null ? null : String(azienda.dipendenti)}
          aiuto="Organico attuale"
          salva={anagrafica("dipendenti")}
        />
        <CampoTesto
          id="cl-fatturato"
          etichetta="Fatturato (€)"
          valore={azienda.fatturato}
          aiuto="Ultimo esercizio chiuso"
          salva={anagrafica("fatturato")}
        />
        <CampoTesto id="cl-sito" etichetta="Sito web" valore={azienda.sitoWeb} salva={anagrafica("sitoWeb")} />
      </div>

      {/* ⚠️ La nota sull'organico non e' pignoleria. `dipendenti` e `fatturato` esistono
          anche dentro i profili dei moduli, e li' sono i valori DELL'ESERCIZIO: senza
          questa riga, un consulente che li vede in due posti diversi con due numeri
          diversi conclude che il prodotto sbaglia. */}
      <p className="mt-2 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
        Sono i valori correnti dell&apos;anagrafica. I singoli percorsi conservano i propri, riferiti
        all&apos;esercizio che rendicontano: un inventario del 2024 continua a usare l&apos;organico del 2024.
      </p>

      {/* ── rubrica ─────────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contatti</h3>
        {!soloLettura && !nuovo && (
          <Button variant="outline" size="sm" onClick={() => setNuovo(true)} data-nuovo-contatto="">
            <UserPlus className="size-4" aria-hidden />
            Aggiungi contatto
          </Button>
        )}
      </div>

      {nuovo && (
        <form action={aggiungi} className="mt-3 grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc-nome">Nome</Label>
            <Input id="nc-nome" name="nome" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-ruolo">Ruolo</Label>
            <Input id="nc-ruolo" name="ruolo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-email">Email</Label>
            <Input id="nc-email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-telefono">Telefono</Label>
            <Input id="nc-telefono" name="telefono" />
          </div>
          <div className="flex items-end gap-2 sm:col-span-4">
            <Button type="submit" size="sm">
              Salva contatto
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNuovo(false)}>
              Annulla
            </Button>
            {erroreRubrica && (
              <p className="text-[12px] text-destructive" role="alert">
                {erroreRubrica}
              </p>
            )}
          </div>
        </form>
      )}

      {contatti.length === 0 ? (
        <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Nessun contatto. Aggiungi chi si chiama in questa azienda quando serve un dato: resta qui,
          accanto ai percorsi, invece che in un&apos;email da ritrovare.
        </p>
      ) : (
        <ul className="mt-3 divide-y rounded-xl border" data-contatti="">
          {contatti.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-contatto={c.id}>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[15px] font-semibold tracking-tight">{c.nome}</span>
                  {c.principale && <Badge variant="outline">Riferimento</Badge>}
                  {c.ruolo && <span className="text-[13px] text-muted-foreground">{c.ruolo}</span>}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {[c.email, c.telefono].filter(Boolean).join(" · ") || "Nessun recapito"}
                </span>
              </span>
              {!soloLettura && (
                <span className="flex shrink-0 items-center gap-1">
                  {!c.principale && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Rendi ${c.nome} il riferimento`}
                      onClick={() =>
                        avvia(async () => {
                          const e = await promuoviContattoAction(companyId, c.id);
                          if (!e.ok) setErroreRubrica(e.errore);
                          else setDaAggiornare(true);
                        })
                      }
                    >
                      <Star className="size-4" aria-hidden />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Elimina ${c.nome}`}
                    onClick={() =>
                      avvia(async () => {
                        const e = await eliminaContattoAction(companyId, c.id);
                        if (!e.ok) setErroreRubrica(e.errore);
                        else setDaAggiornare(true);
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </span>
              )}
              {!soloLettura && (
                <span className="w-full">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-[12px] text-muted-foreground marker:content-none hover:text-foreground">
                      <span className="group-open:hidden">+ modifica recapiti</span>
                      <span className="hidden group-open:inline">− chiudi</span>
                    </summary>
                    <div className="mt-2 grid gap-3 sm:grid-cols-4">
                      {(["nome", "ruolo", "email", "telefono"] as const).map((campo) => (
                        <CampoTesto
                          key={campo}
                          // ⚠️ L'identificativo porta quello del contatto: due contatti
                          // sulla stessa pagina produrrebbero `id` duplicati, e
                          // l'etichetta dell'uno finirebbe a puntare al campo dell'altro.
                          id={`ct-${c.id}-${campo}`}
                          etichetta={campo === "nome" ? "Nome" : campo === "ruolo" ? "Ruolo" : campo === "email" ? "Email" : "Telefono"}
                          valore={c[campo]}
                          salva={async (v) => {
                            const e = await aggiornaCampoContattoAction(companyId, c.id, campo, v);
                            if (e.ok) setDaAggiornare(true);
                            return e;
                          }}
                        />
                      ))}
                    </div>
                  </details>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
