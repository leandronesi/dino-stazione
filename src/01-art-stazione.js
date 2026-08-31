/* Disegni procedurali di Dino Stazione: treni, simboli, segnali e fondali. */
var A = window.A = window.A || {};
(function () {
  'use strict';

  var C = G.C;

  A.destination = function (c, x, y, r, kind) {
    c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = C.ink; c.lineWidth = Math.max(3, r * .11);
    if (kind === 0) {
      c.fillStyle = C.sun; c.beginPath(); c.arc(0, 0, r * .48, 0, 7); c.fill(); c.stroke();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        c.beginPath(); c.moveTo(Math.cos(a) * r * .66, Math.sin(a) * r * .66);
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke();
      }
    } else if (kind === 1) {
      c.fillStyle = C.water; c.beginPath();
      c.moveTo(-r, r * .18); c.quadraticCurveTo(-r * .55, -r * .35, -r * .1, r * .18);
      c.quadraticCurveTo(r * .35, r * .68, r, r * .05); c.lineTo(r, r * .75); c.lineTo(-r, r * .75); c.closePath();
      c.fill(); c.stroke();
    } else {
      c.fillStyle = C.leaf; c.beginPath();
      c.moveTo(0, -r); c.lineTo(r * .85, r * .18); c.lineTo(r * .42, r * .18);
      c.lineTo(r * .9, r * .82); c.lineTo(-r * .9, r * .82); c.lineTo(-r * .42, r * .18);
      c.lineTo(-r * .85, r * .18); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  };

  A.train = function (c, x, y, s, o) {
    o = o || {}; var flip = o.dir === -1 ? -1 : 1;
    c.save(); c.translate(x, y); c.scale(flip, 1); c.lineJoin = 'round';
    var body = o.color || C.berry;
    c.fillStyle = 'rgba(30,20,10,.18)'; c.beginPath(); c.ellipse(0, s * .30, s * .88, s * .13, 0, 0, 7); c.fill();
    c.strokeStyle = C.ink; c.lineWidth = Math.max(3, s * .055);
    c.fillStyle = body; G.roundRect(c, -s * .63, -s * .22, s * 1.15, s * .46, s * .12); c.fill(); c.stroke();
    c.fillStyle = G.shade(body, -24); G.roundRect(c, -s * .34, -s * .58, s * .56, s * .39, s * .08); c.fill(); c.stroke();
    c.fillStyle = '#dff5ff'; G.roundRect(c, -s * .23, -s * .50, s * .31, s * .20, s * .04); c.fill(); c.stroke();
    c.fillStyle = C.bark; G.roundRect(c, s * .25, -s * .53, s * .15, s * .32, s * .04); c.fill(); c.stroke();
    c.fillStyle = C.cream; c.beginPath(); c.arc(s * .48, -s * .03, s * .12, 0, 7); c.fill(); c.stroke();
    [-.38, .22].forEach(function (wx) {
      c.fillStyle = '#384557'; c.beginPath(); c.arc(s * wx, s * .25, s * .18, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#a9b2bd'; c.beginPath(); c.arc(s * wx, s * .25, s * .07, 0, 7); c.fill();
    });
    if (o.kind !== undefined) {
      c.fillStyle = C.cream; c.beginPath(); c.arc(-s * .52, 0, s * .20, 0, 7); c.fill(); c.stroke();
      A.destination(c, -s * .52, 0, s * .13, o.kind);
    }
    c.restore();
  };

  /* I profili ereditati chiamano questo nome interno: qui mostrano una locomotiva. */
  A.kartBack = function (c, x, y, s, o) { A.train(c, x, y, s * .62, { color: o && o.color, dir: 1 }); };

  A.signal = function (c, x, y, r, green) {
    c.save(); c.strokeStyle = C.ink; c.lineWidth = Math.max(3, r * .09); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y + r * .55); c.lineTo(x, y + r * 1.45); c.stroke();
    c.fillStyle = '#384557'; G.roundRect(c, x - r * .55, y - r * .65, r * 1.1, r * 1.25, r * .25); c.fill(); c.stroke();
    c.fillStyle = green ? C.mint : '#c34848'; c.beginPath(); c.arc(x, y, r * .30, 0, 7); c.fill(); c.stroke();
    c.restore();
  };

  A.stationSky = function (c) {
    var g = c.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#82cce5'); g.addColorStop(1, '#d9f0cf');
    c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
    c.fillStyle = '#f2d9a8'; c.fillRect(0, 175, 1280, 545);
    c.fillStyle = '#d66f4b'; G.roundRect(c, 350, 52, 580, 145, 24); c.fill();
    c.fillStyle = C.cream; G.roundRect(c, 385, 88, 510, 109, 14); c.fill();
    G.text('DINO STAZIONE', 640, 130, { ctx: c, size: 45, color: C.ink });
    c.fillStyle = '#a34e38'; c.beginPath(); c.moveTo(320, 63); c.lineTo(640, 0); c.lineTo(960, 63); c.closePath(); c.fill();
  };
})();
