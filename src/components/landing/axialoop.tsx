// «powered by Axialoop»: chi ha sviluppato il prodotto, sulle pagine pubbliche.
//
// Specifica di Axialoop (ottobre 2026), uguale per tutti i prodotti dello sviluppatore:
// - collegamento DOFOLLOW: solo `rel="noopener"`, niente nofollow, sponsored, ugc o
//   noreferrer. È il punto che conta: non «ripulirlo» per abitudine.
// - logo inline e markup statico: la CSP blocca le risorse di altre origini, e le pagine
//   pubbliche non devono leggere la richiesta (`pagine-statiche-pure`).
// - stesso colore, misura e hover degli altri collegamenti del piede: niente opacità, il
//   contrasto resta quello del piede.
// - logo trasparente, senza sfondo: nel tema scuro le parti quasi nere prendono il colore
//   del testo (`currentColor`), blu e verde restano quelli originali. La classe vince
//   sull'attributo `fill`, che resta come valore per chi non legge il CSS.
// - il nome accessibile COMINCIA col testo visibile (WCAG 2.5.3).
export function PoweredByAxialoop({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://www.axialoop.com/it"
      target="_blank"
      rel="noopener"
      aria-label="powered by Axialoop: sito di Axialoop, che ha sviluppato EvalisDeck (si apre in una nuova scheda)"
      data-slot="powered-by-axialoop"
      className={`tocco-comodo inline-flex min-h-6 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      <svg viewBox="0 0 497 494" width="19" height="19" aria-hidden="true" focusable="false" className="shrink-0">
        <path
          fill="#14171c"
          className="fill-[#14171c] dark:fill-current"
          fillRule="evenodd"
          d="M247 4 L139 67 L137 161 L5 238 L4 348 L210 470 L251 490 L492 350 L493 238 L358 158 L358 67 Z M245 231 L248 243 L347 301 L250 358 L197 328 L197 260 Z"
        />
        <path
          fill="#5683a9"
          d="M428 317 L377 290 L256 362 L307 389 L428 320 Z M142 293 L190 323 L193 322 L192 265 Z M10 245 L10 347 L201 459 L246 482 L246 428 L62 321 L60 274 Z M361 231 L355 240 L308 269 L308 272 L349 296 L376 283 L376 241 Z M360 167 L360 224 L434 267 L484 240 Z M246 75 L199 101 L199 188 L246 161 Z M148 67 L193 95 L204 92 L248 66 L301 96 L350 69 L250 9 Z"
        />
        <path
          fill="#7cbb84"
          d="M70 317 L248 422 L297 395 L290 388 L120 289 Z M382 246 L383 284 L432 311 L432 273 Z M188 193 L138 166 L17 236 L15 240 L66 267 L183 199 Z M252 76 L253 240 L300 265 L300 103 Z M144 75 L144 159 L193 187 L193 103 Z"
        />
      </svg>
      <span>
        powered by <span className="font-semibold">Axialoop</span>
      </span>
    </a>
  );
}
