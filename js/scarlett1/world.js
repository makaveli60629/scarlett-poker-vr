// /js/scarlett1/world.js — Scarlett World (Modular Core)
// ✅ Lobby + pit + table + rails + balcony + stairs
// ✅ XR locomotion (Quest sticks) via /core/controls.js
// ✅ Android sticks via ./spine_android.js (ONLY when not in XR)
// ✅ Optional modules: poker / humanoids / lighting (won't crash)

import Controls from "../core/controls.js";
import { initAndroidSticks } from "./spine_android.js";

export async function initWorld({
  THREE,
  scene,
  renderer,
  camera,
  cameraPitch,
  player,
  controllers,
  hands,
  log = console.log,
  BUILD
} = {}) {
  log("initWorld() start");

  const S = {
    THREE, scene, renderer, camera, cameraPitch, player, controllers, hands, log, BUILD,
    root: new THREE.Group(),
    ground: [],
    android: null,
    flags: { poker: true, bots: true, lighting: true },
    t: 0
  };

  scene.add(S.root);

  // --- base environment ---
  setEnv(S);
  buildLobby(S);
  buildPitAndTable(S);
  buildRails(S);
  buildBalconyAndStairs(S);

  // --- optional: lighting module (won't crash) ---
  if (S.flags.lighting) await tryLighting(S);

  // --- optional: poker module ---
  if (S.flags.poker) await tryPoker(S);

  // --- optional: humanoid bots ---
  if (S.flags.bots) await tryBots(S);

  // --- Android sticks (only when not in XR) ---
  S.android = await initAndroidSticks({
    renderer,
    player,
    cameraPitch,
    setHUDVisible: (v) => {
      // if you later want to hide the diag HUD from Android buttons,
      // you can wire this into boot2; for now just a no-op.
    },
    log
  });

  // XR select events can remain for teleport systems in other modules,
  // but locomotion will be handled every frame by Controls.applyLocomotion.

  log("initWorld() completed ✅");

  return {
    update(dt, t) {
      S.t = t;

      // XR locomotion (Quest sticks)
      Controls.applyLocomotion(
        { renderer, player, controllers, diagonal45: true },
        dt
      );

      // Android update (only active when not in XR)
      S.android?.update?.(dt);

      // simple ambience pulse
      pulseNeon(S, t);
    }
  };
}

// ------------------- world pieces -------------------

function setEnv(S) {
  const { THREE, scene } = S;
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 18, 150);

  const hemi = new THREE.HemisphereLight(0xaaccff, 0x080a12, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(10, 18, 8);
  key.castShadow = false;
  scene.add(key);
}

function mat(THREE, c, e = 0, metal = 0.1, rough = 0.85) {
  return new THREE.MeshStandardMaterial({
    color: c,
    emissive: new THREE.Color(c),
    emissiveIntensity: e,
    metalness: metal,
    roughness: rough
  });
}

function buildLobby(S) {
  const { THREE, root } = S;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 72),
    mat(THREE, 0x111a28, 0.0, 0.05, 0.95)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  root.add(floor);
  S.ground.push(floor);

  // Walls (twice as high feel)
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 12, 80, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.9,
      metalness: 0.15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    })
  );
  wall.position.y = 6;
  root.add(wall);

  // Neon ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(15.5, 0.10, 10, 96),
    mat(THREE, 0x66ccff, 0.6, 0.7, 0.35)
  );
  ring.position.y = 3.2;
  ring.rotation.x = Math.PI / 2;
  ring.name = "NEON_RING";
  root.add(ring);

  // Spawn (face inward)
  player.position.set(0, 0, 12.5);
  player.rotation.y = Math.PI;
  S.log("spawn ✅ SPAWN_N");
}

function buildPitAndTable(S) {
  const { THREE, root } = S;

  // Pit “divot”
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 7.5, 1.2, 80),
    mat(THREE, 0x08101c, 0.0, 0.08, 0.98)
  );
  pit.position.y = -0.6;
  root.add(pit);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 80),
    mat(THREE, 0x0b1426, 0.02, 0.06, 0.9)
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -1.2;
  root.add(pitFloor);
  S.ground.push(pitFloor);

  // Main table (simple placeholder; poker module can replace/augment)
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.18, 72),
    mat(THREE, 0x145a3a, 0.05, 0.05, 0.95)
  );
  tableTop.position.y = -0.95;
  root.add(tableTop);

  const tableEdge = new THREE.Mesh(
    new THREE.TorusGeometry(2.85, 0.14, 14, 90),
    mat(THREE, 0x1b2b44, 0.2, 0.6, 0.35)
  );
  tableEdge.position.y = -0.86;
  tableEdge.rotation.x = Math.PI / 2;
  root.add(tableEdge);

  // “Pass line” extra circle marker you asked for (bet circle)
  const pass = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.05, 48),
    mat(THREE, 0x66ccff, 0.65, 0.2, 0.35)
  );
  pass.rotation.x = -Math.PI / 2;
  pass.position.set(0, -0.94, 1.7);
  root.add(pass);
}

function buildRails(S) {
  const { THREE, root } = S;

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(7.8, 0.10, 10, 120),
    mat(THREE, 0x66ccff, 0.55, 0.75, 0.35)
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = -0.15;
  root.add(rail);

  // Simple posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 10);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const p = new THREE.Mesh(postGeo, mat(THREE, 0x0f1a2b, 0.02));
    p.position.set(Math.cos(a) * 7.8, -0.7, Math.sin(a) * 7.8);
    root.add(p);
  }
}

function buildBalconyAndStairs(S) {
  const { THREE, root } = S;

  // Balcony ring above store height (spectator look-down)
  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(12.5, 15.5, 100),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.95,
      metalness: 0.08,
      side: THREE.DoubleSide
    })
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = 4.2;
  root.add(balcony);
  S.ground.push(balcony);

  // Small stairs (not too long)
  const steps = 10;
  const stepW = 2.6;
  const stepH = 0.45;
  const stepD = 0.6;
  for (let i = 0; i < steps; i++) {
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(stepW, stepH, stepD),
      mat(THREE, 0x101a2b, 0.02)
    );
    st.position.set(-10 + i * 0.55, i * stepH * 0.55, 10.5 - i * 0.35);
    root.add(st);
    S.ground.push(st);
  }

  // Telepad up there (teleport target marker)
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 48),
    mat(THREE, 0x66ccff, 0.8, 0.2, 0.35)
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-4.5, 4.25, 6.0);
  root.add(pad);
}

// ------------------- optional modules (safe) -------------------

async function tryLighting(S) {
  try {
    // /js/lighting.js
    const mod = await import(new URL("../lighting.js", import.meta.url).toString());
    if (typeof mod.applyLighting === "function") {
      mod.applyLighting({ THREE: S.THREE, scene: S.scene, root: S.root });
      S.log("lighting ✅");
    } else {
      S.log("lighting loaded but no applyLighting() (skip)");
    }
  } catch (e) {
    S.log(`lighting skip ❌ ${e?.message || e}`);
  }
}

async function tryPoker(S) {
  try {
    const mod = await import(new URL("../poker.js", import.meta.url).toString());
    const PokerJS = mod.PokerJS || mod.default || null;
    if (!PokerJS?.init) {
      S.log("poker loaded but missing PokerJS.init() (skip)");
      return;
    }
    PokerJS.init({ THREE: S.THREE, scene: S.scene, root: S.root, log: S.log, camera: S.camera });
    S.log("poker ✅");
  } catch (e) {
    S.log(`poker skip ❌ ${e?.message || e}`);
  }
}

async function tryBots(S) {
  try {
    const mod = await import(new URL("../humanoids.js", import.meta.url).toString());
    const Humanoids = mod.Humanoids || mod.default || null;
    if (!Humanoids?.init) {
      S.log("humanoids loaded but missing init() (skip)");
      return;
    }
    const bots = Humanoids.init({ THREE: S.THREE, root: S.root });
    bots?.spawnBots?.({ count: 6, center: new S.THREE.Vector3(0, 0, 0), radius: 2.8, y: -1.2 });
    S.log("bots ✅");
  } catch (e) {
    S.log(`bots skip ❌ ${e?.message || e}`);
  }
}

// ------------------- small ambience -------------------

function pulseNeon(S, t) {
  const ring = S.root.getObjectByName("NEON_RING");
  if (!ring?.material) return;
  ring.material.emissiveIntensity = 0.35 + Math.sin(t * 1.4) * 0.15;
}
