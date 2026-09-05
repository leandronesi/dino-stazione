/* Il gioco: instrada i treni, libera i binari e dà il via alle partenze. */
(function () {
  'use strict';
  var C = G.C, W = G.W, H = G.H;
  var TRACK_Y = [312, 454, 596];
  var TRACK_COL = [C.sun, C.water, C.leafLight];
  var TRACK_NAME = ['Sole', 'Mare', 'Bosco'];
  /* Una regola nuova alla volta: binari, coda e direzione arrivano gradualmente. */
  var LEVELS = [
    { tracks: 1, total: 3, maxIncoming: 1 }, { tracks: 2, total: 3, maxIncoming: 1 },
    { tracks: 2, total: 4, maxIncoming: 1 }, { tracks: 3, total: 4, maxIncoming: 1 },
    { tracks: 3, total: 5, cross: true, maxIncoming: 1 }, { tracks: 3, total: 5, cross: true, both: true, maxIncoming: 1 },
    { tracks: 3, total: 6, cross: true, both: true, maxIncoming: 2 }, { tracks: 3, total: 6, cross: true, both: true, maxIncoming: 2 },
    { tracks: 3, total: 7, cross: true, both: true, maxIncoming: 2 }, { tracks: 3, total: 7, cross: true, both: true, maxIncoming: 3 },
    { tracks: 3, total: 8, cross: true, both: true, maxIncoming: 3 }, { tracks: 3, total: 8, cross: true, both: true, maxIncoming: 3 }
  ];
  var MAX_LEVEL = LEVELS.length;
  var S = {};

  function setup(level) {
    level = G.clamp(level || 1, 1, MAX_LEVEL);
    var plan = LEVELS[level - 1];
    var n = plan.tracks, total = plan.total;
    S = {
      level: level, tracks: n, total: total, schedule: [], next: 0, switchA: 0, switchB: 0,
      active: [], focus: null, occupied: [null, null, null], departing: [],
      arrived: 0, departed: 0, mistakes: 0, waits: 0, collisions: 0, hint: -1, idle: 0,
      message: 'Tocca il trenino', fine: false, reward: false, plan: plan
    };
    var last = -1;
    for (var i = 0; i < total; i++) {
      var target = G.rndi(0, n - 1);
      if (n > 1 && target === last && i % 2) target = (target + 1) % n;
      S.schedule.push({ target: target, dir: 1, id: i });
      last = target;
    }
    spawn();
  }

  function spawn() {
    if (S.next >= S.schedule.length || S.fine || S.active.length >= S.plan.maxIncoming) return;
    if (S.plan.maxIncoming === 1 && S.occupied.some(function (v) { return !!v; })) return;
    var q = S.schedule[S.next++], lane = 0;
    while(S.active.some(function(t){return t.lane===lane;})) lane++;
    S.active.push({
      target: q.target, dir: q.dir, id: q.id, phase: 'choose', p: 0,
      x: q.dir === 1 ? 118 : W - 118, y: 238 + lane * 148, sourceY: 238 + lane * 148, lane: lane,
      color: TRACK_COL[q.target]
    });
    S.message = S.active.length > 1 ? 'Scegli un trenino da preparare' : 'Tocca il trenino per guardare dove va';
    S.idle = 0; S.hint = -1;
    if (S.level === 1) setTimeout(function () { if (G.current === 'stazione' && S.active.length) G.say('Tocca il trenino!'); }, 300);
  }

  function fillIncoming() {
    while (!S.fine && S.next < S.schedule.length && S.active.length < S.plan.maxIncoming) {
      var before = S.active.length; spawn();
      if (S.active.length === before) break;
    }
  }

  function focusedTrain() {
    for (var i = 0; i < S.active.length; i++) if (S.active[i].id === S.focus) return S.active[i];
    for (var j = 0; j < S.active.length; j++) if (S.active[j].phase === 'choose-route') return S.active[j];
    return null;
  }

  function trackFreeFor(t) {
    if (S.occupied[t.target] || S.departing.some(function(d){return d.target===t.target;})) return false;
    for (var i = 0; i < S.active.length; i++) {
      var other = S.active[i];
      /* L'incrocio e' una risorsa unica: un solo convoglio lo attraversa,
         gli altri restano visibili in attesa del loro verde. */
      if (other !== t && other.phase === 'moving') return false;
      if (other !== t && other.target === t.target &&
          (other.phase === 'moving' || (other.phase === 'waiting' && other.id < t.id))) return false;
    }
    return true;
  }

  function startMoving(t) {
    t.phase = 'moving'; t.p = 0; S.hint = -1;
    S.message = 'Via libera: ' + TRACK_NAME[t.target] + ' passa per primo'; G.sfx('good');
  }

  function choose(track) {
    var t = focusedTrain();
    if (!t || t.phase !== 'choose-route' || S.fine) return false;
    S.idle = 0;
    if (track !== t.target) {
      S.mistakes++; S.hint = t.target; S.message = 'Quasi! Cerca il simbolo ' + TRACK_NAME[t.target];
      G.sfx('pop'); G.fx.text(205, TRACK_Y[track] || 330, '↩', C.tangerine, 54);
      G.say('Quasi! Cerca ' + TRACK_NAME[t.target] + '.');
      return false;
    }
    S.focus = null;
    if (trackFreeFor(t)) {
      startMoving(t);
      return true;
    }
    if (!t.wasWaiting) { t.wasWaiting = true; S.waits++; }
    t.phase = 'waiting'; S.hint = track;
    S.message = 'Binario occupato: questo trenino aspetta il suo turno'; G.sfx('chime');
    return true;
  }

  /* Il treno e' sempre il primo bersaglio: da lui si apre la scelta del
     binario e da lui riparte quando i passeggeri sono pronti. */
  function tapTrain(t, track) {
    if (S.fine || !t) return false;
    S.idle = 0;
    if (S.active.indexOf(t) >= 0) {
      if (t.phase === 'choose') {
        t.phase = 'choose-route'; S.focus = t.id; S.hint = -1;
        S.message = 'Prepara gli scambi, poi dai il via'; G.sfx('tap');
        G.say('Destinazione ' + TRACK_NAME[t.target] + '. Prepara gli scambi e tocca via.');
        return true;
      }
      if (t.phase === 'choose-route') {
        S.focus = t.id; S.message = 'Segui il binario illuminato. Dove arriverà?'; S.hint = -1;
        return true;
      }
      if (t.phase === 'waiting') {
        if(trackFreeFor(t)){startMoving(t);return true;}
        S.message = 'Libera prima il binario: fai partire il treno fermo'; G.say(S.message);
        return true;
      }
      return false;
    }
    if (track !== undefined && S.occupied[track] === t) {
      if (!t.ready) { S.message = 'Aspettiamo un attimo i passeggeri'; G.sfx('tap'); return true; }
      return depart(track);
    }
    return false;
  }

  function depart(track) {
    var t = S.occupied[track];
    if (!t || !t.ready || S.fine) {
      if (t) { S.message = 'Aspettiamo che salgano tutti'; G.sfx('tap'); }
      return false;
    }
    S.occupied[track] = null; t.phase = 'departing'; t.p = 0;
    S.departing.push(t); S.departed++; S.message = 'Via libera! Buon viaggio!';
    G.sfx('win'); G.fx.confetti(1080, TRACK_Y[track], TRACK_COL[track], 12);
    for (var i = 0; i < S.active.length; i++) {
      if (S.active[i].phase === 'waiting') S.message = 'Ora guarda il segnale e dai il via al treno in attesa';
    }
    fillIncoming();
    checkDone();
    return true;
  }

  function checkDone() {
    if (S.departed < S.total || S.departing.length || S.active.length || S.occupied.some(function (v) { return !!v; })) return;
    S.fine = true; S.message = 'Turno completato! Tutti i treni sono partiti';
    if (!S.reward) {
      S.reward = true;
      var save = G.stationSave(); save.served += S.total;
      save.maxLevel = Math.max(save.maxLevel, Math.min(MAX_LEVEL, S.level + 1));
      save.best[S.level] = Math.min(save.best[S.level] === undefined ? 999 : save.best[S.level], S.mistakes);
      G.saveNow(); G.addStars(1, W / 2, 250); G.addFruits(4 + S.level, W / 2, 300);
      G.fx.confetti(W / 2, 330, C.sun, 48); G.sfx('win'); G.say('Bravissimo! Tutti i treni sono partiti.');
    }
  }

  function update(dt) {
    if (S.fine) return;
    S.idle += dt;
    updateTrains(dt);
  }

  function updateTrains(dt) {
    S.active.forEach(function (a) {
      if (a.phase === 'choose' && S.idle > (S.level === 1 ? 2.6 : 4.5)) S.hint = -2;
      if (a.phase === 'choose-route' && S.focus === a.id && S.idle > (G.level===1?7:12)) S.hint = a.target;
      if (a.phase === 'waiting' && trackFreeFor(a)) S.message = 'Via libera! Tocca il treno in attesa';
    });
    for (var ai = S.active.length - 1; ai >= 0; ai--) {
      var a = S.active[ai];
      if (a.phase !== 'moving') continue;
      a.p += dt / 1.15;
      var point = routePoint(a.target, G.clamp(a.p,0,1), a.sourceY);
      a.x = point.x; a.y = point.y;
      if (a.p >= 1) {
        a.x = 820; a.y = TRACK_Y[a.target]; a.phase = 'parked'; a.dwell = S.level === 1 ? .45 : .8; a.ready = false;
        S.occupied[a.target] = a; S.active.splice(ai, 1); S.arrived++;
        if (S.focus === a.id) S.focus = null;
        S.message = 'Aspettiamo i passeggeri...';
      }
    }
    S.occupied.forEach(function (t, i) {
      if (!t || t.ready) return;
      t.dwell -= dt;
      if (t.dwell <= 0) {
        t.ready = true; S.message = 'Passeggeri pronti! Tocca il trenino per farlo partire'; G.sfx('chime');
        if (S.level === 1) G.say('Passeggeri pronti! Tocca il trenino.');
      }
    });
    for (var i = S.departing.length - 1; i >= 0; i--) {
      var d = S.departing[i]; d.p += dt / 1.05;
      d.x = G.lerp(820, d.dir === 1 ? W + 180 : -180, G.easeIn(d.p));
      if (d.p >= 1) S.departing.splice(i, 1);
    }
    fillIncoming();
    checkDone();
  }

  function selectedRoute(){return S.tracks===1?0:(S.switchA===0?0:(S.tracks===2?1:1+S.switchB));}
  function launch(){return choose(selectedRoute());}
  function toggleSwitch(which){
    if(S.fine || S.active.some(function(t){return t.phase==='moving';}))return;
    if(which===0)S.switchA=1-S.switchA;else S.switchB=1-S.switchB;
    S.idle=0;S.hint=-1;G.sfx('tap');
  }
  // Every moving train follows the very same geometry as the visible rails.
  function routePoint(target,p,sourceY){
    var x,y,t;
    if(p<.32){t=p/.32;x=G.lerp(118,330,t);y=G.lerp(sourceY,312,G.easeInOut(t));}
    else if(p<.65){t=(p-.32)/.33;x=G.lerp(330,530,t);y=G.lerp(312,target===0?312:454,G.easeInOut(t));}
    else{t=(p-.65)/.35;x=G.lerp(530,820,t);y=G.lerp(target===0?312:454,TRACK_Y[target],G.easeInOut(t));}
    return{x:x,y:y};
  }
  function railPath(c,target,sourceY){
    c.beginPath();for(var j=0;j<=40;j++){var q=routePoint(target,j/40,sourceY);if(j)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);}c.lineTo(1280,TRACK_Y[target]);
  }
  function rails(c) {
    c.fillStyle='#aac690';c.fillRect(0,218,W,H-218);
    c.fillStyle='#7baf82';for(var bush=0;bush<9;bush++){c.beginPath();c.ellipse(245+bush*128,680,48,24,0,0,7);c.fill();}
    for(var i=0;i<S.tracks;i++){
      c.lineCap='round';railPath(c,i,238);c.strokeStyle='#b4a185';c.lineWidth=34;c.stroke();
      railPath(c,i,238);c.strokeStyle='#5a615d';c.lineWidth=20;c.stroke();
      railPath(c,i,238);c.strokeStyle='#e0d6bd';c.lineWidth=12;c.stroke();
      c.fillStyle='#f7ebd1';G.roundRect(c,738,TRACK_Y[i]-51,300,86,20);c.fill();
      c.fillStyle='#aa8663';c.fillRect(750,TRACK_Y[i]+33,275,8);
      A.destination(c,982,TRACK_Y[i]-16,27,i);
    }
    var selected=selectedRoute();
    c.save();railPath(c,selected,238);c.strokeStyle='#ffdc78';c.lineWidth=6;c.stroke();c.restore();
    // Waiting sidings reconnect to the first switch, never float over scenery.
    S.active.forEach(function(t){if(t.lane){railPath(c,selected,t.sourceY);c.strokeStyle='#687269';c.lineWidth=4;c.stroke();}});
    G.text('1',330,282,{size:22,color:C.ink});if(S.tracks>2)G.text('2',530,425,{size:22,color:C.ink});
  }

  function draw(c) {
    A.stationSky(c); rails(c);
    G.text('Turno ' + S.level, 34, 114, { ctx: c, size: 28, align: 'left', color: C.ink });
    G.text((S.departed) + ' / ' + S.total + ' partiti', 34, 151, { ctx: c, size: 21, align: 'left', color: C.ink });
    c.fillStyle = 'rgba(255,246,224,.94)'; G.roundRect(c, 310, 154, 660, 62, 24); c.fill();
    G.text(S.message, 640, 185, { ctx: c, size: 25, color: C.ink, maxWidth: 620 });

    var routing=!!focusedTrain(), locked=S.active.some(function(t){return t.phase==='moving';});
    function lever(which,x,y,value){c.strokeStyle='#647364';c.lineWidth=3;c.setLineDash([5,7]);c.beginPath();c.moveTo(x,y-48);c.lineTo(x,which===0?326:468);c.stroke();c.setLineDash([]);G.ui.button({id:'switch-'+which,x:x-52,y:y-48,w:104,h:96,r:26,color:locked?'#a4ada2':C.cream,disabled:locked,
      icon:function(cc,cx,cy){cc.strokeStyle=C.ink;cc.lineWidth=7;cc.lineCap='round';cc.beginPath();cc.moveTo(cx,cy+20);cc.lineTo(cx+(value?24:-24),cy-22);cc.stroke();cc.fillStyle=C.tangerine;cc.beginPath();cc.arc(cx+(value?24:-24),cy-22,14,0,7);cc.fill();},
      onTap:function(){toggleSwitch(which);}});}
    if(S.tracks>1)lever(0,330,410,S.switchA);
    if(S.tracks>2)lever(1,530,563,S.switchB);
    G.ui.button({id:'station-go',x:1060,y:112,w:180,h:104,r:28,color:C.leaf,label:'VIA',disabled:!routing,onTap:launch});
    for(var sig=0;sig<S.tracks;sig++)A.signal(c,1120,TRACK_Y[sig]-20,30,!!(S.occupied[sig]&&S.occupied[sig].ready));
    S.occupied.forEach(function (t, idx) {
      if (!t) return;
      A.train(c, t.x, t.y, 100, { color: t.color, kind: t.target, dir: t.dir });
      G.ui.button({ id: 'parked-' + idx, x: t.x - 92, y: t.y - 86, w: 184, h: 148, r: 54, ghost: true,
        onTap: function () { tapTrain(t, idx); } });
      if (t.ready) {
        c.save(); c.globalAlpha = .55 + .35 * Math.sin(G.t * 6); c.strokeStyle = C.mint; c.lineWidth = 6;
        c.beginPath(); c.arc(t.x, t.y - 12, 92, 0, 7); c.stroke(); c.restore();
      }
    });
    S.departing.forEach(function (t) { A.train(c, t.x, t.y, 100, { color: t.color, kind: t.target, dir: t.dir }); });
    S.active.forEach(function (t) {
      A.train(c, t.x, t.y, 100, { color: t.color, kind: t.target, dir: t.dir });
      G.ui.button({ id: 'active-train-' + t.id, x: t.x - 92, y: t.y - 86, w: 184, h: 148, r: 54, ghost: true,
        onTap: function () { tapTrain(t); } });
      if (t.phase === 'choose') {
        c.save(); c.globalAlpha = .55 + .35 * Math.sin(G.t * 6); c.strokeStyle = C.sun; c.lineWidth = 7;
        c.beginPath(); c.arc(t.x, t.y - 10, 94, 0, 7); c.stroke(); c.restore();
      }
      if (t.phase === 'waiting') {
        c.save(); c.globalAlpha = .8; c.strokeStyle = C.tangerine; c.lineWidth = 6;
        c.beginPath(); c.arc(t.x, t.y - 10, 88, 0, 7); c.stroke(); c.restore();
      }
    });

    if (S.fine) {
      c.fillStyle = 'rgba(31,55,42,.80)'; c.fillRect(0, 0, W, H);
      c.fillStyle = C.cream; G.roundRect(c, 280, 130, 720, 460, 42); c.fill();
      G.text('Stazione perfetta!', W / 2, 222, { ctx: c, size: 55, color: C.leafDark });
      A.train(c, W / 2, 350, 185, { color: G.account.color, kind: S.level % 3 });
      G.text(S.mistakes ? 'Abbiamo corretto insieme ' + S.mistakes + ' scambi' : 'Tutti gli scambi al primo colpo!', W / 2, 455, { ctx: c, size: 27, color: C.ink });
      G.ui.button({ id: 'again', x: 205, y: 500, w: 245, h: 76, r: 24, color: C.water, label: 'Riprova', onTap: function () { setup(S.level); } });
      if (S.level < MAX_LEVEL) {
        G.ui.button({ id: 'next', x: 518, y: 500, w: 245, h: 76, r: 24, color: C.leaf, label: 'Prossimo!',
          onTap: function () { var save = G.stationSave(); save.level = S.level + 1; G.saveNow(); setup(S.level + 1); } });
      }
      G.ui.button({ id: 'menu', x: S.level < MAX_LEVEL ? 830 : 518, y: 500, w: 245, h: 76, r: 24, color: C.tangerine, label: 'Deposito', onTap: function () { G.go('menu'); } });
    }
  }

  G.stationState = function () {
    var focused = focusedTrain() || S.active[0];
    return {
      level: S.level, tracks: S.tracks, total: S.total, next: S.next, route: selectedRoute(), switches:[S.switchA,S.switchB],
      cross: !!S.plan.cross, maxIncoming: S.plan.maxIncoming,
      active: focused && { id: focused.id, target: focused.target, phase: focused.phase },
      actives: S.active.map(function (t) { return { id: t.id, target: t.target, phase: t.phase }; }),
      activeCount: S.active.length,
      moving: S.active.filter(function (t) { return t.phase === 'moving'; }).length,
      waiting: S.active.filter(function (t) { return t.phase === 'waiting'; }).length,
      occupied: S.occupied.map(function (t) { return t && { ready: t.ready, target: t.target }; }),
      arrived: S.arrived, departed: S.departed, mistakes: S.mistakes, waits: S.waits,
      collisions: S.collisions, fine: S.fine
    };
  };
  G.stationChoose = choose;
  G.stationToggle = toggleSwitch;
  G.stationLaunch = launch;
  G.stationRoutePoint = routePoint;
  G.stationDepart = depart;
  G.stationTapTrain = function (id) {
    for (var a = 0; a < S.active.length; a++) {
      if (id === undefined || S.active[a].id === id) return tapTrain(S.active[a]);
    }
    for (var i = 0; i < S.occupied.length; i++) if (S.occupied[i]) return tapTrain(S.occupied[i], i);
    return false;
  };
  G.stationLevels = function () { return MAX_LEVEL; };

  G.scene('stazione', {
    hud: true,
    enter: function (p) { setup((p && p.level) || G.stationSave().level || 1); },
    update: update,
    draw: draw
  });
})();
