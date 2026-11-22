// main.js — the heart of The Velvet Vault: the game loop, the screen state
// machine, tool use, loot pickup, the exit, and what happens when the
// guards catch the thief. Everything here is deterministic: the same
// inputs always play out the same way.

import { LEVELS, buildLevel, totalLootValue, CANVAS } from './levels.js';
import { makeGuard, updateGuard, guardSeesThief } from './guards.js';
import { makeCamera, updateCamera, cameraSeesThief } from './cameras.js';
import {
  makeThief, moveThief, thiefTouches, TOOL_DEFS,
  SMOKE_SECONDS, SMOKE_RADIUS, NOISE_LURE_RADIUS, EMP_RADIUS,
} from './thief.js';
import { makeAlarm, updateAlarm } from './alarm.js';
import {
  makeAudio, ensureAudio, playLootChime, playCaughtSting, playWinArpeggio,
  playEmpZap, playSmokePuff, playNoisemakerBeep, playClick, playExitOpen,
  playAlarmTick, toggleMute,
} from './audio.js';
import { makeInput, attachInput, wasPressed, consumeClick, clearPressed } from './input.js';
import { render } from './render.js';
import { shotFromQuery, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = makeInput();
attachInput(input, canvas);
const audio = makeAudio();

const state = {
  screen: 'title', // title | play | caught | levelclear | gameover | win
  time: 0,
  levelIndex: 0,
  level: null,
  thief: null,
  guards: [],
  cameras: [],
  alarm: makeAlarm(),
  lives: 3,
  score: 0,
  totalTime: 0,
  lootValue: 0, // loot taken across the whole heist, for the HUD
  levelLootValue: 0,
  levelTotalValue: 0,
  levelTime: 0,
  levelTimeBonus: 0,
  smokeClouds: [],
  noisemakers: [],
  particles: [],
  exitOpen: false,
  message: null,
  caughtTimer: 0,
  freezeAlarm: false, // screenshot poses hold the meter where the shot put it
};

function startLevel(index) {
  const level = buildLevel(index);
  state.levelIndex = index;
  state.level = level;
  state.thief = makeThief(level.playerStart.x, level.playerStart.y);
  state.guards = level.guards.map(makeGuard);
  state.cameras = level.cameras.map(makeCamera);
  state.alarm = makeAlarm();
  state.smokeClouds = [];
  state.noisemakers = [];
  state.particles = [];
  state.exitOpen = false;
  state.levelLootValue = 0;
  state.levelTotalValue = totalLootValue(level);
  state.levelTime = 0;
  state.levelTimeBonus = 0;
  state.message = { text: level.intro, left: 4 };
  state.caughtTimer = 0;
}

function startGame() {
  state.lives = 3;
  state.score = 0;
  state.totalTime = 0;
  state.lootValue = 0;
  startLevel(0);
  state.screen = 'play';
}

function showMessage(text, seconds) {
  state.message = { text, left: seconds };
}

function spawnLootBurst(x, y) {
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * (40 + i * 6),
      vy: Math.sin(angle) * (40 + i * 6),
      left: 0.6,
      maxLeft: 0.6,
      color: '#ffd75e',
      size: 3,
    });
  }
}

function useSelectedTool() {
  const thief = state.thief;
  const tool = thief.selectedTool;
  if (thief.tools[tool] <= 0) {
    showMessage(`No ${TOOL_DEFS[tool].label} left — find a blue crate.`, 2);
    return;
  }
  thief.tools[tool] -= 1;
  if (tool === 'emp') {
    let hit = 0;
    for (const camera of state.cameras) {
      if (Math.hypot(camera.x - thief.x, camera.y - thief.y) < EMP_RADIUS) {
        camera.disabledLeft = 6;
        hit += 1;
      }
    }
    playEmpZap(audio);
    showMessage(hit > 0 ? `EMP pulse — ${hit} camera${hit > 1 ? 's' : ''} dark for 6s.` : 'EMP pulse — no camera in range.', 2);
  } else if (tool === 'smoke') {
    state.smokeClouds.push({ x: thief.x, y: thief.y, radius: SMOKE_RADIUS, left: SMOKE_SECONDS });
    playSmokePuff(audio);
    showMessage('Smoke bomb — no eye can see through the cloud.', 2);
  }
}

function throwNoisemaker(x, y) {
  const thief = state.thief;
  if (thief.tools.noise <= 0) {
    showMessage('No noisemakers left — find a blue crate.', 2);
    return;
  }
  thief.tools.noise -= 1;
  state.noisemakers.push({ x, y, left: 4, lastBeep: 0 });
  playNoisemakerBeep(audio);
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - x, guard.y - y) < NOISE_LURE_RADIUS) {
      guard.distracted = { x, y, lookLeft: 2.5 };
    }
  }
}

function thiefInExit() {
  const thief = state.thief;
  const exit = state.level.exit;
  return (
    thief.x > exit.x - 10 && thief.x < exit.x + exit.w + 10 &&
    thief.y > exit.y - 16 && thief.y < exit.y + exit.h + 10
  );
}

function finishLevel() {
  state.totalTime += state.levelTime;
  state.levelTimeBonus = Math.max(0, Math.round((state.level.par - state.levelTime) * 10));
  state.score += state.levelTimeBonus;
  if (state.levelIndex >= LEVELS.length - 1) {
    state.screen = 'win';
    playWinArpeggio(audio);
  } else {
    state.screen = 'levelclear';
    playWinArpeggio(audio);
  }
}

function catchThief() {
  state.lives -= 1;
  playCaughtSting(audio);
  state.particles = [];
  if (state.lives <= 0) {
    state.screen = 'gameover';
    return;
  }
  state.screen = 'caught';
  state.caughtTimer = 1.8;
  // The guards drag the thief back to the door; the room resets around them.
  state.thief.x = state.level.playerStart.x;
  state.thief.y = state.level.playerStart.y;
  state.thief.invulnerableLeft = 2.5;
  for (const guard of state.guards) guard.distracted = null;
}

function updatePlay(dt) {
  const thief = state.thief;
  state.levelTime += dt;
  if (thief.invulnerableLeft > 0) thief.invulnerableLeft -= dt;

  moveThief(thief, input, dt, state.level.walls);
  for (const guard of state.guards) updateGuard(guard, dt, state.level.walls);
  for (const camera of state.cameras) updateCamera(camera, dt);

  // Tool selection and use.
  if (wasPressed(input, 'Digit1')) thief.selectedTool = 'emp';
  if (wasPressed(input, 'Digit2')) thief.selectedTool = 'smoke';
  if (wasPressed(input, 'Digit3')) thief.selectedTool = 'noise';
  if (wasPressed(input, 'KeyQ')) {
    const order = ['emp', 'smoke', 'noise'];
    thief.selectedTool = order[(order.indexOf(thief.selectedTool) + 1) % order.length];
  }
  if (wasPressed(input, 'KeyE') || wasPressed(input, 'Space')) {
    if (thief.selectedTool === 'noise') throwNoisemaker(input.mouseX, input.mouseY);
    else useSelectedTool();
  }
  const click = consumeClick(input);
  if (click) {
    ensureAudio(audio);
    if (thief.selectedTool === 'noise') throwNoisemaker(click.x, click.y);
    else if (thief.selectedTool === 'smoke') {
      if (thief.tools.smoke > 0 && Math.hypot(click.x - thief.x, click.y - thief.y) < 240) {
        thief.tools.smoke -= 1;
        state.smokeClouds.push({ x: click.x, y: click.y, radius: SMOKE_RADIUS, left: SMOKE_SECONDS });
        playSmokePuff(audio);
      } else {
        useSelectedTool();
      }
    } else {
      useSelectedTool();
    }
  }
  if (wasPressed(input, 'KeyM')) {
    const muted = toggleMute(audio);
    showMessage(muted ? 'Sound off.' : 'Sound on.', 1.5);
  }

  // Smoke fades; noisemakers beep and die.
  for (const cloud of state.smokeClouds) cloud.left -= dt;
  state.smokeClouds = state.smokeClouds.filter((c) => c.left > 0);
  for (const maker of state.noisemakers) {
    maker.left -= dt;
    maker.lastBeep += dt;
    if (maker.lastBeep > 0.6) {
      maker.lastBeep = 0;
      playNoisemakerBeep(audio);
    }
  }
  state.noisemakers = state.noisemakers.filter((m) => m.left > 0);

  // Loot: touch it and it is yours.
  for (const item of state.level.loot) {
    if (item.taken) continue;
    if (thiefTouches(thief, item.x, item.y, 30)) {
      item.taken = true;
      state.levelLootValue += item.value;
      state.lootValue += item.value;
      state.score += item.value;
      spawnLootBurst(item.x, item.y);
      playLootChime(audio);
      if (item.target) {
        state.exitOpen = true;
        playExitOpen(audio);
        showMessage(`★ ${item.label} stolen — THE EXIT IS OPEN. RUN!`, 4);
      } else {
        showMessage(`${item.label} — $${item.value}.`, 1.6);
      }
    }
  }
  // Tool crates restock the thief.
  for (const crate of state.level.crates) {
    if (crate.taken) continue;
    if (thiefTouches(thief, crate.x, crate.y, 26)) {
      crate.taken = true;
      thief.tools[crate.tool] += 1;
      playLootChime(audio);
      showMessage(`Picked up a ${TOOL_DEFS[crate.tool].label}.`, 2);
    }
  }

  // Being seen: the strongest sighting this frame drives the alarm.
  let sight = 0;
  if (thief.invulnerableLeft <= 0) {
    for (const guard of state.guards) {
      const seen = guardSeesThief(guard, thief.x, thief.y, state.level.walls, state.smokeClouds);
      guard.alert = seen;
      sight = Math.max(sight, seen);
    }
    for (const camera of state.cameras) {
      sight = Math.max(sight, cameraSeesThief(camera, thief.x, thief.y, state.level.walls, state.smokeClouds));
    }
  } else {
    for (const guard of state.guards) guard.alert = 0;
  }
  if (!state.freezeAlarm) {
    if (updateAlarm(state.alarm, sight, dt) === 'caught') catchThief();
  }
  playAlarmTick(audio, state.alarm.value, performance.now());

  // The exit, once open, ends the room.
  if (state.exitOpen && thiefInExit()) finishLevel();

  // Particles drift and fade.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.left -= dt;
  }
  state.particles = state.particles.filter((p) => p.left > 0);

  if (state.message) {
    state.message.left -= dt;
    if (state.message.left <= 0) state.message = null;
  }
}

function update(dt) {
  if (state.screen === 'title') {
    if (wasPressed(input, 'Enter') || wasPressed(input, 'NumpadEnter') || consumeClick(input)) {
      ensureAudio(audio);
      playClick(audio);
      startGame();
    }
    return;
  }
  if (state.screen === 'play') {
    updatePlay(dt);
    return;
  }
  if (state.screen === 'caught') {
    state.caughtTimer -= dt;
    if (state.caughtTimer <= 0) state.screen = 'play';
    return;
  }
  if (state.screen === 'levelclear') {
    if (wasPressed(input, 'Enter') || wasPressed(input, 'NumpadEnter')) {
      playClick(audio);
      startLevel(state.levelIndex + 1);
      state.screen = 'play';
    }
    return;
  }
  if (state.screen === 'gameover' || state.screen === 'win') {
    if (wasPressed(input, 'Enter') || wasPressed(input, 'NumpadEnter')) {
      playClick(audio);
      startGame();
    }
  }
}

// Debug hook for playtesting in a browser console: window.__velvetVault.
window.__velvetVault = state;

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.time += dt;
  update(dt);
  clearPressed(input);
  render(ctx, state);
  requestAnimationFrame(frame);
}

// Boot: title screen over Gallery I. A ?shot= pose freezes the game into
// the exact frame a screenshot needs, using the same state the game owns.
startGame();
state.screen = 'title';
const shot = shotFromQuery();
if (shot === 'tools') {
  startLevel(1);
  state.screen = 'play';
  state.freezeAlarm = applyShot(state, shot);
} else if (shot === 'cover' || shot === 'win') {
  state.freezeAlarm = applyShot(state, shot);
}
requestAnimationFrame(frame);
