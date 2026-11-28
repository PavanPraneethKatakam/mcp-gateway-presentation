import * as THREE from 'three';
import { net, term, rack, neural } from './worlds.js';
import { sfx } from './sound.js';

const S = window.SLIDES;
const $ = (q, el=document) => el.querySelector(q);
const canvas = $('#stage'), frame = $('#frame'), boringEl = $('#boring'), poster = $('#poster'), sheet = $('#sheet'), ui = $('#ui'), counter = $('#counter');

// ---------- renderer ----------
let R = null;
try { R = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); R.outputColorSpace = THREE.SRGBColorSpace; }
catch(e){ document.body.classList.add('nogl'); }
function resize(){
  const w = innerWidth, h = innerHeight;
  if (R){ R.setPixelRatio(Math.min(devicePixelRatio, 1.6)); R.setSize(w, h, false); }
  Object.values(W).forEach(o => { o.camera.aspect = w/h; o.camera.updateProjectionMatrix(); });
  const s = Math.min(w/1920, h/1080); frame.style.transform = `translate(-50%,-50%) scale(${s})`;
  boringEl.style.setProperty('--s', s);
}

// ---------- the poisoned page texture (used by the ocean world) ----------
function drawPage(c, w, h){
  c.fillStyle = '#ffffff'; c.fillRect(0,0,w,h);
  c.fillStyle = '#4472c4'; c.fillRect(0,h-26,w,26);
  c.fillStyle = '#111'; c.font = '400 64px Arial'; c.fillText('Supplier pricing, Q4', 70, 140);
  c.fillStyle = '#c9c9c9'; for (let i=0;i<11;i++){ const y = 230 + i*62; c.fillRect(70, y, (i%3===2? 560: 900) - (i*13)%90, 22); }
  c.fillStyle = '#ef4a2a'; c.fillRect(70, 930, 880, 22);
  c.strokeStyle = '#3d7cff'; c.lineWidth = 5; c.strokeRect(55, 905, 910, 72);
  [[55,905],[965,905],[55,977],[965,977],[510,905],[510,977]].forEach(([x,y])=>{ c.beginPath(); c.arc(x,y,11,0,7); c.fillStyle='#fff'; c.fill(); c.stroke(); });
  c.fillStyle = '#c9c9c9'; for (let i=0;i<3;i++) c.fillRect(70, 1030 + i*62, 760 - i*120, 22);
}

await Promise.all(['500 40px Sora','400 40px Sora','300 40px Sora','400 40px Geist','500 40px "Geist Mono"','600 40px "Geist Mono"'].map(f=>document.fonts.load(f).catch(()=>{})));
const W = R ? { net: net(drawPage), term: term(), rack: rack(), neural: neural() } : {};

// ---------- board drawings for the salt-flat slides ----------
const INK = '#14161c';
function drawSetup(c, w, h){
  const k = w/1600; c.save(); c.fillStyle = INK; c.font = `500 ${54*k}px Sora`; c.fillText('Experimental setup', 110*k, 120*k);
  c.font = `400 ${27*k}px Sora`; c.fillStyle = 'rgba(20,22,28,.6)'; c.fillText('How each model was trained, tuned and tested', 110*k, 165*k);
  const rows = [
    ['Injection data', '5,546 texts → 4,278 train / 403 val / 865 test; whole template families held out of training'],
    ['External tests', 'deepset (116) · Gandalf (112) · jailbreak (260) · PromptBench · HarmBench-indirect; MinHash de-duplicated'],
    ['Classifier', 'DistilBERT, 2 epochs, lr 5e-5, batch 16, max 128 tokens, seed 42, Apple MPS (≈42 min)'],
    ['Threshold', 'swept 0.3–0.7 on validation, frozen at 0.5 before any test set was scored'],
    ['Behaviour', 'Isolation Forest, 200 trees, 71,776 windows × 28 features; score scaled so the training 99.9th percentile = 0.5'],
    ['End to end', '1,000 traces / 4,944 calls through the real gateway, rule-only vs ML-enhanced'],
    ['Promotion gate', 'any new model must match or beat the shipped one on every set; written down before training'],
  ];
  let y = 238*k;
  rows.forEach(([a,b],i)=>{ c.fillStyle = i%2 ? 'rgba(20,22,28,.035)' : 'rgba(20,22,28,0)'; c.fillRect(100*k, y-44*k, 1400*k, 106*k);
    c.fillStyle = '#c2361b'; c.font = `600 ${22*k}px "Geist Mono"`; c.fillText(a.toUpperCase(), 120*k, y);
    c.fillStyle = INK; c.font = `400 ${29*k}px Geist`;
    const words = b.split(' '); let line = '', ly = y; const maxw = 1030*k, x0 = 430*k;
    words.forEach(wd => { const tst = line ? line+' '+wd : wd; if (c.measureText(tst).width > maxw){ c.fillText(line, x0, ly); line = wd; ly += 38*k; } else line = tst; });
    c.fillText(line, x0, ly); y += 106*k; });
  c.restore();
}
const LINE = { title:'Validation F1 vs decision threshold', subtitle:'Injection detector, validation sets (frozen before testing)', xLabel:'Decision threshold on the injection score',
  yLabel:'F1 (validation)', x:[.3,.4,.5,.6,.7], xTicks:['0.3','0.4','0.5','0.6','0.7'], yMin:.1, yMax:1, yStep:.1, yFormat:v=>v.toFixed(1),
  highlightX:.5, highlightLabel:'shipped threshold 0.5',
  series:[ {name:'Rules', color:'#8a8f99', values:[.457,.457,.457,.288,.222], width:6},
           {name:'A', color:'#2d3fd0', values:[.889,.889,.902,.885,.892], width:7},
           {name:'O', color:'#ef4a2a', values:[.899,.953,.968,.961,.961], width:5} ] };
const BAR = { title:'Recall by attack category', subtitle:'1,000 end-to-end traces · share of attack traces held or blocked',
  yLabel:'Recall', categories:['Prompt injection','Privilege escalation','PII exfiltration','Anomalous behaviour','External comms','All attacks'],
  yMin:0, yMax:1, yStep:.25, yFormat:v=>v.toFixed(2),
  series:[ {name:'Rules only', color:'#a3a7af', values:[0,1,1,.952,1,.790]}, {name:'ML-enhanced', color:'#ef4a2a', values:[1,1,1,.952,1,.990]} ] };
const BOARDS = { setup:[drawSetup,false], line:[(c,w,h,t)=>window.drawLineChart(c,w,h,LINE,t),true], bar:[(c,w,h,t)=>window.drawBarChart(c,w,h,BAR,t),true] };

// ---------- build DOM for slides ----------
function addHandles(root){
  root.querySelectorAll('.sel').forEach(el => { if (el.querySelector(':scope>.h')) return;
    [[0,0],[50,0],[100,0],[0,50],[100,50],[0,100],[50,100],[100,100]].forEach(([x,y]) => { const h = document.createElement('i'); h.className='h'; h.style.left=`calc(${x}% + ${(x-50)/50*10}px)`; h.style.top=`calc(${y}% + ${(y-50)/50*10}px)`; el.appendChild(h); });
    const r = document.createElement('i'); r.className='h r'; el.appendChild(r); });
}
let cur = -1, step = 0, busy = false, started = null, perSlide = S.map(()=>0), enteredAt = performance.now();

function render(i){
  const s = S[i];
  if (s.world === 'boring'){
    boringEl.innerHTML = `<div class="boring-slide ${step? 'step1':''}">${s.html}<div class="num">${i+1}</div></div>`;
    boringEl.style.transform = ''; boringEl.style.opacity = 1; boringEl.style.display = 'block'; frame.innerHTML = '';
  } else {
    boringEl.style.display = 'none';
    frame.innerHTML = `<div class="layer"><div class="layer-inner">${s.html}</div></div>`;
    requestAnimationFrame(()=>frame.classList.add('on'));
  }
  addHandles(document.body);
  document.body.className = (s.world === 'boring' ? 'boring light' : (s.world === 'flat' ? 'flat' + (s.light ? ' light' : '') : '')) + (s.board ? ' boardview' : '');
  if (s.world === 'flat') poster.style.background = s.bg;
  if (W[s.world]) W[s.world].setSlide(s, activeWorld !== s.world);
  activeWorld = s.world;
  if (s.world === 'rack' && s.board && W.rack){ const [fn, anim] = BOARDS[s.board]; W.rack.setDraw(fn, anim); if (anim) setTimeout(()=>sfx.blips(s.board==='bar'?12:5, 1.7), 300); }
  else if (W.rack) W.rack.setDraw(null, false);
  sfx.drone(s.world);
  counter.textContent = String(i+1).padStart(2,'0') + ' / ' + S.length;
  slideExtras(s);
  location.hash = i+1; updateNotes();
}
let activeWorld = null;

function slideExtras(s){
  if (s.mood==='alert') setTimeout(()=>sfx.deny(), 900);
  if (s.title==='Close') setTimeout(()=>sfx.chime(), 700);
  if (s.title==='Method: risk score') setTimeout(()=>sfx.deny(), 2200);
  if (/Isolation Forest/.test(s.title)) isoAnim();
  if (s.title === 'Method: risk score'){ const n = $('#needle i'); if (n){ n.style.left='0%'; setTimeout(()=>{ n.style.left='74.2%'; }, 900); setTimeout(()=>{ n.style.left='90%'; }, 2400); } }
}

// Isolation Forest: random cuts isolate the outlier quickly
function isoAnim(){
  const svg = $('#isoSvg'); if (!svg) return; const NS='http://www.w3.org/2000/svg';
  let seed = 7; const rnd = () => (seed = (seed*16807)%2147483647, seed/2147483647);
  const pts = []; for (let i=0;i<70;i++){ const a=rnd()*6.28, r=Math.sqrt(rnd())*120; pts.push([300+Math.cos(a)*r*1.2, 360+Math.sin(a)*r]); }
  const out = [640, 110];
  svg.innerHTML = `<rect x="2" y="2" width="756" height="636" rx="10" fill="#f6f1e3" stroke="#14161c" stroke-width="3"/>` +
    pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="#2d3fd0"/>`).join('') + `<circle cx="${out[0]}" cy="${out[1]}" r="13" fill="#ef4a2a" stroke="#14161c" stroke-width="3"/>`;
  const cuts = [ ['v',520,0,640,'cut 1'], ['h',230,520,760,'cut 2: isolated'], ['v',180,0,640,''], ['h',470,180,520,''], ['v',360,180,470,''], ['h',300,180,360,''] ];
  cuts.forEach((c,i)=>{ setTimeout(()=>{ const l=document.createElementNS(NS,'line');
    if (c[0]==='v'){ l.setAttribute('x1',c[1]); l.setAttribute('x2',c[1]); l.setAttribute('y1',c[2]); l.setAttribute('y2',c[3]); } else { l.setAttribute('y1',c[1]); l.setAttribute('y2',c[1]); l.setAttribute('x1',c[2]); l.setAttribute('x2',c[3]); }
    l.setAttribute('stroke', i<2?'#ef4a2a':'#14161c'); l.setAttribute('stroke-width', i<2?5:3); l.setAttribute('stroke-dasharray', i<2?'':'10 8'); l.style.opacity=0; l.style.transition='opacity .5s'; svg.appendChild(l); requestAnimationFrame(()=>l.style.opacity=1);
    if (c[4]){ const t=document.createElementNS(NS,'text'); t.textContent=c[4]; t.setAttribute('font-family','Geist Mono'); t.setAttribute('font-size','24'); t.setAttribute('fill','#c2361b');
      if (c[0]==='v'){ t.setAttribute('x',c[1]+10); t.setAttribute('y',620);} else { t.setAttribute('x',c[2]+14); t.setAttribute('y',c[1]-12);} svg.appendChild(t); }
    if (i===5){ const t=document.createElementNS(NS,'text'); t.textContent='normal points: still not isolated'; t.setAttribute('x',40); t.setAttribute('y',612); t.setAttribute('font-family','Geist Mono'); t.setAttribute('font-size','22'); t.setAttribute('fill','#14161c'); svg.appendChild(t); }
  }, 900 + i*650); });
}

// ---------- transitions ----------
const wait = ms => new Promise(r=>setTimeout(r,ms));
function flash(msg){ const el=document.createElement('div'); el.className='hint'; el.textContent=msg; ui.appendChild(el); setTimeout(()=>{ el.style.opacity=0; setTimeout(()=>el.remove(),700); }, 1200); }
async function go(n, dir=1){
  if (busy || n<0 || n>=S.length) return;
  const from = S[cur], to = S[n];
  if (cur>=0 && started===null) started = performance.now();
  const now = performance.now(); if (cur>=0) perSlide[cur] += (now-enteredAt)/1000; enteredAt = now;
  busy = true; step = (dir<0 && to.steps) ? to.steps : 0;
  if (!from){ cur=n; render(n); busy=false; return; }
  const kind = to.trans === 'breakout' && dir>0 ? 'breakout' : (from.world === to.world ? 'same' : 'wash');
  if (kind === 'same'){ sfx.tick();
    frame.classList.add('out'); await wait(420); frame.classList.remove('out','on'); cur=n; render(n);
  } else if (kind === 'breakout'){
    // the boring slide tilts away, revealing the sea; it becomes the floating page
    sfx.breakout(); W.net.setSlide(to, true); activeWorld='net'; document.body.className=''; frame.innerHTML='';
    boringEl.style.transition = 'transform 2.2s cubic-bezier(.55,0,.2,1), opacity 1.1s ease 1.3s';
    boringEl.style.transform = 'perspective(1400px) translate3d(14vw,8vh,-2600px) rotateX(18deg) rotateY(-24deg) rotateZ(4deg)';
    boringEl.style.opacity = 0; await wait(2300); boringEl.style.transition=''; cur=n; render(n);
  } else {
    sfx.whoosh(); sheet.style.background = to.world==='flat' ? to.bg : '#0b0f18';
    sheet.animate([{top:'120%',transform:'rotate(-3deg)'},{top:'-15%',transform:'rotate(0deg)'}],{duration:620,easing:'cubic-bezier(.6,0,.4,1)',fill:'forwards'});
    await wait(640); frame.classList.remove('on'); cur=n; render(n); await wait(60);
    sheet.animate([{top:'-15%',transform:'rotate(0deg)'},{top:'-150%',transform:'rotate(3deg)'}],{duration:700,easing:'cubic-bezier(.6,0,.4,1)',fill:'forwards'});
    await wait(700);
  }
  busy = false;
}
function next(){ const s=S[cur]; if (s.steps && step < s.steps){ step++; render(cur); sfx.glitch(); return; } go(cur+1, 1); }
function prev(){ const s=S[cur]; if (s.steps && step>0){ step--; render(cur); return; } go(cur-1, -1); }

// ---------- presenter UI ----------
let notesOn=false, overOn=false, helpOn=false;
const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function updateNotes(){
  let el = $('.notes', ui); if (!notesOn){ el && el.remove(); return; }
  if (!el){ el = document.createElement('div'); el.className='notes'; ui.appendChild(el); }
  const s = S[cur]; const target = S.slice(0,cur+1).reduce((a,x)=>a+x.time,0); const total = S.reduce((a,x)=>a+x.time,0);
  const el2 = started ? (performance.now()-started)/1000 : 0; const onSlide = (performance.now()-enteredAt)/1000;
  el.innerHTML = `<p><b>${cur+1}. ${s.title}</b>${s.label?` · ${s.label}`:''}<br>${s.notes}</p><div class="meta">slide ${fmt(onSlide)} / ${fmt(s.time)}<br><span class="${el2>target?'late':'ok'}">elapsed ${fmt(el2)}</span> · plan ${fmt(target)}<br>total plan ${fmt(total)}</div>`;
}
setInterval(()=>{ if (notesOn) updateNotes(); }, 500);
function toggleOver(){
  overOn=!overOn; let el=$('.over',ui); if(!overOn){ el&&el.remove(); return; }
  el=document.createElement('div'); el.className='over'; el.innerHTML=S.map((s,i)=>`<button data-i="${i}" aria-current="${i===cur}"><small>${String(i+1).padStart(2,'0')} · ${fmt(s.time)}</small>${s.title}</button>`).join('');
  el.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; toggleOver(); go(+b.dataset.i, +b.dataset.i>cur?1:-1); }; ui.appendChild(el);
}
function toggleHelp(){ helpOn=!helpOn; let el=$('.help',ui); if(!helpOn){ el&&el.remove(); return; }
  el=document.createElement('div'); el.className='help'; el.innerHTML='<b>→ / Space / click</b><span>next</span><b>←</b><span>back</span><b>N</b><span>speaker notes + timer</span><b>G</b><span>all slides</span><b>F</b><span>full screen</span><b>M</b><span>sound on / off</span><b>?</b><span>this help</span>'; ui.appendChild(el); }
addEventListener('keydown', e => {
  if (e.metaKey||e.ctrlKey||e.altKey) return; sfx.unlock();
  if (e.key==='m'||e.key==='M'){ const m = sfx.toggle(); flash(m ? 'Sound off' : 'Sound on'); return; }
  const k = e.key;
  if (k==='ArrowRight'||k===' '||k==='PageDown'||k==='Enter'){ e.preventDefault(); next(); }
  else if (k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){ e.preventDefault(); prev(); }
  else if (k==='n'||k==='N'){ notesOn=!notesOn; updateNotes(); }
  else if (k==='g'||k==='G'||k==='Escape'){ if (k==='Escape' && !overOn) return; toggleOver(); }
  else if (k==='f'||k==='F'){ document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(()=>{}); }
  else if (k==='?'||k==='h'||k==='H'){ toggleHelp(); }
  else if (k==='Home') go(0,-1); else if (k==='End') go(S.length-1,1);
});
addEventListener('click', e => { sfx.unlock(); if (e.target.closest('.over,.help,.notes')) return; (e.clientX < innerWidth*0.2) ? prev() : next(); });
let tx=null; addEventListener('touchstart', e=>{ tx=e.touches[0].clientX; }, {passive:true});
addEventListener('touchend', e=>{ if(tx===null) return; const dx=e.changedTouches[0].clientX-tx; if (Math.abs(dx)>40) (dx<0?next():prev()); tx=null; });

// ---------- loop ----------
const clock = new THREE.Clock(); let fxCur = .5;
function loop(){
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  const w = W[activeWorld];
  if (R && w){ w.update(t, dt); const s=S[cur]||{}; const fx=s.fx||.5; const vw=innerWidth, vh=innerHeight; fxCur += (fx-fxCur)*Math.min(1,dt*2.5);
    if (Math.abs(fxCur-.5)>.001) w.camera.setViewOffset(vw, vh, (.5-fxCur)*vw, 0, vw, vh); else w.camera.clearViewOffset();
    R.render(w.scene, w.camera); }
  requestAnimationFrame(loop);
}
addEventListener('resize', resize);
await document.fonts.ready.catch(()=>{});
resize();
if (R){ // warm up every world once so the first transition does not stutter
  Object.values(W).forEach(w => { w.setSlide(S.find(s=>W[s.world]===w), true); w.update(0, .016); R.compile(w.scene, w.camera); });
}
const start = Math.max(0, Math.min(S.length-1, (parseInt(location.hash.slice(1))||1)-1));
cur = start; render(start); loop();
$('.load').style.opacity = 0; setTimeout(()=>$('.load').remove(), 600);
const hint = document.createElement('div'); hint.className='hint'; hint.textContent='→ to advance · N notes and timer · M sound · ? help'; ui.appendChild(hint); setTimeout(()=>hint.style.opacity=0, 4500);
window.__deck = { go, next, prev, get cur(){ return cur; } };
