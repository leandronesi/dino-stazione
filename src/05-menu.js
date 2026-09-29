/* The map of the six stations: each opens when the previous one earns a star.
   Every card is a real, shrunken drawing of its tracks. */
(function () {
  'use strict';
  var C = G.C, W = G.W, H = G.H;
  var CARD = { w: 360, h: 196, gap: 24, x0: 88, y0: 116 };

  function card(c, i, x, y, open, best) {
    var T = G.traffic, g = T.build(T.MAPS[i]);
    c.fillStyle = '#123d29'; G.roundRect(c, x, y + 7, CARD.w, CARD.h, 24); c.fill();
    c.fillStyle = C.cream; G.roundRect(c, x, y, CARD.w, CARD.h, 24); c.fill();
    c.save(); G.roundRect(c, x + 10, y + 10, CARD.w - 20, 120, 16); c.clip();
    c.fillStyle = '#9fd18a'; c.fillRect(x + 10, y + 10, CARD.w - 20, 120);
    c.translate(x + 10, y + 10 - 12); c.scale((CARD.w - 20) / 1280, 144 / 720);
    g.edges.forEach(function (e) { T.stroke(c, e.pts, 40, '#7a5634'); });
    Object.keys(g.nodes).forEach(function (k) {
      var n = g.nodes[k];
      if (n.t === 'station') { c.fillStyle = T.COL[n.col].c; G.roundRect(c, n.x - 70, n.y - 50, 140, 100, 20); c.fill(); }
      if (n.t === 'switch') { c.fillStyle = C.cream; c.beginPath(); c.arc(n.x, n.y, 40, 0, 7); c.fill(); }
    });
    c.restore();
    G.text((i + 1) + ' · ' + T.MAPS[i].name, x + CARD.w / 2, y + 152, { size: 25, color: C.leafDeep, maxWidth: CARD.w - 30 });
    for (var s = 0; s < 3; s++) A.star(c, x + CARD.w / 2 - 36 + s * 36, y + 180, 13, s < best ? C.sun : '#d8cdb8');
    if (!open) {
      c.fillStyle = 'rgba(23,63,55,.62)'; G.roundRect(c, x + CARD.w / 2 - 50, y + 26, 100, 88, 20); c.fill();
      c.strokeStyle = C.cream; c.lineWidth = 8; c.beginPath(); c.arc(x + CARD.w / 2, y + 58, 16, Math.PI, 0); c.stroke();
      c.fillStyle = C.cream; G.roundRect(c, x + CARD.w / 2 - 24, y + 58, 48, 38, 8); c.fill();
    }
  }

  G.scene('menu', {
    hud: false, back: false,
    draw: function (c) {
      var T = G.traffic, s = T.saved();
      c.fillStyle = '#9fd18a'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#93c77e'; for (var i = 0; i < 40; i++) { c.beginPath(); c.ellipse((i * 211) % W, (i * 137) % H, 26, 10, 0, 0, 7); c.fill(); }
      G.text('DINO STAZIONE', 640, 64, { size: 64, color: C.cream, stroke: C.leafDeep, strokeWidth: 12 });
      T.MAPS.forEach(function (m, i) {
        var col = i % 3, row = Math.floor(i / 3), x = CARD.x0 + col * (CARD.w + CARD.gap), y = CARD.y0 + row * (CARD.h + CARD.gap), open = i <= s.open;
        card(c, i, x, y, open, s.best[i] || 0);
        G.ui.button({ id: 'map' + i, ghost: true, x: x, y: y, w: CARD.w, h: CARD.h, r: 24, onTap: function () {
          if (open) G.go('stazione', { level: i });
          else { G.sfx('bad'); G.say('Prima prendi una stella in ' + T.MAPS[i - 1].name); }
        } });
      });
      G.ui.button({ id: 'profiles', x: 24, y: 600, w: 290, h: 100, color: C.water, label: 'Cambia capo', onTap: function () { G.accounts.logout(); G.go('accesso'); } });
      var next = Math.min(s.open, T.MAPS.length - 1);
      G.ui.button({ id: 'play', x: 440, y: 594, w: 400, h: 110, r: 30, color: C.leaf, label: 'GIOCA!', onTap: function () { G.go('stazione', { level: next }); } });
      G.ui.button({ id: 'parents', x: 966, y: 600, w: 290, h: 100, color: C.bark, label: 'Genitori', onTap: function () { G.go('gate'); } });
    }
  });
})();
