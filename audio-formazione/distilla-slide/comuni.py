# Distillazione delle slide delle SEZIONI COMUNI (una traccia sola, riusata da tutti i corsi).
# `inizia` NON si scrive a mano: si ricava dal copione, così non può divergere.
#
# ⚠️ Tre regole che qui valgono più che altrove:
# - nessuna chiusura porta `prossimo`: la sezione dopo cambia da corso a corso (esercizio o
#   revisione, e dopo gli errori comuni arriva la prima sezione propria del corso);
# - nessun occhiello numerato: il numero della sezione lo conta il renderer;
# - nessuna cifra: i conteggi del catalogo sono segnaposto di NUMERI.
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
RADICE = Path(r"C:/Users/user/workingnameBilanciotool/audio-formazione")


def P(h, d):
    return {"h": h, "d": d}


SLIDE = {
    "dove-sei": [
        (0, "apertura", dict(
            titolo="Dove sei, e come ci si muove", sottotitolo="Tre livelli, sempre nello stesso ordine",
            testo="Il portafoglio elenca le aziende, il fascicolo raccoglie i {moduli} percorsi in {gruppi} gruppi, il percorso è dove lavori.",
            agenda=["Portafoglio, fascicolo, percorso", "La barra laterale", "La pagina di apertura dello studio",
                    "Disponibili, non da fare", "Colore e icona"])),
        (1, "confronto", dict(
            titolo="La barra laterale cambia con te",
            a={"h": "Nello studio", "sub": "Le voci generali", "punti": ["Portafoglio", "Documenti", "Agenda", "Compensi"]},
            b={"h": "Dentro un'azienda", "sub": "Il suo nome e i suoi percorsi",
               "punti": ["Dal bilancio alla dichiarazione di applicabilità", "Senza tornare indietro"]})),
        (2, "split", dict(
            titolo="Dove cominciare la giornata",
            lead="La pagina di apertura dello studio raccoglie i numeri del portafoglio, i documenti pubblicati di recente e lo scadenzario.",
            punti=[P("Per urgenza", "che cosa faccio adesso"), P("Per cliente", "chi è più indietro"),
                   P("Per ambito", "dove sono indietro")])),
        (3, "evidenza", dict(
            eyebrow="Per chi apre il fascicolo la prima volta",
            titolo="{moduli} percorsi disponibili, non {moduli} da fare.",
            testo="Si aprono quelli che servono a quel cliente. Gli altri restano spenti, e non compaiono nello scadenzario.")),
        (4, "definizione", dict(
            eyebrow="Non è decorazione", titolo="Colore e icona",
            definizione="Il modo più rapido per capire dove sei quando hai otto clienti aperti e le schermate cominciano a somigliarsi.",
            punti=[P("Il colore", "dice di che materia si parla"), P("L'icona", "dice quale lavoro stai facendo")])),
    ],
    "come-si-salva": [
        (0, "apertura", dict(
            titolo="Come si salva", sottotitolo="Da solo, campo per campo",
            testo="Il pulsante salva non c'è: ogni campo si salva nel momento in cui lo lasci, e il dato è sul server.",
            agenda=["Il salvataggio automatico", "Per campo, non per riga", "Dati isolati fra studi", "Niente da esportare"])),
        (1, "split", dict(
            titolo="Per campo, non per riga",
            lead="Una scelta pagata con quattro difetti veri: la pagina rimandava tutta la riga, compresa la parte non ancora aggiornata.",
            punti=[P("Salvare il costo", "azzerava la quantità appena scritta"),
                   P("La rilevanza finanziaria", "cancellava l'impatto messo un attimo prima"),
                   P("Adesso torna un campo solo", "e il valore precedente lo rilegge il server")])),
        (2, "cards", dict(
            titolo="Due cose sui dati",
            cards=[P("Isolati fra studi", "Il divieto lo applica il database: un altro studio non li legge nemmeno per un nostro errore di programmazione."),
                   P("Condivisi dentro lo studio", "I colleghi che inviti vedono tutto il portafoglio, così un socio può sostituire l'altro.")])),
        (3, "evidenza", dict(
            eyebrow="Il cambiamento più grande",
            titolo="Nessun archivio da esportare, nessun file da conservare.",
            testo="Il lavoro sta sul server: cambiare computer significa solo rifare l'accesso.")),
    ],
    "esercizio": [
        (0, "apertura", dict(
            titolo="L'esercizio, e il confronto con l'anno prima", sottotitolo="Questo percorso si redige per anno",
            testo="Il selettore in cima dice su quale esercizio lavori: i dati sono per anno, e l'anno vecchio resta com'era.",
            agenda=["Il selettore dell'esercizio", "Copiare la struttura dell'anno prima", "Il confronto non è facoltativo",
                    "Le due colonne insieme", "Il primo anno"])),
        (1, "evidenza", dict(
            eyebrow="Da ricordare",
            titolo="Senza l'anno prima, il documento dice quanto consumi, non se migliori.",
            testo="Esce lo stesso, con le colonne delle variazioni vuote. E chi lo legge cerca proprio quella colonna.")),
        (2, "split", dict(
            titolo="Le due colonne, insieme",
            lead="Compilarle nello stesso momento costa molto meno che tornarci fra un mese.",
            punti=[P("Le fatture", "sono già aperte"), P("Il referente", "è già al telefono"), P("La visura", "è già sul tavolo")])),
        (3, "definizione", dict(
            eyebrow="Il primo anno", titolo="Il confronto che non c'è, dichiarato",
            definizione="Se è la prima volta che segui l'azienda, il documento dichiara che manca l'anno di confronto invece di lasciare un buco.",
            punti=[P("Dall'anno dopo", "il confronto c'è per costruzione")])),
    ],
    "revisione": [
        (0, "apertura", dict(
            titolo="Una fotografia, non un esercizio", sottotitolo="Si aggiorna, e si consegna per revisioni",
            testo="Niente selettore dell'anno: c'è lo stato corrente, e il lavoro prosegue invece di ricominciare a gennaio.",
            agenda=["Lo stato corrente", "Quando pubblicare", "Aggiornare non è consegnare"])),
        (1, "cards", dict(
            titolo="Si pubblica quando qualcuno deve riceverlo",
            cards=[P("Un committente", "che lo ha chiesto"), P("Un ente di certificazione", "o una banca"),
                   P("Un cliente a monte", "della filiera")])),
        (2, "confronto", dict(
            titolo="Aggiornare non è consegnare",
            a={"h": "Aggiornare", "sub": "Continuo", "punti": ["Costa poco per volta", "Si lavora sullo stato corrente"]},
            b={"h": "Consegnare", "sub": "Un momento scelto",
               "punti": ["Produce una revisione numerata", "Le precedenti restano consultabili"]})),
    ],
    "la-verifica": [
        (0, "apertura", dict(
            titolo="La verifica prima di consegnare", sottotitolo="L'elenco di ciò che manca",
            testo="Non è un riassunto e non è un voto: ogni voce mancante è un collegamento al punto da sistemare.",
            agenda=["Che cosa elenca", "Completezza, non correttezza", "Che cosa resta a te", "L'ordine giusto"])),
        (1, "definizione", dict(
            eyebrow="La cosa più importante", titolo="Completezza, non correttezza",
            definizione="La verifica guarda se un dato c'è, non se è giusto: un numero sbagliato ma presente risulta a posto, e la riga diventa verde.")),
        (2, "punti", dict(
            titolo="Resta lavoro tuo, anche quando è tutto verde",
            intro="Sbagli di dieci volte il consumo di gas: il documento esce senza nessun avviso.",
            punti=[P("La quadratura", "con le fatture"), P("La plausibilità", "dei fattori di carico"),
                   P("La coerenza", "dei salti da un anno all'altro")])),
        (3, "chiusura", dict(
            titolo="L'ultimo controllo, non il primo",
            punti=[P("Prima i numeri", "e ti chiedi se hanno senso"),
                   P("Poi la verifica", "per non dimenticare una casella"),
                   P("Al contrario", "ti dirà che va tutto bene, e non servirà a niente")])),
    ],
    "pubblicare": [
        (0, "apertura", dict(
            titolo="Che cosa succede quando pubblichi", sottotitolo="Il documento si congela",
            testo="Dati e calcoli in una versione numerata, che il database non lascia più modificare: è il motivo per cui il documento vale.",
            agenda=["Congelare, non stampare", "Quattro cose in quel momento", "Il PDF archiviato", "Non si pubblica per vedere"])),
        (1, "cards", dict(
            titolo="Quattro cose, in quel momento",
            cards=[P("Numero di versione", "Ripubblicando ottieni la seconda, e la prima resta consultabile."),
                   P("Marchio", "Si sceglie lì: i documenti consegnati non cambiano se lo studio cambia logo."),
                   P("Edizione dei contenuti", "Congelata, perché le norme si aggiornano."),
                   P("Codice di verifica", "Chi ha il documento ne controlla l'autenticità dal sito, senza account.")])),
        (2, "evidenza", dict(
            eyebrow="Il PDF",
            titolo="Riscaricarlo restituisce lo stesso identico file.",
            testo="Si genera una volta e resta archiviato: quello consegnato al cliente non cambia impaginazione, nemmeno fra due anni.")),
        (3, "confronto", dict(
            titolo="Anteprima o pubblicazione",
            a={"h": "Anteprima", "sub": "Dal percorso", "punti": ["Quante volte vuoi", "Mentre il lavoro è in corso"]},
            b={"h": "Pubblicazione", "sub": "Quando il lavoro è finito",
               "punti": ["Resta nell'archivio per sempre", "Il cliente vede anche le versioni di prova"]})),
    ],
    "errori-comuni": [
        (0, "apertura", dict(
            titolo="Gli errori più frequenti", sottotitolo="Distrazioni, non incomprensioni",
            testo="Il primo non produce nessun avviso: prima di cominciare, guarda i due selettori dell'azienda e dell'esercizio.",
            agenda=["Azienda o esercizio sbagliato", "Vuoto invece di zero", "L'anno di confronto", "Pubblicare per vedere"])),
        (1, "confronto", dict(
            titolo="Vuoto non è zero",
            a={"h": "Vuoto", "sub": "La voce non esiste", "punti": ["Esce dai conti", "Il documento la dichiara mancante"]},
            b={"h": "Zero", "sub": "Esiste e vale zero", "punti": ["Resta nei conti", "È un'informazione"]})),
        (2, "evidenza", dict(
            eyebrow="L'anno di confronto",
            titolo="Senza confronto è una fotografia, non una misura.",
            testo="Il documento esce con le variazioni vuote: se ne accorge chi lo legge, non chi lo compila.")),
        (3, "tabella", dict(
            titolo="I quattro errori, e come si evitano",
            cols=["Errore", "Conseguenza", "Come si evita"],
            righe=[["Azienda o esercizio sbagliato", "Dati validi nel posto sbagliato, senza avviso", "Guardare i due selettori"],
                   ["Vuoto invece di zero", "Il dato risulta mancante", "Zero quando vale zero"],
                   ["Anno di confronto vuoto", "Nessuna variazione nel documento", "Compilare le due colonne insieme"],
                   ["Pubblicare per vedere", "Una versione in più, per sempre", "Usare l'anteprima"]])),
    ],
}


def main():
    copione = json.loads((RADICE / "_comuni" / "script.json").read_text(encoding="utf-8"))
    paragrafi = {s["id"]: [p.strip() for p in s["script"].split("\n\n") if p.strip()] for s in copione["sezioni"]}
    voci = []
    for sez, elenco in SLIDE.items():
        if sez not in paragrafi:
            raise SystemExit(f"sezione sconosciuta _comuni/{sez}")
        for p, layout, campi in elenco:
            par = paragrafi[sez]
            if p >= len(par):
                raise SystemExit(f"_comuni/{sez}: p {p} oltre i {len(par)} paragrafi")
            inizia = " ".join(par[p].split()[:6])
            voci.append({"sezione": sez, "p": p, "inizia": inizia, "layout": layout, **campi})
    mancanti = set(paragrafi) - set(SLIDE)
    if mancanti:
        raise SystemExit(f"sezioni comuni senza slide: {sorted(mancanti)}")
    (RADICE / "_comuni" / "slide.json").write_text(json.dumps(voci, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    conta = {}
    for v in voci:
        conta[v["layout"]] = conta.get(v["layout"], 0) + 1
    print(f"_comuni: {len(voci)} slide · " + ", ".join(f"{k} {v}" for k, v in sorted(conta.items(), key=lambda x: -x[1])))


main()
