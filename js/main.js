import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

// Optional: if your controls.js exports Controls, we’ll use it.
// If it doesn’t, we still run (with basic thumbstick locomotion fallback).
let Controls = null;
try {
  const mod = await import("./controls.js");
  Controls = mod.Controls || mod.default || null;
} catch (_) { /* ignore */ }

const BUILD_TAG = "LOCKDOWN-ROOM-v2";
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

// Tries many filename variants (caps/spaces/alternate names). Uses the first that loads.
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

function addBoxCollider(colliders, mesh) {
  // simple AABB collider
  const box = new THREE.Box3().setFromObject(mesh);
  colliders.push(box);
}

function safeSpawn(rig, x, z) {
  rig.position.set(x, 0, z);
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

  // Colliders
  const colliders = [];

  // TEXTURES (with variants)
  const carpet = await loadFirstTexture(
    ["lobby_carpet.jpg", "lobby_carpet.JPG", "Lobby_Carpet.jpg", "Lobby_carpet.jpg"],
    { repeatX: 6, repeatY: 6 }
  );
  const brick = await loadFirstTexture(
    ["brickwall.jpg", "brickwall.JPG", "Brickwall.jpg", "BrickWall.jpg"],
    { repeatX: 5, repeatY: 2 }
  );
  const ceiling = await loadFirstTexture(
    ["ceiling_dome_main.jpg", "ceiling_dome_main.JPG", "Ceiling_dome_main.jpg", "ceiling.jpg"],
    { repeatX: 2, repeatY: 2 }
  );
  const felt = await loadFirstTexture(
    ["table_felt_green.jpg", "table_felt_green.JPG", "Table_felt_green.jpg", "felt.jpg"],
    { repeatX: 1, repeatY: 1 }
  );
  const trim = await loadFirstTexture(
    ["Table leather trim.jpg", "Table_leather_trim.jpg", "table_leather_trim.jpg", "table_trim.jpg"],
    { repeatX: 1, repeatY: 1 }
  );
  const logo = await loadFirstTexture(
    ["brand_logo.jpg", "Brand_logo.jpg", "brand_logo.JPG", "logo.jpg"],
    { repeatX: 1, repeatY: 1 }
  );
  const teleportGlow = await loadFirstTexture(
    ["Teleport glow.jpg", "Teleport_glow.jpg", "teleport_glow.jpg", "Teleportglow.jpg"],
    { repeatX: 1, repeatY: 1 }
  );

  logTo(okBox, `🧾 BUILD: <b>${BUILD_TAG}</b>`);
  logTo(okBox, `carpet: ${carpet.ok ? "✅" : "❌"} (${carpet.path})`);
  logTo(okBox, `brick: ${brick.ok ? "✅" : "❌"} (${brick.path})`);
  logTo(okBox, `ceiling: ${ceiling.ok ? "✅" : "❌"} (${ceiling.path})`);
  logTo(okBox, `felt: ${felt.ok ? "✅" : "❌"} (${felt.path})`);
  logTo(okBox, `trim: ${trim.ok ? "✅" : "❌"} (${trim.path})`);
  logTo(okBox, `logo: ${logo.ok ? "✅" : "❌"} (${logo.path})`);

  // LIGHTS (brighter, less “black ceiling”)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.35));

  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(14, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const warm = new THREE.PointLight(0xffe7c2, 1.2, 40);
  warm.position.set(0, 5.7, 0);
  scene.add(warm);

  const blue = new THREE.PointLight(0x4aa3ff, 0.9, 70);
  blue.position.set(-14, 4.0, -14);
  scene.add(blue);

  // FLOOR
  const floorMat = makeMatFromTex(carpet, 0xff0044, 0.95); // hot pink if missing carpet
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // CEILING
  const ceilMat = makeMatFromTex(ceiling, 0x00ffee, 0.95); // cyan if missing ceiling
  ceilMat.side = THREE.DoubleSide;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.4;
  scene.add(ceil);

  // WALLS (SOLID)
  const wallMat = makeMatFromTex(brick, 0x7c00ff, 0.95); // purple if missing brick
  const wallH = 6.4;
  const thick = 0.6;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallN.position.set(0, wallH / 2, -30);
  wallN.castShadow = wallN.receiveShadow = true;
  scene.add(wallN); addBoxCollider(colliders, wallN);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallS.position.set(0, wallH / 2, 30);
  wallS.castShadow = wallS.receiveShadow = true;
  scene.add(wallS); addBoxCollider(colliders, wallS);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallW.position.set(-30, wallH / 2, 0);
  wallW.castShadow = wallW.receiveShadow = true;
  scene.add(wallW); addBoxCollider(colliders, wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallE.position.set(30, wallH / 2, 0);
  wallE.castShadow = wallE.receiveShadow = true;
  scene.add(wallE); addBoxCollider(colliders, wallE);

  // TABLE (spawn is ALWAYS away from it)
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
  ring.castShadow = ring.receiveShadow = true;
  table.add(ring);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 0.9, 36),
    new THREE.MeshStandardMaterial({ color: 0x111117, roughness: 0.95 })
  );
  base.position.y = 0.45;
  base.castShadow = base.receiveShadow = true;
  table.add(base);

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.65),
    makeMatFromTex(logo, 0xffffff, 0.75)
  );
  plaque.position.set(0, 1.08, 3.75);
  plaque.rotation.y = Math.PI;
  table.add(plaque);

  table.position.set(0, 0, 0);
  scene.add(table);

  // TELEPORT PAD (neon)
  const padMat = makeMatFromTex(teleportGlow, 0x00aaff, 0.3);
  padMat.transparent = true;
  padMat.opacity = teleportGlow.ok ? 0.95 : 0.75;

  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-6, 0.01, 8);
  scene.add(pad);

  // SPAWNS (Lobby/Store/Poker) — we start in lobby away from table
  const spawns = {
    lobby: new THREE.Vector3(0, 0, 9.5),
    poker: new THREE.Vector3(0, 0, 10.5),
    store: new THREE.Vector3(-10, 0, 8)
  };
  safeSpawn(rig, spawns.lobby.x, spawns.lobby.z);

  // Controllers MUST be children of rig (fixes “laser somewhere else”)
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

  // BASIC thumbstick locomotion fallback (if Controls doesn’t exist)
  // Move rig on XZ. Keeps Y fixed at 0.
  const tmpVec = new THREE.Vector3();
  function basicLocomotion(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      const gp = src.gamepad;

      // Most XR: axes[2,3] right stick or [0,1] left stick depending on device
      const ax0 = gp.axes[0] ?? 0;
      const ax1 = gp.axes[1] ?? 0;

      // deadzone
      const dz = 0.18;
      const x = Math.abs(ax0) > dz ? ax0 : 0;
      const y = Math.abs(ax1) > dz ? ax1 : 0;

      if (x === 0 && y === 0) continue;

      // forward based on camera direction
      camera.getWorldDirection(tmpVec);
      tmpVec.y = 0;
      tmpVec.normalize();

      const right = new THREE.Vector3().crossVectors(tmpVec, new THREE.Vector3(0,1,0)).normalize();
      const speed = 3.0;

      const move = new THREE.Vector3()
        .addScaledVector(tmpVec, -y * speed * dt)
        .addScaledVector(right, x * speed * dt);

      rig.position.add(move);
      rig.position.y = 0;
    }
  }

  // If your Controls exists, use it. Otherwise fallback.
  if (Controls && typeof Controls.init === "function") {
    try {
      Controls.init({ rig, camera, renderer, spawns, colliders });
      logTo(okBox, "✅ Controls.init() detected");
    } catch (e) {
      logTo(okBox, "⚠️ Controls.init failed, using basic locomotion fallback");
    }
  } else {
    logTo(okBox, "⚠️ Controls not detected — using basic locomotion fallback");
  }

  setStatus(`Status: running ✅<br>BUILD: ${BUILD_TAG}<br>Spawn: lobby safe ✅`);

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Update controls
    if (Controls && typeof Controls.update === "function") {
      Controls.update(dt);
    } else {
      basicLocomotion(dt);
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
    }
