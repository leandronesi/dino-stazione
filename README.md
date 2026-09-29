# Dino Stazione

Controllore del traffico ferroviario per bambini, nella famiglia di Train
Conductor. Canvas, offline, senza librerie né risorse esterne.

## Come si gioca

I treni entrano da sinistra senza fermarsi mai. Ognuno ha il colore e la
forma della sua stazione (stella gialla, cerchio blu, triangolo verde, cuore
rosa, fiore viola). Si toccano gli **scambi** per mandare ogni treno a casa. Nel
Grande si tocca anche un **treno** per fermarlo (compare lo stop) e lo si
ritocca per farlo ripartire: serve alle confluenze e agli incroci, dove due
treni che arrivano insieme si scontrano.

Sei mappe, ognuna si apre prendendo almeno una stella nella precedente:
Il primo scambio, Tre binari, Due binari diventano uno, L'incrocio, Tre
entrate, La grande stazione. Stelle: 3 se tutti i treni arrivano giusti, 2
dall'80%, 1 dal 60%. I colori di ogni turno sono bilanciati, quindi chi non
tocca niente ne indovina al massimo metà e non prende stelle.

- **Piccolo** (3 anni): treni lenti che frenano da soli e non si scontrano mai
  (il più giovane aspetta), e lo scambio giusto lampeggia quando un treno si
  avvicina. Sbagliare stazione non costa niente.
- **Grande** (6 anni): treni più veloci e ognuno col suo passo, a volte due
  insieme da entrate diverse, tre cuori; uno scontro o una stazione sbagliata
  costano un cuore.

L'accesso è quello di tutta la collezione. Progressi per profilo nel ramo
`traffico` del salvataggio (chiavi `ds.`).

## Sviluppo

```
node build.js
node test/smoke.js   # un bot controllore porta a casa ogni treno di ogni mappa, per entrambe le età
node test/look.js    # Chrome vero, muto: fotogrammi in test/frames e tocco reale sullo scambio
```

Le mappe stanno in `MAPS` dentro `src/10-stazione.js`: nodi (entrata,
scambio, confluenza, stazione) e binari con qualche punto di passaggio,
smussati in automatico. Il collaudo verifica che ogni mappa sia un grafo sano
(ogni entrata offre una scelta, ogni scambio porta da qualche parte).
