#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const failures = [];
let phase = 'boot', clock = 0, drawCount = 0;
const noop = function () {};
function fail(s) { failures.push('[' + phase + '] ' + s); }

function gradient() { return { addColorStop: noop }; }
function context() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return gradient;
      if (k === 'measureText') return s => ({ width: String(s).length * 9 });
      if (typeof k === 'symbol') return undefined;
      return function () {
        drawCount++;
        for (const v of arguments) if (typeof v === 'number' && !Number.isFinite(v)) fail('canvas ' + String(k) + ' riceve ' + v);
      };
    },
    set(t, k, v) { if (typeof v === 'number' && !Number.isFinite(v)) fail('canvas.' + String(k) + ' = ' + v); t[k] = v; return true; }
  });
}
function classes() {
  const s = new Set();
  return { add: x => s.add(x), remove: x => s.delete(x), contains: x => s.has(x), toggle: (x, on) => on ? s.add(x) : s.delete(x) };
}
const els = {};
function element(id) {
  const listeners = {};
  return {
    id, listeners, style: {}, classList: classes(), value: '', textContent: '',
    addEventListener: (t, f) => (listeners[t] = listeners[t] || []).push(f),
    dispatch: (t, e) => (listeners[t] || []).forEach(f => f(e)),
    getContext: () => element.ctx || (element.ctx = context()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1600, height: 900 }),
    setPointerCapture: noop, focus: noop, blur: noop, select: noop,
    requestFullscreen: () => Promise.resolve()
  };
}
['c', 'ovl', 'ovl-t', 'ovl-i', 'ovl-y', 'ovl-n', 'rot'].forEach(id => { els[id] = element(id); });

const timers = [];
function setTimer(fn, ms) { const t = { fn, at: clock + (ms || 0), id: timers.length + 1 }; timers.push(t); return t.id; }
function clearTimer(id) { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); }
function flushTimers() {
  for (let guard = 0; guard < 200; guard++) {
    const due = timers.filter(t => t.at <= clock); if (!due.length) return;
    due.forEach(t => { timers.splice(timers.indexOf(t), 1); try { t.fn(); } catch (e) { fail('timer: ' + e.message); } });
  }
}

const storage = new Map();
const W = {
  innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1, listeners: {},
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
  removeEventListener: noop, matchMedia: () => ({ matches: false }),
  requestAnimationFrame(f) { W.raf = f; return 1; }, cancelAnimationFrame: noop,
  setTimeout: setTimer, clearTimeout: clearTimer, setInterval: () => 0, clearInterval: noop,
  navigator: { wakeLock: null }, performance: { now: () => clock },
  localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  speechSynthesis: { speak: noop, cancel: noop, getVoices: () => [], addEventListener: noop },
  SpeechSynthesisUtterance: function (s) { this.text = s; },
  AudioContext: function () {
    const node = () => ({ connect: noop, start: noop, stop: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, Q: {}, buffer: null });
    this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; this.destination = node();
    this.createGain = node; this.createOscillator = node; this.createBufferSource = node; this.createBiquadFilter = node;
    this.createBuffer = (c, n) => ({ getChannelData: () => new Float32Array(n) }); this.resume = () => Promise.resolve();
  }
};
W.document = {
  hidden: false, fullscreenElement: null, documentElement: element('html'), body: element('body'), listeners: {},
  getElementById: id => els[id] || element(id), createElement: element,
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
  removeEventListener: noop, exitFullscreen: () => Promise.resolve()
};
W.window = W; W.self = W; W.globalThis = W; W.console = { log: noop, info: noop, warn: (...a) => fail('warn: ' + a.join(' ')), error: (...a) => fail('error: ' + a.join(' ')) };
vm.createContext(W);
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
try { vm.runInContext(files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n'), W, { filename: 'bundle.js' }); }
catch (e) { console.error('✗ bundle non avviato\n' + e.stack); process.exit(1); }
const G = W.G;
function pump(n) {
  for (let i = 0; i < n; i++) { clock += 16.7; flushTimers(); try { W.raf(clock); } catch (e) { fail('frame: ' + e.message); } }
}
function tap(x, y) {
  const e = { clientX: G.view.ox + x * G.view.s, clientY: G.view.oy + y * G.view.s, pointerId: 1, preventDefault: noop };
  els.c.dispatch('pointerdown', e); pump(1); els.c.dispatch('pointerup', e); pump(1);
}

console.log('Dino Stazione — collaudo headless');
console.log('moduli: ' + files.join(', ') + '\n');
phase = 'account';
const a = G.accounts.create({ name: 'Prova', color: G.C.berry, level: 2 });
if (!G.accounts.login(a.id)) fail('login fallito');
G.start('menu'); pump(40);
if (G.current !== 'menu') fail('menu non raggiunto');
if (drawCount < 300) fail('menu quasi vuoto');

phase = 'area touch binario';
G.start('stazione', { level: 1 }); pump(20);
tap(105, 312);
if (!G.stationState().active || G.stationState().active.phase !== 'moving') {
  fail('il pulsante visibile del binario non riceve il tap reale');
}

function completeLevel(level) {
  phase = 'turno ' + level;
  G.start('stazione', { level }); pump(20);
  let guard = 0;
  while (!G.stationState().fine && guard++ < 5000) {
    const s = G.stationState();
    if (s.active && s.active.phase === 'choose') G.stationChoose(s.active.target);
    s.occupied.forEach((t, i) => { if (t && t.ready) G.stationDepart(i); });
    pump(1);
  }
  const end = G.stationState();
  if (!end.fine) fail('turno non finito entro il limite');
  if (end.departed !== end.total) fail('partiti ' + end.departed + ' su ' + end.total);
  if (end.arrived !== end.total) fail('arrivati ' + end.arrived + ' su ' + end.total);
}
for (let level = 1; level <= 5; level++) completeLevel(level);

phase = 'errore dolce';
G.start('stazione', { level: 3 }); pump(20);
let s = G.stationState();
const wrong = (s.active.target + 1) % s.tracks;
if (G.stationChoose(wrong)) fail('un binario sbagliato è stato accettato');
if (G.stationState().mistakes !== 1) fail('errore non registrato');
if (!G.stationChoose(s.active.target)) fail('correzione giusta rifiutata');
pump(100);
if (!G.stationState().occupied.some(Boolean)) fail('il treno corretto non arriva al binario');

phase = 'salvataggio';
const save = G.stationSave();
if (save.maxLevel !== 5) fail('progressione non sblocca tutti i turni: ' + save.maxLevel);
if (save.served < 24) fail('treni serviti non salvati: ' + save.served);
try { const j = JSON.stringify(G.save); if (/NaN|Infinity/.test(j)) fail('salvataggio non finito'); } catch (e) { fail('salvataggio non serializzabile'); }

console.log('');
if (failures.length) {
  console.log('✗ ' + failures.length + ' problemi:\n'); failures.slice(0, 40).forEach(x => console.log('  · ' + x)); process.exit(1);
}
console.log('✓ collaudo pulito — 5 turni, scambi, segnali e progressione');
