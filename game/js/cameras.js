// cameras.js — the museum's wall-mounted security cameras: a cone that
// sweeps back and forth on a fixed mount, an EMP that knocks a camera out
// for a few seconds, and the same line-of-sight test the guards use.

import { angleDifference, hasLineOfSight } from './guards.js';

export const CAMERA_CONE_HALF_ANGLE = 0.5; // ~29 degrees each side
export const CAMERA_EMP_SECONDS = 6;

export function makeCamera(def) {
  return {
    name: def.name,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    range: def.range,
    angle: def.baseAngle,
    time: 0,
    disabledLeft: 0, // seconds of EMP blackout remaining
  };
}

// The cone sweeps around its base angle like a metronome; an EMP'd camera
// sits dark until its blackout runs out.
export function updateCamera(camera, dt) {
  camera.time += dt;
  if (camera.disabledLeft > 0) {
    camera.disabledLeft = Math.max(0, camera.disabledLeft - dt);
    return;
  }
  camera.angle = camera.baseAngle + Math.sin(camera.time * 0.55) * camera.sweep;
}

// How strongly this camera sees the thief: 0 when blind, off, or blocked.
export function cameraSeesThief(camera, thiefX, thiefY, walls, smokeClouds) {
  if (camera.disabledLeft > 0) return 0;
  const dx = thiefX - camera.x;
  const dy = thiefY - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > camera.range) return 0;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toThief, camera.angle)) > CAMERA_CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(camera.x, camera.y, thiefX, thiefY, walls, smokeClouds)) return 0;
  return 1 - (dist / camera.range) * 0.5;
}

export function cameraConePoints(camera) {
  const left = camera.angle - CAMERA_CONE_HALF_ANGLE;
  const right = camera.angle + CAMERA_CONE_HALF_ANGLE;
  return {
    x: camera.x,
    y: camera.y,
    leftX: camera.x + Math.cos(left) * camera.range,
    leftY: camera.y + Math.sin(left) * camera.range,
    rightX: camera.x + Math.cos(right) * camera.range,
    rightY: camera.y + Math.sin(right) * camera.range,
  };
}
