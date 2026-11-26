// Synthesised sound effects (Web Audio, no files). Starts on the first key press or click; M toggles mute.
let lastWorld = null, ctx = null, master = null, droneNodes = null, muted = false, noiseBuf = null;

function ensure(){
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : .7;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  return ctx;
}
const now = () => ctx.currentTime;
function env(g, t0, a, peak, dcy){ g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy); }
function noise(){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
function tone(type, f, t0, dur, peak, to){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  env(g, t0, .008, peak, dur); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05); }

export const sfx = {
  unlock(){ const first = !ctx; ensure(); if (first && lastWorld) this.drone(lastWorld); },
  get muted(){ return muted; },
  toggle(){ muted = !muted; if (ensure()) master.gain.setTargetAtTime(muted ? 0 : .7, now(), .05); return muted; },
  // filtered-noise sweep for scene changes
  whoosh(dur = .9){ if (!ensure() || muted) return; const t = now(); const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur*.55); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + dur*.45); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .05);
    tone('sine', 90, t, dur*.9, .18, 45); },
  // soft UI tick for text builds
  tick(){ if (!ensure() || muted) return; const t = now(); tone('triangle', 1800, t, .05, .08, 1200); tone('sine', 900, t+.01, .06, .05); },
  // digital glitch for the poisoned reveal
  glitch(){ if (!ensure() || muted) return; const t = now();
    for (let i=0;i<9;i++){ const f = 120 + Math.random()*1600; tone('square', f, t + i*.035, .03 + Math.random()*.03, .09, f*(.5+Math.random())); }
    const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; env(g, t, .005, .18, .25); n.connect(hp); hp.connect(g); g.connect(master); n.start(t); n.stop(t + .35);
    tone('sawtooth', 55, t, .5, .12, 40); },
  // the slide tearing open
  breakout(){ if (!ensure() || muted) return; const t = now(); this.glitch(); this.whoosh(2.2);
    tone('sine', 40, t + .1, 2.4, .35, 28); tone('sine', 220, t + 1.2, 1.4, .06, 330); },
  // alarm-ish denial for red / blocked moments
  deny(){ if (!ensure() || muted) return; const t = now(); tone('square', 180, t, .14, .07); tone('square', 140, t + .16, .22, .07); },
  // bright confirmation for results
  chime(){ if (!ensure() || muted) return; const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f,i) => tone('sine', f, t + i*.07, .9, .07)); },
  // data blips while a chart draws
  blips(n = 6, dur = 1.6){ if (!ensure() || muted) return; const t = now(); for (let i=0;i<n;i++) tone('sine', 600 + i*110, t + (i/n)*dur, .07, .05); },
  // low ambient bed that shifts with the scene
  drone(world){ lastWorld = world; if (!ctx) return; ensure(); const base = { net:55, term:65.4, neural:49, rack:41.2, flat:0, boring:0 }[world] ?? 0;
    if (!droneNodes){ const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), n = noise(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o1.type = 'sine'; o2.type = 'sine'; lp.type = 'lowpass'; lp.frequency.value = 380; ng.gain.value = .05; g.gain.value = 0;
      lfo.frequency.value = .08; lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency);
      o1.connect(g); o2.connect(g); n.connect(lp); lp.connect(ng); ng.connect(g); g.connect(master); o1.start(); o2.start(); n.start(); lfo.start();
      droneNodes = { o1, o2, g }; }
    const t = now(); if (base){ droneNodes.o1.frequency.setTargetAtTime(base, t, .8); droneNodes.o2.frequency.setTargetAtTime(base*1.5*1.003, t, .8); }
    droneNodes.g.gain.setTargetAtTime(base ? .06 : 0, t, 1.2); },
};
