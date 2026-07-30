import { redirect } from "next/navigation";

// La landing pubblica arriva in Fase 10 (route group marketing).
// Fino ad allora la radice porta all'app: il layout (app) gestisce il login.
export default function Home() {
  redirect("/dashboard");
}
