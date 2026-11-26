// Skyward Rally - mission rules: four gates in order, then a runway landing.
// The mission never draws; it changes stage, score and short HUD messages.

import { RINGS, RUNWAY } from './config.js';
import { groundHeight } from './world.js';

export function createMission(preset) {
  return {
    ringIndex: preset?.ringIndex ?? 0,
    stage: preset?.stage ?? 'rings',
    score: preset?.score ?? 0,
    hits: 0,
    message: '',
    messageTimer: 0,
    reason: '',
    lastZ: preset?.planeZ ?? 0,
  };
}

function say(mission, text, seconds = 3) {
  mission.message = text;
  mission.messageTimer = seconds;
}

export function stepMission(mission, plane, dt) {
  const previousZ = mission.lastZ;
  mission.lastZ = plane.z;
  mission.messageTimer = Math.max(0, mission.messageTimer - dt);
  const floor = groundHeight(plane.x, plane.z) + 5;

  if (mission.stage === 'rings') {
    const ring = RINGS[mission.ringIndex];
    if (ring && previousZ < ring.z && plane.z >= ring.z) {
      const miss = Math.hypot(plane.x - ring.x, plane.y - ring.y);
      if (miss <= ring.r) {
        mission.ringIndex += 1;
        mission.score += 300 + Math.round((ring.r - miss) * 4);
        say(mission, `GATE ${ring.name} CLEAR  +${300 + Math.round((ring.r - miss) * 4)}`);
        if (mission.ringIndex >= RINGS.length) {
          mission.stage = 'landing';
          say(mission, 'ALL GATES CLEAR - LINE UP FOR THE RUNWAY', 5);
        }
      } else {
        mission.hits += 1;
        plane.damage = Math.min(100, plane.damage + 16);
        plane.hitFlash = 1;
        say(mission, `GATE ${ring.name} MISSED - DAMAGE +16`);
      }
    }
    if (plane.y <= floor && plane.speed > 110) {
      mission.stage = 'crashed';
      mission.reason = 'TERRAIN IMPACT';
    }
  } else if (mission.stage === 'landing') {
    const threshold = RUNWAY.z0;
    const aligned = Math.abs(plane.x - RUNWAY.x) < RUNWAY.width * 0.55;
    const slow = plane.speed <= 160;
    const level = plane.pitch <= 0.07;
    const onGround = plane.y <= floor + 8;

    if (plane.z >= threshold - 210 && plane.z <= RUNWAY.z1) {
      if (onGround && aligned && slow && level && plane.gear) {
        mission.score += 900 + Math.round((160 - plane.speed) * 6);
        mission.stage = 'won';
        say(mission, 'TOUCHDOWN - SKYWARD RALLY COMPLETE', 60);
      } else if (plane.y <= floor + 2 && (!aligned || !slow || !level || !plane.gear)) {
        mission.stage = 'crashed';
        mission.reason = !aligned ? 'OFF THE CENTRELINE' : !slow ? 'TOO FAST TO LAND' : !plane.gear ? 'GEAR UP' : 'UNSTABLE APPROACH';
      }
    } else if (plane.z > RUNWAY.z1 && mission.stage === 'landing') {
      mission.stage = 'crashed';
      mission.reason = 'RAN OUT OF RUNWAY';
    }
  }

  if (plane.fuel <= 0 && plane.y <= floor + 12 && mission.stage !== 'won' && mission.stage !== 'crashed') {
    mission.stage = 'crashed';
    mission.reason = 'OUT OF FUEL';
  }
  return mission;
}

export function nextObjective(mission) {
  if (mission.stage === 'rings') {
    const ring = RINGS[mission.ringIndex];
    return ring ? { x: ring.x, y: ring.y, z: ring.z, label: `GATE ${mission.ringIndex + 1}/4 ${ring.name}`, radius: ring.r } : null;
  }
  if (mission.stage === 'landing') {
    return { x: RUNWAY.x, y: 2, z: RUNWAY.z0, label: 'RUNWAY 36', radius: RUNWAY.width / 2 };
  }
  return null;
}
