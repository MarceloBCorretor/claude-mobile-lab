let AC = null, muted = false;
try { muted = localStorage.getItem('pz3d_mute') === '1'; } catch (e) {}
export const isMuted = () => muted;
export function setMuted(v) { muted = v; try { localStorage.setItem('pz3d_mute', v ? '1' : '0'); } catch (e) {} }
export function unlockAudio() { try { if (AC && AC.state === 'suspended') AC.resume(); } catch (e) {} }
export function snd(f, d, type, v, slide) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(v || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
export function vib(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
