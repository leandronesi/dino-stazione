# Dino Stazione

Un gioco da tablet, offline e senza dipendenze, in cui i bambini organizzano una stazione ferroviaria giocattolo.

## Come si gioca

Ogni locomotiva porta un simbolo: **Sole**, **Mare** o **Bosco**. Il bambino tocca prima il trenino, poi il binario con lo stesso simbolo; quando i passeggeri sono pronti tocca di nuovo il trenino per farlo partire.

I primi turni introducono una regola alla volta; oggi la progressione continua fino al turno 12:

1. un solo binario e aiuto vocale rapido;
2. due binari da distinguere;
3. tre destinazioni;
4. più treni contemporaneamente e binari da liberare;
5. treni da entrambe le direzioni e anteprima del prossimo arrivo.

Non ci sono game over o attese che fanno perdere. Uno scambio sbagliato produce un suggerimento e si corregge subito.

## Flusso di gioco e progressione

Il trenino e' sempre il primo oggetto da toccare. Quando arriva, pulsa e dice
visivamente di essere il protagonista; toccandolo si aprono i grandi simboli dei
binari. Quando i passeggeri sono pronti, si tocca di nuovo il trenino per farlo
partire. Il semaforo conferma il verde, ma non e' un comando nascosto.

Ci sono 12 turni salvati per profilo. I primi quattro introducono uno, due e tre
binari; poi arrivano una piccola coda di treni e gli arrivi da entrambe le
direzioni. Alla fine di ogni turno compaiono sempre Riprova, Prossimo e Deposito.
Il menu mostra chiaramente i turni sbloccati.

## Sviluppo

```powershell
node build.js
node test/smoke.js
```

`src/` contiene moduli JavaScript ordinati e concatenati dal build in un unico `index.html`. La PWA include profili separati, salvataggio locale e service worker offline.

## Sito pubblico

Il workflow `.github/workflows/deploy.yml` pubblica automaticamente ogni push su `main` su `https://leandronesi.github.io/dino-stazione/`. La prima volta, in **Settings → Pages**, la sorgente deve essere impostata su **GitHub Actions**.
