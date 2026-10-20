import * as THREE from 'three';
import { LVLCOL } from './config.js';

export const S = 0.02; // 1 unidade lógica = 0.02 no mundo 3D
const cache = {};
export function mat(color, o) {
  const key = color + JSON.stringify(o || {});
  return cache[key] || (cache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .75, metalness: 0 }, o || {})));
}
export function glow(color, intensity) {
  return new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity || 2, roughness: .4 });
}
function box(w, h, d, m, x, y, z) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; return me; }
function cyl(rt, rb, h, m, x, y, z, seg) { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; return me; }
function sph(r, m, x, y, z, ws) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, ws || 20, ws ? ws - 4 : 16), m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; return me; }

/* ---------- texturas procedurais ---------- */
function pixelTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noisePx(g, size, base, vary) {
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = (Math.random() - .5) * vary; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(x, y, 1, 1);
  }
}
const skinCache = {};
function skinTex(key, base) { return skinCache[key] || (skinCache[key] = pixelTex(16, (g, s) => noisePx(g, s, base, .22))); }
let faceT;
function faceTex() {
  return faceT || (faceT = pixelTex(16, (g, s) => {
    noisePx(g, s, '#6ec545', .2);
    g.fillStyle = '#1d3a14'; g.fillRect(3, 5, 3, 3); g.fillRect(10, 5, 3, 3);      // olhos
    g.fillStyle = '#0b1a07'; g.fillRect(4, 6, 2, 2); g.fillRect(11, 6, 2, 2);
    g.fillStyle = '#2a1410'; g.fillRect(5, 10, 6, 4);                                // boca
    g.fillStyle = '#c0392b'; g.fillRect(6, 12, 4, 2);                                // língua
  }));
}

/* ---------- zumbi voxel ---------- */
export function buildZombie(kind) {
  const g = new THREE.Group(), mats = [];
  const mk = (tex, color) => { const m = new THREE.MeshStandardMaterial({ map: tex, color, roughness: .85 }); mats.push(m); return m; };
  const green = skinTex('g', '#6bbf46');
  const shirtCol = { normal: '#2f9bd6', cone: '#d98b2b', runner: '#b24ad6', boss: '#b03030' }[kind] || '#2f9bd6';
  const shirt = mk(skinTex('s' + kind, shirtCol), 0xffffff), skin = mk(green, 0xffffff), pants = mk(skinTex('p', '#5a3fa6'), 0xffffff);
  const faceM = mk(faceTex(), 0xffffff);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.62, .62, .62), [skin, skin, skin, skin, faceM, skin]);
  head.position.y = 1.5; head.castShadow = true; g.add(head);
  const torso = box(.72, .78, .38, shirt, 0, .92, 0); g.add(torso);
  const mkLimb = (w, h, m, x, y) => {
    const geo = new THREE.BoxGeometry(w, h, w); geo.translate(0, -h / 2, 0);
    const me = new THREE.Mesh(geo, m); me.position.set(x, y, 0); me.castShadow = true; g.add(me); return me;
  };
  const legL = mkLimb(.32, .62, pants, -.17, .58), legR = mkLimb(.32, .62, pants, .17, .58);
  const armL = mkLimb(.27, .72, skin, -.5, 1.28), armR = mkLimb(.27, .72, skin, .5, 1.28);
  armL.rotation.x = armR.rotation.x = -1.35;
  if (kind === 'cone') {
    const c = new THREE.Mesh(new THREE.ConeGeometry(.3, .62, 16), mat(0xf08a24)); c.position.y = 2.1; c.castShadow = true; g.add(c);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 8, 18), mat(0xffffff)); band.rotation.x = Math.PI / 2; band.position.y = 2.0; g.add(band);
  }
  if (kind === 'boss') {
    const gold = mat(0xffd24a, { metalness: .6, roughness: .3, emissive: 0x442200, emissiveIntensity: .6 });
    g.add(box(.7, .16, .7, gold, 0, 1.9, 0));
    for (const x of [-.26, 0, .26]) g.add(box(.14, .22, .14, gold, x, 2.05, 0));
  }
  const sc = { normal: 1, cone: 1, runner: .88, boss: 1.75 }[kind] || 1;
  g.scale.setScalar(sc);
  g.userData = { legL, legR, armL, armR, head, mats, sc, top: (kind === 'boss' ? 2.4 : kind === 'cone' ? 2.55 : 2.0) * sc };
  return g;
}

/* ---------- plantas ---------- */
export function buildPlant(type) {
  const g = new THREE.Group();
  g.add(cyl(.5, .56, .1, mat(0x2d7a2a), 0, .05, 0, 24));
  const green = mat(0x5ed12e, { roughness: .45 }), leaf = mat(0x2f8a2b);
  const eyes = (y, z, r) => {
    for (const x of [-.15, .15]) { g.add(sph(r, mat(0xffffff), x, y, z, 12)); g.add(sph(r * .5, mat(0x111111), x, y - .01, z + r * .7, 10)); }
  };
  if (type === 'pea' || type === 'ice') {
    const ice = type === 'ice';
    g.add(sph(.4, ice ? mat(0x6cc4f0, { roughness: .3 }) : green, 0, .55, 0, 24));
    const sn = cyl(.14, .16, .34, ice ? mat(0x3d9ad6) : mat(0x3f9a1e), 0, .62, -.4); sn.rotation.x = Math.PI / 2; g.add(sn);
    const hole = cyl(.09, .09, .02, mat(0x0a2a10), 0, .62, -.58); hole.rotation.x = Math.PI / 2; g.add(hole);
    for (const s of [-1, 1]) { const l = sph(.2, leaf, s * .4, .2, .1, 12); l.scale.set(1.3, .35, 1); g.add(l); }
    if (ice) for (const x of [-.18, 0, .18]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.08, .3 + (x === 0 ? .1 : 0), 6), glow(0xaee8ff, 1.2)); c.position.set(x, .98, 0); g.add(c); }
    eyes(.62, .32, .09);
  } else if (type === 'bomb') {
    const red = mat(0xd81f26, { roughness: .25, metalness: .1 });
    g.add(sph(.28, red, -.24, .35, .05, 20)); g.add(sph(.28, red, .24, .32, .0, 20));
    for (const [x, z] of [[-.24, .05], [.24, 0]]) { const st = cyl(.025, .025, .55, mat(0x2c7a22), x * .55, .72, z * .5); st.rotation.z = x < 0 ? -.35 : .35; g.add(st); }
    const lf = sph(.16, mat(0x3da230), 0, 1.0, 0); lf.scale.set(1.5, .25, 1); lf.rotation.z = .4; g.add(lf);
    for (const x of [-.24, .24]) { g.add(sph(.065, mat(0xffffff), x, .4, .3, 10)); g.add(sph(.033, mat(0x111111), x, .4, .35, 8)); }
  } else {
    const gold = mat(0xffc61a, { emissive: 0x553300, emissiveIntensity: .5 });
    const fl = new THREE.Group(); fl.position.set(0, .62, .02); fl.rotation.x = .75;
    for (let i = 0; i < 10; i++) { const p = sph(.15, gold, 0, 0, 0); p.scale.set(.7, 1.3, .35); p.position.set(Math.sin(i * .628) * .42, Math.cos(i * .628) * .42, 0); p.rotation.z = -i * .628; fl.add(p); }
    const c = cyl(.3, .3, .16, mat(0xb8651b), 0, 0, .05); c.rotation.x = Math.PI / 2; fl.add(c);
    for (const x of [-.1, .1]) fl.add(sph(.04, mat(0x111111), x, .06, .15, 8));
    g.add(fl);
    g.add(cyl(.05, .06, .35, mat(0x2f8a2b), 0, .25, -.05));
  }
  return g;
}
const badgeCache = {};
export function levelBadge(lvl) {
  if (badgeCache[lvl]) return badgeCache[lvl].clone();
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = LVLCOL[lvl]; g.strokeStyle = '#000b'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.font = '900 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lvl, 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(.42, .42, 1); s.renderOrder = 10;
  badgeCache[lvl] = s; return s.clone();
}
export function levelRing(lvl) {
  const m = glow(new THREE.Color(LVLCOL[lvl] || '#fff'), 1.4);
  const r = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 8, 40), m); r.rotation.x = Math.PI / 2; r.position.y = .12; return r;
}

/* ---------- obstáculos / cenário ---------- */
const wood = () => mat(0xa8713a, { roughness: .8 }), darkWood = () => mat(0x6b4524);
export function buildObstacle(k, r) {
  const g = new THREE.Group(), R = r * S;
  if (k === 'trash') {
    g.add(cyl(R * .85, R * .75, R * 1.9, mat(0x9aa4aa, { metalness: .8, roughness: .35 }), 0, R * .95, 0, 24));
    g.add(cyl(R * .95, R * .95, R * .18, mat(0x7d878d, { metalness: .8, roughness: .3 }), 0, R * 1.95, 0, 24));
    g.add(box(R * .5, R * .12, R * .12, mat(0x555e63, { metalness: .7 }), 0, R * 2.1, 0));
    for (let i = 0; i < 4; i++) { const rib = cyl(R * .02, R * .02, R * 1.7, mat(0x6b7479, { metalness: .8 }), Math.sin(i * 1.57) * R * .84, R * .95, Math.cos(i * 1.57) * R * .84, 6); g.add(rib); }
  } else if (k === 'tire') {
    for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(R * .68, R * .32, 14, 28), mat(0x1c1c1f, { roughness: .9 })); t.rotation.x = Math.PI / 2; t.position.y = R * .32 + i * R * .6; t.castShadow = true; g.add(t); }
  } else if (k === 'crate') {
    g.add(box(R * 1.5, R * 1.5, R * 1.5, wood(), 0, R * .75, 0));
    for (const y of [.15, 1.35]) g.add(box(R * 1.56, R * .18, R * 1.56, darkWood(), 0, R * y, 0));
    for (const x of [-.66, .66]) for (const z of [-.66, .66]) g.add(box(R * .2, R * 1.56, R * .2, darkWood(), x * R, R * .75, z * R));
    g.rotation.y = .4;
  } else if (k === 'bbq') {
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(R * .9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x222428, { metalness: .6, roughness: .4 })); bowl.rotation.x = Math.PI; bowl.position.y = R * 1.5; bowl.castShadow = true; g.add(bowl);
    g.add(cyl(R * .86, R * .86, R * .04, mat(0x8a8f94, { metalness: .8 }), 0, R * 1.5, 0, 24));
    for (const [x, z] of [[-.5, -.4], [.5, -.4], [0, .6]]) g.add(cyl(R * .05, R * .05, R * 1.5, mat(0x333333), x * R, R * .75, z * R, 6));
    g.add(sph(R * .25, glow(0xff5a1a, 1.4), 0, R * 1.42, 0, 10));
  } else if (k === 'tree') {
    g.add(cyl(R * .22, R * .3, R * 1.5, mat(0x6b4524), 0, R * .75, 0, 10));
    const f = mat(0x2f8f2f, { roughness: .8 });
    for (const [x, y, z, s] of [[0, 1.9, 0, .85], [-.45, 1.5, .2, .6], [.5, 1.55, -.1, .6], [.1, 2.4, .1, .55]]) {
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(R * s * 1.35, 1), f); l.position.set(x * R, y * R * 1.2, z * R); l.castShadow = true; g.add(l);
    }
  } else if (k === 'log') {
    g.add(cyl(R * .9, R, R * 1.5, mat(0x8a5a2b), 0, R * .75, 0, 18));
    g.add(cyl(R * .82, R * .82, R * .04, mat(0xd9ad6c), 0, R * 1.51, 0, 18));
    g.add(cyl(R * 1.15, R * 1.3, R * .25, mat(0x8d9399), 0, R * .12, 0, 6));
  } else if (k === 'cone') {
    const c = new THREE.Mesh(new THREE.ConeGeometry(R * .85, R * 2.6, 20), mat(0xff6a1a, { roughness: .5 })); c.position.y = R * 1.3; c.castShadow = true; g.add(c);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(R * .5, R * .6, R * .55, 20), mat(0xffffff)); b.position.y = R * 1.25; g.add(b);
    g.add(box(R * 2, R * .2, R * 2, mat(0x2a2a2a), 0, R * .1, 0));
  } else if (k === 'manhole') {
    g.add(cyl(R * 1.05, R * 1.05, R * .16, mat(0x3b3f45, { metalness: .8, roughness: .45 }), 0, R * .08, 0, 28));
    for (let i = 0; i < 6; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(R * (.2 + i * .12), R * .03, 6, 28), mat(0x24272b, { metalness: .8 })); rr.rotation.x = Math.PI / 2; rr.position.y = R * .17; g.add(rr); }
  } else if (k === 'fountain') {
    g.add(cyl(R * 1.0, R * 1.05, R * .45, mat(0xb9b2a4, { roughness: .8 }), 0, R * .22, 0, 36));
    const water = new THREE.Mesh(new THREE.CylinderGeometry(R * .88, R * .88, R * .05, 36), new THREE.MeshStandardMaterial({ color: 0x2f9fe0, emissive: 0x1166aa, emissiveIntensity: .8, roughness: .1, metalness: .3 })); water.position.y = R * .46; g.add(water);
    g.add(cyl(R * .3, R * .38, R * .8, mat(0xc9c2b4), 0, R * .85, 0, 20));
    g.add(cyl(R * .62, R * .5, R * .16, mat(0xc9c2b4), 0, R * 1.3, 0, 28));
    const jet = new THREE.Mesh(new THREE.ConeGeometry(R * .12, R * .8, 12), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x66ccff, emissiveIntensity: 1.2, transparent: true, opacity: .8 })); jet.position.y = R * 1.7; g.add(jet);
    g.userData.jet = jet;
  } else if (k === 'bush') {
    const f = mat(0x2a8a34, { roughness: .9 });
    for (const [x, y, z, s] of [[0, .6, 0, .9], [-.5, .5, .1, .6], [.5, .5, -.1, .65], [0, 1.0, 0, .55]]) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(R * s, 1), f); l.position.set(x * R, y * R, z * R); l.castShadow = true; g.add(l); }
    for (const [x, z] of [[.3, .6], [-.4, .5], [.6, -.2]]) g.add(sph(R * .08, glow(0xff7ab8, 1), x * R, R * .8, z * R, 8));
  } else if (k === 'lamp') {
    g.add(cyl(R * .35, R * .45, R * .4, mat(0x2a2a2d, { metalness: .6 }), 0, R * .2, 0, 10));
    g.add(cyl(R * .14, R * .18, R * 5, mat(0x2a2a2d, { metalness: .6 }), 0, R * 2.6, 0, 10));
    g.add(sph(R * .55, glow(0xffd27a, 2.6), 0, R * 5.3, 0, 14));
  }
  return g;
}
export function buildLamp(h) { return buildObstacle('lamp', 13 * (h || 1)); }
export function buildCar(color) {
  const g = new THREE.Group(), body = mat(color, { roughness: .3, metalness: .5 });
  g.add(box(1.5, .5, 3.1, body, 0, .5, 0));
  g.add(box(1.3, .5, 1.6, mat(0x9bd3ee, { roughness: .1, metalness: .3 }), 0, .98, .1));
  g.add(box(1.32, .08, 1.62, body, 0, 1.26, .1));
  for (const [x, z] of [[-.75, -1], [.75, -1], [-.75, 1], [.75, 1]]) { const w = cyl(.3, .3, .22, mat(0x151515), x, .3, z, 16); w.rotation.z = Math.PI / 2; g.add(w); }
  g.add(box(.3, .12, .06, glow(0xfff2b0, 2), -.45, .55, 1.56)); g.add(box(.3, .12, .06, glow(0xfff2b0, 2), .45, .55, 1.56));
  g.add(box(.3, .12, .06, glow(0xff2222, 1.6), -.45, .55, -1.56)); g.add(box(.3, .12, .06, glow(0xff2222, 1.6), .45, .55, -1.56));
  return g;
}
export function buildBench() {
  const g = new THREE.Group();
  g.add(box(1.6, .1, .5, wood(), 0, .5, 0)); g.add(box(1.6, .45, .08, wood(), 0, .85, -.25));
  for (const x of [-.7, .7]) g.add(box(.08, .5, .5, mat(0x222222, { metalness: .6 }), x, .25, 0));
  return g;
}
export function buildBigTree(sc) {
  const g = new THREE.Group();
  g.add(cyl(.28 * sc, .4 * sc, 1.8 * sc, mat(0x6b4524), 0, .9 * sc, 0, 8));
  const f = mat(0x2f9a3a, { roughness: .85 });
  for (const [x, y, z, s] of [[0, 2.5, 0, 1.3], [-.9, 2.1, .3, .95], [.9, 2.2, -.2, .95], [.1, 3.3, .1, .85]]) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(s * sc, 1), f); l.position.set(x * sc, y * sc, z * sc); l.castShadow = true; g.add(l);
  }
  return g;
}

/* ---------- flipper ---------- */
export function buildFlipper(L, s) {
  const sh = new THREE.Shape(), r0 = 14 * S, r1 = 9 * S, len = L * S;
  sh.absarc(0, 0, r0, Math.PI / 2, 1.5 * Math.PI, false);
  sh.lineTo(len, -r1);
  sh.absarc(len, 0, r1, -Math.PI / 2, Math.PI / 2, false);
  sh.lineTo(0, r0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .36, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2); // plano XZ, extrusão sobe em +Y
  const grp = new THREE.Group();
  const body = new THREE.Mesh(geo, mat(0xd9a45a, { roughness: .55 })); body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const rim = new THREE.Mesh(geo, mat(0x8a929a, { metalness: .9, roughness: .3 })); rim.scale.set(1.02, .35, 1.12); rim.position.y = -.01; rim.castShadow = true; grp.add(rim);
  const cap = cyl(r0 * .8, r0 * .8, .1, mat(0x8a929a, { metalness: .9, roughness: .3 }), 0, .46, 0, 20); grp.add(cap);
  const dot = cyl(r0 * .35, r0 * .35, .12, glow(0x3dff6a, 1.6), 0, .5, 0, 12); grp.add(dot);
  return grp;
}

/* ---------- chão procedural ---------- */
function paintGround(id) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d'); g.scale(2, 2);
  const dots = (n, cols, rmin, rmax, y0, y1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.beginPath(); g.arc(Math.random() * 540, y0 + Math.random() * (y1 - y0), rmin + Math.random() * (rmax - rmin), 0, 7); g.fill(); } };
  const tiles = (y0, y1, col, gap) => { g.fillStyle = gap; g.fillRect(0, y0, 540, y1 - y0); for (let y = y0; y < y1; y += 44) for (let x = (((y - y0) / 44) % 2) * 30 - 30; x < 540; x += 60) { g.fillStyle = col[(Math.random() * col.length) | 0]; g.beginPath(); g.roundRect(x + 3, y + 3, 54, 38, 8); g.fill(); } };
  if (id === 'a') {
    for (let y = 0; y < 360; y += 60) { g.fillStyle = (y / 60) % 2 ? '#58ad3b' : '#63bd44'; g.fillRect(0, y, 540, 60); }
    dots(600, ['#4f9f35', '#6fc84c', '#3f8a2d'], 1, 3, 0, 360); dots(40, ['#ffffff', '#ffe36b'], 2, 4, 90, 340);
    g.fillStyle = '#b98a52'; g.fillRect(0, 340, 540, 440);
    dots(900, ['#a77a45', '#c99a5f', '#9a6f3c', '#d1a56a'], 1, 4, 340, 780); dots(25, ['#8d8f93', '#aeb2b7'], 4, 9, 360, 760);
    let gr = g.createLinearGradient(0, 300, 0, 380); gr.addColorStop(0, '#63bd4400'); gr.addColorStop(1, '#b98a5200'); g.fillStyle = gr; g.fillRect(0, 300, 540, 80);
    tiles(780, 960, ['#9fa3a8', '#b3b7bc', '#8e9297'], '#4c8a38');
  } else if (id === 'b') {
    g.fillStyle = '#4b4e57'; g.fillRect(0, 0, 540, 960); dots(2200, ['#3d4048', '#575a63', '#444750'], 1, 3, 0, 960);
    g.fillStyle = '#e3b53a'; for (let y = 100; y < 780; y += 90) g.fillRect(264, y, 12, 50);
    g.fillStyle = '#e9e9e9'; for (const x of [150, 390]) for (let y = 110; y < 780; y += 120) g.fillRect(x, y, 6, 60);
    g.fillStyle = '#a8a7a1'; g.fillRect(0, 0, 52, 960); g.fillRect(488, 0, 52, 960);
    g.fillStyle = '#8f8e88'; g.fillRect(48, 0, 5, 960); g.fillRect(487, 0, 5, 960);
    tiles(780, 960, ['#9fa3a8', '#b3b7bc', '#8e9297'], '#3d4a38');
  } else {
    g.fillStyle = '#58a83c'; g.fillRect(0, 0, 540, 960); dots(900, ['#4a9831', '#68b948', '#3f8a2d'], 1, 3, 0, 780);
    g.strokeStyle = '#dccaa0'; g.lineWidth = 70; g.lineCap = 'round'; g.beginPath(); g.moveTo(270, 110); g.bezierCurveTo(60, 230, 60, 380, 270, 460); g.bezierCurveTo(480, 560, 480, 700, 270, 790); g.stroke();
    g.strokeStyle = '#cdb98a'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#d8d1c1'; g.beginPath(); g.arc(270, 520, 98, 0, 7); g.fill();
    dots(600, ['#cbbf9c', '#e6d9b5'], 1, 3, 90, 790);
    dots(70, ['#ff7ab8', '#ffe36b', '#ffffff', '#b78cff'], 2, 4, 90, 770);
    tiles(780, 960, ['#9fa3a8', '#b3b7bc', '#8e9297'], '#3f7a34');
  }
  // caminho de pedra até o portão (todas as fases)
  g.fillStyle = '#d7d2c4'; g.globalAlpha = .55; for (let y = 800; y < 940; y += 36) { g.beginPath(); g.roundRect(236, y, 68, 26, 6); g.fill(); } g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function groundTexture(id) { return paintGround(id); }

export function slotIconTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#103a1a'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.strokeStyle = '#7dff9a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 34); g.lineTo(64, 94); g.moveTo(34, 64); g.lineTo(94, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function dangerTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#5a0a0a'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#c91818'; for (let x = -128; x < 1100; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 0); g.lineTo(x + 96, 128); g.lineTo(x + 64, 128); g.fill(); }
  g.fillStyle = '#2a0505'; g.fillRect(380, 0, 264, 128);
  g.font = '900 88px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('⚠', 420, 66); g.fillText('☠', 512, 66); g.fillText('⚠', 604, 66);
  g.fillStyle = '#ffd1d1'; g.fillText('⚠', 420, 64); g.fillText('☠', 512, 64); g.fillText('⚠', 604, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
