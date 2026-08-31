/* Menu e progressione dei turni della stazione. */
(function () {
  'use strict';
  var C = G.C, W = G.W, H = G.H;
  var MAX_LEVEL = 12;

  G.stationSave = function () {
    var s = G.save.station || (G.save.station = {});
    if (!s.maxLevel) s.maxLevel = 1;
    if (!s.level) s.level = 1;
    s.maxLevel = G.clamp(s.maxLevel, 1, MAX_LEVEL);
    s.level = G.clamp(s.level, 1, s.maxLevel);
    if (!s.served) s.served = 0;
    if (!s.best) s.best = {};
    return s;
  };

  G.scene('menu', {
    hud: true, back: false,
    enter: function () {
      var s = G.stationSave();
      if (G.level === 2 && s.maxLevel < 2 && !s.served) { s.maxLevel = 2; s.level = 2; }
      setTimeout(function () { if (G.current === 'menu') G.say('Scegli il turno e prepara i binari!'); }, 450);
    },
    draw: function (c) {
      A.stationSky(c);
      var s = G.stationSave();
      A.train(c, 640 + Math.sin(G.t * .8) * 14, 300, 180, { color: G.account.color, kind: (Math.floor(G.t / 2) % 3) });
      G.text('Scegli il turno', W / 2, 412, { ctx: c, size: 34, color: C.ink });
      var cols = [C.mint, C.water, C.sun, C.tangerine, C.berry];
      for (var i = 0; i < MAX_LEVEL; i++) (function (idx) {
        var unlocked = idx < s.maxLevel;
        var row = Math.floor(idx / 6), col = idx % 6;
        var x = 340 + col * 120, y = 474 + row * 76;
        G.ui.round({
          id: 'level-' + idx, x: x, y: y, r: 33,
          color: unlocked ? cols[idx % cols.length] : '#a9a49d', disabled: !unlocked,
          label: unlocked ? String(idx + 1) : '•', fontSize: 34,
          onTap: function () { s.level = idx + 1; G.saveNow(); G.sfx('pop'); }
        });
        if (s.level === idx + 1 && unlocked) {
          c.strokeStyle = C.cream; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 42, 0, 7); c.stroke();
        }
      })(i);
      G.ui.button({
        id: 'play', x: W / 2 - 190, y: 612, w: 380, h: 76, r: 26,
        color: C.leaf, label: 'Apri il turno ' + s.level + '!', fontSize: 30,
        onTap: function () { G.go('stazione', { level: s.level }); }
      });
      G.ui.button({
        id: 'profiles', x: 22, y: H - 82, w: 210, h: 58, r: 20,
        color: C.bark, label: 'Cambia capo', fontSize: 22,
        onTap: function () { G.go('accesso'); }
      });
      G.text('Treni accompagnati: ' + s.served, W - 28, H - 44, { ctx: c, size: 22, align: 'right', color: C.ink });
    }
  });
})();
