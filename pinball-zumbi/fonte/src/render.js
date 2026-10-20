import { W, H, BR, DANGER, LAUNCHER, SR, LVLCOL, TYPES, SCEN } from './config.js';
import { flippers } from './physics.js';

// Tamanhos de desenho em unidades lógicas (540 x 960)
const ZW = 64, FLIP_LEN = 132, POCKET_Y = 779;

export function createRenderer(canvas, A) {
  const ctx = canvas.getContext('2d'), I = A.img, bg = I.fundo;
  let dpr = 1, cw = 1, ch = 1, s = 1, ox = 0, oy = 0, cap = 2.5;
  const X = x => ox + x * s, Y = y => oy + y * s;

  function setSize(w, h) { dpr = Math.min(window.devicePixelRatio || 1, cap); cw = w; ch = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  // hudBottom / footerTop em px: o trecho lógico [top,bottom] fica centralizado entre os dois
  function setLayout(hudBottom, footerTop, view) {
    const sW = cw / W, sV = (footerTop - hudBottom) / (view.bottom - view.top);
    s = Math.min(sW, sV); ox = (cw - W * s) / 2;
    oy = hudBottom + ((footerTop - hudBottom) - (view.bottom - view.top) * s) / 2 - view.top * s;
  }
  const toLogical = (cx, cy) => { const r = canvas.getBoundingClientRect(); return [(cx - r.left - ox) / s, (cy - r.top - oy) / s]; };
  const toScreen = (x, y) => [X(x), Y(y)];

  /* ---------- peças ---------- */
  function shadow(x, y, rx, ry, a) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(X(x), Y(y), rx * s, ry * s, 0, 0, 7); ctx.fill(); }
  function glowRing(x, y, rx, ry, color, a, lw) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color;
    for (const [k, al] of [[3.2, .12], [1.9, .28], [1, .9]]) { ctx.globalAlpha = Math.min(1, a * al); ctx.lineWidth = lw * k * s; ctx.beginPath(); ctx.ellipse(X(x), Y(y), rx * s, ry * s, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function glowSpot(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * s); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(x), Y(y), r * s, 0, 7); ctx.fill(); ctx.restore();
  }
  function sprite(img, x, bottom, w, flip, extra) {
    const k = w * s / img.width, h = img.height * k;
    ctx.save(); ctx.translate(X(x), Y(bottom)); if (extra && extra.rot) ctx.rotate(extra.rot); if (flip) ctx.scale(-1, 1);
    if (extra && extra.sq) ctx.scale(extra.sq[0], extra.sq[1]);
    ctx.drawImage(img, -w * s / 2, -h, w * s, h); ctx.restore(); return h / s;
  }

  function drawBackground() {
    ctx.fillStyle = '#244f27'; ctx.fillRect(0, 0, cw, ch);
    const iw = bg.width, ih = bg.height, w = W * s, h = H * s;
    if (oy > 0) ctx.drawImage(bg, 0, 0, iw, 22, ox, 0, w, oy + 1);
    if (oy + h < ch) ctx.drawImage(bg, 0, ih - 22, iw, 22, ox, oy + h - 1, w, ch - (oy + h) + 2);
    if (ox > 0) { ctx.drawImage(bg, 0, 0, 10, ih, 0, oy, ox + 1, h); ctx.drawImage(bg, iw - 10, 0, 10, ih, ox + w - 1, oy, ox + 2, h); }
    ctx.drawImage(bg, ox, oy, w, h);
  }

  function drawFlipper(f, i) {
    const img = I.flipper, kn = A.flipKnobs[0], k = FLIP_LEN / (A.flipKnobs[1][0] - kn[0]);
    ctx.save(); ctx.translate(X(f.px), Y(f.py)); if (f.s === -1) ctx.scale(-1, 1); ctx.rotate(f.a);
    ctx.drawImage(img, -kn[0] * k * s, -kn[1] * k * s, img.width * k * s, img.height * k * s);
    if (f.held) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .28; ctx.drawImage(img, -kn[0] * k * s, -kn[1] * k * s, img.width * k * s, img.height * k * s); }
    ctx.restore();
  }

  function drawBall(b, st) {
    const r = BR * s, x = X(b.x), y = Y(b.y), gold = st.gold;
    if (st.trail && b.active) for (let i = 0; i < st.trail.length; i += 2) {
      const a = (i / st.trail.length), tx = st.trail[i], ty = st.trail[i + 1];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gold ? `rgba(255,190,60,${.16 * a})` : `rgba(200,225,255,${.14 * a})`;
      ctx.beginPath(); ctx.arc(X(tx), Y(ty), r * (.35 + .6 * a), 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + r * .25, y + r * .95, r * .95, r * .42, 0, 0, 7); ctx.fill();
    if (gold) { glowSpot(b.x, b.y, 58, '255,190,40', .6 + .15 * Math.sin(st.t * 10)); glowRing(b.x, b.y + 4, 30, 20, '#ffd24a', .8, 2); }
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .08, x, y, r);
    if (gold) { g.addColorStop(0, '#fffbe0'); g.addColorStop(.35, '#ffd84a'); g.addColorStop(.8, '#b8780c'); g.addColorStop(1, '#5a3a05'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(.3, '#dfe8ee'); g.addColorStop(.7, '#7d8a94'); g.addColorStop(1, '#262f36'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x - r * .35, y - r * .42, r * .26, r * .16, -.6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(20,28,34,.65)'; ctx.lineWidth = Math.max(1, r * .07); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }

  function drawZombie(z, t) {
    const mul = z.type === 'boss' ? 1.75 : z.type === 'runner' ? .9 : 1, w = ZW * mul;
    const f = Math.floor(z.ph / Math.PI) & 3, base = (f & 1) ? 'zumbi_34' : 'zumbi_frente', flip = f === 3;
    let img = I[base];
    if (z.type === 'runner') img = A.tint[base + '_runner']; else if (z.type === 'boss') img = A.tint[base + '_boss'];
    const bob = Math.abs(Math.sin(z.ph)) * 3, fade = Math.max(0, Math.min(1, (z.y - 100) / 34 + .15));
    shadow(z.x, z.y + 2, 21 * mul, 7 * mul, .28 * fade);
    ctx.save(); ctx.globalAlpha = fade;
    const sq = z.dying ? [1 + z.dying * .2, 1 - z.dying * .3] : null;
    const rot = Math.sin(z.ph) * (z.eating ? .13 : .05), lunge = z.eating ? Math.abs(Math.sin(z.ph)) * 4 : 0;
    const hgt = sprite(img, z.x, z.y + 6 - bob + lunge, w, flip, { rot, sq });
    if (z.flash > 0) { ctx.globalAlpha = Math.min(1, z.flash * 7) * fade; sprite(A.flash[base + '_white'], z.x, z.y + 6 - bob + lunge, w, flip, { rot }); }
    if (z.slow > 0) { ctx.globalAlpha = .75 * fade; sprite(A.flash[base + '_blue'], z.x, z.y + 6 - bob + lunge, w, flip, { rot }); }
    ctx.globalAlpha = fade;
    if (z.type === 'cone') { // cone de trânsito na cabeça
      const cx = X(z.x), top = Y(z.y + 6 - bob - hgt) + hgt * s * .1, cwid = w * .36 * s, chh = w * .52 * s;
      ctx.fillStyle = '#f08a24'; ctx.strokeStyle = '#7a3d08'; ctx.lineWidth = Math.max(1, s * 1.6); ctx.beginPath(); ctx.moveTo(cx - cwid, top + chh * .15); ctx.lineTo(cx, top - chh); ctx.lineTo(cx + cwid, top + chh * .15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - cwid * .68, top - chh * .25); ctx.lineTo(cx + cwid * .68, top - chh * .25); ctx.lineTo(cx + cwid * .46, top - chh * .55); ctx.lineTo(cx - cwid * .46, top - chh * .55); ctx.closePath(); ctx.fill();
    }
    if (z.type === 'boss') { glowSpot(z.x, z.y - 50 * mul, 36 * mul, '255,60,40', .22); }
    ctx.globalAlpha = 1;
    if (z.hp < z.maxhp) { // barra de vida
      const bw = 40 * mul * s, bx = X(z.x) - bw / 2, by = Y(z.y + 6 - bob - hgt) - 9 * s;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - s, by - s, bw + 2 * s, 7 * s);
      const k = Math.max(0, z.hp / z.maxhp); ctx.fillStyle = k > .35 ? '#7dff4a' : '#ff6a3a'; ctx.fillRect(bx, by, bw * k, 5 * s);
    }
    ctx.restore();
  }

  function drawPlant(sl, t, st) {
    const p = sl.plant, key = { pea: 'atirador', ice: 'gelo_frente', bomb: 'cereja_frente', sun: 'girassol_frente' }[p.type];
    const wmap = { pea: 64, ice: 72, bomb: 68, sun: 70 }, k = 1 + .06 * (p.lvl - 1), h = p.hit;
    const sq = [1 + .16 * h, 1 - .14 * h], bob = Math.sin(t * 2.4 + sl.idx) * 1.6;
    shadow(sl.x, sl.y + 14, 25, 9, .3);
    sprite(I[key] || A.img[key], sl.x, sl.y + 16 + bob, wmap[p.type] * k, false, { sq });
    // barra de vida (a planta perde vida com o tempo e quando os zumbis a comem)
    const fr = Math.max(0, p.hp / p.maxhp), bw = 38 * s, bx = X(sl.x) - bw / 2, by = Y(sl.y + 30);
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(bx - s, by - s, bw + 2 * s, 6 * s);
    ctx.fillStyle = fr > .5 ? '#7dff4a' : fr > .25 ? '#ffd24a' : (Math.sin(t * 12) > 0 ? '#ff4a3a' : '#ff9a8a'); ctx.fillRect(bx, by, bw * fr, 4 * s);
    if (p.lvl >= 2) { // selo de nível
      const bx = X(sl.x + 28), by = Y(sl.y + 6), r = 8 * s;
      ctx.fillStyle = LVLCOL[p.lvl]; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = `900 ${Math.round(12 * s)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.lvl, bx, by + s * .5);
    }
  }

  function drawPadBase(sl, t, st, i) {
    const p = sl.plant, col = p ? TYPES[p.type].ring : '#9dffb0', pulse = .5 + .5 * Math.sin(t * 4 + i);
    const armed = st.armedOk && st.armedOk[i], hot = st.hot === i;
    ctx.fillStyle = 'rgba(6,36,16,.5)'; ctx.beginPath(); ctx.ellipse(X(sl.x), Y(sl.y + 12), 40 * s, 27 * s, 0, 0, 7); ctx.fill();
    const a = p ? .95 + .05 * pulse : .75 + .25 * pulse;
    glowRing(sl.x, sl.y + 12, 40 * (hot ? 1.1 : 1), 27 * (hot ? 1.1 : 1), armed || hot ? '#ffffff' : col, armed || hot ? 1 : a, 2.6);
    if (p && p.lvl >= 2) glowRing(sl.x, sl.y + 12, 46, 31, LVLCOL[p.lvl], .75, 1.6);
    if (!p) { // sinal de +
      ctx.save(); ctx.globalAlpha = armed ? 1 : .55 + .25 * pulse; ctx.strokeStyle = armed ? '#ffffff' : '#c9ffd2'; ctx.lineCap = 'round'; ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.moveTo(X(sl.x - 9), Y(sl.y + 12)); ctx.lineTo(X(sl.x + 9), Y(sl.y + 12)); ctx.moveTo(X(sl.x), Y(sl.y + 12 - 7)); ctx.lineTo(X(sl.x), Y(sl.y + 12 + 7)); ctx.stroke(); ctx.restore();
    }
  }

  function drawObstacle(o, t) {
    if (o.k === 'trash') {
      shadow(o.x, o.y + 14, 26, 9, .3);
      glowRing(o.x, o.y + 12, 42, 29, '#3aa0ff', .95 + o.hit * .9, 2.4);
      sprite(I.lixeira, o.x, o.y + 17, 58, false, { sq: [1 + .12 * o.hit, 1 - .1 * o.hit] });
    } else if (o.k === 'tire') {
      shadow(o.x, o.y + 14, 30, 10, .32);
      sprite(I.pneu, o.x, o.y + 21, 62, false, { sq: [1 + .14 * o.hit, 1 - .12 * o.hit] });
    }
  }

  function drawFountainFx(o, t, st) {
    const cx = o.x, cy = o.y + 10;
    glowRing(cx, cy + 6, 66, 45, '#ffc24a', .3 + o.hit * .8, 2.6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { // brilhos da água
      const a = t * .8 + i * 2.1, rx = 36 * Math.cos(i * 1.7 + a * .2), ry = 19 * Math.sin(i * 2.3 + a * .17), tw = Math.max(0, Math.sin(t * 3 + i * 1.9));
      ctx.fillStyle = `rgba(220,245,255,${.55 * tw})`; ctx.beginPath(); ctx.arc(X(cx + rx), Y(cy + ry - 6), 2 * s * (1 + tw), 0, 7); ctx.fill();
    }
    glowSpot(cx, cy - 44, 22, '150,230,255', .26 + .08 * Math.sin(t * 5) + o.hit * .35);
    ctx.restore();
  }

  function drawParticles(P) {
    for (const p of P) {
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 'cube') {
        const sz = p.size * s, x = X(p.x), y = Y(p.y) - p.z * s;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, k * 2.2);
        ctx.fillStyle = p.col; ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-sz / 2, -sz / 2, sz, sz * .38);
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-sz / 2, sz * .1, sz, sz * .4);
        ctx.restore();
        if (p.z > 2) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y) + sz * .3, sz * .5, sz * .22, 0, 0, 7); ctx.fill(); }
      } else if (p.kind === 'drop') {
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y) - p.z * s, p.size * s, 0, 7); ctx.fill(); ctx.restore();
      } else if (p.kind === 'ring') {
        const rr = p.r0 + (p.r1 - p.r0) * (1 - k); glowRing(p.x, p.y, rr, rr * .68, p.col, k, 2.2);
      } else if (p.kind === 'spark') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y) - p.z * s, p.size * s, 0, 7); ctx.fill(); ctx.restore();
      }
    }
  }

  function draw(st) {
    const t = st.t, sc = SCEN[0];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (st.shake > 0) ctx.translate((Math.random() - .5) * st.shake * 8, (Math.random() - .5) * st.shake * 8);
    drawBackground();
    // lâmpadas acesas
    for (let i = 0; i < sc.lamps.length; i++) glowSpot(sc.lamps[i][0], sc.lamps[i][1], 46, '255,190,80', .34 + .1 * Math.sin(t * 2.2 + i * 1.7));
    // barreira de aviso
    const danger = st.danger, pulse = .5 + .5 * Math.sin(t * 6);
    shadow(270, 654, 238, 12, .25);
    sprite(I.barreira, 270, 668, 500, false);
    if (danger) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,40,30,${.12 + .22 * pulse})`; ctx.fillRect(X(20), Y(616), 500 * s, 52 * s); ctx.restore(); }
    // lançador
    const pull = st.charge * 7;
    shadow(270, LAUNCHER.y + 45, 40, 9, .3);
    sprite(I.lancador, LAUNCHER.x, LAUNCHER.y + 45 + pull * .4, 71, false);
    glowSpot(270, LAUNCHER.y + 12 + pull, 26, '255,215,80', (st.ballReady ? .22 + .12 * Math.sin(t * 6) : .05) + st.charge * .45);
    if (st.charge > 0 || st.aim) { // direção do lançamento (pontos luminosos)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 7; i++) { const d = i * 24, x = 270 + st.aim * .26 * d * 1, y = POCKET_Y - d; ctx.fillStyle = `rgba(255,214,90,${.75 - i * .09})`; ctx.beginPath(); ctx.arc(X(x), Y(y), (5 - i * .4) * s, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // plataformas dos poderes
    st.slots.forEach((sl, i) => drawPadBase(sl, t, st, i));
    for (const o of st.obstacles) if (o.k === 'fountain') drawFountainFx(o, t, st);
    // flippers
    flippers.forEach(drawFlipper);
    // itens ordenados por profundidade
    const list = [];
    for (const o of st.obstacles) if (o.k !== 'fountain') list.push([o.y + 20, () => drawObstacle(o, t)]);
    for (const sl of st.slots) if (sl.plant && !(st.dragIdx === sl.idx)) list.push([sl.y + 18, () => drawPlant(sl, t, st)]);
    for (const z of st.zombies) if (!z.dead) list.push([z.y + 6, () => drawZombie(z, t)]);
    list.push([st.ball.y + BR, () => drawBall({ x: st.ball.x, y: st.ball.y + (st.ball.active ? 0 : pull), active: st.ball.active, vx: st.ball.vx, vy: st.ball.vy }, st)]);
    list.sort((a, b) => a[0] - b[0]); for (const it of list) it[1]();
    // tiros
    for (const sh of st.shots) {
      const col = sh.slow ? '120,210,255' : '150,255,70';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(X(sh.x), Y(sh.y), X(sh.x - sh.vx * .05), Y(sh.y - sh.vy * .05)); g.addColorStop(0, `rgba(${col},.8)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(sh.x), Y(sh.y)); ctx.lineTo(X(sh.x - sh.vx * .05), Y(sh.y - sh.vy * .05)); ctx.stroke();
      ctx.fillStyle = `rgba(${col},.95)`; ctx.beginPath(); ctx.arc(X(sh.x), Y(sh.y), 6 * s, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(X(sh.x), Y(sh.y), 2.6 * s, 0, 7); ctx.fill(); ctx.restore();
    }
    drawParticles(st.parts);
    if (st.goldFlash > 0) { const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .15, cw / 2, ch / 2, ch * .75); g.addColorStop(0, 'rgba(255,200,60,0)'); g.addColorStop(1, `rgba(255,190,40,${.42 * st.goldFlash})`); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore(); }
    // arrastando uma planta
    if (st.dragGhost) { const g = st.dragGhost; ctx.save(); ctx.globalAlpha = .9; sprite(g.img, g.x, g.y, 84, false); ctx.restore(); }
  }

  return { setCap(c) { cap = c; }, setSize, setLayout, toLogical, toScreen, draw, get scale() { return s; } };
}
