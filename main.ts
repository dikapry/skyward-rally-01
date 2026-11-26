// Skyward Rally - the make.fun hand-in program (Node 22, standard library only).
// The game itself is game/: plain static files a desktop browser opens offline, with no build
// step and no network request. main.ts copies game/ and screenshots/ into the output directory
// and writes dossier.json from the vendored, byte-identical make.fun library.
//
// Before copying anything it validates the entry it is about to hand in: the page and every
// module the page loads must exist, and every shot named by shots.json must be a real, small
// image. A broken entry fails here instead of producing a dossier the grader would refuse.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SHOT_BYTES = 262144;
const SHOT_KINDS = ['start', 'play', 'ring', 'landing'];

const requiredFiles = [
  'game/index.html',
  'game/src/config.js',
  'game/src/input.js',
  'game/src/world.js',
  'game/src/aircraft.js',
  'game/src/missions.js',
  'game/src/hud.js',
  'game/src/render.js',
  'game/src/main.js',
];

function validateEntry(): void {
  for (const relative of requiredFiles) {
    if (!existsSync(join(here, relative))) throw new Error(`main.ts: missing required file ${relative}`);
  }
  const html = readFileSync(join(here, 'game/index.html'), 'utf8');
  if (!html.includes('id="game"') || !html.includes('id="status"')) {
    throw new Error('main.ts: game/index.html must keep canvas#game and p#status');
  }
  if (!existsSync(join(here, 'shots.json'))) throw new Error('main.ts: missing shots.json');
  const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8')) as { name: string; query: string }[];
  if (!Array.isArray(shots) || shots.length < 3 || shots.length > 4) {
    throw new Error('main.ts: shots.json must name 3 or 4 screenshots');
  }
  const seenNames = new Set<string>();
  for (const shot of shots) {
    if (seenNames.has(shot.name)) throw new Error(`main.ts: duplicate screenshot name ${shot.name}`);
    seenNames.add(shot.name);
    const file = join(here, 'screenshots', shot.name);
    if (!existsSync(file)) throw new Error(`main.ts: missing screenshot ${shot.name}`);
    if (statSync(file).size > MAX_SHOT_BYTES) throw new Error(`main.ts: screenshot ${shot.name} is over 256 KiB`);
    const query = new URLSearchParams(shot.query);
    const kind = query.get('shot') ?? '';
    if (!SHOT_KINDS.includes(kind) || query.get('seed') === null) {
      throw new Error(`main.ts: screenshot ${shot.name} needs a shot kind and a seed`);
    }
  }
}

validateEntry();
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the dossier bytes;
// the other caps refuse an entry the scorer would refuse. game/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
