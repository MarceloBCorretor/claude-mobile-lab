import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { S, mat, glow, buildObstacle, buildFlipper, buildCar, buildBench, buildBigTree, buildLamp, groundTexture, slotIconTex, dangerTex } from './models.js';
import { SCEN, DANGER, BR } from './config.js';
import { segs, flippers } from './physics.js';

export const wx = x => (x - 270) * S;
export const wz = y => (y - 480) * S;

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3b8a3a);
  scene.fog = new THREE.Fog(0x4d9b45, 70, 170);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .55;
  const camera = new THREE.PerspectiveCamera(46, 9 / 16, .1, 300);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6b8a3a, .65));
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.1);
  sun.position.set(-6, 14, 6); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 13, bottom: -13, near: 1, far: 40 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const flashLight = new THREE.PointLight(0xffffff, 0, 9, 1.6); flashLight.position.set(0, 1.5, 0); scene.add(flashLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .7, .5, 1.1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const world = new THREE.Group(); scene.add(world);        // mesa + cenário (troca por fase)
  const dyn = new THREE.Group(); scene.add(dyn);            // zumbis, plantas, tiros
  let ballMesh, trail, trailPos = [], tableRefs = null;
  const q = { bloom: true, shadow: true, dpr: 1.75 };

  /* ---------- bola ---------- */
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 1, roughness: .14, emissive: 0x000000 });
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR * S, 32, 24), ballMat); ballMesh.castShadow = true; scene.add(ballMesh);
  const TN = 26;
  trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }), TN);
  trail.frustumCulled = false; scene.add(trail);
  const dummy = new THREE.Object3D();

  /* ---------- cubinhos da explosão ---------- */
  const PN = 520, cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .15, .15), new THREE.MeshStandardMaterial({ roughness: .7 }), PN);
  cubes.castShadow = true; cubes.frustumCulled = false; scene.add(cubes);
  const P = Array.from({ length: PN }, () => ({ life: 0, max: 1, x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 1 }));
  for (let i = 0; i < PN; i++) { dummy.position.set(0, -50, 0); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix); cubes.setColorAt(i, new THREE.Color(1, 1, 1)); }
  let pHead = 0; const col = new THREE.Color();
  function burstCubes(x, y, n, palette, power, sc) {
    for (let i = 0; i < n; i++) {
      const p = P[pHead]; pHead = (pHead + 1) % PN;
      const a = Math.random() * 6.283, v = (.4 + Math.random()) * (power || 4);
      Object.assign(p, { life: 1.4 + Math.random() * .8, max: 2.2, x: wx(x), y: .5 + Math.random() * 1.1, z: wz(y), vx: Math.cos(a) * v, vy: 2 + Math.random() * 5, vz: Math.sin(a) * v, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: (Math.random() - .5) * 14, wy: (Math.random() - .5) * 14, wz: (Math.random() - .5) * 14, s: (sc || 1) * (.7 + Math.random() * .8) });
      col.set(palette[(Math.random() * palette.length) | 0]); cubes.setColorAt(pHead === 0 ? PN - 1 : pHead - 1, col);
    }
    cubes.instanceColor.needsUpdate = true;
  }

  /* ---------- mesa ---------- */
  function clearWorld() {
    while (world.children.length) { const c = world.children.pop(); c.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); if (o.material && o.material.map && o.material.map.isCanvasTexture && !o.userData.shared) o.material.map.dispose(); }); }
  }
  function wall(s) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) * S;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len + .06, .62, .34), mat(0x7a4a22, { roughness: .8 }));
    m.position.set(wx((s.x1 + s.x2) / 2), .31, wz((s.y1 + s.y2) / 2)); m.rotation.y = -Math.atan2(dy, dx); m.castShadow = true; m.receiveShadow = true;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(len + .06, .08, .42), mat(0xb07a3c)); trim.position.y = .35; m.add(trim);
    return m;
  }
  function buildTable(si) {
    clearWorld();
    const sc = SCEN[si], refs = { obstacles: [], slots: [], flippers: [], extras: {} };
    // chão
    const gt = groundTexture(sc.id);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(540 * S, 960 * S), new THREE.MeshStandardMaterial({ map: gt, roughness: .95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: sc.id === 'b' ? 0x6d7078 : 0x3f8f3a, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -.02; outer.receiveShadow = true; world.add(outer);
    scene.background.set(sc.id === 'b' ? 0x7aa6c8 : 0x6fb2e0); scene.fog.color.set(sc.id === 'b' ? 0x8aa9c0 : 0x7fbf8a);
    // paredes (só as que formam a mesa)
    for (const s of segs) world.add(wall(s));
    // linha de perigo
    const dm = new THREE.MeshBasicMaterial({ map: dangerTex(), toneMapped: false, transparent: true });
    const danger = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.0), dm); danger.rotation.x = -Math.PI / 2; danger.position.set(0, .03, wz(DANGER + 18)); world.add(danger);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9.0, .05, .09), glow(0xff2a2a, 3)); bar.position.set(0, .06, wz(DANGER)); world.add(bar);
    refs.extras.dangerBar = bar; refs.extras.danger = dm;
    // lançador
    const pocket = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.62, .09, 10, 28), mat(0xb9c0c6, { metalness: .9, roughness: .25 })); rim.rotation.x = Math.PI / 2; rim.position.set(wx(270), .12, wz(918)); world.add(rim);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.28, .5, 3), glow(0xffcc33, 2.4)); arrow.rotation.x = -Math.PI / 2; arrow.position.set(wx(270), .1, wz(862)); world.add(arrow);
    refs.extras.arrow = arrow;
    refs.extras.dots = [];
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), glow(0xffcc33, 2.4)); d.position.set(wx(270), .08, wz(842 - i * 26)); world.add(d); refs.extras.dots.push(d); }
    // flippers
    for (const f of flippers) {
      const m = buildFlipper(f.L, f.s); m.position.set(wx(f.px), .1, wz(f.py)); world.add(m); refs.flippers.push(m);
    }
    // obstáculos
    for (const o of sc.obstacles) {
      const g = buildObstacle(o.k, o.r); g.position.set(wx(o.x), 0, wz(o.y));
      if (o.kick) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r * S * 1.08, .05, 8, 36), glow(0xff8a1e, 1.8)); ring.rotation.x = Math.PI / 2; ring.position.y = .06; g.add(ring); g.userData.ring = ring;
      }
      world.add(g); refs.obstacles.push(g);
    }
    // slots [+]
    const icon = slotIconTex();
    for (const [x, y] of sc.slots) {
      const g = new THREE.Group(); g.position.set(wx(x), 0, wz(y));
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(.56, .6, .1, 28), mat(0x15401e, { metalness: .4, roughness: .45 })); disc.position.y = .05; disc.receiveShadow = true; g.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.56, .05, 10, 36), glow(0x35ff5a, 1.8)); ring.rotation.x = Math.PI / 2; ring.position.y = .1; g.add(ring);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(.44, 28), new THREE.MeshBasicMaterial({ map: icon, transparent: true, toneMapped: false })); pad.rotation.x = -Math.PI / 2; pad.position.y = .11; g.add(pad);
      g.userData = { ring, pad }; world.add(g); refs.slots.push(g);
    }
    decorate(sc, refs);
    tableRefs = refs; return refs;
  }
  function decorate(sc, refs) {
    const add = (o, x, z, ry, s) => { o.position.set(x, 0, z); if (ry) o.rotation.y = ry; if (s) o.scale.setScalar(s); o.traverse(m => { if (m.isMesh) m.castShadow = true; }); world.add(o); return o; };
    const hedge = () => buildObstacle('bush', 40);
    if (sc.id === 'a') {
      for (let i = 0; i < 7; i++) { add(buildBigTree(.9 + (i % 3) * .2), -7 - (i % 2) * 1.2, -8.5 + i * 2.6, i); add(buildBigTree(.8 + (i % 3) * .25), 7.3 + (i % 2) * 1.0, -8 + i * 2.7, i * 2); }
      add(buildBigTree(1.2), -4.5, -11.5, 0); add(buildBigTree(1.1), 3.8, -11.8, 1); add(buildLamp(1), -5.9, 7.6, 0); add(buildLamp(1), 5.9, 7.6, 0);
      add(buildBench(), 6.2, -3, Math.PI / 2, .9);
    } else if (sc.id === 'b') {
      add(buildCar(0xd9332a), -6.8, -3.8, 0); add(buildCar(0x2d5fb8), 6.8, -.2, Math.PI); add(buildCar(0xe8a020), -6.8, 4.5, 0);
      for (const z of [-7, 0, 6.5]) { add(buildLamp(1.3), -5.9, z, 0); add(buildLamp(1.3), 5.9, z - 1.5, 0); }
      for (let i = 0; i < 5; i++) { add(buildBigTree(1.1), -9.2, -9 + i * 4.8, i); add(buildBigTree(1.1), 9.2, -8 + i * 4.8, i + 3); }
    } else {
      for (let i = 0; i < 8; i++) { add(hedge(), -6.2, -9 + i * 2.5, 0, 1.3); add(hedge(), 6.2, -9 + i * 2.5, 0, 1.3); }
      add(buildBench(), -5.7, 2.5, Math.PI / 2, 1); add(buildBench(), 5.7, 2.5, -Math.PI / 2, 1);
      for (let i = 0; i < 4; i++) { add(buildBigTree(1.3), -8.5, -9 + i * 5, i); add(buildBigTree(1.3), 8.5, -9 + i * 5, i + 2); }
      add(buildLamp(1.3), -5.9, 7, 0); add(buildLamp(1.3), 5.9, 7, 0);
    }
  }

  /* ---------- câmera ---------- */
  const target = new THREE.Vector3(0, 0, 0), dir = new THREE.Vector3(0, .85, .53).normalize();
  const camBase = new THREE.Vector3();
  function fitCamera() {
    const corners = [[-5.0, 0, -8.3], [5.0, 0, -8.3], [-5.0, 0, 9.3], [5.0, 0, 9.3]];
    const v = new THREE.Vector3();
    const fits = (d, tz) => {
      target.set(0, 0, tz); camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      for (const c of corners) { v.set(c[0], c[1], c[2]).project(camera); if (Math.abs(v.x) > .97 || v.y > .6 || v.y < -.6) return false; }
      return true;
    };
    outer: for (let d = 10; d < 80; d += .25) {
      const ok = []; for (let tz = -4; tz <= 4; tz += .25) if (fits(d, tz)) ok.push(tz);
      if (ok.length) { const tz = ok[(ok.length / 2) | 0]; fits(d, tz); break outer; }
    }
    camBase.copy(camera.position);
  }
  function resize(w, h) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    renderer.setSize(w, h, false); composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr)); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; fitCamera();
  }

  /* ---------- projeção ---------- */
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  function toLogical(cx, cy) { // clientX/Y -> coordenadas lógicas da mesa
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hit)) return null;
    return [hit.x / S + 270, hit.z / S + 480];
  }
  function toScreen(x, y, h) { // lógico -> px dentro do canvas
    const v = new THREE.Vector3(wx(x), h || 1, wz(y)).project(camera), r = canvas.getBoundingClientRect();
    return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height];
  }

  /* ---------- atualização por quadro ---------- */
  let shakeAmt = 0, flashT = 0, time = 0;
  function update(dt, st) {
    time += dt;
    // bola
    ballMesh.position.set(wx(st.ball.x), BR * S, wz(st.ball.y));
    ballMesh.rotation.x += st.ball.vy * dt * .05; ballMesh.rotation.z -= st.ball.vx * dt * .05;
    if (st.gold) { ballMat.color.set(0xffc233); ballMat.emissive.set(0xff9900); ballMat.emissiveIntensity = 1.6 + Math.sin(time * 12) * .4; ballMat.metalness = .9; ballMat.roughness = .25; }
    else { ballMat.color.set(0xe8eef2); ballMat.emissive.set(0x000000); ballMat.emissiveIntensity = 0; ballMat.metalness = 1; ballMat.roughness = .14; }
    trailPos.unshift(ballMesh.position.x, ballMesh.position.z); if (trailPos.length > TN * 2) trailPos.length = TN * 2;
    const speed = Math.hypot(st.ball.vx, st.ball.vy), vis = st.ball.active && speed > 120;
    for (let i = 0; i < TN; i++) {
      const k = 1 - i / TN, s = vis ? BR * S * .85 * k : 0.0001;
      dummy.position.set(trailPos[i * 2] ?? 0, BR * S * .9, trailPos[i * 2 + 1] ?? 0); dummy.scale.setScalar(s); dummy.updateMatrix(); trail.setMatrixAt(i, dummy.matrix);
    }
    trail.instanceMatrix.needsUpdate = true;
    trail.material.color.setRGB(st.gold ? 3 : 2.2, st.gold ? 1.9 : 2.0, st.gold ? .5 : 1.6);
    // flippers
    if (tableRefs) tableRefs.flippers.forEach((m, i) => { const f = flippers[i]; m.rotation.y = f.s === 1 ? -f.a : Math.PI + f.a; });
    // brilho pulsante
    if (tableRefs) {
      const pulse = .5 + .5 * Math.sin(time * 4);
      tableRefs.extras.dangerBar.material.emissiveIntensity = 2 + pulse * (st.danger ? 4 : 1.2);
      tableRefs.extras.danger.color.setScalar(.8 + pulse * (st.danger ? 1.4 : .4));
      const ready = !st.ball.active;
      tableRefs.extras.arrow.visible = ready; tableRefs.extras.dots.forEach((d, i) => { d.visible = ready; d.material.emissiveIntensity = 1.2 + 2.4 * Math.max(0, Math.sin(time * 7 - i * .9)); });
      tableRefs.extras.arrow.material.emissiveIntensity = 1.6 + pulse * 2;
      tableRefs.slots.forEach((g, i) => { const has = st.slotHas[i]; g.userData.pad.visible = !has; g.userData.ring.material.emissiveIntensity = (st.slotHot === i ? 4.2 : 1.4) + pulse * (has ? .2 : .9); });
      tableRefs.obstacles.forEach((g, i) => { const h = st.obHit[i] || 0; g.scale.setScalar(1 + .12 * h); if (g.userData.ring) g.userData.ring.material.emissiveIntensity = 1.4 + 4 * h; if (g.userData.jet) g.userData.jet.scale.y = 1 + .15 * Math.sin(time * 9); });
    }
    // partículas cúbicas
    for (let i = 0; i < PN; i++) {
      const p = P[i];
      if (p.life <= 0) continue;
      p.life -= dt; p.vy -= 16 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < .075 * p.s) { p.y = .075 * p.s; p.vy *= -.45; p.vx *= .72; p.vz *= .72; p.wx *= .6; p.wy *= .6; p.wz *= .6; if (Math.abs(p.vy) < .6) p.vy = 0; }
      p.rx += p.wx * dt; p.ry += p.wy * dt; p.rz += p.wz * dt;
      const sc = p.life <= 0 ? 0 : p.s * Math.min(1, p.life / .5);
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, p.rz); dummy.scale.setScalar(sc); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix);
      if (p.life <= 0) { dummy.scale.setScalar(0.0001); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix); }
    }
    cubes.instanceMatrix.needsUpdate = true;
    // flash
    if (flashT > 0) { flashT -= dt; flashLight.intensity = Math.max(0, flashT / .35) * flashLight.userData.peak; } else flashLight.intensity = 0;
    // câmera + shake
    shakeAmt = Math.max(0, shakeAmt - dt * 1.6);
    camera.position.copy(camBase);
    if (shakeAmt > 0) { camera.position.x += (Math.random() - .5) * shakeAmt * .5; camera.position.y += (Math.random() - .5) * shakeAmt * .35; camera.position.z += (Math.random() - .5) * shakeAmt * .5; }
    camera.lookAt(target);
  }
  function render() { if (q.bloom) composer.render(); else renderer.render(scene, camera); }

  return {
    renderer, scene, camera, dyn, buildTable, resize, update, render, toLogical, toScreen, burstCubes,
    shake: a => { shakeAmt = Math.max(shakeAmt, a); },
    flash: (x, y, color, peak) => { flashLight.color.set(color); flashLight.position.set(wx(x), 1.6, wz(y)); flashLight.userData.peak = peak || 60; flashT = .35; },
    setQuality(level) { // 0 completo, 1 sem bloom, 2 resolução 1x
      q.bloom = level < 1; q.dpr = level >= 2 ? 1 : 2;
      const c = canvas.getBoundingClientRect(); resize(Math.max(2, Math.round(c.width)), Math.max(2, Math.round(c.height)));
    },
    get refs() { return tableRefs; }
  };
}
