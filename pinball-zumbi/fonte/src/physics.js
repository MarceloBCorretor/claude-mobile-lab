import { BR, G, MAXV } from './config.js';

export const segs = [];
function seg(x1, y1, x2, y2, o) { segs.push(Object.assign({ x1, y1, x2, y2, r: 2, e: .4 }, o || {})); }
function arc(cx, cy, r, a0, a1, n) {
  for (let i = 0; i < n; i++) {
    const p0 = a0 + (a1 - a0) * i / n, p1 = a0 + (a1 - a0) * (i + 1) / n;
    seg(cx + r * Math.cos(p0), cy + r * Math.sin(p0), cx + r * Math.cos(p1), cy + r * Math.sin(p1), { e: .3 });
  }
}
export const WALL = { L: 44, R: 496, T: 108, CR: 40 };
{
  const { L, R, T, CR } = WALL;
  seg(L + CR, T, R - CR, T);
  arc(L + CR, T + CR, CR, Math.PI, 1.5 * Math.PI, 6);
  arc(R - CR, T + CR, CR, 1.5 * Math.PI, 2 * Math.PI, 6);
  seg(L, T + CR, L, 604); seg(R, T + CR, R, 604);
  seg(L, 604, 100, 672); seg(R, 604, 440, 672);                        // guias até os flippers
  seg(236, 774, 236, 819); seg(304, 774, 304, 819);                    // bolso do lançador
  seg(236, 819, 304, 819, { e: .05 });
}

export const flippers = [
  { s: 1, px: 100, py: 685, L: 132, a: .49, rest: .49, up: -.49, w: 0, held: false },
  { s: -1, px: 440, py: 685, L: 132, a: .49, rest: .49, up: -.49, w: 0, held: false }
];
export const FLIP_R = 11;
export function flipTip(f) { return [f.px + f.s * f.L * Math.cos(f.a), f.py + f.L * Math.sin(f.a)]; }

function surfaceVel(f, px, py) {
  const rho = Math.hypot(px - f.px, py - f.py);
  return [rho * f.w * (-f.s * Math.sin(f.a)), rho * f.w * Math.cos(f.a)];
}
function collideSeg(b, s, f) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy;
  let t = ((b.x - s.x1) * dx + (b.y - s.y1) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = s.x1 + dx * t, py = s.y1 + dy * t;
  let nx = b.x - px, ny = b.y - py, d = Math.hypot(nx, ny);
  const R = BR + s.r;
  if (d >= R) return false;
  if (d < 1e-6) { nx = -dy; ny = dx; d = Math.hypot(nx, ny) || 1; }
  nx /= d; ny /= d; b.x += nx * (R - d); b.y += ny * (R - d);
  let ux = 0, uy = 0;
  if (f) { const v = surfaceVel(f, px, py); ux = v[0]; uy = v[1]; }
  const vn = (b.vx - ux) * nx + (b.vy - uy) * ny;
  if (vn < 0) { const k = (1 + s.e) * vn; b.vx -= k * nx; b.vy -= k * ny; }
  return true;
}
function collideCirc(b, c, e, kick) {
  let nx = b.x - c.x, ny = b.y - c.y, d = Math.hypot(nx, ny);
  const R = BR + c.r;
  if (d >= R) return false;
  if (d < 1e-6) { nx = 0; ny = -1; d = 1; }
  nx /= d; ny /= d; b.x += nx * (R - d); b.y += ny * (R - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; if (kick) { b.vx += nx * kick; b.vy += ny * kick; } return true; }
  return false;
}

// S: { ball, obstacles, slots, zombies, hooks:{onObstacle,onPlant,onZombie,onFlipper} }
export function stepPhysics(dt, S) {
  const b = S.ball, N = Math.max(1, Math.ceil(dt / (1 / 480))), h = dt / N;
  const SRAD = S.slotRadius;
  for (let i = 0; i < N; i++) {
    for (const f of flippers) {
      const tgt = f.held ? f.up : f.rest, old = f.a, sp = f.held ? 19 : 11;
      if (f.a > tgt) f.a = Math.max(tgt, f.a - sp * h); else if (f.a < tgt) f.a = Math.min(tgt, f.a + sp * h);
      f.w = (f.a - old) / h;
    }
    if (!b.active) continue;
    b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    for (const s of segs) collideSeg(b, s, null);
    for (const f of flippers) {
      const t = flipTip(f);
      if (collideSeg(b, { x1: f.px, y1: f.py, x2: t[0], y2: t[1], r: FLIP_R, e: .25 }, f) && Math.abs(f.w) > 3) S.hooks.onFlipper(f);
    }
    for (const o of S.obstacles) if (collideCirc(b, o, o.e || .9, o.kick)) S.hooks.onObstacle(o);
    for (const sl of S.slots) { // a bola atravessa as plantas e só as aciona (sem quicar)
      if (!sl.plant) { sl.inside = false; continue; }
      const d = Math.hypot(b.x - sl.x, b.y - sl.y);
      if (!sl.inside && d < SRAD + BR * .4) { sl.inside = true; S.hooks.onPlant(sl); } else if (sl.inside && d > SRAD + BR * .4 + 10) sl.inside = false;
    }
    for (const z of S.zombies) {
      if (z.dead) continue;
      const vx0 = b.vx, vy0 = b.vy;
      if (collideCirc(b, { x: z.x, y: z.y, r: z.r }, .6, 140)) S.hooks.onZombie(z, Math.hypot(vx0, vy0));
    }
  }
}
