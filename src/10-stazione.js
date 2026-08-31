/* Il gioco: instrada i treni, libera i binari e dà il via alle partenze. */
(function () {
  'use strict';
  var C = G.C, W = G.W, H = G.H;
  var TRACK_Y = [312, 454, 596];
  var TRACK_COL = [C.sun, C.water, C.leafLight];
  var TRACK_NAME = ['Sole', 'Mare', 'Bosco'];
  /* Una regola nuova alla volta: binari, coda e direzione arrivano gradualmente. */
  var LEVELS = [
    { tracks: 1, total: 3 }, { tracks: 2, total: 3 },
    { tracks: 2, total: 4 }, { tracks: 3, total: 4 },
    { tracks: 3, total: 5, queue: true }, { tracks: 3, total: 5, queue: true, both: true },
    { tracks: 3, total: 6, queue: true, both: true }, { tracks: 3, total: 6, queue: true, both: true },
    { tracks: 3, total: 7, queue: true, both: true }, { tracks: 3, total: 7, queue: true, both: true },
    { tracks: 3, total: 8, queue: true, both: true }, { tracks: 3, total: 8, queue: true, both: true }
  ];
  var MAX_LEVEL = LEVELS.length;
  var S = {};

  function setup(level) {
    level = G.clamp(level || 1, 1, MAX_LEVEL);
    var plan = LEVELS[level - 1];
    var n = plan.tracks, total = plan.total;
    S = {
      level: level, tracks: n, total: total, schedule: [], next: 0,
      active: null, occupied: [null, null, null], departing: [],
      arrived: 0, departed: 0, mistakes: 0, hint: -1, idle: 0,
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
    if (S.active || S.next >= S.schedule.length || S.fine) return;
    if (!S.plan.queue && S.occupied.some(function (v) { return !!v; })) return;
    var q = S.schedule[S.next++];
    S.active = {
      target: q.target, dir: q.dir, id: q.id, phase: 'choose', p: 0,
      x: q.dir === 1 ? 118 : W - 118, y: 206,
      color: TRACK_COL[q.target]
    };
    S.message = S.occupied[q.target] ? 'Quel binario è occupato: fallo ripartire!' : 'Dove deve arrivare?';
    S.message = 'Tocca il trenino per guardare dove va';
    S.idle = 0; S.hint = -1;
    if (S.level === 1) setTimeout(function () { if (G.current === 'stazione' && S.active) G.say('Tocca il trenino!'); }, 300);
  }

  function choose(track) {
    if (!S.active || S.active.phase !== 'choose-route' || S.fine) return false;
    S.idle = 0;
    if (track !== S.active.target) {
      S.mistakes++; S.hint = S.active.target; S.message = 'Quasi! Cerca il simbolo ' + TRACK_NAME[S.active.target];
      G.sfx('pop'); G.fx.text(205, TRACK_Y[track] || 330, '↩', C.tangerine, 54);
      G.say('Quasi! Cerca ' + TRACK_NAME[S.active.target] + '.');
      return false;
    }
    if (S.occupied[track]) {
      S.hint = track; S.message = 'Prima dai il via al treno sul binario!'; G.sfx('chime');
      G.say('Prima fai partire il treno che è già lì.');
      return false;
    }
    S.active.phase = 'moving'; S.active.p = 0; S.hint = -1;
    S.message = 'Scambio giusto! Il treno sta arrivando'; G.sfx('good');
    return true;
  }

  /* Il treno e' sempre il primo bersaglio: da lui si apre la scelta del
     binario e da lui riparte quando i passeggeri sono pronti. */
  function tapTrain(t, track) {
    if (S.fine || !t) return false;
    S.idle = 0;
    if (t === S.active) {
      if (t.phase === 'choose') {
        t.phase = 'choose-route'; S.hint = t.target;
        S.message = 'Guarda il simbolo e scegli il binario'; G.sfx('tap');
        if (S.level === 1) G.say(TRACK_NAME[t.target] + '. Tocca quel simbolo.');
        return true;
      }
      if (t.phase === 'choose-route') {
        S.message = 'Ora tocca il simbolo uguale'; S.hint = t.target;
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
    if (!S.plan.queue) spawn();
    if (S.active && S.active.target === track) S.hint = track;
    checkDone();
    return true;
  }

  function checkDone() {
    if (S.departed < S.total || S.active || S.occupied.some(function (v) { return !!v; })) return;
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
    if (S.active && S.active.phase === 'choose' && S.idle > (S.level === 1 ? 2.6 : 4.5)) S.hint = -2;
    if (S.active && S.active.phase === 'choose-route' && S.idle > 2.2) S.hint = S.active.target;
    if (S.active && S.active.phase === 'moving') {
      var a = S.active; a.p += dt / 1.15;
      var e = G.easeInOut(a.p), sx = a.dir === 1 ? 118 : W - 118;
      a.x = G.lerp(sx, 660, e); a.y = G.lerp(206, TRACK_Y[a.target], e);
      if (a.p >= 1) {
        a.x = 660; a.y = TRACK_Y[a.target]; a.phase = 'parked'; a.dwell = S.level === 1 ? .45 : .8; a.ready = false;
        S.occupied[a.target] = a; S.active = null; S.arrived++;
        S.message = 'Aspettiamo i passeggeri…';
        if (S.plan.queue) spawn();
      }
    }
    S.occupied.forEach(function (t, i) {
      if (!t || t.ready) return;
      t.dwell -= dt;
      if (t.dwell <= 0) { t.ready = true; S.message = 'Passeggeri pronti! Tocca il trenino per farlo partire'; G.sfx('chime'); if (S.level === 1) G.say('Passeggeri pronti! Tocca il trenino.'); }
    });
    for (var i = S.departing.length - 1; i >= 0; i--) {
      var d = S.departing[i]; d.p += dt / 1.05;
      d.x = G.lerp(660, d.dir === 1 ? W + 180 : -180, G.easeIn(d.p));
      if (d.p >= 1) S.departing.splice(i, 1);
    }
    if (!S.active) spawn();
    checkDone();
  }

  function rails(c) {
    c.fillStyle = '#d4bf95'; c.fillRect(0, 202, W, H - 202);
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

    var routing = S.active && S.active.phase === 'choose-route';
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
    if (S.active) {
      A.train(c, S.active.x, S.active.y, 125, { color: S.active.color, kind: S.active.target, dir: S.active.dir });
      G.ui.button({ id: 'active-train', x: S.active.x - 92, y: S.active.y - 86, w: 184, h: 148, r: 54, ghost: true,
        onTap: function () { tapTrain(S.active); } });
      if (S.active.phase === 'choose') {
        c.save(); c.globalAlpha = .55 + .35 * Math.sin(G.t * 6); c.strokeStyle = C.sun; c.lineWidth = 7;
        c.beginPath(); c.arc(S.active.x, S.active.y - 10, 94, 0, 7); c.stroke(); c.restore();
      }
    }

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
    return {
      level: S.level, tracks: S.tracks, total: S.total, next: S.next,
      active: S.active && { target: S.active.target, phase: S.active.phase },
      occupied: S.occupied.map(function (t) { return t && { ready: t.ready, target: t.target }; }),
      arrived: S.arrived, departed: S.departed, mistakes: S.mistakes, fine: S.fine
    };
  };
  G.stationChoose = choose;
  G.stationDepart = depart;
  G.stationTapTrain = function () {
    if (S.active) return tapTrain(S.active);
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
