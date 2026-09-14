# La parte comune a tutti i generatori di slide: legge il copione, ricava `inizia` dal
# paragrafo (così non può divergere), controlla sezioni e paragrafi, scrive slide.json.
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
RADICE = Path(r"C:/Users/user/workingnameBilanciotool/audio-formazione")


def P(h, d):
    return {"h": h, "d": d}


def scrivi(cartella, slide):
    copione = json.loads((RADICE / cartella / "script.json").read_text(encoding="utf-8"))
    paragrafi = {s["id"]: [p.strip() for p in s["script"].split("\n\n") if p.strip()] for s in copione["sezioni"]}
    mancanti = set(paragrafi) - set(slide)
    if mancanti:
        raise SystemExit(f"{cartella}: sezioni senza slide {sorted(mancanti)}")
    voci = []
    for sez, elenco in slide.items():
        if sez not in paragrafi:
            raise SystemExit(f"{cartella}: sezione sconosciuta {sez}")
        par = paragrafi[sez]
        for p, layout, campi in elenco:
            if p >= len(par):
                raise SystemExit(f"{cartella}/{sez}: p {p} oltre i {len(par)} paragrafi")
            voci.append({"sezione": sez, "p": p, "inizia": " ".join(par[p].split()[:6]), "layout": layout, **campi})
    (RADICE / cartella / "slide.json").write_text(json.dumps(voci, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    conta = {}
    for v in voci:
        conta[v["layout"]] = conta.get(v["layout"], 0) + 1
    print(f"{cartella}: {len(voci)} slide · " + ", ".join(f"{k} {v}" for k, v in sorted(conta.items(), key=lambda x: -x[1])))
