import Link from "next/link";
import { LogoVerticale } from "@/components/brand/logo";

// Registro auth: pagina silenziosa e centrata, il marchio al centro della scena.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-7" aria-label="EvalisDeck">
        <LogoVerticale className="h-24" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-10 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Bilanci di sostenibilità e inventari GHG per le PMI, con il metodo incorporato.
      </p>
    </div>
  );
}
