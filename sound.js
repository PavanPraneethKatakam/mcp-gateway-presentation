// Synthesised sound effects (Web Audio, no files). Starts on the first key press or click; M toggles mute.
// Soft sine tones only, nothing below 200 Hz and no background drone: laptop speakers turn low or square-wave
// sounds into a buzz.
let ctx = null, master = null, muted = false, noiseBuf = null;
const VOLUME = .45;

function ensure(){
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : VOLUME;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;   // take the edge off
  const comp = ctx.createDynamicsCompressor(); master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
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

export const sfx = {
  unlock(){ ensure(); },
  get muted(){ return muted; },
  toggle(){ muted = !muted; if (ensure()) master.gain.setTargetAtTime(muted ? 0 : VOLUME, now(), .05); return muted; },
  // gentle airy sweep for scene changes
  whoosh(dur = .8){ if (!ensure() || muted) return; air(now(), dur, .12, 700, 2400); },
  // soft UI tick for text builds
  tick(){ if (!ensure() || muted) return; tone(1320, now(), .05, .035); },
  // two quick descending notes for the poisoned reveal
  glitch(){ if (!ensure() || muted) return; const t = now(); tone(880, t, .08, .05); tone(660, t + .07, .1, .05); },
  // the slide tearing open
  breakout(){ if (!ensure() || muted) return; const t = now(); air(t, 1.4, .14, 500, 3000); tone(440, t + .2, .5, .05, 330); tone(330, t + .55, .7, .05, 247); },
  // soft two-note "no" for blocked moments
  deny(){ if (!ensure() || muted) return; const t = now(); tone(392, t, .18, .06); tone(311, t + .18, .28, .06); },
  // bright confirmation for results
  chime(){ if (!ensure() || muted) return; const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f,i) => tone(f, t + i*.08, .8, .05)); },
  // data blips while a chart draws
  blips(n = 6, dur = 1.6){ if (!ensure() || muted) return; const t = now(); for (let i=0;i<n;i++) tone(600 + i*60, t + (i/n)*dur, .06, .025); },
  // background drone removed (it buzzed on laptop speakers); kept as a no-op so callers need no change
  drone(){},
};
