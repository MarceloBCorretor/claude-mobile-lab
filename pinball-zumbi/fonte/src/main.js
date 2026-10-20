import * as THREE from 'three';
import { createStage, wx, wz } from './scene.js';
import { buildZombie, buildPlant, levelBadge, levelRing, S as SC } from './models.js';
import { stepPhysics, flippers, WALL } from './physics.js';
import { SCEN, TYPES, ORDER, DMG, MAXLVL, DANGER, SR, POCKET, WAVES_PER_SCEN, BR } from './config.js';
import { snd, vib, isMuted, setMuted, unlockAudio } from './audio.js';

const $ = id => document.getElementById(id);
const gameEl = $('game'), canvas = $('c');

/* ===================== progresso salvo ===================== */
let save = { unlocked: 1, stars: [0, 0, 0], best: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem('pz3d_save') || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem('pz3d_save', JSON.stringify(save)); } catch (e) {} };

/* ===================== palco 3D ===================== */
let stage;
try { stage = createStage(canvas); } catch (e) { console.error(e); $('noGL').style.display = 'grid'; throw e; }
const dyn = stage.dyn;

/* ícones 2D das plantas (renderizados do próprio modelo 3D) */
const icons = {};
(function makeIcons() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(160, 160); r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.7));
  const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(2, 4, 5); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 1.95, 3.2); cam.lookAt(0, .5, 0);
  for (const t of ORDER) { const m = buildPlant(t); sc.add(m); r.render(sc, cam); icons[t] = r.domElement.toDataURL('image/png'); sc.remove(m); }
  r.dispose();
})();

/* ===================== estado do jogo ===================== */
let state = 'menu';            // menu | play | paused | over
let scenIdx = 0, G = {};
const ball = { x: 270, y: POCKET.rest, vx: 0, vy: 0, active: false };
const slots = [], zombies = [], shots = [], obstacles = [];
const input = { kL: false, kR: false, ptrs: new Map(), charging: false, charge: 0, drag: null };
let hotSlot = -1, felipe = { mood: '', until: 0, prio: 0 }, lastFace = '';

const FACES = {}; for (const m of ['feliz', 'triste', 'assustado', 'concentrado', 'vitoria', 'upiii']) { const i = new Image(); i.src = `assets/felipe/${m}.webp`; FACES[m] = i.src; }
function setFelipe(mood, dur, prio) { const n = performance.now(); if (n < felipe.until && prio < felipe.prio) return; felipe = { mood, until: n + dur * 1000, prio }; }
function faceNow() {
  if (performance.now() < felipe.until) return felipe.mood;
  if (zombies.some(z => !z.dead && z.y > DANGER - 130)) return 'assustado';
  return ball.active ? 'concentrado' : 'feliz';
}

/* ===================== HUD ===================== */
const heartSVG = on => `<svg class="heart" viewBox="0 0 32 32"><path d="M16 29 C4 19 2 11 7 6 C11 2 15 5 16 9 C17 5 21 2 25 6 C30 11 28 19 16 29Z" fill="${on ? '#ff3b4e' : '#46505a'}" stroke="${on ? '#7a0f1c' : '#222a31'}" stroke-width="2.4"/>${on ? '<ellipse cx="10" cy="10" rx="3" ry="2" fill="#fff9" transform="rotate(-30 10 10)"/>' : ''}</svg>`;
let hudCache = {};
function hud() {
  const c = hudCache;
  if (c.lives !== G.lives) { $('hearts').innerHTML = [0, 1, 2].map(i => heartSVG(i < G.lives)).join(''); c.lives = G.lives; }
  if (c.coins !== G.coins) { $('coins').textContent = Math.floor(G.coins); c.coins = G.coins; refreshCards(); }
  if (c.wave !== G.wave) { $('waveN').textContent = Math.max(1, G.wave); c.wave = G.wave; }
  const done = G.killed + G.leaked, tot = G.waveTotal;
  const k = done + '/' + tot; if (c.z !== k) { $('zcount').textContent = 'ZUMBIS ' + k; $('barf').style.width = (tot ? 100 * done / tot : 0) + '%'; c.z = k; }
  const gd = G.gold > 0; if (c.gold !== gd) { $('goldTag').style.display = gd ? 'block' : 'none'; c.gold = gd; }
  const cb = G.combo; if (c.combo !== cb || c.gold2 !== gd) { $('comboTag').style.display = !gd && cb > 1 ? 'block' : 'none'; $('comboN').textContent = cb; c.combo = cb; c.gold2 = gd; }
  const f = faceNow(); if (f !== lastFace) { $('face').src = FACES[f]; lastFace = f; }
  $('launchFill').style.height = (input.charge * 100) + '%';
  $('launch').classList.toggle('charging', input.charging);
  $('launchBall').style.display = ball.active ? 'none' : 'block';
}
function buildCards() {
  for (const [col, list] of [['colL', ['pea', 'ice']], ['colR', ['bomb', 'sun']]]) {
    $(col).innerHTML = list.map(t => `<button class="card ${t}" data-t="${t}" aria-label="${TYPES[t].name}"><img class="ic" src="${icons[t]}" alt=""><span><span class="nm">${TYPES[t].name}</span><span class="pr"><i class="coin"></i>${TYPES[t].price}</span></span></button>`).join('');
  }
  document.querySelectorAll('.card').forEach(el => el.addEventListener('pointerdown', e => startCardDrag(e, el.dataset.t)));
}
function refreshCards() { document.querySelectorAll('.card').forEach(el => el.classList.toggle('off', G.coins < TYPES[el.dataset.t].price)); }
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 1600); }
function banner(t, sub) { $('banTxt').textContent = t; $('banSub').textContent = sub || ''; const b = $('banner'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function popup(mood, txt) { $('popImg').src = FACES[mood]; $('popTxt').textContent = txt; const p = $('pop'); p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); }
function floatText(x, y, txt, color, big) {
  const [sx, sy] = stage.toScreen(x, y, 1.8), el = document.createElement('div');
  el.className = 'fl' + (big ? ' big' : ''); el.textContent = txt; el.style.color = color || '#fff';
  el.style.left = sx / gameEl.clientWidth * 100 + '%'; el.style.top = sy / gameEl.clientHeight * 100 + '%';
  gameEl.appendChild(el); el.addEventListener('animationend', () => el.remove());
}

/* ===================== plantas ===================== */
function plantMesh(sl) {
  const p = sl.plant, g = new THREE.Group(), body = buildPlant(p.type);
  g.add(body);
  if (p.lvl >= 2) g.add(levelRing(p.lvl));
  const b = levelBadge(p.lvl); b.position.set(.5, .42, .5); g.add(b);
  const s = 1 + .05 * p.lvl; body.scale.setScalar(s); g.position.set(wx(sl.x), 0, wz(sl.y));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  if (p.mesh) dyn.remove(p.mesh); p.mesh = g; dyn.add(g);
}
function placePlant(sl, type, lvl) { sl.plant = { type, lvl, cd: 0, auto: 2.5 + Math.random() * 1.5, hit: 0, mesh: null }; plantMesh(sl); }
function removePlant(sl) { if (sl.plant && sl.plant.mesh) dyn.remove(sl.plant.mesh); sl.plant = null; }
function mergeFx(sl) {
  stage.burstCubes(sl.x, sl.y, 14, ['#ffd24a', '#fff2a0', '#ffffff', '#7fe3ff'], 3.5, .8); stage.flash(sl.x, sl.y, '#ffe27a', 50);
  floatText(sl.x, sl.y - 20, 'NÍVEL ' + sl.plant.lvl + '!', '#fff', true); snd(520, .12, 'triangle', .07);
  setTimeout(() => snd(780, .12, 'triangle', .07), 90); setTimeout(() => snd(1040, .2, 'triangle', .07), 180); vib(40);
}
function buy(type, sl) { // compra (arrastar) numa vaga, funde com nível 1 igual
  const cost = TYPES[type].price;
  if (!sl) return false;
  if (G.coins < cost) { floatText(sl.x, sl.y, 'Sem moedas', '#ff8a8a'); snd(150, .15, 'square', .05); return false; }
  if (!sl.plant) { G.coins -= cost; placePlant(sl, type, 1); stage.burstCubes(sl.x, sl.y, 8, ['#6bbf46', '#9be55a'], 2.5, .6); snd(400, .1, 'triangle', .06); return true; }
  if (sl.plant.type === type && sl.plant.lvl === 1) { G.coins -= cost; sl.plant.lvl = 2; plantMesh(sl); mergeFx(sl); return true; }
  floatText(sl.x, sl.y, 'Não funde', '#ff8a8a'); snd(150, .12, 'square', .05); return false;
}
function moveDrop(fromSl, toSl) {
  if (!toSl || toSl === fromSl) { plantMesh(fromSl); return; }
  const a = fromSl.plant;
  if (!toSl.plant) { toSl.plant = a; fromSl.plant = null; plantMesh(toSl); snd(330, .06, 'triangle', .05); }
  else if (toSl.plant.type === a.type && toSl.plant.lvl === a.lvl && a.lvl < MAXLVL) { dyn.remove(a.mesh); fromSl.plant = null; toSl.plant.lvl++; plantMesh(toSl); mergeFx(toSl); }
  else { const b = toSl.plant; toSl.plant = a; fromSl.plant = b; plantMesh(toSl); plantMesh(fromSl); snd(330, .06, 'triangle', .05); }
}
function nearestSlot(lx, ly, maxD) { let best = null, bd = maxD; for (const s of slots) { const d = Math.hypot(s.x - lx, s.y - ly); if (d < bd) { bd = d; best = s; } } return best; }

function firePlant(sl) {
  const p = sl.plant, lvl = p.lvl, m = G.gold > 0 ? 2 : 1;
  if (p.type === 'sun') { const g = (2 + 2 * lvl) * m; G.coins += g; floatText(sl.x, sl.y - 20, '+' + g, '#ffe066'); stage.burstCubes(sl.x, sl.y, 5, ['#ffe066', '#ffc61a'], 2, .5); snd(880, .1, 'sine', .05, 1.4); return true; }
  let tg = null, bd = 1e9; for (const z of zombies) { if (z.dead) continue; const d = Math.hypot(z.x - sl.x, z.y - sl.y); if (z.y < sl.y + 60 && d < bd) { bd = d; tg = z; } }
  if (!tg) return false;
  if (p.type === 'bomb') { explode(tg.x, tg.y, 80 + 10 * lvl, DMG[lvl] * 2 * m); snd(110, .25, 'sawtooth', .07, .5); return true; }
  const a0 = Math.atan2(tg.y - sl.y, tg.x - sl.x), angs = G.gold > 0 ? [-.28, 0, .28] : [0];
  for (const da of angs) newShot(sl.x, sl.y - 14, a0 + da, p.type, DMG[lvl] * m * (p.type === 'ice' ? .7 : 1), lvl);
  snd(p.type === 'ice' ? 620 : 420, .09, 'triangle', .06, .6); return true;
}
function newShot(x, y, a, type, dmg, lvl) {
  const ice = type === 'ice', m = new THREE.Mesh(new THREE.SphereGeometry(.14 + .02 * lvl, 12, 10), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: ice ? 0x66ccff : 0x7dff3a, emissiveIntensity: 2.6 }));
  m.position.set(wx(x), .7, wz(y)); dyn.add(m); shots.push({ x, y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, type, dmg, mesh: m, slow: ice });
}
function explode(x, y, r, dmg) {
  stage.burstCubes(x, y, 22, ['#ff9a3c', '#ffd84a', '#ff5a1a'], 6, .8); stage.flash(x, y, '#ff9a3c', 90); stage.shake(.5);
  for (const z of zombies) if (!z.dead && Math.hypot(z.x - x, z.y - y) < r) hurt(z, dmg, false);
}

/* ===================== zumbis ===================== */
const ZPAL = ['#6bbf46', '#4fa334', '#8ad65a', '#2f9bd6', '#5a3fa6'];
function spawnZombie(boss) {
  const n = G.wave, si = scenIdx, r = Math.random();
  let type = 'normal'; if (boss) type = 'boss'; else if (n >= 3 && r < .22) type = 'runner'; else if (n >= 2 && r < .5) type = 'cone';
  const base = 3 + .9 * n + 1.3 * si, sp = Math.min(60, 26 + 2.6 * n + 4 * si);
  const z = { type, x: WALL.L + 70 + Math.random() * (WALL.R - WALL.L - 140), y: 112, ph: Math.random() * 6, flash: 0, slow: 0, stun: 0, dead: false, hitCd: 0, wander: Math.random() * 6 };
  const spec = { normal: [1, 1, 26, 8, 60], cone: [2.2, 1, 26, 12, 90], runner: [.6, 1.9, 22, 10, 80], boss: [10, .55, 40, 60, 600] }[type];
  z.hp = z.maxhp = base * spec[0]; z.sp = sp * spec[1]; z.r = spec[2]; z.coin = spec[3] + n + si * 2; z.pts = spec[4];
  z.mesh = buildZombie(type); z.mesh.position.set(wx(z.x), 0, wz(z.y));
  const bar = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .15), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })), fg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .15), new THREE.MeshBasicMaterial({ color: 0x7dff4a, toneMapped: false }));
  fg.position.z = .002; bar.add(bg, fg); bar.position.y = z.mesh.userData.top / z.mesh.userData.sc + .35; bar.rotation.x = -1.05; bar.scale.setScalar(1 / z.mesh.userData.sc * (type === 'boss' ? 1.4 : 1)); bar.visible = false; z.mesh.add(bar); z.bar = bar; z.fg = fg;
  z.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  dyn.add(z.mesh); zombies.push(z);
}
function hurt(z, d, slow) {
  if (z.dead) return;
  z.hp -= d; z.flash = .12; if (slow) z.slow = 2.5 + G.wave * .1;
  z.bar.visible = true; const k = Math.max(0, z.hp / z.maxhp); z.fg.scale.x = Math.max(.001, k); z.fg.position.x = -(1 - k) * .55; z.fg.material.color.set(k > .35 ? 0x7dff4a : 0xff6a3a);
  if (z.hp <= 0) killZombie(z);
}
function killZombie(z) {
  z.dead = true; G.killed++; G.coins += z.coin; G.score += z.pts;
  const big = z.type === 'boss';
  stage.burstCubes(z.x, z.y, big ? 56 : 18, ZPAL, big ? 7 : 4.5, big ? 1.5 : 1); stage.flash(z.x, z.y, '#b6ff7a', big ? 120 : 70); stage.shake(big ? .9 : .35);
  floatText(z.x, z.y - 10, '+' + z.coin, '#ffe066'); snd(160, .2, 'sawtooth', .07, .4); vib(big ? 60 : 25);
  dyn.remove(z.mesh);
  popup('upiii', G.combo >= 3 ? 'COMBO!' : 'UPIII!'); setFelipe('upiii', 1.3, 2);
}
function leak(z) {
  z.dead = true; G.leaked++; dyn.remove(z.mesh); stage.burstCubes(z.x, z.y, 12, ZPAL, 3, .9);
  G.lives--; $('vig').classList.add('on'); setTimeout(() => $('vig').classList.remove('on'), 80);
  stage.shake(.8); vib(160); snd(120, .4, 'sawtooth', .08, .4); setFelipe('triste', 1.8, 3);
  if (G.lives <= 0) endGame(false); else banner('UM ZUMBI PASSOU!', 'Vidas: ' + G.lives);
}

/* ===================== bola ===================== */
function resetBall() { Object.assign(ball, { x: POCKET.x, y: POCKET.rest, vx: 0, vy: 0, active: false }); input.charge = 0; G.pocketT = 0; G.stuckT = 0; }
function launch() {
  if (state !== 'play' || ball.active) { input.charge = 0; return; }
  const v = 1050 + 650 * input.charge; ball.vy = -v; ball.vx = (Math.random() - .5) * 150; ball.active = true; input.charge = 0; G.pocketT = 0;
  snd(200, .3, 'sawtooth', .06, 3); vib(25);
}
function bump(pts) {
  G.score += pts; G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 1.8;
  if (G.combo >= 5 && G.gold <= 0) { G.gold = 10; G.combo = 0; banner('SEMENTE DOURADA!', 'Dano dobrado e tiro triplo por 10s'); snd(300, .4, 'sawtooth', .07, 3); vib(80); popup('upiii', 'COMBO!'); setFelipe('upiii', 1.3, 2); }
}
const hooks = {
  onObstacle(o) { o.hit = 1; bump(25); snd(520, .07, 'square', .04); },
  onPlant(sl) { const p = sl.plant; p.hit = 1; bump(10); if (p.cd <= 0 && firePlant(sl)) p.cd = p.type === 'sun' ? .35 : .22; snd(260 + sl.idx * 50, .06, 'sine', .04); },
  onZombie(z, speed) {
    if (z.hitCd > 0) return;
    z.hitCd = .25; z.stun = .3; z.y -= 12; bump(15);
    hurt(z, (1 + speed / 520) * (G.gold > 0 ? 2 : 1), false); stage.shake(.12); snd(240, .06, 'square', .05);
  },
  onFlipper() { const n = performance.now(); if (n - (G.flipVib || 0) > 140) { G.flipVib = n; vib(12); } }
};
const PS = { ball, obstacles, slots, zombies, slotRadius: SR, hooks };

/* ===================== fluxo da fase ===================== */
function startGame(si) {
  scenIdx = si; const refs = stage.buildTable(si);
  for (const z of zombies) dyn.remove(z.mesh); zombies.length = 0;
  for (const s of shots) dyn.remove(s.mesh); shots.length = 0;
  for (const s of slots) if (s.plant && s.plant.mesh) dyn.remove(s.plant.mesh);
  slots.length = 0; obstacles.length = 0;
  SCEN[si].slots.forEach(([x, y], i) => slots.push({ x, y, plant: null, idx: i }));
  SCEN[si].obstacles.forEach(o => obstacles.push(Object.assign({ hit: 0 }, o)));
  G = { coins: 150 + si * 40, score: 0, lives: 3, wave: 0, toSpawn: 0, spawnT: 0, interval: 2, between: 2.2, clear: false, waveTotal: 0, killed: 0, leaked: 0, combo: 0, comboT: 0, gold: 0, t: 0, pocketT: 0, stuckT: 0 };
  hudCache = {}; resetBall(); felipe = { mood: '', until: 0, prio: 0 };
  showScreen(null); state = 'play'; banner('FASE ' + (si + 1), SCEN[si].name); setFelipe('feliz', 2, 1);
  buildCards(); hud();
}
function startWave() {
  G.wave++; const n = G.wave, si = scenIdx;
  G.toSpawn = 4 + 2 * n + 2 * si + (n === WAVES_PER_SCEN ? 1 : 0); G.waveTotal = G.toSpawn; G.killed = 0; G.leaked = 0;
  G.interval = Math.max(1.2, 3.2 - .25 * n - .2 * si); G.spawnT = 1.2; G.clear = false;
  banner('ONDA ' + n, n === WAVES_PER_SCEN ? 'Chefão a caminho!' : 'Zumbis chegando');
}
function endGame(win) {
  state = 'over'; input.ptrs.clear(); input.charging = false;
  const stars = win ? Math.max(1, G.lives) : 0;
  if (win) { save.stars[scenIdx] = Math.max(save.stars[scenIdx] || 0, stars); save.unlocked = Math.max(save.unlocked, Math.min(SCEN.length, scenIdx + 2)); }
  save.best = Math.max(save.best, G.score); persist();
  setFelipe(win ? 'vitoria' : 'triste', 60, 3); $('face').src = FACES[win ? 'vitoria' : 'triste']; lastFace = win ? 'vitoria' : 'triste';
  const last = scenIdx === SCEN.length - 1;
  $('resTitle').textContent = win ? (last ? 'VITÓRIA TOTAL!' : 'FASE COMPLETA!') : 'FIM DE JOGO';
  $('resStars').innerHTML = win ? '★'.repeat(stars) + '<s>' + '★'.repeat(3 - stars) + '</s>' : '';
  $('resTxt').textContent = (win ? 'Você defendeu ' + SCEN[scenIdx].name + '!' : 'Os zumbis passaram pelo portão.') + ' Pontos: ' + G.score;
  const mainBtn = $('resMain');
  mainBtn.textContent = win ? (last ? 'JOGAR DE NOVO' : 'PRÓXIMA FASE') : 'TENTAR DE NOVO';
  mainBtn.onclick = () => startGame(win && !last ? scenIdx + 1 : scenIdx);
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
  // bolso do lançador / bola parada
  if (ball.active) {
    const sp = Math.hypot(ball.vx, ball.vy);
    if (ball.y > 905) { G.pocketT += dt; if (G.pocketT > .45) { resetBall(); G.combo = 0; snd(300, .2, 'sine', .05, .5); } } else G.pocketT = 0;
    G.stuckT += dt; if (G.stuckT > 1.8) { const moved = Math.hypot(ball.x - (G.sx || 0), ball.y - (G.sy || 0)); G.sx = ball.x; G.sy = ball.y; G.stuckT = 0; if (moved < 40 && ball.y < 880) { ball.vy = -750; ball.vx = (Math.random() - .5) * 500; } }
  } else { ball.x = POCKET.x; ball.y = POCKET.rest; }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.gold > 0) G.gold -= dt;
  for (const o of obstacles) o.hit = Math.max(0, o.hit - dt * 5);
  // plantas
  for (const sl of slots) if (sl.plant) {
    const p = sl.plant; p.cd -= dt; p.hit = Math.max(0, p.hit - dt * 5); p.auto -= dt;
    if (p.auto <= 0) { p.auto = 3.2 + Math.random(); if (p.type !== 'sun' || Math.random() < .5) firePlant(sl); }
    const h = p.hit; p.mesh.scale.set(1 + .22 * h, 1 - .18 * h, 1 + .22 * h);
    p.mesh.rotation.y = Math.sin(G.t * 1.5 + sl.idx) * .08;
  }
  // ondas
  if (G.toSpawn > 0) { G.spawnT -= dt; if (G.spawnT <= 0) { G.spawnT = G.interval * (.75 + Math.random() * .5); G.toSpawn--; spawnZombie(G.toSpawn === 0 && G.wave === WAVES_PER_SCEN); } }
  else if (!G.clear && G.wave > 0 && zombies.every(z => z.dead)) {
    G.clear = true; G.between = 3.4; const bonus = 40 + 10 * G.wave; G.coins += bonus; G.score += 500;
    if (G.wave >= WAVES_PER_SCEN) { endGame(true); return; }
    banner('ONDA ' + G.wave + ' COMPLETA', '+' + bonus + ' moedas'); setFelipe('vitoria', 2.2, 2); snd(660, .35, 'triangle', .07, 1.5);
  }
  if (G.wave === 0 || G.clear) { G.between -= dt; if (G.between <= 0) startWave(); }
  // zumbis
  const blockers = [...obstacles.map(o => [o.x, o.y, o.r]), ...slots.filter(s => s.plant).map(s => [s.x, s.y, SR])];
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i]; if (z.dead) { zombies.splice(i, 1); continue; }
    z.ph += dt * (z.type === 'runner' ? 11 : 6.5); z.flash = Math.max(0, z.flash - dt); z.stun = Math.max(0, z.stun - dt);
    if (z.stun <= 0) { z.y += z.sp * (z.slow > 0 ? .5 : 1) * dt; z.x += Math.sin(z.ph * .25 + z.wander) * 14 * dt; }
    z.slow = Math.max(0, z.slow - dt);
    for (const [bx, by, br] of blockers) { const dx = z.x - bx, dy = z.y - by, d = Math.hypot(dx, dy) || 1, m = br + z.r + 6; if (d < m) { z.x += dx / d * 110 * dt + (dx === 0 ? 40 * dt : 0); z.y += Math.max(0, dy / d) * 40 * dt; } }
    z.x = Math.min(WALL.R - z.r - 4, Math.max(WALL.L + z.r + 4, z.x));
    const ud = z.mesh.userData, sw = Math.sin(z.ph);
    z.mesh.position.set(wx(z.x), Math.abs(sw) * .05, wz(z.y));
    ud.legL.rotation.x = sw * .75; ud.legR.rotation.x = -sw * .75; ud.armL.rotation.x = -1.35 + Math.sin(z.ph * .5) * .18; ud.armR.rotation.x = -1.35 - Math.sin(z.ph * .5) * .18;
    z.mesh.rotation.z = Math.sin(z.ph * .5) * .05;
    const ec = z.flash > 0 ? 0xffffff : 0x2266aa, ei = z.flash > 0 ? .9 : (z.slow > 0 ? .6 : 0);
    for (const m of ud.mats) { m.emissive.set(ec); m.emissiveIntensity = ei; }
    if (z.y >= DANGER) { leak(z); zombies.splice(i, 1); if (state !== 'play') return; }
  }
  // tiros
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.mesh.position.set(wx(s.x), .7, wz(s.y));
    let gone = s.y < WALL.T || s.y > 900 || s.x < 20 || s.x > 520;
    if (!gone) for (const z of zombies) if (!z.dead && Math.hypot(z.x - s.x, z.y - s.y) < z.r + 8) { hurt(z, s.dmg, s.slow); stage.burstCubes(s.x, s.y, 3, [s.slow ? '#a8e6ff' : '#9be55a'], 2, .35); snd(300, .04, 'square', .03); gone = true; break; }
    if (gone) { dyn.remove(s.mesh); s.mesh.geometry.dispose(); shots.splice(i, 1); }
  }
}
const st = { ball, gold: false, danger: false, slotHas: [], slotHot: -1, obHit: [] };
function frameState() {
  st.gold = G.gold > 0; st.danger = zombies.some(z => !z.dead && z.y > DANGER - 130);
  st.slotHas.length = 0; slots.forEach(s => st.slotHas.push(!!s.plant)); st.slotHot = hotSlot;
  st.obHit.length = 0; obstacles.forEach(o => st.obHit.push(o.hit));
}

/* ===================== entrada ===================== */
const touch = $('touch');
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); unlockAudio(); if (state !== 'play') return;
  try { touch.setPointerCapture(e.pointerId); } catch (_) {}
  const L = stage.toLogical(e.clientX, e.clientY);
  if (L) { const sl = nearestSlot(L[0], L[1], 34); if (sl && sl.plant) { beginSlotDrag(e, sl); return; } }
  const r = gameEl.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2;
  input.ptrs.set(e.pointerId, { k: left ? 'L' : 'R' }); snd(left ? 140 : 150, .05, 'square', .03);
});
touch.addEventListener('pointermove', e => dragMove(e));
const upPtr = e => { const p = input.ptrs.get(e.pointerId); input.ptrs.delete(e.pointerId); if (input.drag && input.drag.id === e.pointerId) endDrag(e); };
touch.addEventListener('pointerup', upPtr); touch.addEventListener('pointercancel', upPtr);

function ghostEl(src) { let g = $('ghost'); if (!g) { g = document.createElement('img'); g.id = 'ghost'; g.style.cssText = 'position:absolute;z-index:25;width:20cqw;height:20cqw;pointer-events:none;transform:translate(-50%,-70%);filter:drop-shadow(0 1cqw 1.4cqw #000a)'; gameEl.appendChild(g); } g.src = src; g.style.display = 'block'; return g; }
function startCardDrag(e, type) {
  e.preventDefault(); unlockAudio(); if (state !== 'play') return;
  const el = e.currentTarget; try { el.setPointerCapture(e.pointerId); } catch (_) {}
  input.drag = { id: e.pointerId, src: 'shop', type, sx: e.clientX, sy: e.clientY, moved: false, el };
  el.addEventListener('pointermove', dragMove); el.addEventListener('pointerup', endDrag, { once: true }); el.addEventListener('pointercancel', endDrag, { once: true });
}
function beginSlotDrag(e, sl) {
  input.drag = { id: e.pointerId, src: 'slot', sl, sx: e.clientX, sy: e.clientY, moved: false };
  sl.plant.mesh.visible = false; ghostEl(icons[sl.plant.type]); placeGhost(e.clientX, e.clientY);
}
function placeGhost(cx, cy) { const g = $('ghost'), r = gameEl.getBoundingClientRect(); if (g) { g.style.left = (cx - r.left) + 'px'; g.style.top = (cy - r.top) + 'px'; } }
function dragMove(e) {
  const d = input.drag; if (!d || d.id !== e.pointerId) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 12) { d.moved = true; if (d.src === 'shop') ghostEl(icons[d.type]); }
  if (!d.moved) return;
  placeGhost(e.clientX, e.clientY);
  const r = gameEl.getBoundingClientRect(), L = stage.toLogical(e.clientX, e.clientY - r.height * .05);
  const sl = L ? nearestSlot(L[0], L[1], 70) : null; hotSlot = sl ? sl.idx : -1;
}
function endDrag(e) {
  const d = input.drag; if (!d || d.id !== e.pointerId) return;
  input.drag = null; const g = $('ghost'); if (g) g.style.display = 'none';
  const r = gameEl.getBoundingClientRect(), L = stage.toLogical(e.clientX, e.clientY - r.height * .05);
  const target = d.moved && L && e.type !== 'pointercancel' ? nearestSlot(L[0], L[1], 70) : null; hotSlot = -1;
  if (d.src === 'shop') {
    if (!d.moved && e.type !== 'pointercancel') { const sl = slots.find(s => !s.plant) || slots.find(s => s.plant.type === d.type && s.plant.lvl === 1); if (sl) buy(d.type, sl); else toast('Sem espaço'); }
    else if (target) buy(d.type, target);
  } else { d.sl.plant.mesh.visible = true; moveDrop(d.sl, target); }
}
const lb = $('launch');
lb.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); if (state !== 'play') return; try { lb.setPointerCapture(e.pointerId); } catch (_) {} input.charging = true; });
const lbUp = () => { if (input.charging) { input.charging = false; launch(); } };
lb.addEventListener('pointerup', lbUp); lb.addEventListener('pointercancel', () => { input.charging = false; input.charge = 0; });
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
  else if (k === ' ' || k === 'ArrowDown') lbUp();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

/* ===================== telas ===================== */
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function togglePause() {
  if (state === 'play') { state = 'paused'; input.ptrs.clear(); input.charging = false; input.charge = 0; flippers.forEach(f => f.held = false); showScreen('pause'); }
  else if (state === 'paused') { state = 'play'; showScreen(null); }
}
function buildLevels() {
  $('lvList').innerHTML = SCEN.map((s, i) => `<button class="lv ${i + 1 > save.unlocked ? 'lock' : ''}" data-lv="${i}"><img src="assets/ui/cenario-${s.id}.webp" alt=""><span><b>${i + 1}. ${s.name}</b><small>${i + 1 > save.unlocked ? 'Complete a fase anterior' : s.sub}</small><div class="st">${'★'.repeat(save.stars[i] || 0)}${'☆'.repeat(3 - (save.stars[i] || 0))}</div></span></button>`).join('');
  document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => startGame(+b.dataset.lv));
}
function toMenu() { state = 'menu'; showScreen('menu'); $('menuBest').textContent = save.best ? 'Recorde: ' + save.best : ''; }
$('hJogar').onclick = () => { unlockAudio(); startGame(Math.min(save.unlocked, SCEN.length) - 1); };
$('hCen').onclick = () => { buildLevels(); showScreen('levels'); };
$('hPers').onclick = () => showScreen('chars');
$('hSom').onclick = () => { setMuted(!isMuted()); toast(isMuted() ? 'Som desligado' : 'Som ligado'); if (!isMuted()) snd(660, .15, 'triangle', .07); };
document.querySelectorAll('[data-go="menu"]').forEach(b => b.onclick = toMenu);
$('pauseBtn').addEventListener('pointerdown', e => { e.stopPropagation(); togglePause(); });
$('bResume').onclick = togglePause;
$('bRestart').onclick = () => startGame(scenIdx);
$('bQuit').onclick = toMenu; $('resMenu').onclick = toMenu;

/* ===================== laço principal ===================== */
function resize() { const r = gameEl.getBoundingClientRect(); stage.resize(Math.max(2, Math.round(r.width)), Math.max(2, Math.round(r.height))); }
new ResizeObserver(resize).observe(gameEl); resize();
let last = performance.now(), slow = 0, qLevel = 0;
function frame(ts) {
  const rawDt = (ts - last) / 1000 || 0, dt = Math.min(.05, rawDt); last = ts;
  if (state === 'play' || state === 'paused' || state === 'over') {
    update(dt); frameState(); stage.update(state === 'paused' ? 0 : dt, st); hud(); stage.render();
    // qualidade automática
    if (state === 'play') { slow = rawDt > .034 && rawDt < .25 ? slow + rawDt : Math.max(0, slow - rawDt * .5); if (slow > 2.5 && qLevel < 2) { qLevel++; stage.setQuality(qLevel); slow = 0; } }
  }
  requestAnimationFrame(frame);
}
toMenu(); buildCards(); requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(() => {});

// gancho de teste (usado nos testes automatizados)
window.PZ = { end: endGame, step: dt => { update(dt); }, start: startGame, launch, buy, slots, zombies, ball, flippers, input, stage, get G() { return G; }, get state() { return state; }, frame: () => { frameState(); stage.update(0.016, st); hud(); stage.render(); } };
