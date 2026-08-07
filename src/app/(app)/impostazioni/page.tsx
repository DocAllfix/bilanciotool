import { requireActiveOrg } from "@/features/auth/guards";
import { getDatiStudio } from "@/features/studio/queries";
import { FormNomeStudio } from "@/components/impostazioni/form-nome-studio";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TITOLARE } from "@/lib/legale";

export const dynamic = "force-dynamic";

const data = (d: Date | null) =>
  d ? d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default async function StudioPage() {
  const s = await requireActiveOrg();
  const studio = await getDatiStudio(s.orgId);
  // Rinominare lo studio cambia quello che i colleghi vedono: lo fa chi lo amministra.
  const puoModificare = s.role === "owner" || s.role === "admin";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-medium">Il tuo studio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Il nome compare nella barra laterale e negli inviti che mandi ai colleghi.
          </p>
        </CardHeader>
        <CardContent>
          <FormNomeStudio
            nomeIniziale={studio?.nome ?? ""}
            organizationId={s.orgId}
            puoModificare={puoModificare}
          />
          <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Attivo dal</dt>
              <dd className="mt-0.5 font-medium">{data(studio?.creatoIl ?? null)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Il tuo ruolo</dt>
              <dd className="mt-0.5 font-medium capitalize">{s.role}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">I tuoi dati</h2>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="mt-0.5 font-medium">{s.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Indirizzo email</dt>
              <dd className="mt-0.5 font-medium break-all">{s.email}</dd>
            </div>
          </dl>
          {/* Il diritto di cancellazione è nell'informativa: qui si dice come si esercita,
              invece di lasciare che lo cerchi. Non è un pulsante perché cancellare uno
              studio significa cancellare i documenti dei suoi clienti: è una cosa che
              vogliamo fare con una conferma umana, non con un clic. */}
          <p className="border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">
            Per chiudere l&apos;account e cancellare i dati, scrivi a{" "}
            <a href={`mailto:${TITOLARE.email}`} className="font-medium text-primary hover:underline">
              {TITOLARE.email}
            </a>
            . Provvediamo entro trenta giorni, dopo averti fatto esportare quello che vuoi tenere.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
