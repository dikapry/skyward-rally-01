// Skyward Rally - heads-up display: speed, altitude, heading, attitude, fuel,
// damage, gate progress and a target marker. Drawing only; it never changes state.

import { PALETTE, RINGS, RUNWAY } from './config.js';
import { headingDegrees } from './aircraft.js';
import { nextObjective } from './missions.js';
import { project } from './world.js';

function label(ctx, value, x, y, size, color, align = 'left') {
  ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, s) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(166, 245, 227, 0.45)';
  ctx.lineWidth = Math.max(1, s);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function bar(ctx, x, y, w, h, value, color, s) {
  ctx.fillStyle = 'rgba(4, 24, 30, 0.8)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, value)), h);
  ctx.strokeStyle = 'rgba(166, 245, 227, 0.55)';
  ctx.lineWidth = Math.max(1, s);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function drawHUD(ctx, w, h, plane, mission, camera) {
  const s = w / 1280;
  const pad = 18 * s;
  const small = 13 * s;
  const big = 30 * s;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Left: airspeed and altitude stacks.
  const leftW = 150 * s;
  panel(ctx, pad, pad, leftW, 116 * s, s);
  label(ctx, 'AIRSPEED', pad + 10 * s, pad + 16 * s, small, PALETTE.hud);
  label(ctx, String(Math.round(plane.speed)).padStart(3, '0'), pad + 10 * s, pad + 42 * s, big, '#ffffff');
  label(ctx, 'KT', pad + leftW - 12 * s, pad + 42 * s, small, PALETTE.hud, 'right');
  label(ctx, 'ALTITUDE', pad + 10 * s, pad + 76 * s, small, PALETTE.hud);
  label(ctx, String(Math.round(plane.y)).padStart(4, '0'), pad + 10 * s, pad + 100 * s, 24 * s, '#ffffff');
  label(ctx, 'M', pad + leftW - 12 * s, pad + 100 * s, small, PALETTE.hud, 'right');

  // Right: heading tape with a fixed centre bug.
  const rightW = 168 * s;
  const rx = w - pad - rightW;
  panel(ctx, rx, pad, rightW, 78 * s, s);
  label(ctx, 'HEADING', rx + 10 * s, pad + 15 * s, small, PALETTE.hud);
  label(ctx, `${String(Math.round(headingDegrees(plane))).padStart(3, '0')}°`, rx + rightW / 2, pad + 48 * s, 30 * s, '#ffffff', 'center');
  const heading = headingDegrees(plane);
  for (let tick = -3; tick <= 3; tick++) {
    const value = ((Math.round(heading / 10) * 10 + tick * 10) % 360 + 360) % 360;
    const tx = rx + rightW / 2 + tick * 20 * s;
    ctx.fillStyle = value === 0 ? PALETTE.stripe : PALETTE.hud;
    ctx.fillRect(tx - 0.5 * s, pad + 62 * s, Math.max(1, s), (value % 30 === 0 ? 8 : 4) * s);
  }

  // Attitude ball: bank rotates the horizon, pitch slides it.
  const ax = w * 0.5;
  const ay = h * 0.49;
  const radius = 60 * s;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(16, 62, 78, 0.80)';
  ctx.fillRect(ax - radius, ay - radius, radius * 2, radius * 2);
  ctx.translate(ax, ay);
  ctx.rotate(-plane.roll);
  const slide = plane.pitch * 150 * s;
  ctx.fillStyle = 'rgba(120, 186, 182, 0.55)';
  ctx.fillRect(-radius * 2, slide, radius * 4, radius * 2);
  ctx.strokeStyle = '#e8fbf3';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-radius * 2, slide);
  ctx.lineTo(radius * 2, slide);
  ctx.stroke();
  for (let deg = -30; deg <= 30; deg += 10) {
    if (deg === 0) continue;
    const ly = slide + (deg * 3.1) * s;
    ctx.strokeStyle = 'rgba(232, 251, 243, 0.55)';
    ctx.lineWidth = s;
    ctx.beginPath();
    ctx.moveTo(-12 * s, ly);
    ctx.lineTo(12 * s, ly);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(166, 245, 227, 0.75)';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(ax, ay, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.stripe;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(ax - 18 * s, ay);
  ctx.lineTo(ax - 5 * s, ay);
  ctx.moveTo(ax + 5 * s, ay);
  ctx.lineTo(ax + 18 * s, ay);
  ctx.moveTo(ax, ay - 5 * s);
  ctx.lineTo(ax, ay + 5 * s);
  ctx.stroke();

  // Bottom-left: throttle, fuel and damage.
  const bw = 196 * s;
  const by = h - pad - 94 * s;
  panel(ctx, pad, by, bw, 94 * s, s);
  label(ctx, 'THR', pad + 10 * s, by + 16 * s, small, PALETTE.hud);
  bar(ctx, pad + 46 * s, by + 10 * s, bw - 58 * s, 11 * s, plane.throttle, PALETTE.ring, s);
  label(ctx, 'FUEL', pad + 10 * s, by + 42 * s, small, PALETTE.hud);
  bar(ctx, pad + 46 * s, by + 36 * s, bw - 58 * s, 11 * s, plane.fuel / 100, plane.fuel < 22 ? PALETTE.warn : PALETTE.stripe, s);
  label(ctx, 'HULL', pad + 10 * s, by + 68 * s, small, PALETTE.hud);
  bar(ctx, pad + 46 * s, by + 62 * s, bw - 58 * s, 11 * s, 1 - plane.damage / 100, plane.damage > 60 ? PALETTE.warn : PALETTE.ring, s);

  // Bottom-right: gates and the next objective.
  const mw = 238 * s;
  const mx = w - pad - mw;
  const my = h - pad - 94 * s;
  panel(ctx, mx, my, mw, 94 * s, s);
  label(ctx, mission.stage === 'landing' ? 'FINAL - RUNWAY 36' : 'RALLY GATES', mx + 10 * s, my + 16 * s, small, PALETTE.hud);
  for (let i = 0; i < RINGS.length; i++) {
    const cx = mx + 22 * s + i * 34 * s;
    const cy = my + 44 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 * s, 0, Math.PI * 2);
    ctx.strokeStyle = i < mission.ringIndex ? PALETTE.ringGold : i === mission.ringIndex ? PALETTE.ring : PALETTE.ringDim;
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    if (i < mission.ringIndex) {
      ctx.fillStyle = PALETTE.ringGold;
      ctx.fill();
    }
    label(ctx, String(i + 1), cx, cy + 0.5 * s, 11 * s, i < mission.ringIndex ? '#173b4a' : PALETTE.hud, 'center');
  }
  label(ctx, `SCORE ${mission.score}`, mx + 10 * s, my + 74 * s, 17 * s, '#ffffff');

  // Target marker: a bracket around the next gate, with distance and name.
  const target = nextObjective(mission);
  if (target && camera) {
    const point = project(camera, target.x, target.y, target.z, w);
    if (point && point.depth > 30 && point.x > -300 && point.x < w + 300 && point.y > -300 && point.y < h + 300) {
      const size = Math.max(16 * s, Math.min(120 * s, target.radius * point.scale));
      const blink = 0.7 + 0.3 * Math.sin(plane.time * 5);
      ctx.strokeStyle = mission.stage === 'landing' ? PALETTE.stripe : `rgba(255, 209, 135, ${blink})`;
      ctx.lineWidth = 2.5 * s;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sy] of corners) {
        const px = point.x + sx * size;
        const py = point.y + sy * size * 0.82;
        ctx.beginPath();
        ctx.moveTo(px - sx * 12 * s, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py - sy * 12 * s);
        ctx.stroke();
      }
      const distance = Math.max(0, Math.round(target.z - plane.z));
      const marker = `${target.label}  ${distance}m`;
      const ty = point.y - size * 0.82 - (mission.stage === 'landing' ? 42 : 16) * s;
      const width = marker.length * 8.4 * s;
      ctx.fillStyle = 'rgba(8, 32, 41, 0.74)';
      ctx.fillRect(point.x - width / 2, ty - 10 * s, width, 20 * s);
      label(ctx, marker, point.x, ty, 14 * s, '#ffe0b0', 'center');
    }
  }

  if (mission.messageTimer > 0) {
    label(ctx, mission.message, w * 0.5, h - pad - 122 * s, 20 * s, PALETTE.stripe, 'center');
  }
  if (plane.damage > 70 || plane.fuel < 18) {
    const warning = plane.fuel < 18 ? 'LOW FUEL - THROTTLE BACK' : 'AIRFRAME STRESS - EASE THE TURN';
    label(ctx, warning, w * 0.5, pad + 30 * s, 18 * s, PALETTE.warn, 'center');
  }
  if (plane.gear) {
    label(ctx, 'GEAR DOWN', w * 0.5, h - pad - 108 * s, 13 * s, PALETTE.hud, 'center');
  }
  ctx.restore();
}
