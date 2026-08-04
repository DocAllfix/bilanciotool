# Infrastruttura del CMS del blog

Copia versionata di ciò che gira su `203.0.113.10` in `/opt/blog-cms`: il WordPress
headless che alimenta `evalisdeck.it/blog`.

## ⚠️ Questa cartella non è in esecuzione

**Il server è la verità, questa è una fotografia.** Modificare un file qui non cambia niente
in produzione: bisogna copiarlo sulla macchina e ricaricare il servizio. Esiste per tre
ragioni pratiche:

1. **Sapere cosa c'è su quella macchina** senza doverci entrare.
2. **Vedere cosa è cambiato** nel tempo, con le ragioni scritte nei messaggi di commit.
3. **Rimontare tutto** se il server sparisse.

Quando si tocca il server, si aggiorna anche qui, nello stesso commit. Altrimenti in sei mesi
questa cartella dirà una cosa e la macchina ne farà un'altra, e ci si fiderà di quella
sbagliata.

## Cosa c'è, e cosa NON c'è

| File | A cosa serve |
|---|---|
| `docker-compose.yml` | I quattro servizi: Caddy, un MariaDB, e **un WordPress per sito** |
| `Caddyfile` | I due domini, i certificati, il `noindex` di testata, `/wp-admin` chiuso |
| `mu-plugins/evalis-headless.php` | Il webhook, lo slug precedente, l'anteprima, il ruolo dell'autore. **Lo stesso file per i due blog**: le costanti arrivano dall'ambiente |
| `db-init/01-schemi.sql` | Gli schemi e gli utenti di database, uno per sito |
| `backup.sh` · `restore-test.sh` | Salvataggio cifrato sullo Storage Box, e la prova settimanale che si ripristina davvero |
| `.env.example` | I nomi delle variabili, **senza valori** |

**Non c'è, e non ci deve finire mai:** il `.env` vero (password del database, token del
webhook e dell'anteprima, chiave di cifratura dei backup, credenziali dello Storage Box).
Vive solo su quella macchina, in un file a permessi `600`, e nel gestore di password.

## Due cose che questo impianto difende

**I due blog sono isolati sul serio.** Reti Docker separate, utenti di database separati,
volumi separati. Provato: nessuno dei due contenitori WordPress raggiunge l'altro, in
nessuna direzione, e ciascuno vede solo il proprio schema. Serve perché sulla stessa
macchina c'è il blog di **Evalis Academy**, che è in produzione: un errore nostro non deve
poterlo toccare.

**Il Caddyfile si valida prima di ricaricarlo** (`caddy validate`). Un errore di sintassi non
spegne il nostro blog: li spegne **tutti e due**.

## Da sapere prima di provare qualcosa

Le trappole trovate montandolo stanno in
[`docs/riferimenti/blog-differenze-evalisdeck.md`](../../docs/riferimenti/blog-differenze-evalisdeck.md),
sezione 12. La più costosa in tempo perso: **il webhook non parte da `wp-cli`**, solo dalle
richieste web. Chi prova la catena da riga di comando conclude che è rotta, e non lo è.
