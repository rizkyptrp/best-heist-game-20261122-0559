// render.js — everything the player sees: the museum floor at night, the
// guards' and cameras' vision cones clipped by the walls they cannot see
// through, the thief, the loot, the HUD with its alarm meter, and the
// title, caught, room-clear, game-over and win screens.

import { GUARD_CONE_RANGE, guardConePoints } from './guards.js';
import { cameraConePoints } from './cameras.js';
import { FIELD, CANVAS } from './levels.js';
import { alarmState } from './alarm.js';

const GOLD = '#c9a227';
const GOLD_BRIGHT = '#ffd75e';
const INK = '#0d0b14';

// Point inside any wall rectangle?
function pointInWalls(x, y, walls) {
  for (const wall of walls) {
    if (x >= wall.x && x <= wall.x + wall.w && y >= wall.y && y <= wall.y + wall.h) return true;
  }
  return false;
}

// How far a ray from (x,y) travels before it hits a wall, at most maxDist.
export function rayDistance(x, y, angle, maxDist, walls) {
  let lo = 0;
  let hi = maxDist;
  if (!pointInWalls(x + Math.cos(angle) * maxDist, y + Math.sin(angle) * maxDist, walls)) return maxDist;
  for (let i = 0; i < 10; i += 1) {
    const mid = (lo + hi) / 2;
    if (pointInWalls(x + Math.cos(angle) * mid, y + Math.sin(angle) * mid, walls)) hi = mid;
    else lo = mid;
  }
  return lo;
}

// A cone polygon whose edge stops at the first wall in each direction, so
// the light reads as if it really cannot pass through stone.
function conePolygon(ctx, cx, cy, angle, halfAngle, range, walls) {
  const steps = 24;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i <= steps; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / steps;
    const d = rayDistance(cx, cy, a, range, walls);
    ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = '#171226';
  ctx.fillRect(0, FIELD.y, FIELD.width, FIELD.height);
  const tile = 64;
  for (let y = FIELD.y; y < FIELD.y + FIELD.height; y += tile) {
    for (let x = 0; x < FIELD.width; x += tile) {
      const odd = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = odd ? '#1b1530' : '#181327';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // A deep-red carpet runner down the middle of the hall.
  ctx.fillStyle = '#4a1620';
  ctx.fillRect(600, FIELD.y, 80, FIELD.height);
  ctx.fillStyle = '#5c1d28';
  ctx.fillRect(606, FIELD.y, 68, FIELD.height);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(606, FIELD.y, 68, FIELD.height);
  // Dust motes drifting in the dark, for atmosphere.
  ctx.fillStyle = 'rgba(255, 215, 94, 0.10)';
  for (let i = 0; i < 24; i += 1) {
    const mx = ((i * 173 + 40) % 1280);
    const my = FIELD.y + ((i * 97 + time * 6) % FIELD.height);
    ctx.fillRect(mx, my, 2, 2);
  }
}

function drawWalls(ctx, walls) {
  for (const wall of walls) {
    ctx.fillStyle = '#38304a';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = '#453d5c';
    ctx.fillRect(wall.x, wall.y, wall.w, 3);
    if (wall.kind === 'case') {
      // A glass display case: pale glass, gold frame, a glint.
      ctx.fillStyle = 'rgba(127, 179, 213, 0.22)';
      ctx.fillRect(wall.x + 4, wall.y + 4, wall.w - 8, wall.h - 8);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 2, wall.y + 2, wall.w - 4, wall.h - 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(wall.x + 10, wall.y + 8, wall.w - 20, 3);
    } else if (wall.kind === 'rope') {
      ctx.fillStyle = '#a02030';
      ctx.fillRect(wall.x, wall.y + 3, wall.w, 4);
      ctx.fillStyle = GOLD;
      for (let x = wall.x + 4; x < wall.x + wall.w; x += 28) {
        ctx.beginPath();
        ctx.arc(x, wall.y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (wall.kind === 'pillar') {
      ctx.fillStyle = '#2c2540';
      ctx.fillRect(wall.x + 4, wall.y + 4, wall.w - 8, wall.h - 8);
      ctx.strokeStyle = GOLD;
      ctx.strokeRect(wall.x + 2, wall.y + 2, wall.w - 4, wall.h - 4);
    }
  }
}

function drawExit(ctx, exit, open, time) {
  const glow = open ? 0.55 + 0.3 * Math.sin(time * 4) : 0.12;
  ctx.fillStyle = open ? '#2fae5f' : '#1d5c33';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = `rgba(80, 255, 150, ${glow})`;
  ctx.fillRect(exit.x - 6, exit.y - 26, exit.w + 12, exit.h + 26);
  ctx.fillStyle = open ? '#eafff0' : '#9fc7ab';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT · LOCKED', exit.x + exit.w / 2, exit.y - 10);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
}

const LOOT_COLORS = { painting: '#e8b4d8', gem: '#7fe3f0', gold: GOLD_BRIGHT };

function drawLoot(ctx, loot, time) {
  for (const item of loot) {
    if (item.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3 + item.x);
    if (item.target) {
      ctx.strokeStyle = `rgba(255, 215, 94, ${0.5 + 0.5 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 26 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = GOLD_BRIGHT;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ TARGET', item.x, item.y - 32);
    }
    if (item.kind === 'painting') {
      ctx.fillStyle = GOLD;
      ctx.fillRect(item.x - 22, item.y - 16, 44, 32);
      ctx.fillStyle = LOOT_COLORS.painting;
      ctx.fillRect(item.x - 18, item.y - 12, 36, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(item.x - 14, item.y - 9, 12, 8);
    } else if (item.kind === 'gem') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.sin(time * 2 + item.y) * 0.25);
      ctx.fillStyle = LOOT_COLORS.gem;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 2);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(item.x - 13, item.y - 6, 26, 12);
      ctx.fillStyle = GOLD_BRIGHT;
      ctx.fillRect(item.x - 11, item.y - 8, 22, 9);
    }
    ctx.fillStyle = `rgba(255, 215, 94, ${0.4 + 0.4 * pulse})`;
    ctx.fillRect(item.x - 1, item.y - 22, 2, 2);
    ctx.fillRect(item.x + 12, item.y + 10, 2, 2);
  }
}

function drawCrates(ctx, crates) {
  for (const crate of crates) {
    if (crate.taken) continue;
    ctx.fillStyle = '#2c4a6b';
    ctx.fillRect(crate.x - 12, crate.y - 12, 24, 24);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(crate.x - 12, crate.y - 12, 24, 24);
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    const label = crate.tool === 'emp' ? 'EMP' : crate.tool === 'smoke' ? 'SMK' : 'NOI';
    ctx.fillText(label, crate.x, crate.y + 4);
  }
}

function drawGuardCone(ctx, guard, walls, hot) {
  const pts = guardConePoints(guard);
  const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, GUARD_CONE_RANGE);
  const color = hot ? '255, 90, 60' : '255, 210, 90';
  grad.addColorStop(0, `rgba(${color}, 0.34)`);
  grad.addColorStop(1, `rgba(${color}, 0.05)`);
  ctx.fillStyle = grad;
  conePolygon(ctx, pts.x, pts.y, guard.angle, 0.61, GUARD_CONE_RANGE, walls);
  ctx.fill();
}

function drawCameraCone(ctx, camera, walls) {
  if (camera.disabledLeft > 0) return;
  const pts = cameraConePoints(camera);
  const grad = ctx.createRadialGradient(camera.x, camera.y, 8, camera.x, camera.y, camera.range);
  grad.addColorStop(0, 'rgba(255, 70, 70, 0.30)');
  grad.addColorStop(1, 'rgba(255, 70, 70, 0.04)');
  ctx.fillStyle = grad;
  conePolygon(ctx, pts.x, pts.y, camera.angle, 0.5, camera.range, walls);
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Body: a navy uniform, cap brim facing the patrol direction.
  ctx.fillStyle = '#2c4a6b';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c27a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(guard.angle);
  ctx.fillStyle = '#1c3247';
  ctx.fillRect(6, -9, 10, 18);
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.arc(16, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (guard.alert > 0.45) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  } else if (guard.distracted) {
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  }
}

function drawCamera(ctx, camera, time) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = camera.disabledLeft > 0 ? '#777' : '#ff4646';
  ctx.lineWidth = 2;
  ctx.strokeRect(-7, -7, 14, 14);
  if (camera.disabledLeft > 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕', 0, 5);
  } else {
    const blink = Math.sin(time * 5) > 0;
    ctx.fillStyle = blink ? '#ff2e2e' : '#7a1010';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (camera.disabledLeft > 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`EMP ${Math.ceil(camera.disabledLeft)}s`, Math.max(40, camera.x), camera.y + 24);
  }
}

function drawThief(ctx, thief, time) {
  if (thief.invulnerableLeft > 0 && Math.floor(time * 10) % 2 === 0) return; // blink
  const bob = thief.moving ? Math.sin(thief.stepPhase) * 2 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob);
  ctx.fillStyle = '#1c1c26';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6b4fa1';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hooded face, turned toward the direction of travel.
  ctx.rotate(thief.angle);
  ctx.fillStyle = '#6b4fa1';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(4, -7);
  ctx.lineTo(4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8ddff';
  ctx.beginPath();
  ctx.arc(5, -3.5, 1.8, 0, Math.PI * 2);
  ctx.arc(5, 3.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSmoke(ctx, clouds) {
  for (const cloud of clouds) {
    const alpha = Math.min(0.55, (cloud.left / 8) * 0.55 + 0.15);
    const grad = ctx.createRadialGradient(cloud.x, cloud.y, 4, cloud.x, cloud.y, cloud.radius);
    grad.addColorStop(0, `rgba(200, 200, 210, ${alpha})`);
    grad.addColorStop(1, 'rgba(200, 200, 210, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNoisemakers(ctx, makers) {
  for (const maker of makers) {
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.arc(maker.x, maker.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 140, 66, ${0.3 + 0.7 * Math.abs(Math.sin(maker.left * 6))})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(maker.x, maker.y, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.left / p.maxLeft);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function drawHud(ctx, state) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CANVAS.width, 64);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 62, CANVAS.width, 2);
  // Left: room name and objective.
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(state.level.name.toUpperCase(), 16, 24);
  ctx.fillStyle = '#b9b3cc';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(state.level.intro, 16, 46);
  // Centre: the alarm meter — the number the whole heist turns on.
  const alarm = state.alarm.value;
  const alarmColor = alarmState(state.alarm) === 'hot' ? '#ff4a3c' : alarmState(state.alarm) === 'warm' ? '#ffb02e' : '#3ecf6e';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e4f5';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('ALARM', 640, 20);
  ctx.fillStyle = '#241f33';
  ctx.fillRect(500, 28, 280, 18);
  ctx.fillStyle = alarmColor;
  ctx.fillRect(500, 28, 280 * (alarm / 100), 18);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.strokeRect(500, 28, 280, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(`${Math.floor(alarm)}%`, 640, 42);
  // Right: loot, lives, timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(`LOOT $${state.lootValue} / $${state.levelTotalValue}`, 1264, 24);
  ctx.fillStyle = '#ff6b81';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('♥'.repeat(state.lives) + '♡'.repeat(Math.max(0, 3 - state.lives)), 1264, 46);
  // Tools and timer share the HUD's bottom row, clear of the objective line.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9b3cc';
  ctx.font = '13px Georgia, serif';
  const t = state.thief.tools;
  const tools = [
    `1 EMP×${t.emp}${state.thief.selectedTool === 'emp' ? ' ◀' : ''}`,
    `2 SMK×${t.smoke}${state.thief.selectedTool === 'smoke' ? ' ◀' : ''}`,
    `3 NOI×${t.noise}${state.thief.selectedTool === 'noise' ? ' ◀' : ''}`,
  ].join('   ');
  ctx.fillText(tools, 640, 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e4f5';
  ctx.fillText(`⏱ ${formatTime(state.levelTime)}`, 1264, 60);
  // Toast message under the HUD.
  if (state.message && state.message.left > 0) {
    ctx.globalAlpha = Math.min(1, state.message.left);
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(340, 76, 600, 30);
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(340, 76, 600, 30);
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message.text, 640, 96);
    ctx.globalAlpha = 1;
  }
}

function drawOverlay(ctx, title, lines, footer) {
  ctx.fillStyle = 'rgba(10, 8, 18, 0.88)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(title, 640, 190);
  ctx.fillStyle = '#e8e4f5';
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 250 + i * 32));
  if (footer) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(footer, 640, 250 + lines.length * 32 + 48);
  }
}

export function render(ctx, state) {
  const time = state.time;
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  if (state.screen === 'title') {
    drawFloor(ctx, time);
    drawWalls(ctx, state.level.walls);
    drawOverlay(
      ctx,
      'THE VELVET VAULT',
      [
        'A museum after midnight. One thief, three galleries,',
        'and every guard in the building between you and the Crown of Vesna.',
        '',
        'WASD / arrows — move quietly      1 / 2 / 3 — choose a tool',
        'Click — throw the noisemaker at that spot      E — use the chosen tool',
        'M — mute      Stay out of the yellow cones and the red camera sweeps.',
        'Steal the ★ TARGET piece to unlock the green exit, then get out.',
      ],
      'PRESS ENTER OR CLICK TO BEGIN',
    );
    return;
  }
  drawFloor(ctx, time);
  drawLoot(ctx, state.level.loot, time);
  drawCrates(ctx, state.level.crates);
  const hot = state.alarm.value >= 60;
  for (const guard of state.guards) drawGuardCone(ctx, guard, state.level.walls, hot);
  for (const camera of state.cameras) drawCameraCone(ctx, camera, state.level.walls);
  drawWalls(ctx, state.level.walls);
  drawExit(ctx, state.level.exit, state.exitOpen, time); // the door sits in the wall, drawn over it
  for (const guard of state.guards) drawGuard(ctx, guard, time);
  for (const camera of state.cameras) drawCamera(ctx, camera, time);
  drawThief(ctx, state.thief, time);
  drawNoisemakers(ctx, state.noisemakers);
  drawSmoke(ctx, state.smokeClouds);
  drawParticles(ctx, state.particles);
  drawHud(ctx, state);
  if (state.screen === 'caught') {
    ctx.fillStyle = `rgba(160, 10, 20, ${0.25 + 0.2 * Math.sin(time * 10)})`;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    drawOverlay(ctx, 'CAUGHT!', ['A guard has you by the collar.', 'Back to the door — one life fewer.'], '');
  } else if (state.screen === 'levelclear') {
    drawOverlay(
      ctx,
      'ROOM CLEARED',
      [
        `${state.level.name} — loot $${state.levelLootValue} of $${state.levelTotalValue}.`,
        `Time bonus: $${state.levelTimeBonus}.`,
        '',
        'The next gallery waits. The guards there are less forgiving.',
      ],
      'PRESS ENTER FOR THE NEXT ROOM',
    );
  } else if (state.screen === 'gameover') {
    drawOverlay(
      ctx,
      'THE VAULT KEEPS ITS SECRETS',
      [
        `You were caught one time too many. Loot kept: $${state.score}.`,
        'The museum changes its locks tonight — but there is always tomorrow.',
      ],
      'PRESS ENTER TO TRY AGAIN',
    );
  } else if (state.screen === 'win') {
    drawOverlay(
      ctx,
      'THE VAULT IS YOURS',
      [
        `The Crown of Vesna is in your pocket. Total loot: $${state.score}.`,
        `Three galleries, ${formatTime(state.totalTime)} of quiet footsteps,`,
        'and not one alarm that mattered.',
      ],
      'PRESS ENTER TO PLAY AGAIN',
    );
  }
}
