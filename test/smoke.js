#!/usr/bin/env node
/* Dino Stazione — collaudo. `node test/smoke.js`
   A controller bot plays every map at both ages through the real step(): it
   must bring every train home with no crash. The passive player must earn no
   star, and Piccolo's self-braking trains must never crash nor jam. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const noop=()=>{},store=new Map(),scenes={},events={};
const context=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='measureText')return s=>({width:String(s).length*10});if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop:noop});return noop;},set(t,k,v){t[k]=v;return true;}});
const elements={};function element(id){return elements[id]||(elements[id]={style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},getContext:()=>context,addEventListener:noop,getBoundingClientRect:()=>({left:0,top:0}),focus:noop,blur:noop,select:noop});}
const sandbox={console,Math,Date,JSON,innerWidth:1280,innerHeight:720,devicePixelRatio:2,performance:{now:()=>0},navigator:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{hidden:false,getElementById:element,documentElement:{},addEventListener:(n,f)=>events[n]=f},addEventListener:(n,f)=>events[n]=f,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,setInterval:noop,matchMedia:()=>({matches:false}),speechSynthesis:{getVoices:()=>[],speak:noop,cancel:noop,addEventListener:noop},SpeechSynthesisUtterance:function(){}};
sandbox.window=sandbox;vm.createContext(sandbox);
const dir=path.join(__dirname,'../src');
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort()){
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox,{filename:file});
  if(file==='00-core.js'){const original=sandbox.G.scene;sandbox.G.scene=(name,s)=>{scenes[name]=s;original(name,s);};}
}
const G=sandbox.G,T=G.traffic,S=()=>T.state();
const kid=G.accounts.create({name:'Prova',level:1});G.accounts.login(kid.id);
T.quiet(true);

const rules=fs.readFileSync(path.join(dir,'10-stazione.js'),'utf8').split('/* ================================================================ drawing */')[0].replace(/\/\*[\s\S]*?\*\//g,'');
assert(!/Math\.random|G\.rnd|G\.pick|G\.shuffle/.test(rules),'the rules must use the seeded rnd()');

// ---- every map is a sound graph
T.MAPS.forEach(m=>{
  const g=T.build(m);
  Object.values(g.nodes).forEach(n=>{
    const want={entry:1,switch:2,merge:1,station:0}[n.t];assert.equal(n.out.length,want,m.name+' '+n.id+' has '+n.out.length+' exits');
    if(n.t==='switch')n.out.forEach(o=>assert(g.edges[o].reach.length,m.name+' '+n.id+' leads nowhere'));
  });
  g.entries.forEach(e=>assert(g.edges[g.nodes[e].out[0]].reach.length>=2,m.name+': every entry must offer a choice'));
  const stations=Object.values(g.nodes).filter(n=>n.t==='station').map(n=>n.col);assert.equal(new Set(stations).size,stations.length,'one station per colour');
});

// ---- the bot: route every train, and (Grande) hold the younger of two trains about to meet
function lookahead(tr,dist){const g=T.graph(),st=S();let e=tr.e,d=tr.d;const out=[];for(let k=12;k<=dist;k+=12){let dd=d+k,ee=e;while(ee>=0&&dd>g.edges[ee].len){dd-=g.edges[ee].len;const n=g.nodes[g.edges[ee].to];ee=n.t==='station'?-1:n.t==='switch'?n.out[st.sw[n.id]]:n.out[0];}if(ee<0)break;const i=Math.min(g.edges[ee].pts.length-1,Math.floor(dd/3));out.push({x:g.edges[ee].pts[i][0],y:g.edges[ee].pts[i][1],e:ee});}return out;}
function bot(){
  const g=T.graph(),st=S();
  // switches: serve the closest train heading for them
  Object.keys(st.sw).forEach(k=>{
    let best=null,bd=1e9;
    st.trains.forEach(t=>{let e=t.e,dist=g.edges[e].len-t.d;for(let hop=0;hop<4&&e>=0;hop++){const n=g.nodes[g.edges[e].to];if(n.id===k){if(dist<bd){bd=dist;best=t;}break;}if(n.t==='station')break;e=n.t==='switch'?n.out[st.sw[n.id]]:n.out[0];dist+=g.edges[e].len;}});
    if(best){const n=g.nodes[k],want=g.edges[n.out[0]].reach.includes(best.col)?0:1;if(st.sw[k]!==want)T.toggle(k);}
  });
  if(G.level!==2)return;
  st.trains.forEach(t=>{t.hold=false;});
  const trains=st.trains.slice().sort((a,b)=>a.id-b.id);
  trains.forEach((t,i)=>{
    const look=lookahead(t,130),mine=new Set([t.e].concat(look.map(p=>p.e)));
    for(const o of trains.slice(0,i)){
      if(mine.has(o.e))continue;   // following: the game brakes by itself
      const theirs=lookahead(o,130).concat(o.cars.map(c=>({x:c.x,y:c.y})));
      if(look.some(p=>theirs.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<42))){t.hold=true;break;}
    }
  });
}
function play(li,level,seed,withBot){
  G.level=level;T.reset(li,seed);T.start();
  for(let f=0;f<60*60*12&&S().phase==='play';f++){if(withBot)bot();T.step();}
  const s=S();return {phase:s.phase,ok:s.ok,n:T.rules().n,bad:s.bad,crashes:s.crashes,hearts:s.hearts};
}
for(const level of [1,2])T.MAPS.forEach((m,li)=>{
  for(const seed of [3,77]){
    const r=play(li,level,seed,true);
    assert(r.phase==='clear'&&r.ok===r.n&&r.crashes===0,`bot on ${m.name} (${level===1?'Piccolo':'Grande'}, seed ${seed}): ${JSON.stringify(r)}`);
  }
  const p=play(li,level,5,false);
  const bc=[3,77].length;console.log(`  ${m.name.padEnd(26)} ${level===1?'Piccolo':'Grande '}  bot 3 stelle · passivo ${JSON.stringify(p)}`);
  assert(p.ok/p.n<.6,'touching nothing must not earn a star on '+m.name);
  if(level===1){assert.equal(p.phase,'clear','Piccolo trains must never jam on '+m.name);assert.equal(p.crashes,0,'Piccolo trains must never crash');}
  else assert(p.phase==='over'||p.ok/p.n<.6);
});

// ---- the real tap: a switch flips, a train stops and goes again
G.level=2;T.reset(0,1);T.start();const sw0=S().sw.S1;T.tap({x:380,y:430});assert.equal(S().sw.S1,1-sw0,'tapping the switch flips it');
for(let i=0;i<60*5&&!S().trains.length;i++)T.step();for(let i=0;i<120;i++)T.step();
const tr=S().trains[0],c0=tr.cars[0];T.tap({x:c0.x,y:c0.y});assert(tr.hold,'tapping a train holds it');const d0=tr.d;for(let i=0;i<60;i++)T.step();assert.equal(S().trains[0].d,d0,'a held train does not move');T.tap({x:S().trains[0].cars[0].x,y:S().trains[0].cars[0].y});assert(!S().trains[0].hold);

// ---- a crash in Grande costs a heart; in Piccolo the same trains just wait
for(const level of [2,1]){G.level=level;T.reset(2,9);T.start();const R=T.rules(),keep=R.every;R.every=1.2;S().sw.S1=1;S().sw.S2=1;S().hearts=99;
  for(let f=0;f<60*90&&S().phase==='play'&&!S().crashes;f++)T.step();
  R.every=keep;if(level===2)assert(S().crashes>0&&S().hearts<99,'two trains meeting at the merge must crash in Grande');else assert.equal(S().crashes,0,'Piccolo never crashes');}

// ---- stars unlock the next map, and profiles stay apart
delete G.save.traffico;G.level=1;play(0,1,4,true);assert.equal(T.saved().open,1);assert.equal(T.saved().best[0],3);
const sib=G.accounts.create({name:'Fratello',level:2});G.accounts.login(sib.id);assert.equal(G.save.traffico,undefined,'sibling save leaked');G.accounts.login(kid.id);assert.equal(T.saved().open,1);

// ---- scenes draw
for(const name of ['accesso','menu','stazione']){if(scenes[name].enter)scenes[name].enter({level:0});scenes[name].draw(context);}
['ready','play','pause','clear','over'].forEach(ph=>{S().phase=ph;scenes.stazione.draw(context);});
for(let li=0;li<T.MAPS.length;li++){scenes.stazione.enter({level:li});S().phase='play';scenes.stazione.draw(context);}
console.log('PASS Dino Stazione: bot routes every map at both ages with no crash, passive player earns no star, Piccolo never crashes nor jams, taps, holds, unlocks, separate saves');
