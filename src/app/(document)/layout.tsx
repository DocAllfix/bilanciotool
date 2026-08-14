import localFont from "next/font/local";
import "./documento.css";

// Registro EDITORIALE del documento: serif, sfondo carta, sempre chiaro
// (il documento si stampa: niente dark mode qui, per scelta di design).
//
// Il font lo ospitiamo NOI, e non e' una preferenza: il 14 agosto 2026 Google ha
// ruotato gli indirizzi dei file di Source Serif 4 e ogni build su Vercel ha
// cominciato a fallire con sei 404 su `fonts.gstatic.com`. `next/font/google`
// chiedeva i file `vEFv2_...woff2`, spariti; Google ne serviva altri con un hash
// diverso. In locale il build passava lo stesso, perche' i file erano gia' in cache:
// il guasto si vedeva solo dove la cache non c'e', cioe' in produzione.
//
// Motivo piu' importante della disponibilita': questo e' il carattere dei cinque
// documenti che diventano PDF e finiscono in mano ai clienti degli studi. Farlo
// dipendere dalla CDN di Google al momento del build significa che l'aspetto di un
// documento legale dipende da un servizio di terzi il giorno in cui si distribuisce.
//
// Un file solo, 50 KB: Source Serif 4 e' un font VARIABILE, e i tre pesi che
// chiedevamo (400, 600, 700) erano lo stesso identico file scaricato tre volte —
// verificato confrontando le impronte.
const serif = localFont({
  src: "../../fonts/source-serif-4-latin.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  variable: "--font-doc-serif",
});

export default function DocumentoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} documento-root`}>{children}</div>;
}
