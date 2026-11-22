// audio.js — every sound in the game is synthesized with WebAudio: no
// audio files, no network, just oscillators and a little noise. The room
// hums low while the thief works; the alarm's pulse quickens with the meter.

export function makeAudio() {
  return {
    ctx: null,
    muted: false,
    humNodes: null,
    lastBeepAt: 0,
  };
}

// AudioContext only exists after a user gesture; call from a click or key.
export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  audio.ctx = new Ctor();
  startRoomHum(audio);
}

function startRoomHum(audio) {
  const ctx = audio.ctx;
  const gain = ctx.createGain();
  gain.gain.value = 0.035;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 55.7;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc2.start();
  audio.humNodes = { gain, osc, osc2 };
}

function blip(audio, frequency, duration, type, volume, slideTo) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function noiseBurst(audio, duration, volume) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playLootChime(audio) {
  blip(audio, 880, 0.12, 'sine', 0.18);
  setTimeout(() => blip(audio, 1320, 0.18, 'sine', 0.15), 70);
}

export function playCaughtSting(audio) {
  blip(audio, 220, 0.5, 'sawtooth', 0.22, 55);
  noiseBurst(audio, 0.3, 0.12);
}

export function playWinArpeggio(audio) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => blip(audio, freq, 0.3, 'triangle', 0.2), i * 120);
  });
}

export function playEmpZap(audio) {
  blip(audio, 1400, 0.25, 'square', 0.1, 180);
}

export function playSmokePuff(audio) {
  noiseBurst(audio, 0.5, 0.15);
}

export function playNoisemakerBeep(audio) {
  blip(audio, 1200, 0.08, 'square', 0.12);
  setTimeout(() => blip(audio, 1200, 0.08, 'square', 0.12), 180);
}

export function playClick(audio) {
  blip(audio, 660, 0.06, 'sine', 0.12);
}

export function playExitOpen(audio) {
  blip(audio, 392, 0.15, 'triangle', 0.18);
  setTimeout(() => blip(audio, 587, 0.25, 'triangle', 0.18), 120);
}

// The alarm's heartbeat: a soft tick whose pace follows the meter.
export function playAlarmTick(audio, alarmValue, nowMs) {
  if (!audio.ctx || audio.muted || alarmValue < 25) return;
  const interval = alarmValue >= 60 ? 320 : 700;
  if (nowMs - audio.lastBeepAt < interval) return;
  audio.lastBeepAt = nowMs;
  blip(audio, alarmValue >= 60 ? 980 : 740, 0.09, 'sine', 0.1);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.humNodes) audio.humNodes.gain.gain.value = audio.muted ? 0 : 0.035;
  return audio.muted;
}
