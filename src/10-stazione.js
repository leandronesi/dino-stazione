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
      level: level, tracks: n, total: total, schedule: [], next: 0,
      active: [], focus: null, occupied: [null, null, null], departing: [],
      arrived: 0, departed: 0, mistakes: 0, waits: 0, collisions: 0, hint: -1, idle: 0,
      message: 'Tocca il trenino', fine: false, reward: false, plan: plan
    };
    var last = -1;
    for (var i = 0; i < total; i++) {
      var target = G.rndi(0, n - 1);
      if (n > 1 && target === last && i % 2) target = (target + 1) % n;
      S.schedule.push({ target: target, dir: plan.both && i % 2 ? -1 : 1, id: i });
      last = target;
    }
    spawn();
  }

  function spawn() {
    if (S.next >= S.schedule.length || S.fine || S.active.length >= S.plan.maxIncoming) return;
    if (S.plan.maxIncoming === 1 && S.occupied.some(function (v) { return !!v; })) return;
    var q = S.schedule[S.next++], lane = S.active.length;
    S.active.push({
      target: q.target, dir: q.dir, id: q.id, phase: 'choose', p: 0,
      x: q.dir === 1 ? 118 : W - 118, y: 210 + lane * 48, sourceY: 210 + lane * 48, lane: lane,
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
    if (S.occupied[t.target]) return false;
    for (var i = 0; i < S.active.length; i++) {
      var other = S.active[i];
      /* L'incrocio e' una risorsa unica: un solo convoglio lo attraversa,
         gli altri restano visibili in attesa del loro verde. */
      if (S.plan.cross && other !== t && other.phase === 'moving') return false;
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
        t.phase = 'choose-route'; S.focus = t.id; S.hint = t.target;
        S.message = 'Guarda il simbolo e scegli il binario'; G.sfx('tap');
        if (S.level === 1) G.say(TRACK_NAME[t.target] + '. Tocca quel simbolo.');
        return true;
      }
      if (t.phase === 'choose-route') {
        S.focus = t.id; S.message = 'Ora tocca il simbolo uguale'; S.hint = t.target;
        return true;
      }
      if (t.phase === 'waiting') {
        S.message = 'Aspetta: passa prima chi ha il binario libero'; G.sfx('tap');
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
      if (S.active[i].phase === 'waiting' && trackFreeFor(S.active[i])) startMoving(S.active[i]);
    }
    fillIncoming();
    checkDone();
    return true;
  }

  function checkDone() {
    if (S.departed < S.total || S.active.length || S.occupied.some(function (v) { return !!v; })) return;
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
      if (a.phase === 'choose-route' && S.focus === a.id && S.idle > 2.2) S.hint = a.target;
      if (a.phase === 'waiting' && trackFreeFor(a)) startMoving(a);
    });
    for (var ai = S.active.length - 1; ai >= 0; ai--) {
      var a = S.active[ai];
      if (a.phase !== 'moving') continue;
      a.p += dt / 1.15;
      var e = G.easeInOut(a.p), sx = a.dir === 1 ? 118 : W - 118;
      a.x = G.lerp(sx, 660, e); a.y = G.lerp(a.sourceY, TRACK_Y[a.target], e);
      if (a.p >= 1) {
        a.x = 660; a.y = TRACK_Y[a.target]; a.phase = 'parked'; a.dwell = S.level === 1 ? .45 : .8; a.ready = false;
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
      d.x = G.lerp(660, d.dir === 1 ? W + 180 : -180, G.easeIn(d.p));
      if (d.p >= 1) S.departing.splice(i, 1);
    }
    fillIncoming();
    checkDone();
  }

  function rails(c) {
    c.fillStyle = '#d4bf95'; c.fillRect(0, 202, W, H - 202);
    if (S.plan.cross) {
      c.save();
      c.strokeStyle = '#62594e'; c.lineWidth = 8;
      c.beginPath(); c.moveTo(360, 255); c.lineTo(850, 545); c.stroke();
      c.beginPath(); c.moveTo(360, 545); c.lineTo(850, 255); c.stroke();
      c.strokeStyle = '#8b765b'; c.lineWidth = 5;
      for (var crossX = 430; crossX < 825; crossX += 58) {
        var crossY = 255 + (crossX - 360) * 290 / 490;
        c.beginPath(); c.moveTo(crossX - 12, crossY + 12); c.lineTo(crossX + 12, crossY - 12); c.stroke();
      }
      c.fillStyle = 'rgba(255,246,224,.94)'; G.roundRect(c, 830, 650, 390, 44, 18); c.fill();
      G.text('INCROCIO: passa chi ha il verde', 1025, 672, { ctx: c, size: 18, color: C.ink });
      c.restore();
    }
    for (var i = 0; i < S.tracks; i++) {
      var y = TRACK_Y[i];
      c.fillStyle = 'rgba(255,255,255,.44)'; G.roundRect(c, 172, y - 53, 835, 106, 20); c.fill();
      c.strokeStyle = '#62594e'; c.lineWidth = 8;
      c.beginPath(); c.moveTo(0, 220); c.bezierCurveTo(210, 220, 220, y, 405, y); c.lineTo(W, y); c.stroke();
      c.beginPath(); c.moveTo(0, 238); c.bezierCurveTo(210, 238, 220, y + 18, 405, y + 18); c.lineTo(W, y + 18); c.stroke();
      c.strokeStyle = '#8b765b'; c.lineWidth = 5;
      for (var x = 220; x < W; x += 52) { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x, y + 27); c.stroke(); }
      c.fillStyle = TRACK_COL[i]; G.roundRect(c, 246, y - 45, 150, 54, 17); c.fill();
      A.destination(c, 275, y - 18, 21, i);
      G.text('Binario ' + (i + 1), 300, y - 18, { ctx: c, size: 20, align: 'left', color: C.ink });
    }
  }

  function draw(c) {
    A.stationSky(c); rails(c);
    G.text('Turno ' + S.level, 34, 114, { ctx: c, size: 28, align: 'left', color: C.ink });
    G.text((S.departed) + ' / ' + S.total + ' partiti', 34, 151, { ctx: c, size: 21, align: 'left', color: C.ink });
    c.fillStyle = 'rgba(255,246,224,.94)'; G.roundRect(c, 310, 154, 660, 62, 24); c.fill();
    G.text(S.message, 640, 185, { ctx: c, size: 25, color: C.ink, maxWidth: 620 });

    var routing = !!focusedTrain();
    for (var i = 0; i < S.tracks; i++) (function (idx) {
      var pulse = routing && S.hint === idx ? 1 + Math.sin(G.t * 7) * .08 : 1;
      G.ui.round({
        id: 'route-' + idx, x: 105, y: TRACK_Y[idx], r: 46 * pulse, color: TRACK_COL[idx], disabled: !routing,
        icon: function (cc, x, y) { A.destination(cc, x, y, 25, idx); },
        onTap: function () { choose(idx); }
      });
      var occ = S.occupied[idx];
      A.signal(c, 1085, TRACK_Y[idx] - 18, 34, !!(occ && occ.ready));
    })(i);

    S.occupied.forEach(function (t, idx) {
      if (!t) return;
      A.train(c, t.x, t.y, 125, { color: t.color, kind: t.target, dir: t.dir });
      G.ui.button({ id: 'parked-' + idx, x: t.x - 92, y: t.y - 86, w: 184, h: 148, r: 54, ghost: true,
        onTap: function () { tapTrain(t, idx); } });
      if (t.ready) {
        c.save(); c.globalAlpha = .55 + .35 * Math.sin(G.t * 6); c.strokeStyle = C.mint; c.lineWidth = 6;
        c.beginPath(); c.arc(t.x, t.y - 12, 92, 0, 7); c.stroke(); c.restore();
      }
    });
    S.departing.forEach(function (t) { A.train(c, t.x, t.y, 125, { color: t.color, kind: t.target, dir: t.dir }); });
    S.active.forEach(function (t) {
      A.train(c, t.x, t.y, 125, { color: t.color, kind: t.target, dir: t.dir });
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

    if (S.plan.both && S.next < S.schedule.length) {
      c.fillStyle = 'rgba(255,246,224,.92)'; G.roundRect(c, W - 205, 112, 165, 92, 22); c.fill();
      G.text('Prossimo', W - 122, 136, { ctx: c, size: 18, color: C.ink });
      A.destination(c, W - 122, 173, 26, S.schedule[S.next].target);
    }
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
      level: S.level, tracks: S.tracks, total: S.total, next: S.next,
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
