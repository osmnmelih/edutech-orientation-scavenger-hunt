// ─────────────────────────────────────────────────────────────────────────────
// ANTIGRAVITY 2.0 — Web Audio Synth Engine
// All sounds generated via Web Audio API (zero external assets, instant load).
// ─────────────────────────────────────────────────────────────────────────────

let _sfxCtx = null;

function _ctx() {
  if (typeof window === 'undefined') return null;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;

  if (!_sfxCtx || _sfxCtx.state === 'closed') {
    _sfxCtx = new C();
  }

  // Force playback category to bypass physical silent mute switch on iOS
  if (typeof navigator !== 'undefined' && navigator.audioSession) {
    try {
      if (navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
  }

  if (_sfxCtx.state === 'suspended') {
    _sfxCtx.resume().catch(() => {});
  }
  return _sfxCtx;
}

// Wrapper to guarantee the audio context is active before creating nodes
function _playSFX(playCallback) {
  try {
    const ctx = _ctx();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Play synchronously in the same callstack to satisfy browser autoplay policy
    playCallback(ctx);
  } catch (e) {
    console.warn('SFX playback failed:', e);
  }
}

// ── One-shot SFX Effects ────────────────────────────────────────────────────

export function playClickSound() {
  _playSFX((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  });
}

export function playUnlockSound() {
  _playSFX((ctx) => {
    const now = ctx.currentTime;
    [440, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.25);
    });
  });
}

export function playSuccessSound() {
  _playSFX((ctx) => {
    const now = ctx.currentTime;
    // 8-bit style upward chord C5→E5→G5→C6
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.28);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.3);
    });
  });
}

export function playPingSound() {
  _playSFX((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  });
}

// ── Background Cyber Ambient Synth Generator ─────────────────────────────────

let _ambientOsc1 = null;
let _ambientOsc2 = null;
let _ambientGain = null;
let _ambientInterval = null;
let _isAmbientPlaying = false;

let _tenseOsc = null;
let _tenseGain = null;
let _tenseInterval = null;
let _isTensePlaying = false;

export function startAmbientSpaceMusic() {
  if (typeof window === 'undefined') return;
  if (_isAmbientPlaying) return;

  const ctx = _ctx();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    _ambientGain = ctx.createGain();
    _ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
    _ambientGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2.0); // Gentle fade-in

    _ambientOsc1 = ctx.createOscillator();
    _ambientOsc2 = ctx.createOscillator();

    _ambientOsc1.type = 'sine';
    _ambientOsc2.type = 'triangle';

    _ambientOsc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 chord
    _ambientOsc2.frequency.setValueAtTime(164.81, ctx.currentTime); // E3 chord

    _ambientOsc1.connect(_ambientGain);
    _ambientOsc2.connect(_ambientGain);
    _ambientGain.connect(ctx.destination);

    _ambientOsc1.start();
    _ambientOsc2.start();
    _isAmbientPlaying = true;

    // Slow ambient pitch modulation for space atmosphere effect
    let step = 0;
    const notes = [110, 123.47, 130.81, 146.83];
    _ambientInterval = setInterval(() => {
      if (!ctx || !_ambientOsc1 || ctx.state === 'closed') return;
      step = (step + 1) % notes.length;
      try {
        _ambientOsc1.frequency.linearRampToValueAtTime(notes[step], ctx.currentTime + 3.0);
      } catch (e) {}
    }, 4000);
  } catch (e) {
    console.warn('Ambient music failed:', e);
  }
}

export function stopAmbientSpaceMusic() {
  if (_ambientInterval) {
    clearInterval(_ambientInterval);
    _ambientInterval = null;
  }
  if (_ambientGain && _sfxCtx) {
    try {
      _ambientGain.gain.linearRampToValueAtTime(0.001, _sfxCtx.currentTime + 0.5);
      setTimeout(() => {
        if (_ambientOsc1) { try { _ambientOsc1.stop(); _ambientOsc1.disconnect(); } catch (e) {} _ambientOsc1 = null; }
        if (_ambientOsc2) { try { _ambientOsc2.stop(); _ambientOsc2.disconnect(); } catch (e) {} _ambientOsc2 = null; }
        _isAmbientPlaying = false;
      }, 500);
    } catch (e) {
      _isAmbientPlaying = false;
    }
  } else {
    _isAmbientPlaying = false;
  }
}

export function startTenseMissionMusic() {
  if (typeof window === 'undefined') return;
  stopAmbientSpaceMusic();
  if (_isTensePlaying) return;

  const ctx = _ctx();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    _tenseGain = ctx.createGain();
    _tenseGain.gain.setValueAtTime(0.001, ctx.currentTime);
    _tenseGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.0);

    _tenseOsc = ctx.createOscillator();
    _tenseOsc.type = 'sawtooth';
    _tenseOsc.frequency.setValueAtTime(73.42, ctx.currentTime); // D2 low pulse

    // Filter to soften sawtooth bass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    _tenseOsc.connect(filter);
    filter.connect(_tenseGain);
    _tenseGain.connect(ctx.destination);

    _tenseOsc.start();
    _isTensePlaying = true;

    // Pulse rhythm ticker for mission/task mode
    let pulseToggle = false;
    _tenseInterval = setInterval(() => {
      if (!ctx || !_tenseOsc || ctx.state === 'closed') return;
      pulseToggle = !pulseToggle;
      try {
        _tenseOsc.frequency.setValueAtTime(pulseToggle ? 87.31 : 73.42, ctx.currentTime);
      } catch (e) {}
    }, 600);
  } catch (e) {
    console.warn('Tense music failed:', e);
  }
}

export function stopTenseMissionMusic() {
  if (_tenseInterval) {
    clearInterval(_tenseInterval);
    _tenseInterval = null;
  }
  if (_tenseGain && _sfxCtx) {
    try {
      _tenseGain.gain.linearRampToValueAtTime(0.001, _sfxCtx.currentTime + 0.4);
      setTimeout(() => {
        if (_tenseOsc) { try { _tenseOsc.stop(); _tenseOsc.disconnect(); } catch (e) {} _tenseOsc = null; }
        _isTensePlaying = false;
      }, 400);
    } catch (e) {
      _isTensePlaying = false;
    }
  } else {
    _isTensePlaying = false;
  }
}

export function getAudioStatus() {
  return _isAmbientPlaying || _isTensePlaying ? 'ACTIVE' : 'READY';
}

// Global window event listener to resume AudioContext on first mobile/desktop user interaction
if (typeof window !== 'undefined') {
  const resumeAudio = () => {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch (e) {}
    }
    if (!_sfxCtx || _sfxCtx.state === 'closed') {
      _sfxCtx = new C();
    }
    if (_sfxCtx && _sfxCtx.state === 'suspended') {
      _sfxCtx.resume().then(() => {
        const osc = _sfxCtx.createOscillator();
        const gain = _sfxCtx.createGain();
        gain.gain.setValueAtTime(0.0001, _sfxCtx.currentTime);
        osc.connect(gain);
        gain.connect(_sfxCtx.destination);
        osc.start();
        osc.stop(_sfxCtx.currentTime + 0.01);
      }).catch((err) => console.log('Audio resume error:', err));
    }
  };
  window.addEventListener('touchend', resumeAudio);
  window.addEventListener('click', resumeAudio);
}
