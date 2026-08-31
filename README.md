# Dino Stazione

Un gioco da tablet, offline e senza dipendenze, in cui i bambini organizzano una stazione ferroviaria giocattolo.

## Come si gioca

Ogni locomotiva porta un simbolo: **Sole**, **Mare** o **Bosco**. Il bambino tocca il binario con lo stesso simbolo, aspetta che salgano i passeggeri e infine dà il via dal segnale verde.

I cinque turni introducono una regola alla volta:

1. un solo binario e aiuto vocale rapido;
2. due binari da distinguere;
3. tre destinazioni;
4. più treni contemporaneamente e binari da liberare;
5. treni da entrambe le direzioni e anteprima del prossimo arrivo.

Non ci sono game over o attese che fanno perdere. Uno scambio sbagliato produce un suggerimento e si corregge subito.

## Sviluppo

```powershell
node build.js
node test/smoke.js
```

`src/` contiene moduli JavaScript ordinati e concatenati dal build in un unico `index.html`. La PWA include profili separati, salvataggio locale e service worker offline.
