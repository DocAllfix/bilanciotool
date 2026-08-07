import { requireActiveOrg } from "@/features/auth/guards";
import { getQuadroAccessi } from "@/features/studio/queries";
import { GestioneMembri } from "@/components/impostazioni/gestione-membri";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MembriPage() {
  const s = await requireActiveOrg();
  const quadro = await getQuadroAccessi(s.orgId);
  const puoGestire = s.role === "owner" || s.role === "admin";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Chi lavora nello studio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ogni persona vede tutte le aziende del portafoglio.
            </p>
          </div>
          <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">{quadro.usati}</span> di {quadro.limite} accessi
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <GestioneMembri
          organizationId={s.orgId}
          membri={quadro.membri}
          inviti={quadro.inviti}
          pieno={quadro.pieno}
          limite={quadro.limite}
          puoGestire={puoGestire}
          ioSono={s.userId}
        />
      </CardContent>
    </Card>
  );
}
