// alarm.js — the alarm meter: the museum's nerves. Being watched fills it,
// hiding drains it, and a full meter means the guards have the thief.
// The meter is the game's heartbeat: it must be readable at a glance.

export const ALARM_MAX = 100;
export const ALARM_RISE_PER_SECOND = 55; // at full sight strength
export const ALARM_FALL_PER_SECOND = 16; // while unseen
export const ALARM_CAUGHT_RESET = 30; // where the meter sits after a capture
export const ALARM_WARNING = 60; // past here the room knows something is wrong

export function makeAlarm() {
  return { value: 0 };
}

// Feed in the strongest sighting this frame (0..1 across guards and cameras)
// and the alarm climbs or falls. Returns 'caught' the frame it fills.
export function updateAlarm(alarm, sightStrength, dt) {
  if (sightStrength > 0) {
    alarm.value += sightStrength * ALARM_RISE_PER_SECOND * dt;
  } else {
    alarm.value -= ALARM_FALL_PER_SECOND * dt;
  }
  if (alarm.value < 0) alarm.value = 0;
  if (alarm.value >= ALARM_MAX) {
    alarm.value = ALARM_CAUGHT_RESET;
    return 'caught';
  }
  return 'ok';
}

export function alarmState(alarm) {
  if (alarm.value >= ALARM_WARNING) return 'hot';
  if (alarm.value >= 25) return 'warm';
  return 'calm';
}
