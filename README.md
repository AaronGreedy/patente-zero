# Patente B — Zero Errori

Progetto di interfaccia mobile (iPhone, verticale) per preparare il quiz della patente B
puntando a **zero errori**, non alla sufficienza.

Non è un'app per studiare tutte le domande: trova quelle in cui sbagli o **esiti**
e te le fa ripetere finché non diventano sicure.

👉 **Sito:** le otto schermate sono in `index.html`, una pagina statica senza dipendenze.

## Le otto schermate

**Simulazione** — come l'esame vero: 30 domande, 20 minuti, correzione solo alla fine.

1. **Home** — stato di preparazione in un colpo d'occhio: sicure / instabili / deboli
2. **Domanda** — vero/falso, segnale in evidenza, timer discreto
3. **Risultato** — errori, tempo, e quali domande entrano nel ripasso (con il perché)
4. **Correzione e scelte** — le risposte tutte insieme, con i due interruttori per riga

**Infinity** — senza timer, a scorrimento: rispondi e sai subito com'è andata.

5. **Progresso** — serie di simulazioni a zero errori (obiettivo: 3 di fila) e andamento
6. **Infinity · domanda** — stessa coppia di bottoni, nessun timer
7. **Infinity · sbagliata** — spiegazione sempre visibile, parola trabocchetto sottolineata
8. **Infinity · giusta** — bottone *Spiegazione* a richiesta, utile quando hai indovinato

## Il meccanismo

| | |
|---|---|
| **Esce dal giro** | giusta sotto i **4 secondi** per **3 volte di fila**, oppure segnata con ⭐ |
| **Rientra nel giro** | sbagliata, **esitata oltre i 15 secondi**, oppure segnata con ↻ |

Le due soglie (4s e 15s) sono i parametri da tarare: tutto il resto dipende da loro.

I due interruttori valgono su **un solo archivio**: quello che togli in simulazione
non torna in Infinity, e viceversa.

## Direzione visiva

- **Colore** — bianco `#FFFFFF`, carta `#F4F4F1`, inchiostro `#16171A`, grigio testo `#5E626B`,
  filetti `#E2E2DE`. Un solo accento, e **solo per l'esito**: `#16794F` giusto / `#A62A1B` sbagliato.
- Lo stato di preparazione usa **pieno → grigio → vuoto**, non colori: così il verde e il rosso
  restano inconfondibili.
- **Tipografia** — [Barlow](https://fonts.google.com/specimen/Barlow) e Barlow Condensed,
  disegnate sulla segnaletica stradale: parlano la lingua del soggetto.
- Niente gamification invadente: nessun cuore, coriandolo o mascotte.

## ⚠️ Le domande

Le domande nelle schermate sono **contenuto di progetto**: vere nella forma e fedeli allo stile
ministeriale, ma scelte per mostrare come funziona l'interfaccia.

Il repertorio vero è pubblicato dal **Ministero delle Infrastrutture e dei Trasporti** e conta
diverse migliaia di affermazioni: va **importato dalla fonte ufficiale**, non ricostruito a mano.
Allo stesso modo i cartelli disegnati qui vanno sostituiti con le **figure ufficiali**, perché
nei quiz la figura esatta fa parte della domanda.

## Sviluppo

Nessuna build, nessuna dipendenza: apri `index.html`.
