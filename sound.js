// Synthesised sound effects (Web Audio, no files). Starts on the first key press or click; M toggles mute.
// Soft sine tones, nothing below 200 Hz and no background drone (laptop speakers turn those into a buzz), except
// the original poisoned-slide effects below.
let ctx = null, master = null, raw = null, muted = false, noiseBuf = null;
const VOLUME = .45;

function ensure(){
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : VOLUME;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;   // take the edge off
  const comp = ctx.createDynamicsCompressor(); master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
  raw = ctx.createGain(); raw.gain.value = muted ? 0 : .7; raw.connect(comp);   // original effects, original level
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  return ctx;
}
const now = () => ctx.currentTime;
// soft attack (20 ms) so no tone starts with a click
function tone(f, t0, dur, peak, to){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + .02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + .02 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .1); }
function air(t, dur, peak, from, to){ const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf;
  f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur*.4); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .05); }

// Original effects for the poisoned-slide reveal (glitch on the Agenda build, breakout into "The attack"),
// kept exactly as first designed.
function envO(g, t0, a, peak, dcy){ g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy); }
function noiseO(){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
function toneO(type, f, t0, dur, peak, to){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  envO(g, t0, .008, peak, dur); o.connect(g); g.connect(raw); o.start(t0); o.stop(t0 + dur + .05); }
function glitchO(){ const t = now();
  for (let i=0;i<9;i++){ const f = 120 + Math.random()*1600; toneO('square', f, t + i*.035, .03 + Math.random()*.03, .09, f*(.5+Math.random())); }
  const n = noiseO(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; envO(g, t, .005, .18, .25); n.connect(hp); hp.connect(g); g.connect(raw); n.start(t); n.stop(t + .35);
  toneO('sawtooth', 55, t, .5, .12, 40); }
function whooshO(dur){ const t = now(); const n = noiseO(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur*.55); f.frequency.exponentialRampToValueAtTime(500, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + dur*.45); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  n.connect(f); f.connect(g); g.connect(raw); n.start(t); n.stop(t + dur + .05);
  toneO('sine', 90, t, dur*.9, .18, 45); }

export const sfx = {
  unlock(){ ensure(); },
  get muted(){ return muted; },
  toggle(){ muted = !muted; if (ensure()){ master.gain.setTargetAtTime(muted ? 0 : VOLUME, now(), .05); raw.gain.setTargetAtTime(muted ? 0 : .7, now(), .05); } return muted; },
  // gentle airy sweep for scene changes
  whoosh(dur = .8){ if (!ensure() || muted) return; air(now(), dur, .12, 700, 2400); },
  // soft UI tick for text builds
  tick(){ if (!ensure() || muted) return; tone(1320, now(), .05, .035); },
  // digital glitch for the poisoned reveal (original)
  glitch(){ if (!ensure() || muted) return; glitchO(); },
  // the slide tearing open (original)
  breakout(){ if (!ensure() || muted) return; const t = now(); glitchO(); whooshO(2.2);
    toneO('sine', 40, t + .1, 2.4, .35, 28); toneO('sine', 220, t + 1.2, 1.4, .06, 330); },
  // soft two-note "no" for blocked moments
  deny(){ if (!ensure() || muted) return; const t = now(); tone(392, t, .18, .06); tone(311, t + .18, .28, .06); },
  // bright confirmation for results
  chime(){ if (!ensure() || muted) return; const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f,i) => tone(f, t + i*.08, .8, .05)); },
  // data blips while a chart draws
  blips(n = 6, dur = 1.6){ if (!ensure() || muted) return; const t = now(); for (let i=0;i<n;i++) tone(600 + i*60, t + (i/n)*dur, .06, .025); },
  // background drone removed (it buzzed on laptop speakers); kept as a no-op so callers need no change
  drone(){},
};
