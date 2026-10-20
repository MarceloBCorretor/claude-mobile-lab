import { createRenderer } from './render.js';
import { loadAssets } from './assets.js';
import { stepPhysics, flippers, WALL } from './physics.js';
import { SCEN, PLAN, TYPES, ORDER, DMG, MAXLVL, DANGER, SR, POCKET, LAUNCHER, VIEW, WAVES_PER_SCEN, SPAWN_Y, PLANT_HP, PLANT_DECAY, BITE, SEEK_RANGE, priceFor } from './config.js';
import { snd, vib, isMuted, setMuted, unlockAudio } from './audio.js';

const $ = id => document.getElementById(id);
const gameEl = $('game'), canvas = $('c');

/* ===================== progresso salvo ===================== */
let save = { stars: [0], best: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem('pz25_save') || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem('pz25_save', JSON.stringify(save)); } catch (e) {} };

/* ===================== estado do jogo ===================== */
let R = null, A = null;            // renderizador e sprites (depois do carregamento)
let state = 'menu';                // menu | play | paused | over
let scenIdx = 0, G = {};
const ball = { x: POCKET.x, y: POCKET.rest, vx: 0, vy: 0, active: false };
const slots = [], zombies = [], shots = [], obstacles = [], parts = [], trail = [];
const input = { kL: false, kR: false, ptrs: new Map(), charging: false, charge: 0, aim: 0, drag: null, armed: null };
let hotSlot = -1, felipe = { mood: '', until: 0, prio: 0 }, lastFace = '', shake = 0, noteUntil = 0, tagUntil = 0, ghost = null, dragIdx = -1;

const FACES = {}; for (const m of ['feliz', 'triste', 'assustado', 'concentrado', 'vitoria', 'upiii']) { const i = new Image(); i.src = `assets/felipe/${m}.webp`; FACES[m] = i.src; }
function setFelipe(mood, dur, prio) { const n = performance.now(); if (n < felipe.until && prio < felipe.prio) return; felipe = { mood, until: n + dur * 1000, prio }; }
function faceNow() {
  if (performance.now() < felipe.until) return felipe.mood;
  if (zombies.some(z => !z.dead && z.y > DANGER - 130)) return 'assustado';
  return ball.active ? 'concentrado' : 'feliz';
}

/* ===================== interface (HTML) ===================== */
const heartSVG = on => `<svg class="heart" viewBox="0 0 32 32"><path d="M16 29 C4 19 2 11 7 6 C11 2 15 5 16 9 C17 5 21 2 25 6 C30 11 28 19 16 29Z" fill="${on ? '#ff3b4e' : '#46505a'}" stroke="${on ? '#7a0f1c' : '#222a31'}" stroke-width="2.4"/>${on ? '<ellipse cx="10" cy="10" rx="3" ry="2" fill="#fff9" transform="rotate(-30 10 10)"/>' : ''}</svg>`;
let hudCache = {};
function hud() {
  const c = hudCache;
  if (c.lives !== G.lives) { $('hearts').innerHTML = [0, 1, 2].map(i => heartSVG(i < G.lives)).join(''); c.lives = G.lives; }
  if (c.coins !== Math.floor(G.coins)) { $('coins').textContent = Math.floor(G.coins); c.coins = Math.floor(G.coins); refreshCards(); }
  if (c.wave !== G.wave) { $('waveN').textContent = Math.max(1, G.wave); c.wave = G.wave; document.querySelectorAll('.card').forEach(el => { el.querySelector('.pv').textContent = priceFor(el.dataset.t, G.wave); }); refreshCards(); }
  const done = G.killed + G.leaked, tot = G.waveTotal;
  const k = done + '/' + tot; if (c.z !== k) { $('zcount').textContent = 'ZUMBIS ' + k; $('barf').style.width = (tot ? 100 * done / tot : 0) + '%'; c.z = k; }
  const f = faceNow(); if (f !== lastFace) { $('face').src = FACES[f]; lastFace = f; }
  $('gzL').classList.toggle('on', flippers[0].held); $('gzR').classList.toggle('on', flippers[1].held);
  document.querySelectorAll('.card').forEach(el => el.classList.toggle('armed', input.armed === el.dataset.t));
  // texto discreto sob o cabeçalho: mensagem curta ou aviso da Semente Dourada
  const n = performance.now(), nt = $('note');
  if (n > noteUntil) { if (G.gold > 0) { nt.textContent = 'SEMENTE DOURADA ×2 · ' + Math.ceil(G.gold) + 's'; nt.className = 'on gold'; } else nt.className = ''; }
  $('tag').classList.toggle('on', n < tagUntil);
}
function buildCards() {
  if (!A) return;
  $('footer').innerHTML = ORDER.map(t => `<button class="card ${t}" data-t="${t}" aria-label="${TYPES[t].name}"><img class="ic" src="${A.icons[t]}" alt=""><span class="tx"><span class="nm">${TYPES[t].name}</span><span class="pr"><i class="coin"></i><b class="pv">${priceFor(t, G.wave || 1)}</b></span></span></button>`).join('');
  document.querySelectorAll('.card').forEach(el => el.addEventListener('pointerdown', e => startCardDrag(e, el.dataset.t)));
}
function refreshCards() { document.querySelectorAll('.card').forEach(el => el.classList.toggle('off', G.coins < priceFor(el.dataset.t, G.wave))); }
function note(t, ms) { const e = $('note'); e.textContent = t; e.className = 'on'; noteUntil = performance.now() + (ms || 1800); }
const toast = t => note(t, 1500);
function floatText(x, y, txt, color, big) {
  const [sx, sy] = R.toScreen(x, y - 30), el = document.createElement('div');
  el.className = 'fl' + (big ? ' big' : ''); el.textContent = txt; el.style.color = color || '#fff';
  el.style.left = sx / gameEl.clientWidth * 100 + '%'; el.style.top = sy / gameEl.clientHeight * 100 + '%';
  gameEl.appendChild(el); el.addEventListener('animationend', () => el.remove());
}

/* ===================== partículas ===================== */
const rnd = (a, b) => a + Math.random() * (b - a);
function cubes(x, y, n, palette, power, size) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, v = rnd(.3, 1) * power;
    parts.push({ kind: 'cube', x, y, z: rnd(20, 50), vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6, vz: rnd(120, 340), rot: Math.random() * 6, vr: rnd(-9, 9), size: size * rnd(.7, 1.3), life: rnd(1.3, 2.2), max: 2.2, col: palette[(Math.random() * palette.length) | 0] });
  }
}
function drops(x, y, n, power) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rnd(.2, 1) * power; parts.push({ kind: 'drop', x, y, z: rnd(10, 30), vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6, vz: rnd(150, 300), size: rnd(1.6, 3.2), life: rnd(.6, 1.1), max: 1.1, col: Math.random() < .5 ? '#bfeaff' : '#ffffff' }); } }
function sparks(x, y, n, col, power) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rnd(.3, 1) * power; parts.push({ kind: 'spark', x, y, z: rnd(8, 30), vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6, vz: rnd(40, 160), size: rnd(1.4, 3), life: rnd(.25, .55), max: .55, col }); } }
function ripple(x, y, r1, col) { parts.push({ kind: 'ring', x, y, r0: 8, r1, life: .6, max: .6, col }); }
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    if (p.kind === 'ring') continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 900 * dt;
    if (p.z <= 0) { p.z = 0; p.vz *= -.4; p.vx *= .7; p.vy *= .7; if (Math.abs(p.vz) < 20) p.vz = 0; if (p.vr) p.vr *= .7; }
    if (p.vr) p.rot += p.vr * dt;
  }
}

/* ===================== plantas ===================== */
const spriteOf = t => ({ pea: A.img.atirador, ice: A.img.gelo_frente, bomb: A.img.cereja_frente, sun: A.img.girassol_frente }[t]);
function healPlant(p) { p.maxhp = PLANT_HP[p.lvl]; p.hp = p.maxhp; }
function placePlant(sl, type, lvl) { sl.plant = { type, lvl, cd: 0, auto: 2.5 + Math.random() * 1.5, hit: 0 }; healPlant(sl.plant); }
function plantDies(sl) {
  cubes(sl.x, sl.y - 10, 12, ['#6bbf46', '#2f8a2b', '#9be55a'], 150, 6); sparks(sl.x, sl.y - 10, 8, 'rgb(150,255,120)', 120);
  floatText(sl.x, sl.y - 24, 'Planta destruída', '#ff9a8a'); snd(120, .25, 'sawtooth', .06, .5); vib(30); sl.plant = null; sl.inside = false;
}
function mergeFx(sl) {
  cubes(sl.x, sl.y, 12, ['#ffd24a', '#fff2a0', '#ffffff', '#7fe3ff'], 150, 6); sparks(sl.x, sl.y, 14, 'rgb(255,230,120)', 200); ripple(sl.x, sl.y + 12, 70, 'rgb(255,226,122)');
  floatText(sl.x, sl.y - 20, 'NÍVEL ' + sl.plant.lvl + '!', '#fff', true); snd(520, .12, 'triangle', .07);
  setTimeout(() => snd(780, .12, 'triangle', .07), 90); setTimeout(() => snd(1040, .2, 'triangle', .07), 180); vib(40);
}
// Compra num local: vazio instala; mesma planta sobe 1 nível (fusão). Preço = base x 1,2^(onda-1), cobrado na hora.
function buy(type, sl) {
  if (!sl) return false;
  const cost = priceFor(type, G.wave);
  if (sl.plant && (sl.plant.type !== type || sl.plant.lvl >= MAXLVL)) { floatText(sl.x, sl.y, sl.plant.lvl >= MAXLVL ? 'Nível máximo' : 'Local ocupado', '#ff8a8a'); snd(150, .12, 'square', .05); return false; }
  if (G.coins < cost) { floatText(sl.x, sl.y, 'Sem moedas', '#ff8a8a'); snd(150, .15, 'square', .05); return false; }
  G.coins -= cost; G.spent = (G.spent || 0) + cost;
  if (!sl.plant) { placePlant(sl, type, 1); cubes(sl.x, sl.y, 8, ['#6bbf46', '#9be55a'], 110, 5); sparks(sl.x, sl.y, 10, 'rgb(150,255,120)', 160); ripple(sl.x, sl.y + 12, 64, TYPES[type].ring); snd(400, .1, 'triangle', .06); }
  else { sl.plant.lvl++; healPlant(sl.plant); mergeFx(sl); }
  floatText(sl.x, sl.y - 34, '-' + cost, '#ffd24a'); return true;
}
function moveDrop(fromSl, toSl) {
  if (!toSl || toSl === fromSl || !fromSl.plant) return;
  const a = fromSl.plant;
  if (!toSl.plant) { toSl.plant = a; fromSl.plant = null; snd(330, .06, 'triangle', .05); }
  else if (toSl.plant.type === a.type && toSl.plant.lvl === a.lvl && a.lvl < MAXLVL) { fromSl.plant = null; toSl.plant.lvl++; healPlant(toSl.plant); mergeFx(toSl); }
  else { const b = toSl.plant; toSl.plant = a; fromSl.plant = b; snd(330, .06, 'triangle', .05); }
}
function nearestSlot(lx, ly, maxD) { let best = null, bd = maxD; for (const s of slots) { const d = Math.hypot(s.x - lx, s.y - ly); if (d < bd) { bd = d; best = s; } } return best; }

function firePlant(sl) {
  const p = sl.plant, lvl = p.lvl, m = G.gold > 0 ? 2 : 1;
  if (p.type === 'sun') { const g = (2 + 2 * lvl) * m; G.coins += g; floatText(sl.x, sl.y - 24, '+' + g, '#ffe066'); sparks(sl.x, sl.y - 20, 6, 'rgb(255,224,102)', 120); snd(880, .1, 'sine', .05, 1.4); return true; }
  let tg = null, bd = 1e9; for (const z of zombies) { if (z.dead || z.y < 118) continue; const d = Math.hypot(z.x - sl.x, z.y - sl.y); if (d < bd) { bd = d; tg = z; } }
  if (!tg) return false;
  if (p.type === 'bomb') { explode(tg.x, tg.y, 90 + 10 * lvl, DMG[lvl] * 2 * m); snd(110, .25, 'sawtooth', .07, .5); return true; }
  const a0 = Math.atan2(tg.y - 14 - (sl.y - 20), tg.x - sl.x), angs = G.gold > 0 ? [-.28, 0, .28] : [0];
  for (const da of angs) shots.push({ x: sl.x, y: sl.y - 20, vx: Math.cos(a0 + da) * 560, vy: Math.sin(a0 + da) * 560, type: p.type, dmg: DMG[lvl] * m * (p.type === 'ice' ? .7 : 1), slow: p.type === 'ice' });
  snd(p.type === 'ice' ? 620 : 420, .09, 'triangle', .06, .6); return true;
}
function explode(x, y, r, dmg) {
  cubes(x, y, 16, ['#ff9a3c', '#ffd84a', '#ff5a1a'], 220, 7); sparks(x, y, 26, 'rgb(255,170,60)', 320); ripple(x, y, r, 'rgb(255,150,60)'); shake = Math.max(shake, .5);
  for (const z of zombies) if (!z.dead && Math.hypot(z.x - x, z.y - y) < r) hurt(z, dmg, false);
}

/* ===================== zumbis ===================== */
const ZPAL = ['#6bbf46', '#4fa334', '#8ad65a', '#2f9bd6', '#5a3fa6', '#8b5a2b'];
function spawnZombie(boss) {
  const n = G.wave, si = scenIdx, r = Math.random();
  let type = 'normal'; if (boss) type = 'boss'; else if (n >= 3 && r < .22) type = 'runner'; else if (n >= 2 && r < .5) type = 'cone';
  const base = 3 + .9 * n + 1.3 * si, sp = Math.min(46, 19 + 2 * n + 3 * si);
  const spec = { normal: [1, 1, 22, 8, 60], cone: [2.2, 1, 22, 12, 90], runner: [.6, 1.9, 19, 10, 80], boss: [10, .55, 34, 60, 600] }[type];
  const z = { type, x: WALL.L + 70 + Math.random() * (WALL.R - WALL.L - 140), y: SPAWN_Y, ph: Math.random() * 6, flash: 0, slow: 0, stun: 0, dead: false, hitCd: 0, wander: Math.random() * 6 };
  z.hp = z.maxhp = base * spec[0]; z.sp = sp * spec[1]; z.r = spec[2]; z.coin = spec[3] + n + si * 2; z.pts = spec[4];
  zombies.push(z);
}
function hurt(z, d, slow) {
  if (z.dead) return;
  z.hp -= d; z.flash = .14; if (slow) z.slow = 2.5 + G.wave * .1;
  if (z.hp <= 0) killZombie(z);
}
function killZombie(z) {
  z.dead = true; G.killed++; G.coins += z.coin; G.score += z.pts;
  const big = z.type === 'boss';
  cubes(z.x, z.y - 30, big ? 40 : 15, ZPAL, big ? 240 : 170, big ? 12 : 8); sparks(z.x, z.y - 30, 12, 'rgb(190,255,130)', 180); ripple(z.x, z.y, big ? 110 : 60, 'rgb(182,255,122)');
  shake = Math.max(shake, big ? .9 : .3);
  floatText(z.x, z.y - 40, '+' + z.coin, '#ffe066'); snd(160, .2, 'sawtooth', .07, .4); vib(big ? 60 : 25);
  tag(G.combo >= 3 ? 'COMBO!' : 'UPIII!'); setFelipe('upiii', 1.3, 2);
}
function tag(t) { $('tag').textContent = t; tagUntil = performance.now() + 1100; }
function leak(z) {
  z.dead = true; G.leaked++; cubes(z.x, z.y - 20, 10, ZPAL, 130, 7);
  G.lives--; $('vig').classList.add('on'); setTimeout(() => $('vig').classList.remove('on'), 80);
  shake = Math.max(shake, .7); vib(160); snd(120, .4, 'sawtooth', .08, .4); setFelipe('triste', 1.8, 3);
  if (G.lives <= 0) endGame(false); else note('Um zumbi passou · vidas ' + G.lives);
}

/* ===================== bola ===================== */
function resetBall() { Object.assign(ball, { x: POCKET.x, y: POCKET.rest, vx: 0, vy: 0, active: false }); input.charge = 0; trail.length = 0; G.pocketT = 0; G.stuckT = 0; }
function launch() {
  if (state !== 'play' || ball.active) { input.charge = 0; return; }
  const v = 900 + 600 * input.charge; ball.vy = -v; ball.vx = input.aim * 260 + (Math.random() - .5) * 20; ball.active = true; input.charge = 0; input.aim = 0; G.pocketT = 0;
  snd(200, .3, 'sawtooth', .06, 3); vib(25);
}
function bump(pts) {
  G.score += pts; G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 1.8;
  if (G.combo === 3) note('COMBO ×3', 1200); else if (G.combo === 4) note('COMBO ×4', 1200);
  if (G.combo >= 5 && G.gold <= 0) { G.gold = 10; G.combo = 0; G.goldFlash = 1; sparks(ball.x, ball.y, 24, 'rgb(255,210,80)', 300); ripple(ball.x, ball.y, 110, 'rgb(255,210,80)'); note('SEMENTE DOURADA! dano dobrado e tiro triplo', 2200); snd(300, .4, 'sawtooth', .07, 3); vib(80); tag('UPIII!'); setFelipe('upiii', 1.3, 2); }
}
const hooks = {
  onObstacle(o) {
    o.hit = 1; bump(o.k === 'fountain' ? 15 : 25);
    if (o.k === 'fountain') { drops(ball.x, ball.y, 12, 150); ripple(o.x, o.y + 14, 80, 'rgb(150,225,255)'); snd(380, .12, 'sine', .05, 1.6); shake = Math.max(shake, .06); }
    else { sparks(ball.x, ball.y, 8, o.k === 'trash' ? 'rgb(90,170,255)' : 'rgb(255,220,160)', 190); snd(o.k === 'trash' ? 700 : 240, .07, o.k === 'trash' ? 'square' : 'sine', .05); shake = Math.max(shake, .08); }
  },
  onPlant(sl) { const p = sl.plant; p.hit = 1; bump(10); if (p.cd <= 0 && firePlant(sl)) p.cd = p.type === 'sun' ? .35 : .22; snd(260 + sl.idx * 50, .06, 'sine', .04); },
  onZombie(z, speed) {
    if (z.hitCd > 0) return;
    z.hitCd = .25; z.stun = .3; z.y -= 12; bump(15);
    hurt(z, (1 + speed / 520) * (G.gold > 0 ? 2 : 1), false); sparks(ball.x, ball.y, 6, 'rgb(255,255,255)', 160); shake = Math.max(shake, .12); snd(240, .06, 'square', .05);
  },
  onFlipper() { const n = performance.now(); if (n - (G.flipVib || 0) > 140) { G.flipVib = n; vib(12); } }
};
const PS = { ball, obstacles, slots, zombies, slotRadius: SR, hooks };

/* ===================== fluxo da fase ===================== */
function startGame(si) {
  if (!R) return;
  scenIdx = si; zombies.length = 0; shots.length = 0; parts.length = 0; slots.length = 0; obstacles.length = 0;
  SCEN[si].slots.forEach(([x, y], i) => slots.push({ x, y, plant: null, idx: i }));
  SCEN[si].obstacles.forEach(o => obstacles.push(Object.assign({ hit: 0 }, o)));
  G = { coins: 150 + si * 40, score: 0, lives: 3, wave: 0, toSpawn: 0, spawnT: 0, interval: 2, between: 2.2, clear: false, waveTotal: 0, killed: 0, leaked: 0, combo: 0, comboT: 0, gold: 0, t: 0, pocketT: 0, stuckT: 0 };
  hudCache = {}; input.armed = null; hotSlot = -1; dragIdx = -1; ghost = null; resetBall(); felipe = { mood: '', until: 0, prio: 0 };
  showScreen(null); state = 'play'; note('FASE ' + (si + 1) + ' · ' + SCEN[si].name, 2200); setFelipe('feliz', 2, 1);
  buildCards(); hud(); layout();
}
function startWave() {
  G.wave++; const n = G.wave, si = scenIdx;
  G.toSpawn = 4 + 2 * n + 2 * si + (n === WAVES_PER_SCEN ? 1 : 0); G.waveTotal = G.toSpawn; G.killed = 0; G.leaked = 0;
  G.interval = Math.max(1.2, 3.2 - .25 * n - .2 * si); G.spawnT = 1.2; G.clear = false;
  note('ONDA ' + n + (n === WAVES_PER_SCEN ? ' · chefão a caminho' : ' · zumbis chegando'), 2200);
}
function endGame(win) {
  state = 'over'; input.ptrs.clear(); input.charging = false;
  const stars = win ? Math.max(1, G.lives) : 0;
  if (win) save.stars[scenIdx] = Math.max(save.stars[scenIdx] || 0, stars);
  save.best = Math.max(save.best, G.score); persist();
  setFelipe(win ? 'vitoria' : 'triste', 60, 3); $('face').src = FACES[win ? 'vitoria' : 'triste']; lastFace = win ? 'vitoria' : 'triste';
  $('resTitle').textContent = win ? 'FASE COMPLETA!' : 'FIM DE JOGO';
  $('resStars').innerHTML = win ? '★'.repeat(stars) + '<s>' + '★'.repeat(3 - stars) + '</s>' : '';
  $('resTxt').textContent = (win ? 'Você defendeu o ' + SCEN[scenIdx].name + '! As próximas fases chegam em breve.' : 'Os zumbis passaram pela barreira.') + ' Pontos: ' + G.score;
  $('resMain').textContent = win ? 'JOGAR DE NOVO' : 'TENTAR DE NOVO';
  $('resMain').onclick = () => startGame(scenIdx);
  setTimeout(() => { if (state === 'over') showScreen('result'); }, win ? 1200 : 700);
  snd(win ? 660 : 180, .5, win ? 'triangle' : 'sawtooth', .08, win ? 1.6 : .5);
}

/* ===================== atualização ===================== */
function update(dt) {
  if (state !== 'play') return;
  G.t += dt;
  flippers[0].held = input.kL || [...input.ptrs.values()].some(p => p.k === 'L');
  flippers[1].held = input.kR || [...input.ptrs.values()].some(p => p.k === 'R');
  if (input.charging && !ball.active) input.charge = Math.min(1, input.charge + dt / .9);
  for (const z of zombies) z.hitCd = Math.max(0, z.hitCd - dt);
  stepPhysics(dt, PS);
  // bolso do lançador / bola parada / segurança
  if (ball.active) {
    if (ball.y > 762 && ball.x > 232 && ball.x < 308) { G.pocketT += dt; if (G.pocketT > .45) { resetBall(); G.combo = 0; snd(300, .2, 'sine', .05, .5); } } else G.pocketT = 0;
    G.stuckT += dt; if (G.stuckT > 1.8) { const moved = Math.hypot(ball.x - (G.sx || 0), ball.y - (G.sy || 0)); G.sx = ball.x; G.sy = ball.y; G.stuckT = 0; if (moved < 40 && ball.y < 744) { ball.vy = -750; ball.vx = (Math.random() - .5) * 500; } }
    if (!(ball.x > 0 && ball.x < 540 && ball.y > 0 && ball.y < 850)) { resetBall(); toast('Bola de volta ao lançador'); }
    trail.push(ball.x, ball.y); if (trail.length > 24) trail.splice(0, 2);
  } else { ball.x = POCKET.x; ball.y = POCKET.rest; if (trail.length) trail.length = 0; }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.gold > 0) G.gold -= dt;
  for (const o of obstacles) o.hit = Math.max(0, o.hit - dt * 5);
  shake = Math.max(0, shake - dt * 1.8);
  updateParts(dt);
  // plantas
  for (const sl of slots) if (sl.plant) {
    const p = sl.plant; p.cd -= dt; p.hit = Math.max(0, p.hit - dt * 5); p.auto -= dt;
    p.hp -= PLANT_DECAY * dt; if (p.hp <= 0) { plantDies(sl); continue; }
    if (p.auto <= 0) { p.auto = 3.2 + Math.random(); if (p.type !== 'sun' || Math.random() < .5) firePlant(sl); }
  }
  // ondas
  if (G.toSpawn > 0) { G.spawnT -= dt; if (G.spawnT <= 0) { G.spawnT = G.interval * (.75 + Math.random() * .5); G.toSpawn--; spawnZombie(G.toSpawn === 0 && G.wave === WAVES_PER_SCEN); } }
  else if (!G.clear && G.wave > 0 && zombies.every(z => z.dead)) {
    G.clear = true; G.between = 3.4; const bonus = 40 + 10 * G.wave; G.coins += bonus; G.score += 500;
    if (G.wave >= WAVES_PER_SCEN) { endGame(true); return; }
    note('ONDA ' + G.wave + ' COMPLETA · +' + bonus + ' moedas', 2200); setFelipe('vitoria', 2.2, 2); snd(660, .35, 'triangle', .07, 1.5);
  }
  if (G.wave === 0 || G.clear) { G.between -= dt; if (G.between <= 0) startWave(); }
  // zumbis
  const blockers = obstacles.map(o => [o.x, o.y, o.r]);
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i]; if (z.dead) { zombies.splice(i, 1); continue; }
    z.ph += dt * (z.eating ? 15 : z.type === 'runner' ? 11 : 6.5); z.flash = Math.max(0, z.flash - dt); z.stun = Math.max(0, z.stun - dt);
    // o zumbi vai atrás da planta mais próxima; ao chegar, para e a come (a planta não resiste)
    if (!z.target || !z.target.plant) { z.target = null; let bd = SEEK_RANGE; for (const sl of slots) if (sl.plant) { const d = Math.hypot(sl.x - z.x, sl.y - z.y); if (d < bd) { bd = d; z.target = sl; } } }
    z.eating = false;
    if (z.stun <= 0) {
      const k = z.slow > 0 ? .5 : 1;
      if (z.target && z.y > 115) {
        const dx = z.target.x - z.x, dy = z.target.y - 8 - z.y, d = Math.hypot(dx, dy) || 1;
        if (d > 36) { z.x += dx / d * z.sp * 1.1 * k * dt; z.y += dy / d * z.sp * 1.1 * k * dt; }
        else {
          z.eating = true; const tp = z.target.plant; tp.hp -= (BITE[z.type] || 16) * k * dt; tp.hit = Math.max(tp.hit, .5); z.biteT = (z.biteT || 0) - dt;
          if (z.biteT <= 0) { z.biteT = .5; snd(170, .05, 'square', .04); cubes(z.target.x, z.target.y - 14, 2, ['#6bbf46', '#2f8a2b'], 70, 4); }
          if (tp.hp <= 0) plantDies(z.target);
        }
      } else { z.y += z.sp * k * dt; z.x += Math.sin(z.ph * .25 + z.wander) * 14 * dt; }
    }
    z.slow = Math.max(0, z.slow - dt);
    for (const [bx, by, br] of blockers) { const dx = z.x - bx, dy = z.y - by, d = Math.hypot(dx, dy) || 1, m = br + z.r + 8; if (d < m) { z.x += dx / d * 120 * dt + (dx === 0 ? 40 * dt : 0); z.y += Math.max(0, dy / d) * 40 * dt; } }
    z.x = Math.min(WALL.R - z.r - 4, Math.max(WALL.L + z.r + 4, z.x));
    if (z.y >= DANGER) { leak(z); zombies.splice(i, 1); if (state !== 'play') return; }
  }
  // tiros
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt;
    let gone = s.y < 90 || s.y > 800 || s.x < 10 || s.x > 530;
    if (!gone) for (const z of zombies) if (!z.dead && Math.hypot(z.x - s.x, z.y - 16 - s.y) < z.r + 14) { hurt(z, s.dmg, s.slow); sparks(s.x, s.y, 5, s.slow ? 'rgb(150,220,255)' : 'rgb(170,255,110)', 120); snd(300, .04, 'square', .03); gone = true; break; }
    if (gone) shots.splice(i, 1);
  }
}

const view = { t: 0, ball, trail, gold: false, charge: 0, danger: false, slots, obstacles, zombies, shots, parts, armedOk: null, hot: -1, shake: 0, ballReady: true, dragIdx: -1, dragGhost: null };
function draw() {
  if (!R) return;
  view.aim = input.aim; view.goldFlash = G.goldFlash || 0; if (G.goldFlash > 0) G.goldFlash = Math.max(0, G.goldFlash - .03); view.t = performance.now() / 1000; view.gold = G.gold > 0; view.charge = input.charge; view.danger = zombies.some(z => !z.dead && z.y > DANGER - 130);
  view.armedOk = input.armed ? slots.map(s => !s.plant || (s.plant.type === input.armed && s.plant.lvl < MAXLVL)) : null;
  view.hot = hotSlot; view.shake = shake; view.ballReady = !ball.active; view.dragIdx = dragIdx; view.dragGhost = ghost;
  R.draw(view);
}

/* ===================== entrada ===================== */
const touch = $('touch');
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); unlockAudio(); if (state !== 'play') return;
  try { touch.setPointerCapture(e.pointerId); } catch (_) {}
  const L = R.toLogical(e.clientX, e.clientY);
  if (input.armed) { // poder escolhido no rodapé: o toque escolhe o local
    const sl = nearestSlot(L[0], L[1], 62), t = input.armed; input.armed = null; hotSlot = -1;
    if (sl) buy(t, sl); else toast('Compra cancelada');
    return;
  }
  if (Math.abs(L[0] - LAUNCHER.x) < 46 && L[1] > LAUNCHER.y - 40 && L[1] < LAUNCHER.y + 60 && !ball.active) { input.ptrs.set(e.pointerId, { k: 'P' }); input.charging = true; input.aim = Math.max(-1, Math.min(1, (L[0] - LAUNCHER.x) / 110)); return; }
  const sl = nearestSlot(L[0], L[1], 36); if (sl && sl.plant) { beginSlotDrag(e, sl); return; }
  const r = gameEl.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2;
  input.ptrs.set(e.pointerId, { k: left ? 'L' : 'R' }); snd(left ? 140 : 150, .05, 'square', .03);
});
touch.addEventListener('pointermove', e => { const p = input.ptrs.get(e.pointerId); if (p && p.k === 'P') { const L = R.toLogical(e.clientX, e.clientY); input.aim = Math.max(-1, Math.min(1, (L[0] - LAUNCHER.x) / 110)); } dragMove(e); });
const upPtr = e => { const p = input.ptrs.get(e.pointerId); input.ptrs.delete(e.pointerId); if (p && p.k === 'P') { input.charging = false; launch(); } if (input.drag && input.drag.id === e.pointerId) endDrag(e); };
touch.addEventListener('pointerup', upPtr); touch.addEventListener('pointercancel', upPtr);

function startCardDrag(e, type) {
  e.preventDefault(); unlockAudio(); if (state !== 'play') return;
  const el = e.currentTarget; try { el.setPointerCapture(e.pointerId); } catch (_) {}
  input.drag = { id: e.pointerId, src: 'shop', type, sx: e.clientX, sy: e.clientY, moved: false, el };
  el.addEventListener('pointermove', dragMove); el.addEventListener('pointerup', endDrag, { once: true }); el.addEventListener('pointercancel', endDrag, { once: true });
}
function beginSlotDrag(e, sl) {
  input.drag = { id: e.pointerId, src: 'slot', sl, sx: e.clientX, sy: e.clientY, moved: false };
  dragIdx = sl.idx; const L = R.toLogical(e.clientX, e.clientY); ghost = { img: spriteOf(sl.plant.type), x: L[0], y: L[1] };
}
function dragMove(e) {
  const d = input.drag; if (!d || d.id !== e.pointerId) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 12) d.moved = true;
  if (!d.moved) return;
  const L = R.toLogical(e.clientX, e.clientY - 36); ghost = { img: spriteOf(d.src === 'shop' ? d.type : d.sl.plant.type), x: L[0], y: L[1] + 36 };
  const sl = nearestSlot(L[0], L[1] + 20, 70); hotSlot = sl ? sl.idx : -1;
}
function endDrag(e) {
  const d = input.drag; if (!d || d.id !== e.pointerId) return;
  input.drag = null; ghost = null; dragIdx = -1;
  const L = R.toLogical(e.clientX, e.clientY - 36), target = d.moved && e.type !== 'pointercancel' ? nearestSlot(L[0], L[1] + 20, 70) : null; hotSlot = -1;
  if (d.src === 'shop') {
    if (!d.moved && e.type !== 'pointercancel') { // toque simples: arma o poder e mostra os locais
      if (input.armed === d.type) { input.armed = null; }
      else if (G.coins < priceFor(d.type, G.wave)) { toast('Moedas insuficientes'); snd(150, .15, 'square', .05); }
      else { input.armed = d.type; toast('Toque num local + para instalar'); snd(500, .06, 'triangle', .05); }
    } else if (target) buy(d.type, target);
  } else moveDrop(d.sl, target);
}
window.addEventListener('keydown', e => {
  if (e.repeat) return; const k = e.key;
  if (k === 'ArrowLeft' || k === 'z' || k === 'Z') input.kL = true;
  else if (k === 'ArrowRight' || k === 'm' || k === 'M' || k === '/') input.kR = true;
  else if (k === ' ' || k === 'ArrowDown') { input.charging = true; e.preventDefault(); }
  else if (k === 'p' || k === 'P') togglePause();
});
window.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'z' || k === 'Z') input.kL = false;
  else if (k === 'ArrowRight' || k === 'm' || k === 'M' || k === '/') input.kR = false;
  else if (k === ' ' || k === 'ArrowDown') { if (input.charging) { input.charging = false; launch(); } }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

/* ===================== telas ===================== */
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function togglePause() {
  if (state === 'play') { state = 'paused'; input.ptrs.clear(); input.charging = false; input.charge = 0; flippers.forEach(f => f.held = false); showScreen('pause'); }
  else if (state === 'paused') { state = 'play'; showScreen(null); }
}
function buildLevels() {
  $('lvList').innerHTML = PLAN.map((name, i) => {
    const ok = i < SCEN.length, stars = save.stars[i] || 0;
    return `<button class="lv ${ok ? '' : 'lock'}" ${ok ? `data-lv="${i}"` : ''}><span class="th" style="${ok ? 'background-image:url(assets/ui/thumb-fonte.webp)' : ''}"></span><span><b>${i + 1}. ${name}</b><small>${ok ? SCEN[i].sub : 'Em breve'}</small>${ok ? `<div class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` : ''}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => startGame(+b.dataset.lv));
}
function toMenu() { state = 'menu'; showScreen('menu'); $('menuBest').textContent = save.best ? 'Recorde: ' + save.best : ''; }
$('hJogar').onclick = () => { unlockAudio(); startGame(0); };
$('hCen').onclick = () => { buildLevels(); showScreen('levels'); };
$('hPers').onclick = () => showScreen('chars');
$('hSom').onclick = () => { setMuted(!isMuted()); toast(isMuted() ? 'Som desligado' : 'Som ligado'); if (!isMuted()) snd(660, .15, 'triangle', .07); };
document.querySelectorAll('[data-go="menu"]').forEach(b => b.onclick = toMenu);
$('pauseBtn').addEventListener('pointerdown', e => { e.stopPropagation(); togglePause(); });
$('bResume').onclick = togglePause;
$('bRestart').onclick = () => startGame(scenIdx);
$('bQuit').onclick = toMenu; $('resMenu').onclick = toMenu;

/* ===================== laço principal ===================== */
function layout() {
  if (!R) return;
  const r = gameEl.getBoundingClientRect(), top = $('top').getBoundingClientRect(), ft = $('footer').getBoundingClientRect();
  R.setSize(r.width, r.height); R.setLayout(top.bottom - r.top + 6, ft.top - r.top - 6, VIEW);
}
let last = performance.now(), slowT = 0, dprCap = 2.5;
function frame(ts) {
  const rawDt = (ts - last) / 1000 || 0, dt = Math.min(.05, rawDt); last = ts;
  if (state === 'play' || state === 'paused' || state === 'over') {
    update(dt); draw(); hud();
    if (state === 'play') { slowT = rawDt > .034 && rawDt < .25 ? slowT + rawDt : Math.max(0, slowT - rawDt * .5); if (slowT > 2.5 && dprCap > 1.25) { dprCap = Math.max(1.25, dprCap - .6); R.setCap(dprCap); layout(); slowT = 0; } }
  }
  requestAnimationFrame(frame);
}
(async function boot() {
  $('hJogar').disabled = true;
  try { A = await loadAssets(); } catch (e) { console.error(e); $('noGL').style.display = 'grid'; $('noGL').firstElementChild.textContent = 'Não foi possível carregar as imagens do jogo. Verifique a conexão e abra de novo.'; return; }
  R = createRenderer(canvas, A); buildCards(); new ResizeObserver(layout).observe(gameEl); layout();
  $('hJogar').disabled = false; requestAnimationFrame(frame);
})();
toMenu();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(() => {});

// gancho de teste (usado nos testes automatizados)
window.PZ = { end: endGame, step: dt => update(dt), start: startGame, launch, buy, slots, zombies, ball, flippers, input, view, get R() { return R; }, get G() { return G; }, get state() { return state; }, frame: () => { draw(); hud(); } };
