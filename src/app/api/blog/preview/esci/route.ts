// Uscita dalla modalità anteprima.
//
// Senza, il consulente continuerebbe a vedere le bozze anche tornando sul sito pubblico,
// e crederebbe di guardare ciò che vedono i visitatori.

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  (await draftMode()).disable();
  redirect("/blog");
}
