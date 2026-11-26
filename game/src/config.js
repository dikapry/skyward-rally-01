// Skyward Rally - shared constants, colour palette, deterministic RNG and shot presets.
// Every value here is plain data: no imports, no side effects, no network access.

export const PALETTE = Object.freeze({
  skyTop: '#172a4e',
  skyMid: '#62508d',
  skyLow: '#e88560',
  skyHaze: '#ffc98a',
  sun: '#ffe6b4',
  cloud: 'rgba(255, 226, 205, 0.26)',
  ridgeFar: '#42527a',
  ridgeMid: '#2a5068',
  ridgeNear: '#173b4a',
  groundFar: '#22606a',
  groundNear: '#0d3540',
  grid: 'rgba(126, 226, 208, 0.19)',
  river: '#45b5c5',
  riverEdge: '#93e5d8',
  rockLight: '#337475',
  rockDark: '#153d48',
  rockSnow: '#a8ddd2',
  runway: '#24303b',
  runwayEdge: '#e8f3f2',
  stripe: '#f4d68a',
  ring: '#7ef2d4',
  ringDim: '#3f928c',
  ringGold: '#ffd187',
  hud: '#a6f5e3',
  hudPanel: 'rgba(8, 32, 41, 0.66)',
  warn: '#ff8f70',
  body: '#e9f2f3',
  wing: '#b3cbd2',
  accent: '#ff7052',
  canopy: '#123a47',
  navRed: '#ff5f67',
  navGreen: '#71ffa9',
  flame: '#ffd18d',
});

// Small deterministic PRNG so a ?seed= always builds the same world.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The rally course: four gates in a valley, then a runway in the flats beyond.
export const RINGS = Object.freeze([
  Object.freeze({ x: 0, y: 286, z: 540, r: 50, name: 'CINDER' }),
  Object.freeze({ x: 118, y: 322, z: 990, r: 48, name: 'RIDGE' }),
  Object.freeze({ x: -96, y: 250, z: 1460, r: 46, name: 'RIVER' }),
  Object.freeze({ x: 34, y: 172, z: 1940, r: 44, name: 'HOME' }),
]);

export const RUNWAY = Object.freeze({
  x: 0,
  z0: 2290,
  z1: 2750,
  width: 68,
});

export const LIMITS = Object.freeze({
  stall: 78,
  cruise: 220,
  max: 270,
  fuelBurnIdle: 0.22,
  fuelBurnFull: 0.82,
});

// Deterministic camera states used by ?shot=... for screenshot capture.
export const SHOTS = Object.freeze({
  start: Object.freeze({
    overlay: 'title',
    plane: { x: 0, y: 258, z: 40, heading: 0.05, roll: -0.07, pitch: 0.02, speed: 168, throttle: 0.70, fuel: 88, gear: false },
    mission: { ringIndex: 0, stage: 'rings', score: 0 },
  }),
  play: Object.freeze({
    overlay: null,
    plane: { x: -18, y: 282, z: 250, heading: 0.06, roll: -0.20, pitch: 0.03, speed: 180, throttle: 0.78, fuel: 83, gear: false },
    mission: { ringIndex: 0, stage: 'rings', score: 0 },
  }),
  ring: Object.freeze({
    overlay: null,
    plane: { x: -10, y: 284, z: 392, heading: 0.015, roll: 0.05, pitch: 0.0, speed: 184, throttle: 0.82, fuel: 81, gear: false },
    mission: { ringIndex: 0, stage: 'rings', score: 0 },
  }),
  landing: Object.freeze({
    overlay: null,
    plane: { x: 5, y: 104, z: 2075, heading: -0.012, roll: 0.06, pitch: -0.05, speed: 132, throttle: 0.42, fuel: 46, gear: true },
    mission: { ringIndex: 4, stage: 'landing', score: 1100 },
  }),
});
