import { Source_Serif_4 } from "next/font/google";
import "./documento.css";

// Registro EDITORIALE del documento: serif, sfondo carta, sempre chiaro
// (il documento si stampa: niente dark mode qui, per scelta di design).
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-doc-serif",
});

export default function DocumentoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} documento-root`}>{children}</div>;
}
