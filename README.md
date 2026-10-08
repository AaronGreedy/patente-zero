# Patente B — Zero Errori

App web per preparare il quiz della patente B puntando a **zero errori**, non alla sufficienza.

Dentro ci sono le **7.106 domande ufficiali** del listato ministeriale A/B, con le 409 figure.
Non è un'app per studiare tutte le domande: trova quelle in cui sbagli o **esiti** e te le fa
ripetere finché non diventano sicure.

**Live:** https://patente-zero.vercel.app · **Il disegno delle schermate:** `/design.html`

## Le tre modalità

| | |
|---|---|
| **Allenati** | solo le domande deboli e instabili, correzione immediata con spiegazione |
| **Simulazione 30** | come l'esame: 30 domande, 20 minuti, **nessuna correzione** fino alla fine |
| **Infinity** | senza timer, a scorrimento: rispondi e sai subito com'è andata |

La simulazione pesca a caso da tutto l'archivio (tolte solo quelle messe da parte con ⭐):
deve restare un esame onesto. L'allenamento invece insiste dove sbagli.

## Il meccanismo

| | |
|---|---|
| **Esce dal giro** | giusta in meno di **4 secondi** per **3 volte di fila**, oppure segnata con ⭐ |
| **Rientra nel giro** | sbagliata, **esitata oltre i 15 secondi**, oppure segnata con ↻ |

Le soglie stanno in cima a `app.js` (`FAST`, `FAST_STREAK`, `HESIT`): sono i parametri da tarare,
tutto il resto dipende da loro.

I due interruttori valgono su **un solo archivio**: quello che togli in simulazione non torna
in Infinity, e viceversa. Lo stato vive in `localStorage` (`patente-zero:v1`), sul dispositivo.

Nella correzione di fine simulazione ogni domanda mostra **se l'hai presa e in quanto tempo**,
con i due interruttori per riga: l'app dichiara quante ne ha tolte da sola e tu correggi.

## Le domande

`data/bank.json` — 7.106 domande, 25 capitoli, 409 figure. Deriva dal
[listato A/B del Portale dell'Automobilista del 23 aprile 2025](https://www.ilportaledellautomobilista.it/web/portale-automobilista/dettaglio-news/-/asset_publisher/V57QhEdoCmc7/document/id/121608540),
tramite [GoldenNocturne/patente-lab](https://github.com/GoldenNocturne/patente-lab) (MIT);
l'hash SHA-256 del PDF sorgente è nei metadati del file. Testi, risposte e figure sono ufficiali.

`data/explanations.json` — spiegazione, focus sul trabocchetto e regola breve per tutte e 7.106.
⚠️ **Non sono testo ministeriale**: vengono da
[Lamuo/quiz-patente](https://github.com/Lamuo/quiz-patente) e sono generate con AI. Servono a
capire, non fanno fede. Le domande e le risposte giuste invece sì.

Il campo `focus` è anche quello che fa **sottolineare la parola trabocchetto** dentro la frase.

## Sviluppo

Nessuna build e nessuna dipendenza. Serve un server locale (le domande si caricano con `fetch`):

```sh
python3 -m http.server 8777
# poi apri http://localhost:8777
```

- `index.html` · guscio · `app.css` · `app.js` — tutta la logica
- `design.html` — le otto schermate del progetto di interfaccia, da condividere
- `data/`, `images/` — archivio e figure

## Licenza

Codice MIT. I contenuti di terzi (quiz, figure, spiegazioni) restano soggetti alle condizioni
delle rispettive fonti, elencate sopra.
