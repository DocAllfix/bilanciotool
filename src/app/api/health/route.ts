import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health/versione: dice quale commit è realmente online. Serve per sapere se un
// deploy è arrivato prima di verificare un fix (e in futuro per il monitoraggio).
export function GET() {
  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "locale",
    ambiente: process.env.VERCEL_ENV ?? "sviluppo",
    ora: new Date().toISOString(),
  });
}
