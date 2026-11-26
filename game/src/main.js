// Skyward Rally - boot and the single frame loop.
// Keyboard input is read once per frame, physics and mission advance in fixed 1/60 s steps,
// and the renderer paints the resulting state. ?shot=start|play|ring|landing&seed=1 freezes a
// deterministic scene for screenshots; ordinary visits play the game from the title screen.

import { SHOTS } from './config.js';
import { createWorld } from './world.js';
import { createAircraft, stepAircraft } from './aircraft.js';
import { createMission, stepMission } from './missions.js';
import { createInput } from './input.js';
import { render } from './render.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const parsedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(parsedSeed) ? parsedSeed : Math.floor(Math.random() * 4294967296);
const shotName = params.get('shot');
const frozenShot = Object.hasOwn(SHOTS, shotName ?? '') ? SHOTS[shotName] : null;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');
const world = createWorld(seed);
const input = createInput(window);

let plane;
let mission;
let screen;
let accumulator = 0;
let last = performance.now();
let painted = 0;

function resize() {
  canvas.width = Math.max(480, Math.round(window.innerWidth));
  canvas.height = Math.max(480, Math.round(window.innerHeight));
}
window.addEventListener('resize', resize);
resize();

function announce(message) {
  status.textContent = message;
}

function reset(preset) {
  plane = createAircraft(preset?.plane ?? null);
  mission = createMission({ ...(preset?.mission ?? {}), planeZ: plane.z });
  screen = preset ? (preset.overlay ?? 'play') : 'title';
  accumulator = 0;
  announce(screen === 'title'
    ? 'Skyward Rally. Press Enter or Space to launch.'
    : 'Flying. Use W and S to pitch, A and D to turn, Q and E for throttle.');
}

function launch() {
  reset(null);
  screen = 'play';
  announce('Flying. Use W and S to pitch, A and D to turn, Q and E for throttle.');
}

function paint() {
  render(ctx, canvas.width, canvas.height, plane, mission, world, screen);
  painted += 1;
  if (frozenShot && painted === 2) window.__shotReady = true;
}

function advance() {
  const axes = input.axis();
  stepAircraft(plane, axes, STEP, mission.stage);
  stepMission(mission, plane, STEP);
  if (mission.stage === 'won' || mission.stage === 'crashed') {
    screen = mission.stage;
    announce(mission.stage === 'won'
      ? `Rally complete. Score ${mission.score}.`
      : `Flight ended: ${mission.reason}. Score ${mission.score}.`);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;

  if (frozenShot) {
    paint();
    return;
  }

  if (input.consume('confirm') && screen !== 'play') {
    input.clear();
    launch();
  }

  if (screen === 'play') {
    accumulator += elapsed;
    while (accumulator >= STEP && screen === 'play') {
      advance();
      accumulator -= STEP;
    }
  } else {
    accumulator = 0;
  }
  paint();
}

reset(frozenShot);
window.__skyward = {
  get plane() { return plane; },
  get mission() { return mission; },
  get screen() { return screen; },
  reset,
};
requestAnimationFrame(frame);
