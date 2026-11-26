// Skyward Rally - flight model: throttle, turning, climb, fuel, damage and terrain contact.
// Pure state maths; it knows nothing about pixels or the DOM.

import { LIMITS } from './config.js';
import { groundHeight } from './world.js';

export function createAircraft(preset) {
  return {
    x: preset?.x ?? 0,
    y: preset?.y ?? 260,
    z: preset?.z ?? 0,
    prevZ: preset?.z ?? 0,
    heading: preset?.heading ?? 0,
    roll: preset?.roll ?? 0,
    pitch: preset?.pitch ?? 0,
    speed: preset?.speed ?? 165,
    throttle: preset?.throttle ?? 0.7,
    fuel: preset?.fuel ?? 100,
    damage: 0,
    gear: preset?.gear ?? false,
    time: 0,
    hitFlash: 0,
  };
}

/** Advance the aircraft one fixed step. axes: {pitch, turn, throttle}, each -1..1. */
export function stepAircraft(plane, axes, dt, stage) {
  plane.prevZ = plane.z;
  plane.time += dt;
  plane.hitFlash = Math.max(0, plane.hitFlash - dt * 2.5);

  const targetThrottle = Math.max(0, Math.min(1, plane.throttle + axes.throttle * dt * 0.55));
  plane.throttle += (targetThrottle - plane.throttle) * Math.min(1, dt * 6);

  const targetRoll = axes.turn * 0.46;
  const targetPitch = axes.pitch * 0.26 - (stage === 'landing' && plane.y < 150 ? 0.05 : 0);
  plane.roll += (targetRoll - plane.roll) * Math.min(1, dt * 3.6);
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 3.2);

  const authority = 0.82 * (plane.speed / 180);
  plane.heading += axes.turn * authority * dt;

  const dry = LIMITS.stall + 18;
  const targetSpeed = dry + plane.throttle * (LIMITS.cruise - dry) - plane.pitch * 48;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.8);
  if (plane.fuel <= 0) plane.speed -= 24 * dt;
  plane.speed = Math.max(45, Math.min(LIMITS.max, plane.speed));

  const climb = plane.pitch * 96 + (plane.speed - 152) * 0.13;
  plane.y += climb * dt;

  plane.x += Math.sin(plane.heading) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;

  const burn = LIMITS.fuelBurnIdle + plane.throttle * (LIMITS.fuelBurnFull - LIMITS.fuelBurnIdle);
  plane.fuel = Math.max(0, plane.fuel - burn * dt);

  // A hard, banked pull close to the ridges stresses the airframe.
  const load = Math.abs(axes.turn) * (plane.speed / 190) + Math.abs(axes.pitch) * 0.7;
  const low = Math.max(0, 1 - (plane.y - groundHeight(plane.x, plane.z)) / 130);
  if (load > 1.05 && low > 0) plane.damage += (load - 1.05) * low * 8 * dt;

  const floor = groundHeight(plane.x, plane.z) + 5;
  if (plane.y < floor) {
    plane.y = floor;
    if (plane.speed > 120) {
      plane.damage += 10 * dt;
      plane.hitFlash = 1;
    }
  }
  if (stage === 'landing' && plane.y < 170) plane.gear = true;
  plane.damage = Math.min(100, plane.damage);
  return plane;
}

export function headingDegrees(plane) {
  const deg = (plane.heading * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}
