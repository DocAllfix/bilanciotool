import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AvvisoReimpostata } from "./avviso-reimpostata";
import { ModuloAccesso } from "./modulo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold tracking-tight">Accedi</h1>
        <p className="text-sm text-muted-foreground">Entra nel tuo studio.</p>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <AvvisoReimpostata />
        </Suspense>
        <ModuloAccesso />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Non hai un account?{" "}
          <Link href="/registrati" className="font-medium text-primary hover:underline">
            Prova la demo guidata
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
