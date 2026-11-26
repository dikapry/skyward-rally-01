// Skyward Rally - the world: terrain shape, gate and runway layout, seeded scenery,
// and the camera projection shared by every drawing module.

import { PALETTE, RINGS, RUNWAY, mulberry32 } from './config.js';

export function groundHeight(x, z) {
  const nearRunway = z > RUNWAY.z0 - 90 && z < RUNWAY.z1 + 120 && Math.abs(x) < 130;
  if (nearRunway) return 0;
  const rolling = 16 + 12 * Math.sin(x / 170) * Math.cos(z / 230) + 7 * Math.sin((x + z) / 105);
  const ridge = Math.max(0, 34 * Math.sin(z / 410 + 0.6) - Math.abs(x) / 46);
  return Math.max(0, rolling + ridge);
}

export function riverX(z) {
  if (z > RUNWAY.z0 - 220 && z < RUNWAY.z1 + 220) return 430;
  return 170 * Math.sin(z / 430 + 0.4) + 52 * Math.sin(z / 137);
}

export function createWorld(seed = 1) {
  const random = mulberry32(seed * 7919 + 11);
  const mountains = [];
  for (let i = 0; i < 84; i++) {
    const z = 220 + random() * 3300;
    const side = random() < 0.5 ? -1 : 1;
    const x = side * (150 + random() * 1250);
    if (z > RUNWAY.z0 - 160 && Math.abs(x) < 190) continue;
    mountains.push({
      x,
      z,
      h: 46 + random() * 132,
      w: 70 + random() * 150,
      tint: random(),
    });
  }
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    clouds.push({
      x: random() * 2 - 1,
      y: 0.08 + random() * 0.30,
      s: 0.5 + random() * 0.9,
      drift: 0.004 + random() * 0.008,
    });
  }
  return { seed, mountains, clouds };
}

// Camera sits behind and above the aircraft; forward is +z rotated by heading.
export function makeCamera(plane, width, height) {
  const fx = Math.sin(plane.heading);
  const fz = Math.cos(plane.heading);
  return {
    x: plane.x - fx * 22,
    y: plane.y + 5.5,
    z: plane.z - fz * 22,
    heading: plane.heading,
    focal: width * 0.62,
    horizon: height * 0.455,
  };
}

// World point -> screen point. null when the point is behind the camera.
export function project(cam, x, y, z, width) {
  const fx = Math.sin(cam.heading);
  const fz = Math.cos(cam.heading);
  const dx = x - cam.x;
  const dz = z - cam.z;
  const rx = dx * fz - dz * fx;
  const rz = dx * fx + dz * fz;
  if (rz < 2) return null;
  const scale = cam.focal / rz;
  return {
    x: width * 0.5 + rx * scale,
    y: cam.horizon - (y - cam.y) * scale,
    scale,
    depth: rz,
  };
}

export function ringsWithState(mission) {
  return RINGS.map((ring, index) => ({
    ...ring,
    index,
    state: index < mission.ringIndex ? 'passed' : index === mission.ringIndex ? 'active' : 'next',
  }));
}

export { PALETTE, RINGS, RUNWAY };
