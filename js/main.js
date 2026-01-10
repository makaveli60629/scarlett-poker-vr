// /js/main.js — Scarlett Hybrid 2.3 (FULL) — Chips + Betting + Hands-only Grab
// ✅ Keeps: world 4-corner cubes + spawn pad + face center
// ✅ Keeps: GestureEngine + VR teleport laser/ring (camera-based, reliable)
// ✅ Adds: Grab system (pinch to grab nearest chip), release to drop
// ✅ Adds: Chip rack spawner near SpawnPad + near Table
// ✅ Adds: BettingModule bet zone + whale alert
//
// Required files:
//   /js/world.js
//   /js/gesture_engine.js
//   /js/chip_physicality.js
//   /js/betting_module.js
//   /js/VRButton.js (you already have)

(async function boot() {
  if (window.__SCARLETT_BOOTED__) throw new Error("Double boot prevented");
  window.__SCARLETT_BOOTED__ = true;

  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = {
    lines: [],
    max: 700,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    copy() { navigator.clipboard?.writeText?.(this.lines.join("\n")); this.push("log", "Copied logs ✅"); }
  };

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  function setMetrics(rows) {
    if (!ui.grid) return;
    ui.grid.innerHTML = "";
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
      const vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
      row.appendChild(kk); row.appendChild(vv);
      ui.grid.appendChild(row);
    }
  }

  async function setCaps() {
    const xr = !!navigator.xr;
    if (ui.capXR) ui.capXR.textContent = xr ? "YES" : "NO";
    let immersive = false;
    try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
    if (ui.capImm) ui.capImm.textContent = immersive ? "YES" : "NO";
    return { xr, immersive };
  }

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnSoftReboot?.addEventListener("click", () => location.reload());

  // THREE
  const THREE = await (async () => {
    try { const m = await import("./three.js"); return m.default || m.THREE || m; }
    catch { return await import("three"); }
  })();

  async function safeImport(url, label = url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + Rig
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // VRButton (use your local VRButton.js)
  const vrb = await safeImport("./VRButton.js", "./VRButton.js");
  if (vrb?.VRButton?.createButton) {
    const btn = vrb.VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", "VRButton ✅");
  } else {
    LOG.push("warn", "VRButton.js not found or invalid.");
  }

  // ctx
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    colliders: [],

    player,
    rig: player,
    cameraRig: player,
    yawObject: player,
    pitchObject: camera,
  };

  // Load world
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // Spawn + face
  const _tmp = new THREE.Vector3();
  const _tmp2 = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable");

    if (sp) {
      sp.getWorldPosition(_tmp);
      player.position.set(_tmp.x, 0, _tmp.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    if (table) {
      table.getWorldPosition(_tmp);
      _tmp2.set(player.position.x, 0, player.position.z);
      const d = _tmp.sub(_tmp2);
      d.y = 0;
      if (d.lengthSq() > 1e-6) player.rotation.set(0, Math.atan2(d.x, d.z), 0);
      LOG.push("log", "Facing table ✅");
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 200));

  // GestureEngine
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  gestureMod?.GestureEngine?.init?.({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });

  // Chip + Betting modules
  const chipMod = await safeImport("./chip_physicality.js", "./chip_physicality.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  betMod?.BettingModule?.init?.(ctx);

  // Hands
  let leftHand = null, rightHand = null;
  try {
    leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft";
    rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight";
    scene.add(leftHand, rightHand);
  } catch {}

  // Teleport laser + ring (camera based)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.renderOrder = 9999;
  laser.material.depthTest = false;
  scene.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 9999;
  ring.material.depthTest = false;
  scene.add(ring);

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function updateTeleportRay() {
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);
    dir.normalize();
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 1e-6) return { ok: false };
    const t = -(floorPlane.normal.dot(origin) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 24) return { ok: false };

    hit.copy(origin).addScaledVector(dir, t);
    laser.geometry.setFromPoints([origin, hit]);
    ring.position.set(hit.x, 0.02, hit.z);
    return { ok: true, point: hit.clone() };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // ==============
  // GRAB SYSTEM
  // ==============
  const grab = {
    held: { left: null, right: null },
    holdOffset: new THREE.Vector3(0, 0, -0.08),
    tmp: new THREE.Vector3(),
    tmp2: new THREE.Vector3(),
  };

  function getHandWorldPos(hand, out) {
    // try wrist joint for best stability
    const wrist = hand?.joints?.wrist;
    if (wrist) { wrist.getWorldPosition(out); return true; }
    if (hand) { hand.getWorldPosition(out); return true; }
    return false;
  }

  function findNearestChip(handedness) {
    const hand = handedness === "left" ? leftHand : rightHand;
    if (!hand) return null;

    const handPos = grab.tmp;
    if (!getHandWorldPos(hand, handPos)) return null;

    let best = null;
    let bestD2 = 0.12 * 0.12; // grab radius ~12cm

    scene.traverse((o) => {
      if (!o?.userData?.grabbable) return;
      if (o.userData.type !== "chip") return;

      o.getWorldPosition(grab.tmp2);
      const d2 = handPos.distanceToSquared(grab.tmp2);
      if (d2 < bestD2) { bestD2 = d2; best = o; }
    });

    return best;
  }

  function attachToHand(handedness, obj) {
    const hand = handedness === "left" ? leftHand : rightHand;
    if (!hand || !obj) return;

    // detach from parent and attach to hand group
    obj.parent?.remove(obj);
    hand.add(obj);

    // stable hold in front of wrist/palm
    obj.position.set(0, 0, -0.08);
    obj.rotation.set(-Math.PI / 2, 0, 0);

    grab.held[handedness] = obj;
    LOG.push("log", `[grab] ${handedness} grabbed chip ${obj.userData.value}`);
  }

  function releaseFromHand(handedness) {
    const hand = handedness === "left" ? leftHand : rightHand;
    const obj = grab.held[handedness];
    if (!hand || !obj) return;

    // compute world position before detach
    obj.getWorldPosition(grab.tmp);
    obj.getWorldQuaternion(new THREE.Quaternion());

    hand.remove(obj);
    scene.add(obj);

    obj.position.copy(grab.tmp);
    obj.rotation.set(-Math.PI / 2, obj.rotation.y, 0);

    grab.held[handedness] = null;

    // Check bet zone drop
    betMod?.BettingModule?.tryDropChip?.(ctx, obj);
  }

  // Gesture events: left hand grab, right hand teleport/grab depending on what is near
  // Rule:
  // - Right pinch: if near chip -> grab; else teleport
  // - Left pinch: grab/release only
  let queuedTeleport = false;

  gestureMod?.GestureEngine?.on?.("pinchstart", (e) => {
    if (e.hand === "right") {
      const chip = findNearestChip("right");
      if (chip) attachToHand("right", chip);
      else queuedTeleport = true;
    } else {
      const chip = findNearestChip("left");
      if (chip) attachToHand("left", chip);
    }
  });

  gestureMod?.GestureEngine?.on?.("pinchend", (e) => {
    if (e.hand === "right") releaseFromHand("right");
    if (e.hand === "left") releaseFromHand("left");
  });

  // ==============
  // CHIP SPAWNERS
  // ==============
  function spawnChipPile(x, z, values) {
    if (!chipMod?.ChipPhysicality) return;
    let y = 0.05;
    for (let i = 0; i < values.length; i++) {
      const chip = chipMod.ChipPhysicality.createFromCtx(ctx, values[i]);
      chip.position.set(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25);
      chip.rotation.y = Math.random() * Math.PI * 2;
      scene.add(chip);
      y += 0.014;
    }
  }

  // Spawn near SpawnPad and near Table
  const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
  if (sp) {
    sp.getWorldPosition(_tmp);
    spawnChipPile(_tmp.x + 1.2, _tmp.z + 0.2, [1, 5, 10, 25, 100, 500, 1000]);
    spawnChipPile(_tmp.x + 1.6, _tmp.z - 0.4, [1, 1, 5, 5, 10, 25, 25, 100]);
    LOG.push("log", "[chips] Spawn piles created near SpawnPad ✅");
  }

  const table = scene.getObjectByName("BossTable");
  if (table) {
    table.getWorldPosition(_tmp);
    spawnChipPile(_tmp.x + 0.9, _tmp.z + 1.4, [10, 25, 100, 100, 500, 1000]);
    LOG.push("log", "[chips] Spawn pile created near BossTable ✅");
  }

  // Loop
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((t, frame) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    // world update
    try { ctx.world?.update?.(ctx, dt); } catch {}

    // modules
    betMod?.BettingModule?.update?.(ctx, dt);

    // gestures + teleport (VR only)
    if (renderer.xr.isPresenting) {
      const refSpace = renderer.xr.getReferenceSpace?.();
      gestureMod?.GestureEngine?.update?.(frame, refSpace);

      const ray = updateTeleportRay();
      laser.visible = ray.ok;
      ring.visible = ray.ok;

      if (queuedTeleport && ray.ok) {
        queuedTeleport = false;
        teleportTo(ray.point);
      }
    } else {
      // in non-VR, hide teleport
      laser.visible = false;
      ring.visible = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Pot", `${betMod?.BettingModule?.getPot?.() ?? 0}`],
      ["Held L", grab.held.left ? String(grab.held.left.userData.value) : "none"],
      ["Held R", grab.held.right ? String(grab.held.right.userData.value) : "none"],
      ["Rig XYZ", `${player.position.x.toFixed(1)},${player.position.y.toFixed(1)},${player.position.z.toFixed(1)}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 2.3 boot complete ✅ (chips + bet zone + pinch grab)");
})();
