// Skyward Rally - drawing only. Sky, ridges, terrain, river, gates, runway, the aircraft
// and its instruments are painted from the simulation state; nothing here changes that state.

import { PALETTE, RUNWAY } from './config.js';
import { groundHeight, riverX, makeCamera, project, ringsWithState } from './world.js';
import { drawHUD } from './hud.js';

function text(ctx, value, x, y, size, color, align = 'center', weight = '600') {
  ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function drawSky(ctx, w, h, world, time) {
  const s = w / 1280;
  const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.58);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(0.56, PALETTE.skyMid);
  gradient.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const sx = w * 0.73;
  const sy = h * 0.28;
  const glow = ctx.createRadialGradient(sx, sy, 4 * s, sx, sy, 190 * s);
  glow.addColorStop(0, 'rgba(255, 230, 180, 0.85)');
  glow.addColorStop(0.28, 'rgba(255, 196, 138, 0.35)');
  glow.addColorStop(1, 'rgba(255, 196, 138, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 200 * s, sy - 200 * s, 400 * s, 400 * s);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  for (const cloud of world.clouds) {
    const drift = (cloud.drift * time * 40) % 2.4;
    const cx = ((cloud.x + drift + 1.2) % 2.4 - 1.2) * w * 0.5 + w * 0.5;
    const cy = cloud.y * h;
    const cw = 110 * s * cloud.s;
    ctx.fillStyle = PALETTE.cloud;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + (i - 1) * cw * 0.55, cy + (i % 2) * 6 * s, cw * 0.52, 13 * s * cloud.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const horizon = h * 0.455;
  const layers = [
    { color: PALETTE.ridgeFar, base: horizon + 2 * s, amp: 46 * s, period: 190 * s, phase: 0.8 },
    { color: PALETTE.ridgeMid, base: horizon + 9 * s, amp: 30 * s, period: 122 * s, phase: 2.2 },
    { color: PALETTE.ridgeNear, base: horizon + 16 * s, amp: 19 * s, period: 84 * s, phase: 4.1 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, layer.base);
    for (let x = 0; x <= w; x += 16 * s) {
      const u = x / layer.period + layer.phase;
      const y = layer.base - layer.amp * (0.5 + 0.5 * Math.sin(u)) - layer.amp * 0.22 * Math.sin(u * 2.7 + 1);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround(ctx, w, h, cam, world) {
  const s = w / 1280;
  const horizon = h * 0.455;
  const fill = ctx.createLinearGradient(0, horizon, 0, h);
  fill.addColorStop(0, PALETTE.groundFar);
  fill.addColorStop(1, PALETTE.groundNear);
  ctx.fillStyle = fill;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Winding river ribbon, laid on the ground before the grid and mountains.
  const left = [];
  const right = [];
  for (let z = 260; z <= 3600; z += 70) {
    const cx = riverX(z);
    left.push(project(cam, cx - 30, groundHeight(cx - 30, z), z, w));
    right.push(project(cam, cx + 30, groundHeight(cx + 30, z), z, w));
  }
  ctx.beginPath();
  let started = false;
  for (const p of left) {
    if (!p) continue;
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const p = right[i];
    if (p) ctx.lineTo(p.x, p.y);
  }
  if (started) {
    ctx.closePath();
    ctx.fillStyle = PALETTE.river;
    ctx.globalAlpha = 0.78;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Perspective survey grid: constant-z and constant-x lines over the valley floor.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = Math.max(1, s);
  for (let z = 300; z <= 3300; z += 180) {
    ctx.globalAlpha = Math.max(0.08, 0.55 - z / 7000);
    ctx.beginPath();
    let open = false;
    for (let x = -1500; x <= 1500; x += 150) {
      const p = project(cam, x, groundHeight(x, z), z, w);
      if (!p) { open = false; continue; }
      if (!open) { ctx.moveTo(p.x, p.y); open = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let x = -1500; x <= 1500; x += 300) {
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    let open = false;
    for (let z = 260; z <= 3400; z += 120) {
      const p = project(cam, x, groundHeight(x, z), z, w);
      if (!p) { open = false; continue; }
      if (!open) { ctx.moveTo(p.x, p.y); open = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Low-poly ridges, far to near, each with a shaded face and an occasional snow cap.
  const sorted = world.mountains.slice().sort((a, b) => {
    const da = (a.x - cam.x) ** 2 + (a.z - cam.z) ** 2;
    const db = (b.x - cam.x) ** 2 + (b.z - cam.z) ** 2;
    return db - da;
  });
  for (const m of sorted) {
    const baseLeft = project(cam, m.x - m.w, groundHeight(m.x - m.w, m.z), m.z, w);
    const baseRight = project(cam, m.x + m.w, groundHeight(m.x + m.w, m.z), m.z, w);
    const apex = project(cam, m.x, m.h, m.z, w);
    const middle = project(cam, m.x, groundHeight(m.x, m.z), m.z, w);
    if (!baseLeft || !baseRight || !apex || !middle) continue;
    if (apex.x < -300 || apex.x > w + 300 || apex.y < -200 || apex.y > h + 300) continue;
    ctx.fillStyle = PALETTE.rockDark;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(baseLeft.x, baseLeft.y);
    ctx.lineTo(middle.x, middle.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = m.tint > 0.55 ? PALETTE.rockLight : '#285962';
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(middle.x, middle.y);
    ctx.lineTo(baseRight.x, baseRight.y);
    ctx.closePath();
    ctx.fill();
    if (m.h > 138) {
      ctx.fillStyle = PALETTE.rockSnow;
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(apex.x - 9 * s * apex.scale * 0.02 - 4 * s, apex.y + 16 * s);
      ctx.lineTo(apex.x + 5 * s, apex.y + 12 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawRunway(ctx, w, s, cam);
}

function drawRunway(ctx, w, s, cam) {
  const half = RUNWAY.width / 2;
  const nearL = project(cam, RUNWAY.x - half, 0, RUNWAY.z0, w);
  const nearR = project(cam, RUNWAY.x + half, 0, RUNWAY.z0, w);
  const farL = project(cam, RUNWAY.x - half, 0, RUNWAY.z1, w);
  const farR = project(cam, RUNWAY.x + half, 0, RUNWAY.z1, w);
  if (!nearL || !nearR || !farL || !farR) return;

  ctx.fillStyle = PALETTE.runway;
  ctx.beginPath();
  ctx.moveTo(nearL.x, nearL.y);
  ctx.lineTo(nearR.x, nearR.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.lineTo(farL.x, farL.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = PALETTE.runwayEdge;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(nearL.x, nearL.y);
  ctx.lineTo(farL.x, farL.y);
  ctx.moveTo(nearR.x, nearR.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.stroke();

  for (let z = RUNWAY.z0 + 40; z < RUNWAY.z1 - 20; z += 84) {
    const a = project(cam, -2.4, 0, z, w);
    const b = project(cam, 2.4, 0, z, w);
    const c = project(cam, 2.4, 0, z + 40, w);
    const d = project(cam, -2.4, 0, z + 40, w);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = PALETTE.stripe;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = -2; i <= 2; i++) {
    const a = project(cam, i * 11 - 4, 0, RUNWAY.z0 + 14, w);
    const b = project(cam, i * 11 + 4, 0, RUNWAY.z0 + 14, w);
    const c = project(cam, i * 11 + 4, 0, RUNWAY.z0 + 48, w);
    const d = project(cam, i * 11 - 4, 0, RUNWAY.z0 + 48, w);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = PALETTE.runwayEdge;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = -4; i <= 4; i++) {
    const p = project(cam, i * 26, 2, RUNWAY.z0 - 46, w);
    if (!p) continue;
    ctx.fillStyle = i % 2 === 0 ? PALETTE.stripe : PALETTE.ring;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5 * s, 2.6 * p.scale * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGates(ctx, w, h, cam, plane, mission, s) {
  for (const gate of ringsWithState(mission)) {
    const p = project(cam, gate.x, gate.y, gate.z, w);
    if (!p || p.depth < 20) continue;
    const radius = gate.r * p.scale;
    if (radius < 3 || p.x < -radius - 100 || p.x > w + radius + 100) continue;
    const active = gate.state === 'active';
    const color = gate.state === 'passed' ? PALETTE.ringDim : active ? PALETTE.ringGold : PALETTE.ring;
    ctx.save();
    ctx.globalAlpha = gate.state === 'passed' ? 0.42 : 1;
    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 22 * s;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5 * s, Math.min(10 * s, radius * 0.075));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, radius, radius * 0.88, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(232, 251, 243, 0.55)';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, radius * 0.86, radius * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (active) {
      ctx.setLineDash([8 * s, 10 * s]);
      ctx.strokeStyle = PALETTE.ringGold;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius * 1.07, radius * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const side of [-1, 1]) {
      const foot = project(cam, gate.x + side * gate.r, groundHeight(gate.x + side * gate.r, gate.z), gate.z, w);
      if (!foot) continue;
      ctx.strokeStyle = 'rgba(126, 242, 212, 0.35)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(p.x + side * radius, p.y + radius * 0.44);
      ctx.lineTo(foot.x, foot.y);
      ctx.stroke();
    }
    if (radius > 34 * s) {
      text(ctx, gate.name, p.x, p.y - radius * 0.88 - 12 * s, 12 * s, color);
    }
    ctx.restore();
  }
}

function drawShadow(ctx, w, cam, plane, s) {
  const p = project(cam, plane.x, groundHeight(plane.x, plane.z), plane.z, w);
  if (!p || p.y < 0 || p.y > w * 2) return;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#06222b';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, Math.max(6 * s, 26 * p.scale * 0.03), Math.max(3 * s, 10 * p.scale * 0.03), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAircraft(ctx, w, h, plane, s) {
  const cx = w * 0.5;
  const cy = h * 0.725;
  const scale = (w / 1280) * (1 + (plane.speed - 170) / 900);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 1.15);
  ctx.scale(scale, scale);

  if (plane.hitFlash > 0) {
    ctx.shadowColor = PALETTE.warn;
    ctx.shadowBlur = 30;
  }

  // Exhaust: two warm plumes whose length follows throttle.
  const flame = 24 + plane.throttle * 54 + Math.sin(plane.time * 38) * 4;
  const plume = ctx.createLinearGradient(0, 64, 0, 64 + flame);
  plume.addColorStop(0, 'rgba(255, 209, 141, 0.95)');
  plume.addColorStop(1, 'rgba(255, 112, 82, 0)');
  ctx.fillStyle = plume;
  for (const ex of [-8, 8]) {
    ctx.beginPath();
    ctx.moveTo(ex - 5, 64);
    ctx.lineTo(ex + 5, 64);
    ctx.lineTo(ex + 2, 64 + flame);
    ctx.lineTo(ex - 2, 64 + flame);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Tailplane and vertical fin.
  ctx.fillStyle = PALETTE.wing;
  ctx.beginPath();
  ctx.moveTo(-8, 48); ctx.lineTo(-54, 78); ctx.lineTo(-54, 89); ctx.lineTo(-6, 70);
  ctx.lineTo(6, 70); ctx.lineTo(54, 89); ctx.lineTo(54, 78); ctx.lineTo(8, 48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.moveTo(-5, 52); ctx.lineTo(0, 12); ctx.lineTo(5, 52); ctx.closePath();
  ctx.fill();

  // Main wings, swept back with a bright leading edge.
  ctx.fillStyle = PALETTE.wing;
  ctx.beginPath();
  ctx.moveTo(-13, -22); ctx.lineTo(-124, 32); ctx.lineTo(-128, 51); ctx.lineTo(-12, 30);
  ctx.lineTo(12, 30); ctx.lineTo(128, 51); ctx.lineTo(124, 32); ctx.lineTo(13, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, -22); ctx.lineTo(-124, 32);
  ctx.moveTo(13, -22); ctx.lineTo(124, 32);
  ctx.stroke();
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.moveTo(-96, 39); ctx.lineTo(-124, 39); ctx.lineTo(-126, 49); ctx.lineTo(-96, 47); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, 39); ctx.lineTo(124, 39); ctx.lineTo(126, 49); ctx.lineTo(96, 47); ctx.closePath();
  ctx.fill();

  // Fuselage, nose first.
  ctx.fillStyle = PALETTE.body;
  ctx.beginPath();
  ctx.moveTo(0, -98);
  ctx.quadraticCurveTo(15, -74, 15, -30);
  ctx.lineTo(13, 60);
  ctx.quadraticCurveTo(0, 74, -13, 60);
  ctx.lineTo(-15, -30);
  ctx.quadraticCurveTo(-15, -74, 0, -98);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(18, 56, 71, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Canopy with a sunlit reflection.
  ctx.fillStyle = PALETTE.canopy;
  ctx.beginPath();
  ctx.ellipse(0, -34, 12, 29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(168, 221, 210, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-4, -42, 3, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose stripe and panel ticks.
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(-2, -86, 4, 34);
  ctx.strokeStyle = 'rgba(18, 56, 71, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, 8); ctx.lineTo(12, 8);
  ctx.moveTo(-12, 30); ctx.lineTo(12, 30);
  ctx.stroke();

  // Navigation lights and landing gear.
  const glow = 0.65 + 0.35 * Math.sin(plane.time * 6);
  ctx.globalAlpha = glow;
  ctx.fillStyle = PALETTE.navRed;
  ctx.beginPath(); ctx.arc(-126, 47, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.navGreen;
  ctx.beginPath(); ctx.arc(126, 47, 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  if (plane.gear) {
    ctx.fillStyle = '#243a45';
    for (const gx of [-30, 30]) {
      ctx.fillRect(gx - 3, 52, 6, 18);
      ctx.beginPath(); ctx.ellipse(gx, 71, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawOverlay(ctx, w, h, screen, plane, mission) {
  const s = w / 1280;
  if (screen === 'play') return;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 22, 32, 0.66)';
  ctx.fillRect(0, 0, w, h);
  const pw = 720 * s;
  const ph = 368 * s;
  const px = (w - pw) / 2;
  const py = (h - ph) / 2;
  ctx.fillStyle = 'rgba(10, 35, 45, 0.88)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = PALETTE.ring;
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(px + 0.5 * s, py + 0.5 * s, pw - s, ph - s);
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(px, py, pw, 5 * s);

  if (screen === 'title') {
    text(ctx, 'SKYWARD RALLY', w / 2, py + 88 * s, 62 * s, '#ffffff', 'center', '700');
    text(ctx, 'FOUR GATES  -  ONE RUNWAY  -  BRING IT HOME', w / 2, py + 132 * s, 19 * s, PALETTE.ring);
    const controls = [
      ['W / S  or  UP / DOWN', 'pitch'],
      ['A / D  or  LEFT / RIGHT', 'bank and turn'],
      ['Q / E', 'throttle'],
      [' Fly through the gold gates, then land', ''],
    ];
    for (let i = 0; i < controls.length; i++) {
      text(ctx, controls[i][0], px + 118 * s, py + 190 * s + i * 34 * s, 18 * s, '#c9e6e2', 'left');
      if (controls[i][1]) text(ctx, controls[i][1], px + 470 * s, py + 190 * s + i * 34 * s, 18 * s, '#8fd7cb', 'left');
    }
    text(ctx, 'PRESS ENTER OR SPACE TO LAUNCH', w / 2, py + ph - 42 * s, 22 * s, PALETTE.stripe);
  } else {
    const won = screen === 'won';
    text(ctx, won ? 'RALLY COMPLETE' : 'FLIGHT ENDED', w / 2, py + 100 * s, 56 * s, won ? PALETTE.ring : PALETTE.warn, 'center', '700');
    text(ctx, won ? 'Clean approach. The runway is yours.' : mission.reason, w / 2, py + 152 * s, 22 * s, '#c9e6e2');
    text(ctx, `SCORE ${mission.score}`, w / 2, py + 214 * s, 38 * s, '#ffffff');
    text(ctx, `GATES ${mission.ringIndex}/4   HULL ${Math.round(100 - plane.damage)}%   FUEL ${Math.round(plane.fuel)}%`, w / 2, py + 266 * s, 18 * s, PALETTE.hud);
    text(ctx, 'PRESS R OR ENTER TO FLY AGAIN', w / 2, py + ph - 42 * s, 21 * s, PALETTE.stripe);
  }
  ctx.restore();
}

/** Paint one complete frame. */
export function render(ctx, w, h, plane, mission, world, screen) {
  const cam = makeCamera(plane, w, h);
  const s = w / 1280;
  drawSky(ctx, w, h, world, plane.time);
  drawGround(ctx, w, h, cam, world);
  drawShadow(ctx, w, cam, plane, s);
  drawGates(ctx, w, h, cam, plane, mission, s);
  drawAircraft(ctx, w, h, plane, s);
  drawHUD(ctx, w, h, plane, mission, cam);
  drawOverlay(ctx, w, h, screen, plane, mission);
}
