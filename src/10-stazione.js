/* Dino Stazione — the traffic controller, in the family of Train Conductor.

   The first Dino Stazione was a quiz standing still: set two levers, press VIA,
   watch. Here the trains never stop coming. Each one carries the colour and
   shape of its station; the child flips the switches in time to send it home,
   and (Grande) taps a train to hold it back before a merge or a crossing.

   Piccolo (3 years): slow trains that brake by themselves — they never crash —
   and the right switch blinks when a train is getting close. A wrong station
   costs nothing but the fruit. Grande (6 years): faster, busier maps, three
   hearts; a crash or a wrong station costs one.

   Every round has a fixed number of trains with a balanced mix of colours, so
   a child who touches nothing gets at most half of them right and no star.

   The rules live in S (plain data, seeded random): test/smoke.js plays every
   map with a bot through the same step(). */
(function () {
  'use strict';
  var C = G.C, W = G.W, H = G.H, DT = 1 / 60, STEP = 3, CAR = 52, GAP = 6;
  var S = null, quiet = false, acc = 0, cache = {};

  var COL = [
    { c: '#f5b82e', dk: '#b9821a', shape: 'stella', name: 'gialla' },
    { c: '#4d80e4', dk: '#2f59a8', shape: 'cerchio', name: 'blu' },
    { c: '#2f9e57', dk: '#1f6b3a', shape: 'triangolo', name: 'verde' },
    { c: '#ff6fae', dk: '#c23f7c', shape: 'cuore', name: 'rosa' },
    { c: '#8f5bd6', dk: '#5f3a99', shape: 'fiore', name: 'viola' }
  ];

  /* ------------------------------------------------------------ maps
     nodes: id: [x, y, type, colour]  (entry | switch | merge | station)
     edges: [from, to, waypoints]. A switch's first edge is its starting side. */
  var MAPS = [
    { name: 'Il primo scambio',
      nodes: { E: [-60, 430, 'entry'], S1: [380, 430, 'switch'], A: [1190, 250, 'station', 0], B: [1190, 600, 'station', 1] },
      edges: [['E', 'S1', []], ['S1', 'A', [[440, 430], [640, 250]]], ['S1', 'B', [[440, 430], [640, 600]]]],
      p: { n: 6, v: 55, every: 7, max: 1 }, g: { n: 8, v: 80, every: 5.5, max: 2 } },
    { name: 'Tre binari',
      nodes: { E: [-60, 400, 'entry'], S1: [300, 400, 'switch'], A: [1190, 200, 'station', 0], S2: [640, 470, 'switch'], B: [1190, 420, 'station', 1], Cc: [1190, 630, 'station', 2] },
      edges: [['E', 'S1', []], ['S1', 'A', [[360, 400], [540, 200]]], ['S1', 'S2', [[360, 400], [480, 470]]], ['S2', 'B', [[700, 470], [840, 420]]], ['S2', 'Cc', [[700, 470], [880, 630]]]],
      p: { n: 7, v: 58, every: 6.5, max: 2 }, g: { n: 10, v: 88, every: 5, max: 3 } },
    { name: 'Due binari diventano uno',
      nodes: { E1: [-60, 230, 'entry'], E2: [-60, 620, 'entry'], S1: [330, 230, 'switch'], S2: [330, 620, 'switch'], M: [620, 430, 'merge'], S3: [860, 430, 'switch'],
        A: [1190, 170, 'station', 0], Cc: [1190, 660, 'station', 2], B: [1190, 340, 'station', 1], D: [1190, 520, 'station', 3] },
      edges: [['E1', 'S1', []], ['S1', 'A', [[390, 230], [580, 170]]], ['S1', 'M', [[390, 230], [520, 410]]], ['E2', 'S2', []], ['S2', 'Cc', [[390, 620], [580, 660]]], ['S2', 'M', [[390, 620], [520, 450]]],
        ['M', 'S3', []], ['S3', 'B', [[920, 430], [1040, 340]]], ['S3', 'D', [[920, 430], [1040, 520]]]],
      p: { n: 8, v: 60, every: 6, max: 2 }, g: { n: 12, v: 95, every: 4.2, max: 3 } },
    { name: "L'incrocio",
      nodes: { E1: [-60, 300, 'entry'], E2: [-60, 610, 'entry'], S1: [360, 300, 'switch'], S2: [360, 610, 'switch'],
        A: [1190, 150, 'station', 0], B: [1190, 470, 'station', 1], Cc: [1190, 660, 'station', 2], D: [1190, 310, 'station', 3] },
      edges: [['E1', 'S1', []], ['S1', 'A', [[420, 300], [620, 150]]], ['S1', 'B', [[420, 300], [680, 300], [920, 470]]], ['E2', 'S2', []], ['S2', 'Cc', [[420, 610], [640, 660]]], ['S2', 'D', [[420, 610], [680, 610], [920, 310]]]],
      p: { n: 8, v: 60, every: 6, max: 2 }, g: { n: 14, v: 100, every: 4, max: 4 } },
    { name: 'Tre entrate',
      nodes: { E1: [-60, 200, 'entry'], E2: [-60, 450, 'entry'], E3: [-60, 660, 'entry'], S1: [300, 200, 'switch'], M1: [580, 340, 'merge'], S2: [780, 340, 'switch'], S3: [300, 660, 'switch'],
        A: [1190, 160, 'station', 0], B: [1190, 285, 'station', 1], Cc: [1190, 420, 'station', 2], D: [1190, 555, 'station', 3], Ev: [1190, 675, 'station', 4] },
      edges: [['E1', 'S1', []], ['S1', 'A', [[360, 200], [560, 160]]], ['S1', 'M1', [[360, 200], [480, 310]]], ['E2', 'M1', [[380, 450], [490, 370]]], ['M1', 'S2', []],
        ['S2', 'B', [[840, 340], [960, 285]]], ['S2', 'Cc', [[840, 340], [960, 420]]], ['E3', 'S3', []], ['S3', 'D', [[360, 660], [620, 555]]], ['S3', 'Ev', [[360, 660], [620, 675]]]],
      p: { n: 9, v: 62, every: 5.5, max: 3 }, g: { n: 16, v: 105, every: 3.4, max: 5 } },
    { name: 'La grande stazione',
      nodes: { E1: [-60, 190, 'entry'], E2: [-60, 420, 'entry'], E3: [-60, 650, 'entry'], S1: [280, 190, 'switch'], M1: [540, 330, 'merge'], S2: [720, 330, 'switch'], S3: [280, 650, 'switch'],
        A: [1190, 150, 'station', 0], B: [1190, 260, 'station', 1], Cc: [1190, 420, 'station', 2], D: [1190, 560, 'station', 3], Ev: [1190, 675, 'station', 4] },
      edges: [['E1', 'S1', []], ['S1', 'A', [[340, 190], [520, 150]]], ['S1', 'M1', [[340, 190], [460, 300]]], ['E2', 'M1', [[380, 420], [460, 360]]], ['M1', 'S2', []],
        ['S2', 'B', [[780, 330], [900, 260]]], ['S2', 'D', [[780, 330], [900, 420], [1010, 560]]],
        ['E3', 'S3', []], ['S3', 'Ev', [[340, 650], [580, 675]]], ['S3', 'Cc', [[340, 650], [640, 650], [860, 480], [1010, 420]]]],
      p: { n: 10, v: 64, every: 5, max: 3 }, g: { n: 18, v: 112, every: 3, max: 6 } }
  ];

  /* ------------------------------------------------------------ geometry */
  function chaikin(pts) {
    for (var it = 0; it < 4; it++) {
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
      }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }
  function resample(pts) {
    var out = [pts[0]], left = STEP, i, a, b, seg, t;
    for (i = 0; i < pts.length - 1; i++) {
      a = pts[i]; b = pts[i + 1]; seg = Math.hypot(b[0] - a[0], b[1] - a[1]); t = 0;
      while (seg - t >= left) { t += left; out.push([a[0] + (b[0] - a[0]) * t / seg, a[1] + (b[1] - a[1]) * t / seg]); left = STEP; }
      left -= seg - t;
    }
    var last = pts[pts.length - 1], prev = out[out.length - 1], tail = Math.hypot(last[0] - prev[0], last[1] - prev[1]);
    if (tail > .01) out.push(last);
    return { pts: out, len: (out.length - 2) * STEP + (tail > .01 ? tail : STEP) };
  }
  function build(map) {
    if (map.g_) return map.g_;
    var nodes = {}, edges = [];
    Object.keys(map.nodes).forEach(function (id) { var n = map.nodes[id]; nodes[id] = { id: id, x: n[0], y: n[1], t: n[2], col: n[3], out: [], inn: [] }; });
    map.edges.forEach(function (e, i) {
      var a = nodes[e[0]], b = nodes[e[1]], raw = [[a.x, a.y]].concat(e[2]).concat([[b.x, b.y]]);
      var r = resample(chaikin(raw));
      edges.push({ i: i, from: a.id, to: b.id, pts: r.pts, len: r.len });
      a.out.push(i); b.inn.push(i);
    });
    // which station colours each edge can still reach
    function reach(ei, seen) {
      var e = edges[ei], n = nodes[e.to];
      if (n.t === 'station') return [n.col];
      var r = [];
      n.out.forEach(function (o) { reach(o).forEach(function (c) { if (r.indexOf(c) < 0) r.push(c); }); });
      return r;
    }
    edges.forEach(function (e) { e.reach = reach(e.i); });
    var entries = Object.keys(nodes).filter(function (k) { return nodes[k].t === 'entry'; });
    return (map.g_ = { nodes: nodes, edges: edges, entries: entries });
  }
  function at(e, d) {
    var i = Math.max(0, Math.min(e.pts.length - 2, Math.floor(d / STEP))), f = G.clamp(d / STEP - i, 0, 1), a = e.pts[i], b = e.pts[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  /* ------------------------------------------------------------ state */
  function rnd() {
    S.seed = (S.seed + 0x6D2B79F5) | 0;
    var t = S.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function sfx(n) { if (!quiet) G.sfx(n); }
  function say(s) { if (!quiet) G.say(s); }
  function map() { return MAPS[S.li]; }
  function graph() { return build(MAPS[S.li]); }
  function rules() { return G.level === 1 ? map().p : map().g; }

  function reset(li, seed) {
    var m = MAPS[li], g = build(m);
    S = { li: li, phase: 'ready', t: 0, seed: seed === undefined ? (Date.now() & 0xffff) : seed, trains: [], nextId: 1, sw: {}, spawnT: 2, warns: [], queued: 0,
      spawned: 0, done: 0, ok: 0, log: [], bad: 0, crashes: 0, hearts: 3, msg: '', msgT: 0, bags: {}, hint: {}, flash: [] };
    Object.keys(g.nodes).forEach(function (k) { if (g.nodes[k].t === 'switch') S.sw[k] = 0; });
    // a balanced bag of colours per entry: touching nothing gets at most half right
    g.entries.forEach(function (en) { S.bags[en] = []; });
    acc = 0;
  }
  function start() { if (S.phase !== 'ready') return; S.phase = 'play'; sfx('win'); say(G.level === 1 ? 'Tocca gli scambi: ogni treno va alla stazione del suo colore!' : 'Gira gli scambi, e tocca un treno per fermarlo!'); }

  function nextEdge(nodeId) {
    var n = graph().nodes[nodeId];
    if (n.t === 'station') return -1;
    if (n.t === 'switch') return n.out[S.sw[nodeId]];
    return n.out[0];
  }
  /* points ahead of a train, following the switches as they are now */
  function ahead(tr, dist) {
    var g = graph(), e = tr.e, d = tr.d, out = [], k;
    for (k = 12; k <= dist; k += 12) {
      var dd = d + k, ee = e;
      while (ee >= 0 && dd > g.edges[ee].len) { dd -= g.edges[ee].len; ee = nextEdge(g.edges[ee].to); }
      if (ee < 0) break;
      var p = at(g.edges[ee], dd); out.push({ x: p[0], y: p[1], e: ee });
    }
    return out;
  }
  function cars(tr) {
    // loco + two wagons, laid back along the trail the loco has left
    var res = [], h = tr.hist, need = 0, acc2 = 0, i = h.length - 1;
    for (var c = 0; c < 3; c++) {
      need = c * (CAR + GAP);
      while (i > 0 && acc2 + Math.hypot(h[i][0] - h[i - 1][0], h[i][1] - h[i - 1][1]) < need) { acc2 += Math.hypot(h[i][0] - h[i - 1][0], h[i][1] - h[i - 1][1]); i--; }
      var p = h[i], q = h[Math.max(0, i - 3)], r = h[Math.min(h.length - 1, i + 3)];
      res.push({ x: p[0], y: p[1], a: Math.atan2(r[1] - q[1], r[0] - q[0]) || 0 });
    }
    return res;
  }

  function spawn() {
    var g = graph(), R = rules(), en = g.entries[S.queued++ % g.entries.length], e0 = g.nodes[en].out[0];
    var bag = S.bags[en];
    if (!bag.length) { bag.push.apply(bag, g.edges[e0].reach.slice()); for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; } }
    return { en: en, col: bag.shift(), e: e0 };
  }
  function entryFree(e0) {
    var p = graph().edges[e0].pts[0];
    return !S.trains.some(function (t) { return t.cars.some(function (c) { return Math.hypot(c.x - p[0], c.y - p[1]) < 150; }); });
  }

  function deliver(tr, node) {
    S.done++; S.log.push(node.col === tr.col);
    if (node.col === tr.col) { S.ok++; sfx('good'); S.flash.push({ x: node.x, y: node.y, t: 1, ok: true }); if (!quiet) G.fx.burst(node.x - 60, node.y, { color: COL[tr.col].c, count: 16 }); }
    else {
      S.bad++; sfx('bad'); S.flash.push({ x: node.x, y: node.y, t: 1, ok: false });
      S.msg = 'Questo treno andava alla stazione ' + COL[tr.col].name; S.msgT = 2.5; say(S.msg);
      if (G.level === 2) { S.hearts--; if (!quiet) G.shake(4); }
    }
  }

  function step() {
    S.t += DT;
    S.msgT = Math.max(0, S.msgT - DT);
    S.flash = S.flash.filter(function (f) { return (f.t -= DT) > 0; });
    if (S.phase !== 'play') return;
    var g = graph(), R = rules(), i, j;
    var ramp = 1 + .15 * Math.min(1, S.spawned / R.n);

    // arrivals: warn first, then the train rolls in from the edge
    S.spawnT -= DT;
    if (S.spawnT <= 0 && S.queued < R.n && S.trains.length + S.warns.length < R.max) {
      var first = spawn(); first.k = G.level === 2 ? .8 + rnd() * .4 : 1; S.warns.push(first);
      // Grande: sometimes two trains at once, from different entries — they meet at the merges
      if (G.level === 2 && g.entries.length > 1 && S.queued < R.n && S.trains.length + S.warns.length < R.max && rnd() < .4) { var pair = spawn(); pair.k = first.k; S.warns.push(pair); }   // same pace: they reach the merge together
      S.warns.forEach(function (w) { if (w.t === undefined) w.t = 2; });
      S.spawnT = 2 + R.every * (G.level === 2 ? .35 + rnd() * 1.1 : .85 + rnd() * .3);
    }
    for (i = S.warns.length - 1; i >= 0; i--) {
      var w = S.warns[i];
      if ((w.t -= DT) > 0 || !entryFree(w.e)) continue;
      var p0 = g.edges[w.e].pts[0];
      var tr = { id: S.nextId++, col: w.col, e: w.e, d: 0, k: w.k, hold: false, ghost: 0, via: [w.e], hist: [[p0[0] - 200, p0[1]], [p0[0], p0[1]]], cars: [] };
      tr.cars = cars(tr);
      S.trains.push(tr); S.spawned++; S.warns.splice(i, 1); sfx('whoosh');
    }

    // moving
    S.hint = {};
    for (i = 0; i < S.trains.length; i++) {
      var t = S.trains[i];
      t.ghost = Math.max(0, t.ghost - DT);
      if (t.hold) continue;
      var look = ahead(t, 80), blocked = false;
      var path = {}; path[t.e] = 1; look.forEach(function (p) { path[p.e] = 1; });
      for (j = 0; j < S.trains.length && !blocked; j++) {
        var o = S.trains[j]; if (o === t) continue;
        var near = look.some(function (p) { return o.cars.some(function (c) { return Math.hypot(c.x - p.x, c.y - p.y) < 40; }); });
        if (!near) continue;
        // following = the other train came down my own track: a merge or a crossing is NOT following
        var following = (o.e === t.e && o.d > t.d) || (path[o.e] && o.via.indexOf(t.e) >= 0);
        if (following) blocked = true;                      // never rear-end the train in front
        else if (G.level === 1 && t.id > o.id) blocked = true;   // Piccolo: the younger train waits
      }
      if (blocked) continue;
      t.d += R.v * ramp * t.k * DT;   // Grande: every train has its own pace, so they catch up at merges
      var gone = false;
      while (t.d > g.edges[t.e].len) {
        t.d -= g.edges[t.e].len;
        var node = g.nodes[g.edges[t.e].to];
        if (node.t === 'station') { deliver(t, node); S.trains.splice(i, 1); i--; gone = true; break; }
        t.e = nextEdge(node.id); t.via.push(t.e); if (t.via.length > 5) t.via.shift();
      }
      if (gone) continue;
      // the trail the wagons follow: a new point every 4px, the newest one always at the loco
      var hp = at(g.edges[t.e], t.d), prev = t.hist[t.hist.length - 2];
      if (Math.hypot(hp[0] - prev[0], hp[1] - prev[1]) >= 4) { t.hist.push(hp); if (t.hist.length > 90) t.hist.shift(); }
      else t.hist[t.hist.length - 1] = hp;
      t.cars = cars(t);
    }

    // Piccolo: the switch a nearby train needs blinks
    if (G.level === 1) S.trains.forEach(function (t) {
      var d = g.edges[t.e].len - t.d, n = g.nodes[g.edges[t.e].to];
      if (n.t === 'switch' && d < 260) {
        var want = n.out[0] >= 0 && g.edges[n.out[0]].reach.indexOf(t.col) >= 0 ? 0 : 1;
        if (S.sw[n.id] !== want) S.hint[n.id] = true;
      }
    });

    // crashes (only Grande can have them: Piccolo's trains wait)
    for (i = 0; i < S.trains.length; i++) for (j = i + 1; j < S.trains.length; j++) {
      var a = S.trains[i], b = S.trains[j];
      if (a.ghost > 0 || b.ghost > 0) continue;
      var hit = a.cars.some(function (c) { return b.cars.some(function (k) { return Math.hypot(c.x - k.x, c.y - k.y) < 32; }); });
      if (hit) {
        a.ghost = b.ghost = 2.5; S.crashes++; S.hearts--; sfx('bad'); if (!quiet) G.shake(7);
        S.msg = 'Scontro! Ferma un treno toccandolo'; S.msgT = 2.5; say('Scontro!');
        S.flash.push({ x: a.cars[0].x, y: a.cars[0].y, t: 1, ok: false });
      }
    }

    if (G.level === 2 && S.hearts <= 0) { S.phase = 'over'; finish(); return; }
    if (S.done >= R.n) { S.phase = 'clear'; finish(); }
  }
  function stars() { var R = rules(), r = S.ok / R.n; return S.phase === 'over' ? 0 : r >= 1 ? 3 : r >= .8 ? 2 : r >= .6 ? 1 : 0; }
  function finish() {
    var s = saved(), st = stars();
    s.best[S.li] = Math.max(s.best[S.li] || 0, st);
    if (st > 0) s.open = Math.max(s.open, Math.min(MAPS.length - 1, S.li + 1));
    s.trains += S.ok; G.saveNow();
    if (!quiet) { if (st > 0) { G.fx.confetti(); sfx('win'); } say(st === 3 ? 'Perfetto! Tutti i treni a casa!' : st > 0 ? 'Bravo! Stazione finita' : 'Ci riproviamo?'); }
  }
  function saved() { var s = G.save.traffico || (G.save.traffico = {}); s.open = s.open || 0; s.best = s.best || {}; s.trains = s.trains || 0; return s; }

  function tapAt(p) {
    if (S.phase !== 'play') return false;
    var g = graph(), best = null, bd = 64;
    Object.keys(S.sw).forEach(function (k) { var n = g.nodes[k], d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = k; } });
    if (best) { toggle(best); return true; }
    var tr = null; bd = 46;
    S.trains.forEach(function (t) { t.cars.forEach(function (c) { var d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; tr = t; } }); });
    if (tr) { tr.hold = !tr.hold; sfx(tr.hold ? 'tap' : 'whoosh'); return true; }
    return false;
  }
  function toggle(k) { S.sw[k] = 1 - S.sw[k]; sfx('pop'); }

  /* ================================================================ drawing */
  function railsTo(c, g) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    g.edges.forEach(function (e) { stroke(c, e.pts, 30, '#c9b28a'); });
    g.edges.forEach(function (e) {
      c.strokeStyle = '#7a5634'; c.lineWidth = 4;
      for (var i = 2; i < e.pts.length - 2; i += 5) {
        var a = e.pts[i - 1], b = e.pts[i + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), p = e.pts[i];
        c.beginPath(); c.moveTo(p[0] - Math.sin(ang) * 12, p[1] + Math.cos(ang) * 12); c.lineTo(p[0] + Math.sin(ang) * 12, p[1] - Math.cos(ang) * 12); c.stroke();
      }
    });
    g.edges.forEach(function (e) { offset(c, e.pts, 7, '#8e969c', 3.5); offset(c, e.pts, -7, '#8e969c', 3.5); });
  }
  function stroke(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); }
  function offset(c, pts, o, col, w) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      var x = pts[i][0] - Math.sin(ang) * o, y = pts[i][1] + Math.cos(ang) * o;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();
  }
  function ground(c) {
    c.fillStyle = '#9fd18a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#93c77e';
    for (var i = 0; i < 60; i++) { var x = (i * 211) % W, y = 100 + (i * 137) % 620; c.beginPath(); c.ellipse(x, y, 26, 10, 0, 0, 7); c.fill(); }
  }
  function deco(c, g) {
    // trees and flowers in the free spaces, placed once per map and kept off the tracks
    var spots = [];
    for (var i = 0; i < 90; i++) {
      var x = 40 + (i * 397) % 1100, y = 120 + (i * 229) % 580, ok = true;
      g.edges.forEach(function (e) { for (var k = 0; k < e.pts.length; k += 4) if (Math.hypot(e.pts[k][0] - x, e.pts[k][1] - y) < 64) { ok = false; break; } });
      if (ok && x < 1080) spots.push([x, y, i % 4]);
    }
    spots.slice(0, 26).forEach(function (s) {
      var x = s[0], y = s[1];
      if (s[2] === 0) { c.fillStyle = '#7a4a26'; c.fillRect(x - 5, y - 4, 10, 18); c.fillStyle = '#2f8f4e'; c.beginPath(); c.arc(x, y - 16, 24, 0, 7); c.fill(); c.fillStyle = '#48a863'; c.beginPath(); c.arc(x - 7, y - 22, 12, 0, 7); c.fill(); }
      else if (s[2] === 1) { c.fillStyle = '#3b8f4f'; c.beginPath(); c.ellipse(x, y, 22, 14, 0, 0, 7); c.fill(); c.fillStyle = C.pinkPop; c.beginPath(); c.arc(x - 8, y - 5, 4, 0, 7); c.arc(x + 7, y - 2, 4, 0, 7); c.fill(); }
      else if (s[2] === 2) { c.fillStyle = C.sun; for (var f = 0; f < 3; f++) { c.beginPath(); c.arc(x + f * 14 - 14, y + (f % 2) * 6, 5, 0, 7); c.fill(); } }
      else { c.fillStyle = '#a3b0a5'; c.beginPath(); c.ellipse(x, y, 16, 11, 0, 0, 7); c.fill(); }
    });
  }
  function staticLayer(c) {
    var key = S.li;
    if (typeof document !== 'undefined' && document.createElement) {
      if (!cache[key]) {
        var cv = document.createElement('canvas');
        if (cv && cv.getContext) { cv.width = W; cv.height = H; var cc = cv.getContext('2d'); ground(cc); deco(cc, graph()); railsTo(cc, graph()); cache[key] = cv; }
      }
      if (cache[key] && cache[key].width) { c.drawImage(cache[key], 0, 0); return; }
    }
    ground(c); deco(c, graph()); railsTo(c, graph());
  }
  function drawSwitches(c) {
    var g = graph();
    Object.keys(S.sw).forEach(function (k) {
      var n = g.nodes[k], on = g.edges[n.out[S.sw[k]]], off = g.edges[n.out[1 - S.sw[k]]];
      // the chosen branch lights up, the other one gets a little barrier
      c.lineCap = 'round';
      stroke(c, on.pts.slice(0, 30), 10, 'rgba(255,215,94,.95)');
      var bp = off.pts[Math.min(off.pts.length - 1, 12)], bq = off.pts[Math.min(off.pts.length - 1, 14)], ang = Math.atan2(bq[1] - bp[1], bq[0] - bp[0]);
      c.save(); c.translate(bp[0], bp[1]); c.rotate(ang + Math.PI / 2);
      c.fillStyle = '#e8362b'; c.fillRect(-18, -5, 36, 10); c.fillStyle = '#fff'; c.fillRect(-6, -5, 12, 10); c.restore();
      var pulse = S.hint[k] ? 1 + Math.sin(S.t * 12) * .12 : 1, r = 34 * pulse;
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(n.x, n.y + 5, r, 0, 7); c.fill();
      c.fillStyle = S.hint[k] ? '#fff2a8' : C.cream; c.beginPath(); c.arc(n.x, n.y, r, 0, 7); c.fill();
      c.strokeStyle = S.hint[k] ? C.tangerine : '#6a4222'; c.lineWidth = 5; c.stroke();
      var tp = on.pts[Math.min(on.pts.length - 1, 22)], a2 = Math.atan2(tp[1] - n.y, tp[0] - n.x);
      c.save(); c.translate(n.x, n.y); c.rotate(a2);
      c.fillStyle = '#2f8f4e'; c.beginPath(); c.moveTo(22, 0); c.lineTo(-4, -17); c.lineTo(-4, -7); c.lineTo(-18, -7); c.lineTo(-18, 7); c.lineTo(-4, 7); c.lineTo(-4, 17); c.fill();
      c.restore();
    });
  }
  function drawStations(c) {
    var g = graph();
    Object.keys(g.nodes).forEach(function (k) {
      var n = g.nodes[k]; if (n.t !== 'station') return;
      var col = COL[n.col], x = n.x - 20, y = n.y;
      c.fillStyle = 'rgba(0,0,0,.18)'; G.roundRect(c, x - 36, y - 44, 130, 96, 14); c.fill();
      c.fillStyle = '#f6ecd4'; G.roundRect(c, x - 40, y - 50, 130, 96, 14); c.fill();
      c.fillStyle = col.c; G.roundRect(c, x - 48, y - 62, 146, 34, 12); c.fill();
      c.fillStyle = col.dk; c.fillRect(x - 40, y - 30, 130, 6);
      c.fillStyle = '#5a3a1c'; G.roundRect(c, x - 44, y - 16, 20, 34, 6); c.fill();
      A.SHAPES[col.shape](c, x + 36, y + 6, 24, col.c);
      var f = S.flash.filter(function (q) { return q.x === n.x && q.y === n.y; })[0];
      if (f) { c.globalAlpha = f.t; c.strokeStyle = f.ok ? C.sun : '#e8362b'; c.lineWidth = 8; c.beginPath(); c.arc(x + 25, y, 60 + (1 - f.t) * 30, 0, 7); c.stroke(); c.globalAlpha = 1; }
    });
  }
  function drawTrain(c, t) {
    var col = COL[t.col];
    for (var k = t.cars.length - 1; k >= 0; k--) {
      var p = t.cars[k];
      c.save(); c.translate(p.x, p.y); c.rotate(p.a);
      if (t.ghost > 0 && Math.sin(S.t * 30) > 0) c.globalAlpha = .45;
      c.fillStyle = 'rgba(0,0,0,.2)'; G.roundRect(c, -CAR / 2 + 3, -16, CAR, 36, 10); c.fill();
      if (k === 0) {
        c.fillStyle = col.c; G.roundRect(c, -CAR / 2, -18, CAR, 36, 11); c.fill();
        c.fillStyle = col.dk; G.roundRect(c, -CAR / 2, -18, 20, 36, 9); c.fill();
        c.fillStyle = '#2b1d12'; c.beginPath(); c.arc(CAR / 2 - 9, 0, 8, 0, 7); c.fill();
        c.fillStyle = C.cream; c.beginPath(); c.arc(CAR / 2 - 1, -11, 4, 0, 7); c.arc(CAR / 2 - 1, 11, 4, 0, 7); c.fill();
        c.rotate(-p.a); A.SHAPES[col.shape](c, -4, 0, 12, '#fff'); c.rotate(p.a);
      } else {
        c.fillStyle = col.c; G.roundRect(c, -CAR / 2, -17, CAR, 34, 9); c.fill();
        c.fillStyle = '#fff6e0'; G.roundRect(c, -CAR / 2 + 5, -12, CAR - 10, 24, 6); c.fill();
        var heads = [C.dino, C.tangerine, C.blueberry, C.pinkPop];
        for (var h = 0; h < 2; h++) { c.fillStyle = heads[(t.id + k + h) % 4]; c.beginPath(); c.arc(-10 + h * 20, 0, 8.5, 0, 7); c.fill(); c.fillStyle = C.ink; c.beginPath(); c.arc(-7 + h * 20, -3, 2, 0, 7); c.fill(); }
      }
      c.restore();
    }
    if (t.hold) {
      var h0 = t.cars[0];
      c.fillStyle = '#e8362b'; c.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + Math.PI / 8; c.lineTo(h0.x + Math.cos(a) * 20, h0.y - 36 + Math.sin(a) * 20); } c.fill();
      c.fillStyle = '#fff'; c.fillRect(h0.x - 11, h0.y - 39, 22, 6);
    } else if (!quiet && Math.floor(S.t * 6 + t.id) % 5 === 0 && t.cars[0].x > 0) {
      G.fx.burst(t.cars[0].x, t.cars[0].y, { color: 'rgba(255,255,255,.7)', count: 1, speed: 30, gravity: -40, life: .6, size: 10 });
    }
  }
  function drawWarn(c) {
    S.warns.forEach(function (w) {
    var p = graph().edges[w.e].pts, q = p[Math.min(p.length - 1, 30)], x = Math.max(34, q[0] < 0 ? 34 : Math.min(q[0], 60)), y = q[1];
    var col = COL[w.col], blink = Math.sin(S.t * 10) > 0;
    c.fillStyle = blink ? col.c : '#fff6e0'; c.beginPath(); c.arc(x, y, 28, 0, 7); c.fill();
    c.strokeStyle = col.dk; c.lineWidth = 5; c.stroke();
    A.SHAPES[col.shape](c, x, y, 13, blink ? '#fff' : col.c);
    c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 34, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0, w.t) / 2); c.stroke();
    });
  }
  function hud(c) {
    var R = rules();
    c.fillStyle = 'rgba(23,63,55,.88)'; G.roundRect(c, 16, 10, 1010, 76, 24); c.fill();
    var x = 44;
    if (G.level === 2) { for (var h = 0; h < 3; h++) A.SHAPES.cuore(c, x + 14 + h * 50, 48, 19, h < S.hearts ? C.pinkPop : '#637c70'); x += 170; }
    for (var i = 0; i < R.n; i++) {
      var cx = x + 10 + i * (R.n > 12 ? 24 : 32);
      c.fillStyle = S.log[i] === true ? C.sun : S.log[i] === false ? '#e8836b' : 'rgba(255,246,224,.25)'; c.beginPath(); c.arc(cx, 48, 9, 0, 7); c.fill();
    }
    G.text(S.ok + ' / ' + R.n, x + R.n * (R.n > 12 ? 24 : 32) + 24, 49, { size: 30, color: C.cream, align: 'left' });
    G.text(String(S.li + 1), 985, 49, { size: 34, color: C.sun });
    G.ui.button({ id: 'st-pause', x: 1080, y: 6, w: 180, h: 86, r: 24, color: C.water, label: 'Ⅱ', fontSize: 40, onTap: function () { if (S.phase === 'play') S.phase = 'pause'; else if (S.phase === 'pause') S.phase = 'play'; } });
    if (S.msgT > 0) { c.fillStyle = 'rgba(23,63,55,.85)'; G.roundRect(c, 340, 104, 600, 56, 20); c.fill(); G.text(S.msg, 640, 133, { size: 26, color: C.cream, maxWidth: 570 }); }
  }
  function panel(c, title, sub) {
    c.fillStyle = 'rgba(18,61,41,.68)'; c.fillRect(0, 0, W, H);
    c.fillStyle = C.cream; G.roundRect(c, 250, 120, 780, 470, 36); c.fill();
    G.text(title, 640, 196, { size: 52, color: C.leafDeep, maxWidth: 720 });
    if (sub) G.text(sub, 640, 256, { size: 27, color: C.ink, maxWidth: 700 });
  }
  function draw(c) {
    staticLayer(c);
    drawSwitches(c);
    S.trains.forEach(function (t) { drawTrain(c, t); });   // a train rolling over a switch hides it for a moment, like a real one
    drawStations(c);
    drawWarn(c);
    hud(c);
    if (S.phase === 'ready') {
      panel(c, (S.li + 1) + ' · ' + map().name, 'Ogni treno va alla stazione del suo colore');
      c.fillStyle = '#e9f3e1'; G.roundRect(c, 330, 300, 280, 150, 22); c.fill(); G.roundRect(c, 670, 300, 280, 150, 22); c.fill();
      c.fillStyle = C.cream; c.beginPath(); c.arc(470, 360, 34, 0, 7); c.fill(); c.strokeStyle = '#6a4222'; c.lineWidth = 5; c.stroke();
      c.fillStyle = '#2f8f4e'; c.beginPath(); c.moveTo(492, 360); c.lineTo(466, 343); c.lineTo(466, 353); c.lineTo(452, 353); c.lineTo(452, 367); c.lineTo(466, 367); c.lineTo(466, 377); c.fill();
      G.text('tocca lo scambio', 470, 425, { size: 22, color: C.leafDeep });
      var demo = { id: 1, col: 1, hold: G.level === 2, ghost: 0, cars: [{ x: 850, y: 360, a: Math.PI }, { x: 805, y: 360, a: Math.PI }, { x: 760, y: 360, a: Math.PI }] };
      demo.cars = [{ x: 850, y: 365, a: 0 }, { x: 805, y: 365, a: 0 }, { x: 760, y: 365, a: 0 }];
      var q = quiet; quiet = true; drawTrain(c, demo); quiet = q;
      G.text(G.level === 2 ? 'tocca un treno per fermarlo' : 'ogni colore ha la sua casa', 810, 425, { size: 22, color: C.leafDeep });
      G.ui.button({ id: 'st-go', x: 470, y: 480, w: 340, h: 96, r: 28, color: C.leaf, label: 'VIA!', onTap: start });
    } else if (S.phase === 'pause') {
      panel(c, 'Pausa', 'I treni aspettano te');
      G.ui.button({ id: 'st-resume', x: 330, y: 420, w: 300, h: 110, color: C.leaf, label: 'Continua', onTap: function () { S.phase = 'play'; } });
      G.ui.button({ id: 'st-menu', x: 650, y: 420, w: 300, h: 110, color: C.tangerine, label: 'Mappa', onTap: function () { G.go('menu'); } });
    } else if (S.phase === 'clear' || S.phase === 'over') {
      var st = stars(), R = rules();
      panel(c, S.phase === 'over' ? 'Troppi guai sui binari!' : st === 3 ? 'Perfetto!' : st > 0 ? 'Stazione finita!' : 'Ci riproviamo?', S.ok + ' treni su ' + R.n + ' alla stazione giusta');
      for (var s = 0; s < 3; s++) A.star(c, 560 + s * 80, 330, 32, s < st ? C.sun : '#d8cdb8');
      var last = S.li === MAPS.length - 1;
      G.ui.button({ id: 'st-again', x: 290, y: 420, w: 220, h: 110, color: C.water, label: 'Riprova', onTap: function () { reset(S.li); start(); } });
      if (st > 0 && !last) G.ui.button({ id: 'st-next', x: 530, y: 420, w: 220, h: 110, color: C.leaf, label: 'Avanti', onTap: function () { reset(S.li + 1); } });
      G.ui.button({ id: 'st-map', x: st > 0 && !last ? 770 : 530, y: 420, w: 220, h: 110, color: C.tangerine, label: 'Mappa', onTap: function () { G.go('menu'); } });
    }
  }

  G.scene('stazione', {
    hud: false, back: false,
    enter: function (o) { reset(o && o.level !== undefined ? o.level : 0); },
    update: function (dt) { acc += dt; var n = 0; while (acc >= DT && n < 4) { step(); acc -= DT; n++; } if (n === 4) acc = 0; },
    draw: draw,
    onDown: function (p) { tapAt(p); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && G.current === 'stazione' && S && S.phase === 'play') S.phase = 'pause'; });
  window.addEventListener('keydown', function (e) { if (G.current === 'stazione' && S) { if (e.key === 'Escape') S.phase = S.phase === 'play' ? 'pause' : S.phase === 'pause' ? 'play' : S.phase; if (e.key === 'Enter') start(); } });

  /* for the menu and the tests */
  G.traffic = {
    MAPS: MAPS, COL: COL, build: build, reset: reset, start: start, step: step, state: function () { return S; }, graph: graph, rules: rules,
    snap: function () { return JSON.stringify(S); }, load: function (s) { S = JSON.parse(s); }, quiet: function (q) { quiet = q; },
    tap: tapAt, toggle: toggle, saved: saved, railsTo: railsTo, stroke: stroke
  };
})();
