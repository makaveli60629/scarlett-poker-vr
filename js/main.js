// /js/main.js — Scarlett Poker VR 1.0 (GitHub Pages SAFE, VRButton ALWAYS)
// - CDN Three.js + VRButton
// - Green HUB overlay (load report)
// - World build + forced spawn on lobby pad
// - Optional modules loaded safely (won't crash if missing)
// - Optional vrcontroller.js rig (laser/ring/teleport) if present
// - Dev controls (WASD) when not in XR (Android/desktop debugging)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";

const overlay = document.getElementById("overlay");
const HUB = makeHub(overlay);

// ---------- boot ----------
HUB.line("Scarlett Poker VR — booting…");
HUB.line("--------------------------------");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 8, 90);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  220
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

// IMPORTANT: XR color output
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

document.body.appendChild(renderer.domElement);

// ALWAYS keep VR button
document.body.appendChild(VRButton.createButton(renderer));
HUB.ok("VRButton", "Ready");

// Player rig (camera parent)
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

// Default camera local offset (head height when not in XR)
camera.position.set(0, 1.8, 0);

// ---------- build world ----------
let world = null;
try {
  world = World.build(scene, player); // some versions accept (scene, player)
  HUB.ok("world.js", "Built (scene, player)");
} catch (e1) {
  try {
    world = World.build(scene); // newer versions accept (scene)
    HUB.ok("world.js", "Built (scene)");
  } catch (e2) {
    HUB.fail("world.js", e2);
    // If world totally fails, still show something instead of black
    addFailsafeLight(scene);
    addFailsafeFloor(scene);
  }
}

// ---------- force spawn on lobby pad ----------
forceSpawnOnLobby(player, world);
HUB.ok("spawn", `Rig at ${fmtV3(player.position)}`);

// ---------- optional VR rig (controller laser/ring/teleport) ----------
let vrRig = null;
try {
  const mod = await safeImport("./vrcontroller.js");
  if (mod?.createVRRig) {
    vrRig = mod.createVRRig(renderer, scene, camera, {
      heightLockM: 1.80,         // locked height you asked for
      getWorld: () => world,     // lets rig raycast pads/floor
    });
    HUB.ok("vrcontroller.js", "Rig attached (laser/ring/teleport)");
  } else {
    HUB.skip("vrcontroller.js", "No createVRRig export (or file missing)");
  }
} catch (e) {
  HUB.fail("vrcontroller.js", e);
}

// ---------- optional modules (won't crash if missing/broken) ----------
await loadOptional("./controls.js", "controls.js", async (m) => {
  // Support both styles: Controls.init(...) or init(...)
  const C = m?.Controls || m;
  if (C?.init) {
    C.init({
      renderer,
      camera,
      player,
      colliders: world?.colliders || [],
      bounds: world?.bounds || null,
      pads: world?.pads || [],
      padById: world?.padById || {},
      floorY: world?.floorY ?? 0,
    });
    scene.userData._controls = C;
    return true;
  }
  return false;
});

await loadOptional("./ui.js", "ui.js", async (m) => {
  const UI = m?.UI || m;
  if (UI?.init) {
    UI.init(scene, camera);
    scene.userData._ui = UI;
    return true;
  }
  return false;
});

await loadOptional("./poker_simulation.js", "poker_simulation.js", async (m) => {
  const P = m?.PokerSimulation || m;
  if (P?.build) {
    P.build({}); // crash-safe version will idle if no bots/players
    scene.userData._poker = P;
    return true;
  }
  return false;
});

await loadOptional("./bots.js", "bots.js", async (m) => {
  if (m?.init) {
    const api = m.init({ scene, world });
    // support optional update hook
    if (api?.update) scene.userData._botsUpdate = api.update;
    return true;
  }
  return false;
});

await loadOptional("./interactions.js", "interactions.js", async (m) => {
  if (m?.init) {
    m.init({ scene, camera, world });
    return true;
  }
  return false;
});

await loadOptional("./store.js", "store.js", async (m) => {
  if (m?.init) {
    m.init({ scene, world });
    return true;
  }
  return false;
});

await loadOptional("./watch_ui.js", "watch_ui.js", async (m) => {
  if (m?.init) {
    m.init({ camera, scene });
    return true;
  }
  return false;
});

// ---------- dev controls (Android/Desktop when not in XR) ----------
const dev = makeDevControls({ renderer, player, camera, world });

// ---------- resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- animation loop ----------
const clock = new THREE.Clock();
HUB.line("");
HUB.line("✅ Ready — press Enter VR");

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // If you have external controls.js, update it
  if (scene.userData._controls?.update) {
    try { scene.userData._controls.update(dt); } catch {}
  }

  // VR rig update (laser/ring/teleport)
  if (renderer.xr.isPresenting && vrRig?.update) {
    try { vrRig.update(dt); } catch {}
  }

  // UI update hook
  if (scene.userData._ui?.update) {
    try { scene.userData._ui.update(dt); } catch {}
  }

  // bots update hook
  if (scene.userData._botsUpdate) {
    try { scene.userData._botsUpdate(dt); } catch {}
  }

  // dev update if not in XR
  dev.update(dt);

  renderer.render(scene, camera);
});

// ===================== helpers =====================

function makeHub(overlayEl) {
  const lines = [];
  const push = (s) => {
    lines.push(String(s));
    if (overlayEl) overlayEl.textContent = lines.join("\n");
  };
  return {
    line: (t) => push(t),
    ok: (name, msg) => push(`✅ ${name}: ${msg || "ok"}`),
    skip: (name, msg) => push(`⏭️ ${name}: ${msg || "skipped"}`),
    fail: (name, e) => push(`❌ ${name}: ${errStr(e)}`),
  };
}

function errStr(e) {
  const s = String(e?.message || e || "error");
  return s.length > 180 ? s.slice(0, 180) + "…" : s;
}

async function safeImport(path) {
  // If module fails (404 / syntax), return null without crashing main.js
  try {
    return await import(path);
  } catch (e) {
    return null;
  }
}

async function loadOptional(path, name, runner) {
  const m = await safeImport(path);
  if (!m) {
    HUB.skip(name, "Missing or not importable");
    return;
  }
  try {
    const ok = await runner(m);
    if (ok) HUB.ok(name, "Loaded");
    else HUB.skip(name, "No supported exports");
  } catch (e) {
    HUB.fail(name, e);
  }
}

function forceSpawnOnLobby(player, world) {
  // Spawn priority:
  // 1) world.padById.lobby.position
  // 2) world.spawn
  // 3) fallback (0,0,10)
  const lobby = world?.padById?.lobby?.position;
  const spawn = world?.spawn;

  const p = lobby || spawn || new THREE.Vector3(0, 0, 10);
  player.position.set(p.x, 0, p.z);

  // face toward the table center
  player.rotation.set(0, 0, 0);
}

function fmtV3(v) {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

function addFailsafeLight(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 18, 8);
  scene.add(sun);
}

function addFailsafeFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0015;
  scene.add(floor);
}

function makeDevControls({ renderer, player, camera, world }) {
  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const clampToBounds = (p) => {
    const b = world?.bounds;
    if (!b) return;
    p.x = THREE.MathUtils.clamp(p.x, b.min.x, b.max.x);
    p.z = THREE.MathUtils.clamp(p.z, b.min.z, b.max.z);
  };

  return {
    update(dt) {
      // Only run when NOT in XR (Android/desktop debugging)
      if (renderer.xr.isPresenting) return;

      // lock dev height so you can see over table while sitting
      camera.position.y = 1.80;

      const speed = 2.2;
      const turn = 1.6;

      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      const right = tmp.copy(fwd).cross(up).normalize();

      const move = new THREE.Vector3();

      if (keys.has("w")) move.add(fwd);
      if (keys.has("s")) move.sub(fwd);
      if (keys.has("a")) move.sub(right);
      if (keys.has("d")) move.add(right);

      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(speed * dt);
        player.position.add(move);
        clampToBounds(player.position);
      }

      if (keys.has("arrowleft")) player.rotation.y += turn * dt;
      if (keys.has("arrowright")) player.rotation.y -= turn * dt;
    },
  };
  }
