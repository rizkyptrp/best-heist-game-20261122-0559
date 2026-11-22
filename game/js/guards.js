// guards.js — the museum's patrol guards: waypoint walking, sweeping
// vision cones, and the line-of-sight test that decides whether a guard
// can actually see the thief (walls and smoke block the view).

export const GUARD_CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_CONE_RANGE = 210;
export const GUARD_RADIUS = 14;

// Does the segment from (x1,y1) to (x2,y2) cross a rectangle?
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// True when the line from the watcher to (tx,ty) is clear of every wall
// and is not hidden inside a smoke cloud.
export function hasLineOfSight(x1, y1, tx, ty, walls, smokeClouds) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, tx, ty, wall)) return false;
  }
  for (const cloud of smokeClouds) {
    // A smoke cloud hides the thief when the sight line passes through it.
    const cx = cloud.x;
    const cy = cloud.y;
    const dx = tx - x1;
    const dy = ty - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return true;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + dx * t;
    const nearY = y1 + dy * t;
    const distSq = (cx - nearX) * (cx - nearX) + (cy - nearY) * (cy - nearY);
    if (distSq < cloud.radius * cloud.radius) return false;
  }
  return true;
}

// Angle difference wrapped to [-PI, PI].
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function makeGuard(def) {
  const start = def.waypoints[0];
  return {
    name: def.name,
    x: start[0],
    y: start[1],
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    speed: def.speed,
    pause: def.pause,
    pauseLeft: 0,
    angle: 0,
    // A guard lured by a noisemaker walks to the sound, looks around, returns.
    distracted: null, // { x, y, lookLeft }
    alert: 0, // 0..1, how hard the guard is staring at the thief right now
  };
}

// Walk the patrol loop, pausing at each waypoint; a distracted guard walks
// to the noise first and only then resumes the patrol.
export function updateGuard(guard, dt, walls) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return;
  }
  let target;
  if (guard.distracted) {
    target = [guard.distracted.x, guard.distracted.y];
  } else {
    target = guard.waypoints[guard.waypointIndex];
  }
  const dx = target[0] - guard.x;
  const dy = target[1] - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    if (guard.distracted) {
      guard.distracted.lookLeft -= dt;
      guard.angle += dt * 1.6; // scan the room for the noise's source
      if (guard.distracted.lookLeft <= 0) guard.distracted = null;
    } else {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseLeft = guard.pause;
    }
    return;
  }
  const step = Math.min(dist, guard.speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  const wantedAngle = Math.atan2(dy, dx);
  guard.angle += angleDifference(wantedAngle, guard.angle) * Math.min(1, dt * 8);
}

// How strongly this guard sees the thief: 0 when unseen, up to 1 when the
// thief stands close inside the cone. Returns 0 when a wall or smoke hides them.
export function guardSeesThief(guard, thiefX, thiefY, walls, smokeClouds) {
  const dx = thiefX - guard.x;
  const dy = thiefY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_CONE_RANGE) return 0;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toThief, guard.angle)) > GUARD_CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(guard.x, guard.y, thiefX, thiefY, walls, smokeClouds)) return 0;
  // Closer reads are worse: a thief at arm's length is unmistakable.
  return 1 - (dist / GUARD_CONE_RANGE) * 0.55;
}

// The cone's outline, for drawing: centre, left edge, right edge.
export function guardConePoints(guard) {
  const left = guard.angle - GUARD_CONE_HALF_ANGLE;
  const right = guard.angle + GUARD_CONE_HALF_ANGLE;
  return {
    x: guard.x,
    y: guard.y,
    leftX: guard.x + Math.cos(left) * GUARD_CONE_RANGE,
    leftY: guard.y + Math.sin(left) * GUARD_CONE_RANGE,
    rightX: guard.x + Math.cos(right) * GUARD_CONE_RANGE,
    rightY: guard.y + Math.sin(right) * GUARD_CONE_RANGE,
  };
}
