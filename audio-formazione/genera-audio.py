#!/usr/bin/env python3
"""Genera l'audio dei corsi di formazione dagli script.json — Azure TTS.

Riusa lo STANDARD VOCE della fabbrica Evalis (marcello-v2): Marcello Multilingual,
rate 0%, pitch -3%, silenzi 550/230/320, coda 1s.

Uso:
    python audio-formazione/genera-audio.py            # tutto cio' che e' cambiato
    python audio-formazione/genera-audio.py --corso energetico
    python audio-formazione/genera-audio.py --verifica # nessuna sintesi, solo controlli
    python audio-formazione/genera-audio.py --forza    # rigenera anche cio' che e' aggiornato

Legge AZURE_SPEECH_KEY da .env. Richiede ffmpeg nel PATH per la conversione in MP3.

COSA GARANTISCE
· Il testo passa la LISTA BIANCA prima di partire: un carattere non parlabile ferma
  tutto, invece di produrre audio sbagliato in silenzio.
· audio-map.json registra per traccia l'impronta di (testo + voce + standard): se il
  testo cambia o cambia lo standard, la traccia e' STALE e si rigenera. Le altre no.
· I WAV restano fuori dalla repo (.gitignore). In consegna vanno gli MP3.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path
from xml.sax.saxutils import escape

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

QUI = Path(__file__).resolve().parent
RADICE = QUI.parent
WAV = QUI / "_wav"          # master, fuori dalla repo
MP3 = QUI / "_mp3"          # cio' che si consegna
MAPPA = QUI / "audio-map.json"

REGIONE = "westeurope"
VOCE = "it-IT-MarcelloMultilingualNeural"
FORMATO_WAV = "riff-24khz-16bit-mono-pcm"
BITRATE = "64k"
STD = {"rate": "0%", "pitch": "-3%",
       "sil_frase": "550ms", "sil_virgola": "230ms", "sil_pv": "320ms"}
CODA = "1000ms"
VERSIONE = "marcello-v2 / formazione-bilanciotool"
PAROLE_AL_SECONDO = 2.607   # MISURATA su 16 tracce reali (gamma 2,37-2,77).
# ⚠️ E' cambiata due volte: 1,90 sul testo originale della pagina (fitto di elenchi e
# codici, pieno di pause forzate), 2,27 sulle prime riscritture, 2,607 sui copioni
# attuali. La velocita' dipende da COME e' scritto il testo, non dalla voce: si
# rimisura quando cambia lo stile di scrittura, non si eredita.

# Sigle lette a lettere (convenzione I.A. / P.D.C.A. della fabbrica). NON si toccano
# quelle che sono parole: ATECO, ENEA, ISPRA, INAIL, IVA, SOA, MUD.
SIGLE = ["ESRS", "ESG", "GHG", "GRI", "GWP", "SGI", "QAS", "KPI", "PDF", "DDT",
         "GPL", "PMI", "UTC", "CEI", "PDCA", "DNSH", "LCA"]

# Termini inglesi -> <lang en-US>.
#
# LISTA DECISA DALL'UTENTE ASCOLTANDO i campioni A/B di _campione/pronuncia/ (02/09/2026).
# Ne fanno parte SOLO i quattro dove la lettura italiana sbaglia davvero la parola:
#   scope       -> all'italiana sarebbe "sco-pe", e nel bilancio GHG e' terminologia esatta
#   file        -> all'italiana sarebbe "fi-le", come una fila di persone
#   cloud       -> all'italiana sarebbe "clo-ud"
#   stakeholder -> nessuno lo dice all'italiana
#   baseline    -> idem
#
# ⚠️ TUTTI GLI ALTRI RESTANO ITALIANI PER SCELTA ESPLICITA, anche quelli che "sembrano"
# inglesi: audit, due diligence, market based, location based, governance, backup,
# standard, target, budget, business, checklist. In italiano professionale si dicono
# all'italiana, e forzarli in inglese suonerebbe peggio — audit da solo compare 43 volte.
# Non riaggiungerli senza una nuova prova d'ascolto.
INGLESI = ["scope", "file", "cloud", "stakeholder", "baseline"]

GLOSSARIO = {
    "tCO₂e": "tonnellate di CO due equivalente", "CO₂e": "CO due equivalente",
    "CO₂": "CO due", "CO2": "CO due",
    "kWh": "chilowattora", "MWh": "megawattora", "GWh": "gigawattora",
    "kW": "chilowatt", "m³": "metri cubi", "m²": "metri quadri", "€": " euro",
    "±": " più o meno ", "²": " al quadrato", "³": " al cubo", "§": "paragrafo ",
    "×": " per ", "÷": " diviso ", "−": " meno ", "√": " radice quadrata di ",
    "Σ": " sommatoria di ", "≥": " maggiore o uguale a ", "≤": " minore o uguale a ",
    "→": " che porta a ", "ᵢ": " i-esimo", "≈": " circa uguale a ", "≠": " diverso da ",
    "max(0,": "il maggiore fra zero e", "cat.": "categoria",
}
LISTA_BIANCA = re.compile(r"[a-zA-Zà-ùÀ-Ù0-9\s.,;:!?']")


def leggi_chiave() -> str:
    env = RADICE / ".env"
    if env.exists():
        for riga in env.read_text(encoding="utf-8", errors="replace").splitlines():
            if riga.startswith("AZURE_SPEECH_KEY="):
                return riga.split("=", 1)[1].strip().strip('"').strip("'")
    k = os.environ.get("AZURE_SPEECH_KEY", "")
    if not k:
        sys.exit("AZURE_SPEECH_KEY non trovata: mettila in .env o nell'ambiente")
    return k


def normalizza(t: str) -> str:
    """Testo scritto -> testo PARLABILE. Ogni regola nasce da un caso reale del corpus."""
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = t.replace("*", "").replace("«", "").replace("»", "")
    t = t.replace("“", "").replace("”", "").replace("’", "'")
    t = re.sub(r"\s*—\s*", ", ", t)
    t = re.sub(r"\s*·\s*", ". ", t)
    t = t.replace("⚠️", "").replace("⚠", "")
    t = re.sub(r"(?<=[0-9])\s*%", " per cento", t)   # 65% -> 65 per cento
    t = re.sub(r"\s*%", " percentuale", t)           # etichetta di formula
    for k in sorted(GLOSSARIO, key=len, reverse=True):
        t = t.replace(k, GLOSSARIO[k])
    for s in SIGLE:
        t = re.sub(rf"(?<![A-Za-zÀ-ù]){s}(?![A-Za-zÀ-ù0-9])", ".".join(s) + ".", t)
    t = re.sub(r"[()\[\]]", ", ", t)
    t = re.sub(r"(?<=[a-zà-ùA-ZÀ-Ù])-(?=[a-zà-ùA-ZÀ-Ù])", " ", t)
    t = re.sub(r"(?<=[0-9A-Za-z])-(?=[0-9])", " parte ", t)   # EN 16247-1 -> parte 1
    t = t.replace("_", " ").replace("+", " più ")
    t = t.replace("/", " ").replace("=", " uguale ")
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s+([.,;:!?])", r"\1", t)
    t = re.sub(r"([.,;:])\1+", r"\1", t)
    t = re.sub(r",\s*\.", ".", t)
    t = re.sub(r"\.\s*,", ".", t)
    return t.strip()


def controlla(t: str, dove: str) -> str:
    residui = sorted(set(c for c in t if not LISTA_BIANCA.match(c)))
    if residui:
        raise ValueError(f"[{dove}] caratteri non parlabili {residui} in: {t[:140]!r}")
    return t


def frasi_lunghe(t: str, soglia: int = 35) -> list[tuple[int, str]]:
    """Ascoltabilita': oltre ~35 parole una frase non sta in un respiro."""
    fuori = []
    for f in re.split(r"(?<=[.!?])\s+", t):
        n = len(f.split())
        if n > soglia:
            fuori.append((n, f.strip()))
    return fuori


def con_lingua(t: str) -> str:
    presenti = [p for p in sorted(INGLESI, key=len, reverse=True)
                if re.search(rf"(?<![a-zà-ùA-ZÀ-Ù]){re.escape(p)}(?![a-zà-ùA-ZÀ-Ù])", t, re.I)]
    if not presenti:
        return t
    alt = "|".join(re.escape(p) for p in presenti)
    return re.sub(rf"(?<![a-zà-ùA-ZÀ-Ù])({alt})(?![a-zà-ùA-ZÀ-Ù])",
                  r'<lang xml:lang="en-US">\1</lang>', t, flags=re.I)


def ssml(testo: str) -> str:
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{STD["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{STD["sil_virgola"]}"/>'
           f'<mstts:silence type="Semicolon-exact" value="{STD["sil_pv"]}"/>')
    corpo = (f'<prosody rate="{STD["rate"]}" pitch="{STD["pitch"]}">'
             f'{con_lingua(escape(testo))}</prosody>')
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT">'
            f'<voice name="{VOCE}">{sil}{corpo}<break time="{CODA}"/></voice></speak>')


def _applicabili(testo: str, voci: list[str]) -> list[str]:
    """Solo le voci presenti in QUESTO testo."""
    return sorted(v for v in voci
                  if re.search(rf"(?<![a-zà-ùA-ZÀ-Ù]){re.escape(v)}(?![a-zà-ùA-ZÀ-Ù])",
                               testo, re.I))


def sha(testo: str) -> str:
    """Impronta di cio' che determina l'audio di QUESTA traccia.

    ⚠️ Del glossario e della lista inglese entrano solo le voci APPLICABILI a questo
    testo, non le liste intere. Altrimenti aggiungere un termine renderebbe vecchie
    TUTTE le tracce, anche quelle che quel termine non lo contengono: novanta sintesi
    rifatte per una parola. Cosi' invece si rigenera solo cio' che cambia davvero.
    """
    base = (testo + "|" + VOCE + "|" + json.dumps(STD, sort_keys=True) + "|" + VERSIONE
            + "|" + json.dumps(_applicabili(testo, INGLESI))
            + "|" + json.dumps(_applicabili(testo, SIGLE)))
    return hashlib.sha256(base.encode()).hexdigest()


def sintetizza(chiave: str, testo: str, dest_wav: Path) -> tuple[float, list[dict]]:
    """Sintetizza e restituisce (durata, marche parola per parola).

    Usa il Speech SDK e non l'endpoint REST perché il REST NON emette le marche
    temporali. Servono a due cose insieme:
      · far avanzare la slide dentro una traccia lunga (senza, una slide resterebbe
        ferma anche sette minuti);
      · il controllo di IDENTITÀ del QA — le parole registrate sono la prova di
        che cosa c'è DENTRO quel file, quindi un file scambiato non può passare.
    (La sintesi batch di Azure le darebbe in un .word.json, ma su questa chiave
    l'endpoint batch risponde 401: risorsa di tipo diverso da quella della fabbrica.)
    """
    import azure.cognitiveservices.speech as sp
    dest_wav.parent.mkdir(parents=True, exist_ok=True)
    cfg = sp.SpeechConfig(subscription=chiave, region=REGIONE)
    cfg.set_speech_synthesis_output_format(sp.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
    cfg.request_word_level_timestamps()
    syn = sp.SpeechSynthesizer(speech_config=cfg,
                               audio_config=sp.audio.AudioOutputConfig(filename=str(dest_wav)))
    marche: list[dict] = []

    # ⚠️ `synthesis_word_boundary` NON emette solo parole: emette anche i confini di
    # FRASE, e in quel caso `e.text` contiene l'intera frase (misurato: 20 eventi su 556
    # portavano fino a 118 parole in una volta). Senza questo filtro l'elenco piatto
    # delle parole si gonfia di dieci volte e gli stacchi dei paragrafi finiscono tutti
    # sullo stesso secondo. Si tengono solo i confini di PAROLA.
    # Doppia guardia: il tipo dichiarato NON basta. Su 487 eventi tipizzati come
    # parola, uno portava 464 parole in una volta — misurato, non ipotizzato. Una
    # marca di parola non contiene spazi: quello e' il controllo che non puo' sbagliare.
    def _boundary(e) -> None:
        t = (e.text or "").strip()
        if e.boundary_type == sp.SpeechSynthesisBoundaryType.Word and t and " " not in t:
            marche.append({"t": t, "s": round(e.audio_offset / 10_000_000, 3)})

    syn.synthesis_word_boundary.connect(_boundary)
    r = syn.speak_ssml_async(ssml(testo)).get()
    if r.reason != sp.ResultReason.SynthesizingAudioCompleted:
        det = getattr(r, "cancellation_details", None)
        raise RuntimeError(f"sintesi fallita: {getattr(det, 'error_details', r.reason)}")
    del syn  # chiude il file prima di rileggerlo
    with wave.open(str(dest_wav), "rb") as w:
        dur = w.getnframes() / w.getframerate()
    dest_wav.with_suffix(".words.json").write_text(
        json.dumps(marche, ensure_ascii=False), encoding="utf-8")
    return dur, marche


def marche_paragrafi(script: str, marche: list[dict]) -> list[dict]:
    """A che secondo comincia ogni paragrafo, per far avanzare la slide dentro la traccia.

    I paragrafi sono separati da RIGA VUOTA nello `script`. Si e' scelta la riga vuota e
    non un marcatore inventato tipo [[blocco]] perche' un token inventato va tolto prima
    di sintetizzare, e il giorno che qualcuno dimentica di toglierlo la voce lo legge.

    ⚠️ Qui si restituiscono SOLO i secondi dei paragrafi: quale blocco visivo mostrare a
    quale paragrafo NON e' cosa di questo file. I blocchi sono un array posizionale nei
    sorgenti dei corsi, senza identificatori: tenere quella corrispondenza qui
    significherebbe puntare a indici di un file che questo generatore non vede, e un
    avviso inserito a meta' sezione sposterebbe tutte le slide senza che niente protesti.
    """
    par = [p for p in re.split(r"\n\s*\n", script) if p.strip()]

    # Elenco piatto delle marche, una voce per PAROLA (una marca puo' portare
    # punteggiatura, che non produce token).
    parole: list[tuple[str, float]] = []
    for m in marche:
        for t in _token(m["t"]):
            parole.append((t, m["s"]))
    seq = [t for t, _ in parole]

    # ⚠️ NON si allinea parola per parola avanzando a ogni corrispondenza: sulle parole
    # comuni dell'italiano (e, di, la, che) l'indice corre in avanti e supera i confini
    # dei paragrafi prima del tempo — misurato, tre paragrafi finivano tutti allo stesso
    # secondo. Si cerca invece la SEQUENZA INIZIALE di ogni paragrafo, che e' distintiva,
    # a partire da dove finisce il paragrafo precedente.
    out: list[dict] = []
    da = 0
    for k, p in enumerate(par):
        chiave = _token(normalizza(p))[:6]
        if not chiave:
            continue
        trovato = -1
        for j in range(da, len(seq) - len(chiave) + 1):
            if seq[j:j + len(chiave)] == chiave:
                trovato = j
                break
        if trovato < 0:                     # sequenza non trovata: meglio dirlo che inventare
            out.append({"p": k, "s": None, "nota": "inizio non individuato nell'audio"})
            continue
        out.append({"p": k, "s": round(parole[trovato][1], 2)})
        da = trovato + len(chiave)
    return out


# ------------------------------------------------------------------ QA (A–F)
def _token(t: str) -> list[str]:
    """Parole confrontabili fra il copione e ciò che Azure ha registrato.

    ⚠️ L'APOSTROFO È UN SEPARATORE, e la ragione è sperimentale: dove il copione
    scrive «perche'», Azure emette DUE marche — «perche» e «'». Tenendo l'apostrofo
    dentro la parola i due elenchi non combaciano mai su quel punto, e in italiano
    quel punto capita ogni tre righe.
    """
    return [x for x in re.findall(r"[a-zA-Zà-ùÀ-Ù0-9]+", t.lower()) if x]


def qa_traccia(id_: str, testo: str, wav: Path, mp3: Path, atteso_s: float | None) -> list[str]:
    """I sei controlli della fabbrica. Un file che passa tutti e sei È quello giusto,
    è integro, ed è associato alla sezione giusta."""
    p: list[str] = []
    # A — integrità: il file esiste, è un RIFF leggibile, non è vuoto
    if not wav.exists() or not mp3.exists():
        return [f"A: file mancante ({'wav' if not wav.exists() else 'mp3'})"]
    try:
        with wave.open(str(wav), "rb") as w:
            dur = w.getnframes() / w.getframerate()
            if w.getnchannels() != 1 or w.getframerate() != 24000:
                p.append(f"A: formato inatteso {w.getnchannels()}ch {w.getframerate()}Hz")
    except Exception as e:
        return [f"A: wav illeggibile o corrotto ({e})"]
    if dur < 1.0:
        p.append(f"A: durata {dur:.1f}s, praticamente vuoto")
    if mp3.stat().st_size < 1024:
        p.append("A: mp3 troppo piccolo, conversione fallita")

    # B — la durata è coerente con la quantità di testo
    stima = len(testo.split()) / PAROLE_AL_SECONDO
    if not (0.75 * stima <= dur <= 1.35 * stima):
        p.append(f"B: durata {dur:.1f}s fuori scala per {len(testo.split())} parole (attesa ~{stima:.0f}s)")
    if atteso_s and abs(dur - atteso_s) > max(20, 0.25 * atteso_s):
        p.append(f"B: {dur:.0f}s contro un bersaglio di {atteso_s:.0f}s")

    # C — IDENTITÀ: le parole DENTRO il file devono essere quelle di QUESTA sezione.
    # È il controllo che rende impossibile un file scambiato o mescolato.
    wj = wav.with_suffix(".words.json")
    if not wj.exists():
        p.append("C: marche assenti, identità non verificabile")
    else:
        try:
            reg = _token(" ".join(m["t"] for m in json.loads(wj.read_text(encoding="utf-8"))))
        except Exception as e:
            p.append(f"C: marche illeggibili ({e})")
            reg = []
        att = _token(testo)
        if reg:
            # Allineamento TOLLERANTE ai salti. Un greedy che si ferma alla prima
            # parola non trovata perde tutto il resto e boccia file corretti: qui si
            # misura la piu' lunga sottosequenza comune, quindi una singola parola
            # diversa costa una parola, non l'intero controllo.
            import difflib
            blocchi = difflib.SequenceMatcher(None, att, reg, autojunk=False).get_matching_blocks()
            i = sum(b.size for b in blocchi)
            copertura = i / len(att) if att else 0
            if copertura < 0.85:
                p.append(f"C: IDENTITÀ — solo il {copertura:.0%} del testo atteso è nel file. "
                         f"Traccia probabilmente sbagliata o troncata")
            # D — la linea del tempo chiude sulla durata reale
            fine = json.loads(wj.read_text(encoding="utf-8"))[-1]["s"]
            if fine > dur + 0.5:
                p.append(f"D: le marche arrivano a {fine:.1f}s ma il file dura {dur:.1f}s")
            if dur - fine > 8:
                p.append(f"D: {dur - fine:.1f}s di coda muta dopo l'ultima parola")

    # E — coerenza fra identificativo e posizione sul disco
    corso, sez = id_.split("/", 1)
    if wav.parent.name != corso or wav.stem != sez:
        p.append(f"E: {wav} non corrisponde all'identificativo {id_}")
    return p


def in_mp3(src: Path, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-codec:a", "libmp3lame", "-b:a", BITRATE, "-ac", "1",
                    "-ar", "24000", str(dest)], check=True)
    return dest.stat().st_size


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corso", help="solo questo corso (nome della cartella)")
    ap.add_argument("--verifica", action="store_true", help="nessuna sintesi, solo controlli")
    ap.add_argument("--qa", action="store_true",
                    help="nessuna sintesi: verifica che OGNI traccia esistente sia integra, "
                         "della durata giusta e ASSOCIATA ALLA SEZIONE GIUSTA")
    ap.add_argument("--forza", action="store_true", help="rigenera anche cio' che e' aggiornato")
    a = ap.parse_args()

    mappa = json.loads(MAPPA.read_text(encoding="utf-8")) if MAPPA.exists() else {}

    # ---- QA: nessuna sintesi, si controlla ciò che esiste già -----------------
    if a.qa:
        guai: list[str] = []
        attese: set[str] = set()
        for p in sorted(QUI.glob("*/script.json")):
            corso = p.parent.name.strip("_")
            if a.corso and corso != a.corso:
                continue
            for s in json.loads(p.read_text(encoding="utf-8"))["sezioni"]:
                id_ = f"{corso}/{s['id']}"
                attese.add(id_)
                t = normalizza(s["script"])
                g = qa_traccia(id_, t, WAV / corso / f"{s['id']}.wav",
                               MP3 / corso / f"{s['id']}.mp3", s.get("durata_obiettivo_s"))
                # lo script è cambiato dopo la sintesi?
                voce = mappa.get(id_)
                if voce:
                    if voce.get("sha_script") != hashlib.sha256(s["script"].encode()).hexdigest():
                        g.append("G: lo SCRIPT è cambiato dopo la sintesi, la traccia è vecchia")
                    if voce.get("sha") != sha(t):
                        g.append("G: lo STANDARD DI VOCE è cambiato, la traccia è vecchia")
                else:
                    g.append("F: nessuna voce in audio-map.json")
                print(f"  {'OK  ' if not g else 'GUAI'}  {id_}")
                for x in g:
                    print(f"          {x}")
                guai += [f"{id_}: {x}" for x in g]
        # F — orfani: file presenti che nessuno script reclama.
        # Con --corso si guarda SOLO quella cartella: altrimenti tutte le tracce degli
        # altri corsi risulterebbero orfane, e un controllo che grida al lupo si ignora.
        for f in (MP3 / a.corso).rglob("*.mp3") if a.corso else MP3.rglob("*.mp3"):
            id_ = f"{f.parent.name}/{f.stem}"
            if id_ not in attese:
                guai.append(f"{id_}: F: traccia ORFANA, nessuno script la reclama")
                print(f"  GUAI  {id_}\n          F: traccia orfana")
        print(f"\n  {len(attese)} attese · {len(guai)} problemi")
        return 1 if guai else 0

    chiave = "" if a.verifica else leggi_chiave()
    fatte = saltate = 0
    problemi: list[str] = []

    for p in sorted(QUI.glob("*/script.json")):
        corso = p.parent.name.strip("_")
        if a.corso and corso != a.corso:
            continue
        for s in json.loads(p.read_text(encoding="utf-8"))["sezioni"]:
            id_ = f"{corso}/{s['id']}"
            try:
                t = controlla(normalizza(s["script"]), id_)
            except ValueError as e:
                problemi.append(str(e))
                continue
            for n, f in frasi_lunghe(t):
                problemi.append(f"[{id_}] ascoltabilita': frase di {n} parole -> {f[:90]}…")
            h = sha(t)
            mp3 = MP3 / corso / f"{s['id']}.mp3"
            if not a.forza and mappa.get(id_, {}).get("sha") == h and mp3.exists():
                saltate += 1
                continue
            if a.verifica:
                print(f"  DA RIGENERARE  {id_}")
                fatte += 1
                continue
            w = WAV / corso / f"{s['id']}.wav"
            dur, marche = sintetizza(chiave, t, w)
            byte = in_mp3(w, mp3)
            mappa[id_] = {
                "sha": h,
                # Impronta dello SCRIPT COSÌ COM'È SCRITTO (non normalizzato). Serve alla
                # guardia anti-divergenza: l'audio è registrato, il testo della pagina no.
                # Se qualcuno corregge una frase e non risintetizza, chi ascolta sente una
                # cosa e legge l'altra — e non se ne accorge nessuno. Questa impronta rende
                # quella divergenza VISIBILE invece che silenziosa.
                "sha_script": hashlib.sha256(s["script"].encode()).hexdigest(),
                "durata_s": round(dur, 1),
                "byte": byte,
                "parole": len(t.split()),
                # barre NORMALI anche su Windows: questo manifesto lo legge codice JavaScript,
                # e "_mp3\energetico\x.mp3" li' sarebbe una stringa con caratteri di escape.
                "mp3": mp3.relative_to(QUI).as_posix(),
                # Secondo d'inizio di ogni paragrafo: fa avanzare la slide DENTRO la
                # traccia. Senza, una sezione da sette minuti sarebbe una slide ferma
                # per sette minuti.
                "marche": marche_paragrafi(s["script"], marche),
                "marche_parole": len(marche),
                # chiave nell'archivio: in questo prodotto ogni chiave deve cominciare con
                # l'identificativo dell'organizzazione; `_piattaforma` è il prefisso
                # riservato per il contenuto che non appartiene a nessuno studio.
                "chiave_archivio": f"_piattaforma/formazione/{corso}/{s['id']}.mp3",
            }
            atteso = s.get("durata_obiettivo_s")
            scarto = f"  ({dur - atteso:+.0f}s sul bersaglio)" if atteso else ""
            print(f"  {id_:<40}{dur:>6.1f}s  {byte/1024:>6.0f} KB{scarto}")
            fatte += 1

    if not a.verifica:
        MAPPA.write_text(json.dumps(mappa, indent=1, ensure_ascii=False), encoding="utf-8")
    tot = sum(v["durata_s"] for v in mappa.values())
    print(f"\n  generate {fatte} · gia' aggiornate {saltate} · "
          f"totale in mappa {len(mappa)} tracce = {tot/60:.1f} minuti")
    if problemi:
        print(f"\n  ⚠️  {len(problemi)} SEGNALAZIONI:")
        for x in problemi[:20]:
            print("   ", x)
    return 1 if any("non parlabili" in x for x in problemi) else 0


if __name__ == "__main__":
    sys.exit(main())
