// js/main.js — Scarlett Poker VR — PERMANENT v2.1 (Spawn + Height Lock + Always-Move)
// GitHub Pages safe. VRButton always.
// Movement priority:
// 1) If ./controls.js exports Controls.init/update => use it
// 2) Else use built-in fallback locomotion (Quest-safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const HUB = document.getElementById("hub");
const log = (m) => HUB && (HUB.innerHTML += `${m}<br>`);

const ok = (m) => log(`✅ ${m}`);
const warn = (m) => log(`⚠️ ${m}`);
const fail = (m) => log(`❌ ${m}`);

log("Scarlett Poker VR — booting…");

(async () => {
  // ---------- Scene / Renderer ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  ok("Renderer + VRButton ready");

  // ---------- Player Rig ----------
  const playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  // ---------- Lighting (ANTI-BLACK) ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));

  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // Headlamp so you never get a black void
  const headlamp = new THREE.PointLight(0xffffff, 2.2, 45);
  camera.add(headlamp);

  ok("Lighting added");

  // ---------- Safe Floor (always visible) ----------
  const safeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 1.0, metalness: 0.0 })
  );
  safeFloor.rotation.x = -Math.PI / 2;
  safeFloor.position.y = 0;
  scene.add(safeFloor);

  // ---------- Helpers ----------
  async function loadModule(path, label) {
    try {
      const mod = await import(path);
      ok(`Loaded ${label}`);
      return mod;
    } catch (e) {
      warn(`Skipped ${label}`);
      return null;
    }
  }

  // ---------- Load alignment + world ----------
  const Alignment = (await loadModule("./alignment.js?v=2026", "alignment.js"))?.Alignment || null;
  const World = (await loadModule("./world.js?v=2026", "world.js"))?.World || null;

  if (!Alignment) warn("Alignment missing — height lock disabled");
  if (!World) warn("World missing — safe floor only");

  // ---------- Build World ----------
  let worldData = null;
  if (World?.build) {
    try {
      worldData = World.build(scene, playerGroup);
      ok("World built");
    } catch (e) {
      fail(`World.build failed: ${e?.message || e}`);
    }
  }

  // ---------- Spawn (always on lobby pad if available) ----------
  const lobbyPadPos =
    worldData?.padById?.lobby?.position ||
    worldData?.spawn ||
    new THREE.Vector3(0, 0, 10);

  playerGroup.position.x = lobbyPadPos.x;
  playerGroup.position.z = lobbyPadPos.z;
  ok(`Spawn -> (${playerGroup.position.x.toFixed(2)}, ${playerGroup.position.z.toFixed(2)})`);

  // ---------- Height lock init ----------
  if (Alignment?.init) {
    Alignment.init(playerGroup, camera);
    ok("Alignment init OK");
  }

  // ---------- Try external controls.js ----------
  const ControlsMod = await loadModule("./controls.js?v=2026", "controls.js");
  const Controls = ControlsMod?.Controls || null;

  let usingFallback = false;

  if (Controls?.init) {
    try {
      // Pass collision data if your controls uses it
      Controls.init({
        renderer,
        camera,
        player: playerGroup,
        colliders: worldData?.colliders || [],
        bounds: worldData?.bounds || null,
        spawn: { position: new THREE.Vector3(lobbyPadPos.x, 0, lobbyPadPos.z), yaw: 0 },
      });
      ok("Controls.init OK (external)");
    } catch (e) {
      warn(`Controls.init failed -> fallback locomotion: ${e?.message || e}`);
      usingFallback = true;
    }
  } else {
    warn("controls.js not found or missing Controls.init -> fallback locomotion");
    usingFallback = true;
  }

  // ---------- FALLBACK locomotion (always works) ----------
  const snapAngle = THREE.MathUtils.degToRad(45);
  let snapCD = 0;
  const moveSpeed = 2.2;

  function getXRGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return { left: null, right: null };
    let left = null, right = null;
    const list = [];

    for (const src of s.inputSources || []) {
      if (!src?.gamepad) continue;
      list.push(src.gamepad);
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }
    if (!left && list[0]) left = list[0];
    if (!right && list[1]) right = list[1];
    return { left, right };
  }

  function readStick(gp) {
    if (!gp?.axes) return { x: 0, y: 0 };
    const a = gp.axes;
    const x01 = a[0] ?? 0, y01 = a[1] ?? 0;
    const x23 = a[2] ?? 0, y23 = a[3] ?? 0;
    const mag01 = Math.abs(x01) + Math.abs(y01);
    const mag23 = Math.abs(x23) + Math.abs(y23);
    return mag23 > mag01 ? { x: x23, y: y23 } : { x: x01, y: y01 };
  }

  function clampBounds(pos) {
    const b = worldData?.bounds;
    if (!b?.min || !b?.max) return;
    pos.x = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
    pos.z = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
  }

  function collidesXZ(pos) {
    const r = 0.28;
    const cols = worldData?.colliders || [];
    for (const m of cols) {
      if (!m) continue;
      const box = new THREE.Box3().setFromObject(m);
      if (
        pos.x > box.min.x - r && pos.x < box.max.x + r &&
        pos.z > box.min.z - r && pos.z < box.max.z + r
      ) return true;
    }
    return false;
  }

  // ---------- Resize ----------
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- Loop ----------
  let lastT = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // height lock
    try { Alignment?.update?.(playerGroup, camera); } catch {}

    if (!usingFallback) {
      // external controls
      try { Controls?.update?.(dt); } catch {}
    } else {
      // fallback controls: left stick move, right stick snap turn
      const { left, right } = getXRGamepads();

      // move
      const moveGp = left || right;
      const { x: mxRaw, y: myRaw } = readStick(moveGp);

      const dead = 0.14;
      const mx = Math.abs(mxRaw) < dead ? 0 : mxRaw;
      const my = Math.abs(myRaw) < dead ? 0 : myRaw;

      if (mx || my) {
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();

        const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

        const next = playerGroup.position.clone();
        next.addScaledVector(rightDir, mx * moveSpeed * dt);
        next.addScaledVector(fwd, -my * moveSpeed * dt);

        clampBounds(next);
        if (!collidesXZ(next)) {
          playerGroup.position.x = next.x;
          playerGroup.position.z = next.z;
        }
      }

      // snap turn
      snapCD = Math.max(0, snapCD - dt);
      const turnGp = right || moveGp;
      const { x: txRaw } = readStick(turnGp);

      if (snapCD <= 0 && Math.abs(txRaw) > 0.65) {
        playerGroup.rotation.y += (txRaw > 0 ? -1 : 1) * snapAngle;
        snapCD = 0.28;
      }
    }

    renderer.render(scene, camera);
  });

  ok(usingFallback ? "Movement: fallback ON (guaranteed)" : "Movement: controls.js ON");
  ok("Main loop running");
})();
