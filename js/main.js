import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";
import { WatchUI } from "./watch_ui.js";

const BUILD_TAG = "LOCKDOWN-ROOM-v2.1";
const TEX_ROOT = "./assets/textures/";

function logTo(okBox, html) {
  if (!okBox) return;
  okBox.innerHTML += `<div>${html}</div>`;
}

function loadTextureOne(path, opts = {}) {
  const loader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    loader.load(
      path,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(opts.repeatX ?? 1, opts.repeatY ?? 1);
        resolve({ ok: true, tex, path });
      },
      undefined,
      () => resolve({ ok: false, tex: null, path })
    );
  });
}

async function loadFirstTexture(candidates, opts = {}) {
  for (const name of candidates) {
    const res = await loadTextureOne(TEX_ROOT + name, opts);
    if (res.ok) return res;
  }
  return { ok: false, tex: null, path: TEX_ROOT + candidates[0] };
}

function makeMatFromTex(res, fallbackColor, rough = 0.95) {
  return new THREE.MeshStandardMaterial({
    color: res.ok ? 0xffffff : fallbackColor,
    map: res.ok ? res.tex : null,
    roughness: rough
  });
}

function safeSpawn(rig, v3) {
  rig.position.set(v3.x, 0, v3.z);
  rig.rotation.set(0, 0, 0);
}

export async function boot(statusEl, okBox) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "12px";
  vrBtn.style.top = "12px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  // Rig + Camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // TEXTURES
  const carpet = await loadFirstTexture(["lobby_carpet.jpg","lobby_carpet.JPG","Lobby_Carpet.jpg"], { repeatX: 6, repeatY: 6 });
  const brick = await loadFirstTexture(["brickwall.jpg","brickwall.JPG","Brickwall.jpg"], { repeatX: 5, repeatY: 2 });
  const ceiling = await loadFirstTexture(["ceiling_dome_main.jpg","ceiling_dome_main.JPG"], { repeatX: 2, repeatY: 2 });
  const felt = await loadFirstTexture(["table_felt_green.jpg","table_felt_green.JPG"], { repeatX: 1, repeatY: 1 });
  const trim = await loadFirstTexture(["Table leather trim.jpg","Table_leather_trim.jpg","table_leather_trim.jpg"], { repeatX: 1, repeatY: 1 });
  const logo = await loadFirstTexture(["brand_logo.jpg","Brand_logo.jpg","brand_logo.JPG"], { repeatX: 1, repeatY: 1 });
  const teleportGlow = await loadFirstTexture(["Teleport glow.jpg","Teleport_glow.jpg","teleport_glow.jpg"], { repeatX: 1, repeatY: 1 });

  logTo(okBox, `🧾 BUILD: <b>${BUILD_TAG}</b>`);
  logTo(okBox, `carpet: ${carpet.ok ? "✅" : "❌"} (${carpet.path})`);
  logTo(okBox, `brick: ${brick.ok ? "✅" : "❌"} (${brick.path})`);
  logTo(okBox, `ceiling: ${ceiling.ok ? "✅" : "❌"} (${ceiling.path})`);
  logTo(okBox, `felt: ${felt.ok ? "✅" : "❌"} (${felt.path})`);
  logTo(okBox, `trim: ${trim.ok ? "✅" : "❌"} (${trim.path})`);
  logTo(okBox, `logo: ${logo.ok ? "✅" : "❌"} (${logo.path})`);

  // LIGHTS (brighter)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.35));

  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(14, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const warm = new THREE.PointLight(0xffe7c2, 1.35, 40);
  warm.position.set(0, 5.7, 0);
  scene.add(warm);

  const blue = new THREE.PointLight(0x4aa3ff, 0.95, 70);
  blue.position.set(-14, 4.0, -14);
  scene.add(blue);

  // FLOOR
  const floorMat = makeMatFromTex(carpet, 0xff0044, 0.95);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // CEILING
  const ceilMat = makeMatFromTex(ceiling, 0x111116, 0.95);
  ceilMat.side = THREE.DoubleSide;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.4;
  scene.add(ceil);

  // WALLS (solid geometry)
  const wallMat = makeMatFromTex(brick, 0x303060, 0.95);
  const wallH = 6.4;
  const thick = 0.6;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallN.position.set(0, wallH / 2, -30);
  scene.add(wallN);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallS.position.set(0, wallH / 2, 30);
  scene.add(wallS);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallW.position.set(-30, wallH / 2, 0);
  scene.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallE.position.set(30, wallH / 2, 0);
  scene.add(wallE);

  // TABLE (oval)
  const table = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.18, 72),
    makeMatFromTex(felt, 0x00ff88, 0.7)
  );
  top.scale.set(1.55, 1, 1);
  top.position.y = 0.92;
  top.castShadow = top.receiveShadow = true;
  table.add(top);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.14, 24, 110),
    makeMatFromTex(trim, 0xffcc00, 0.55)
  );
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.55, 1, 1);
  ring.position.y = 1.01;
  table.add(ring);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 0.9, 36),
    new THREE.MeshStandardMaterial({ color: 0x111117, roughness: 0.95 })
  );
  base.position.y = 0.45;
  table.add(base);

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.65),
    makeMatFromTex(logo, 0xffffff, 0.75)
  );
  plaque.position.set(0, 1.08, 3.75);
  plaque.rotation.y = Math.PI;
  table.add(plaque);

  scene.add(table);

  // TELEPORT PAD (neon)
  const padMat = makeMatFromTex(teleportGlow, 0x00aaff, 0.3);
  padMat.transparent = true;
  padMat.opacity = teleportGlow.ok ? 0.95 : 0.75;

  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-6, 0.01, 8);
  scene.add(pad);

  // SPAWNS (safe, never in table)
  const spawns = {
    lobby: new THREE.Vector3(0, 0, 9.5),
    poker: new THREE.Vector3(0, 0, 10.8),
    store: new THREE.Vector3(-12.0, 0, 8.5)
  };

  safeSpawn(rig, spawns.lobby);

  // Controllers locked to rig
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  function addLaser(ctrl, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 8;
    ctrl.add(line);
  }
  addLaser(c0, 0x00ccff);
  addLaser(c1, 0xffaa00);

  // AUDIO (simple toggle stub — you can wire your audio.js later)
  let audioOn = false;
  function toggleAudio() {
    audioOn = !audioOn;
    logTo(okBox, audioOn ? "🔊 Audio: ON" : "🔇 Audio: OFF");
  }

  // Watch menu
  WatchUI.init({
    onNavigate: (room) => {
      if (!spawns[room]) return;
      safeSpawn(rig, spawns[room]);
      WatchUI.close();
      logTo(okBox, `🚪 Teleport menu -> ${room}`);
    },
    onAudioToggle: () => toggleAudio(),
    onReset: () => safeSpawn(rig, spawns.lobby)
  });

  // Controls
  Controls.init({ rig, camera, renderer, spawns, colliders: [] });
  Controls.setHaloParent(scene);

  Controls.onMenuToggle = () => WatchUI.toggle();
  Controls.onReset = () => safeSpawn(rig, spawns.lobby);
  Controls.onAudioToggle = () => toggleAudio();

  setStatus(`Status: running ✅<br>BUILD: ${BUILD_TAG}<br>Spawn: lobby safe ✅<br>
    Left stick = move | Right stick = 45° turn | Left trigger = teleport | Y = menu`);

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    Controls.update(dt);
    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
    }
