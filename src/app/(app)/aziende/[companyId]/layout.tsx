import Link from "next/link";
import { getSessionOrNull, orgAttivaVerificata } from "@/features/auth/guards";
import { aziendaDelloStudio } from "@/features/companies/lettori-condivisi";

// La fascia «azienda archiviata» sopra ogni pagina dell'azienda: fascicolo e quattordici
// percorsi.
//
// ⚠️ Perché qui e non in ciascun percorso. Su un'azienda archiviata il DATABASE rifiuta il
// lavoro nuovo (migrazione 0061); senza questa fascia il consulente scoprirebbe la regola
// solo quando un salvataggio gli risponde di no. Disabilitare i comandi uno per uno nei
// quattordici percorsi è un altro lavoro: qui si dice la cosa una volta, in alto.
//
// ⚠️ Non solleva MAI. La lettura viene da `aziendaDelloStudio`, la stessa che le pagine
// usano (`cache()` di React: nessun viaggio in più al database). Se l'azienda non si trova
// o la sessione non regge si rendono solo i figli: decidono le pagine, col proprio
// `notFound` o `requireActiveOrg`. Un layout che solleva spegnerebbe anche il messaggio con
// cui la pagina spiega che cosa manca.
export default async function AziendaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const archiviata = await eArchiviata(companyId).catch(() => false);
  return (
    <>
      {archiviata && (
        <div
          role="status"
          data-slot="azienda-archiviata"
          className="mb-5 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm"
        >
          <strong>Azienda archiviata: sola lettura.</strong> Puoi consultare tutto e scaricare i documenti
          già pubblicati; per aprire nuovi esercizi, pubblicare o creare collegamenti per il cliente,{" "}
          <Link href="/dashboard" className="font-medium underline underline-offset-2">
            ripristinala dal portafoglio
          </Link>
          .
        </div>
      )}
      {children}
    </>
  );
}

async function eArchiviata(companyId: string): Promise<boolean> {
  const s = await getSessionOrNull();
  if (!s) return false;
  const org = await orgAttivaVerificata(s);
  if (typeof org === "string") return false;
  const az = await aziendaDelloStudio(s.userId, org.orgId, companyId);
  return az?.stato === "archived";
}
