// thief.js — Vesper, the thief: quiet footsteps, wall sliding, and the
// three tools of the trade. Every tool costs something: a charge the thief
// carries, picked up from crates or spent to stay unseen.

export const THIEF_RADIUS = 13;
export const THIEF_SPEED = 175;
export const THIEF_PICKUP_RADIUS = 26;
export const LOOT_GRAB_RADIUS = 30;

export const TOOL_DEFS = {
  emp: {
    label: 'EMP Pulse',
    key: '1',
    hint: 'kills every camera nearby for 6s',
  },
  smoke: {
    label: 'Smoke Bomb',
    key: '2',
    hint: 'a cloud no eye can see through, 8s',
  },
  noise: {
    label: 'Noisemaker',
    key: '3',
    hint: 'click a spot: guards walk to the sound',
  },
};

export const SMOKE_SECONDS = 8;
export const SMOKE_RADIUS = 70;
export const NOISE_LURE_RADIUS = 280;
export const EMP_RADIUS = 320;

export function makeThief(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2, // facing up the room on entry
    moving: false,
    // Charges carried. A heist starts light: one EMP, one smoke, two noises.
    tools: { emp: 1, smoke: 1, noise: 2 },
    selectedTool: 'emp',
    invulnerableLeft: 0, // grace seconds after being caught, shown as a blink
    stepPhase: 0, // drives the little footstep bob while walking
  };
}

// Circle against a wall rectangle: push the thief out along the shallow axis.
export function resolveCircleRect(thief, rect) {
  const nearestX = Math.max(rect.x, Math.min(thief.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(thief.y, rect.y + rect.h));
  const dx = thief.x - nearestX;
  const dy = thief.y - nearestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= THIEF_RADIUS * THIEF_RADIUS) return;
  if (distSq === 0) {
    thief.y = rect.y - THIEF_RADIUS; // centred inside a wall: push out the top
    return;
  }
  const dist = Math.sqrt(distSq);
  thief.x = nearestX + (dx / dist) * THIEF_RADIUS;
  thief.y = nearestY + (dy / dist) * THIEF_RADIUS;
}

// Move with the keys held, sliding along walls instead of sticking to them.
export function moveThief(thief, input, dt, walls) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  thief.moving = dx !== 0 || dy !== 0;
  if (!thief.moving) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  thief.angle = Math.atan2(dy, dx);
  thief.stepPhase += dt * 11;
  thief.x += dx * THIEF_SPEED * dt;
  for (const wall of walls) resolveCircleRect(thief, wall);
  thief.y += dy * THIEF_SPEED * dt;
  for (const wall of walls) resolveCircleRect(thief, wall);
}

// The thief grabs loot by touching it and tool crates by walking over them.
export function thiefTouches(thief, x, y, radius) {
  return Math.hypot(thief.x - x, thief.y - y) < radius + THIEF_RADIUS;
}
