/* Real Chrome: screenshots of every world and real multi-touch on the pads.
   node test/look.js  -> test/frames/*.png  (not published, see deploy.yml) */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'frames');
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let child,ws,server;
async function main(){
  assert(chrome,'Chrome required');fs.mkdirSync(out,{recursive:true});
  server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return;}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(fs.readFileSync(f));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  child=spawn(chrome,['--headless=new','--remote-debugging-port=0','--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'dino-stazione-')),'--no-first-run','--mute-audio','--hide-scrollbars','--window-size=1280,720','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let endpoint='';child.stderr.on('data',b=>{const m=b.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(m)endpoint=m[1];});
  for(let i=0;i<100&&!endpoint;i++)await delay(100);assert(endpoint,'Chrome startup timeout');
  const targets=await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list').then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let seq=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  async function run(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function shot(name){await delay(250);const s=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(s.data,'base64'));}
  const touch=(type,pts)=>call('Input.dispatchTouchEvent',{type,touchPoints:pts});
  await call('Runtime.enable');await call('Page.enable');
  // silence: speech goes through the OS voice and ignores --mute-audio
  await call('Page.addScriptToEvaluateOnNewDocument',{source:'try{speechSynthesis.speak=function(){};}catch(e){}window.AudioContext=window.webkitAudioContext=undefined;'});
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:origin+'/'});
  for(let i=0;i<100;i++){await delay(50);if(await run("!!(window.G && G.current==='accesso')"))break;}
  await run("const a=G.accounts.create({name:'Leo',color:G.C.dino,level:2});G.accounts.login(a.id);G.save.traffico={open:5,best:{0:3,1:2}};G.go('menu')");await delay(900);await shot('menu');
  await run("G.go('stazione',{level:0})");await delay(700);await shot('ready');
  // real tap on the switch of map 1
  await run('G.traffic.start()');const before=await run('G.traffic.state().sw.S1');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:380,y:430,id:1}]});await delay(40);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
  assert.equal(await run('G.traffic.state().sw.S1'),1-before,'a real tap flips the switch');console.log('touch: switch flips');
  for(let li=0;li<6;li++){await run("G.go('stazione',{level:"+li+"})");await delay(600);await run('G.traffic.start();G.traffic.state().spawnT=0');await delay(li<3?7000:9000);await shot('map'+(li+1));}
  await run('G.traffic.state().trains.forEach(t=>t.hold=true)');await delay(300);await shot('hold');
  await run("G.traffic.state().phase='clear';G.traffic.state().ok=G.traffic.rules().n-1");await delay(300);await shot('clear');
  await call('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:2,mobile:true});await run("G.go('stazione',{level:2})");await delay(600);await run('G.traffic.start()');await delay(5000);await shot('tablet');
  assert.deepEqual(errors,[],'console errors: '+JSON.stringify(errors).slice(0,800));
  console.log('PASS look: frames in test/frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{try{ws&&ws.close();}catch(e){}try{child&&child.kill();}catch(e){}try{server&&server.close();}catch(e){}});
