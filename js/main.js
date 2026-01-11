// /js/main.js — Scarlett Hybrid 4.6 (HALLWAYS FIX + LASER FIX + INPUT FIX + FULL GRID MODE)
// ✅ Laser always visible (both controllers, robust right-hand selection)
// ✅ Movement restored (left stick move, right stick 45° snap)
// ✅ Teleport is 1 leap per press (right trigger)
// ✅ Bright + consistent lighting (less inside/outside mismatch)

(async function boot() {
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const BUILD = (window.__SCARLETT_BUILD__ ||= Date.now());
  console.log("SCARLETT_MAIN=4.6 BUILD=", BUILD);

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
    max: 900,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    copy() {
      try { navigator.clipboard?.writeText?.(this.lines.join("\n")); this.push("log","Copied logs ✅"); }
      catch { this.push("warn","Clipboard not available"); }
    }
  };

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnSoftReboot?.addEventListener("click", () => location.reload());

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

  // THREE
  let THREE;
  try {
    const m = await import(`./three.js?v=${BUILD}`);
    THREE = m.default || m.THREE || m;
    LOG.push("log", "three via local wrapper ✅");
  } catch {
    THREE = await import("three");
    LOG.push("log", "three via importmap ✅");
  }

  // Scene / Camera / Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f18);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1400);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.05;
  renderer.physicallyCorrectLights = false;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // VRButton
  const { VRButton } = await import(`./VRButton.js?v=${BUILD}`);
  document.body.appendChild(VRButton.createButton(renderer));
  LOG.push("log", "VRButton ✅");

  // Player Rig
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // Lighting (consistent: less “inside bright/outside black”)
  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a40, 2.6));

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(60, 120, 70);
  scene.add(sun);

  // Mild headlamp (not overpowering)
  const headLamp = new THREE.PointLight(0xffffff, 1.15, 28);
  headLamp.position.set(0, 1.45, 0.35);
  camera.add(headLamp);

  // Controllers
  const controller0 = renderer.xr.getController(0); controller0.name = "Controller0";
  const controller1 = renderer.xr.getController(1); controller1.name = "Controller1";
  player.add(controller0, controller1);
  LOG.push("log", "Controllers parented to PlayerRig ✅");

  // Hands (optional)
  try {
    const hand0 = renderer.xr.getHand(0); hand0.name = "XRHand0";
    const hand1 = renderer.xr.getHand(1); hand1.name = "XRHand1";
    player.add(hand0, hand1);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // Laser setup on BOTH controllers (Quest index may swap)
  function makeLaser() {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
      new THREE.LineBasicMaterial({ color: 0x00ffff })
    );
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }

  const laser0 = makeLaser(); controller0.add(laser0);
  const laser1 = makeLaser(); controller1.add(laser1);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // World
  const { World } = await import(`./world.js?v=${BUILD}`);
  const ctx = { THREE, scene, camera, renderer, player, LOG, BUILD, colliders: [] };
  await World.init(ctx);
  LOG.push("log", `world module loaded: ${World.VERSION || "?"}`);

  // Spawn + face table
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint");
    if (sp) {
      sp.getWorldPosition(tmpA);
      player.position.set(tmpA.x, 0, tmpA.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    const target = scene.getObjectByName("BossTable") || scene.getObjectByName("HubCenter");
    if (target) {
      target.getWorldPosition(tmpA);
      tmpB.set(player.position.x, 0, player.position.z);
      const v = tmpA.sub(tmpB); v.y = 0;
      if (v.lengthSq() > 1e-6) {
        const yaw = Math.atan2(v.x, v.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅ (BossTable)");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 180));

  // Floor plane at y=0 for teleport (even with no floors)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Robust controller + gamepad selection
  function getInputMap() {
    const session = renderer.xr.getSession();
    if (!session) return { gpL:null, gpR:null, rightCtrl: controller1, rightLaser: laser1 };

    let gpL = null, gpR = null;

    // choose right controller based on handedness when possible
    let rightCtrl = null;
    let rightLaser = null;

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }

    // Decide “right controller object” by whether gpR exists and which index has pose
    // Fallback: show both lasers if we can’t decide.
    const pickRight = () => {
      if (gpR) {
        // try to match a controller by checking which has non-zero pose
        const p0 = new THREE.Vector3(); controller0.getWorldPosition(p0);
        const p1 = new THREE.Vector3(); controller1.getWorldPosition(p1);
        // if one is near origin and the other isn't, pick the valid one
        const ok0 = p0.lengthSq() > 0.01;
        const ok1 = p1.lengthSq() > 0.01;
        if (ok1 && !ok0) return { c: controller1, l: laser1 };
        if (ok0 && !ok1) return { c: controller0, l: laser0 };
      }
      // safe fallback
      return { c: controller1, l: laser1 };
    };

    const pr = pickRight();
    rightCtrl = pr.c;
    rightLaser = pr.l;

    return { gpL, gpR, rightCtrl, rightLaser };
  }

  // Teleport ray
  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function hubTarget() {
    return scene.getObjectByName("HubCenter") || scene.getObjectByName("BossTable") || null;
  }

  function updateTeleportRay(rightCtrl, rightLaser) {
    // hide both by default
    laser0.visible = false;
    laser1.visible = false;
    ring.visible = false;

    rightCtrl.getWorldPosition(o);
    rightCtrl.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

    // Bias toward hub center so you “tend” to point into the circle
    const h = hubTarget();
    if (h) {
      const t = new THREE.Vector3();
      h.getWorldPosition(t);
      const toHub = t.sub(o).normalize();
      fwd.lerp(toHub, 0.28).normalize();
    }

    dir.copy(fwd);
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 35) return false;

    hit.copy(o).addScaledVector(dir, t);

    rightLaser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    rightLaser.visible = true;

    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

    return true;
  }

  // Locomotion settings
  const MOVE_SPEED = 1.15;       // sane speed
  const SNAP_ANGLE = Math.PI/4;  // 45°
  let snapCooldown = 0;

  // Teleport 1-leap per press
  let lastTeleportPressed = false;

  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR, rightCtrl, rightLaser } = getInputMap();

      // Move with left stick (fallback if handedness missing)
      const gpMove = gpL || gpR;
      if (gpMove?.axes?.length >= 2) {
        const lx = gpMove.axes[0] ?? 0;
        const ly = gpMove.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn with right stick X (Quest uses axes[2] often)
      snapCooldown = Math.max(0, snapCooldown - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = gpR.axes[2] ?? 0;
      else if (gpR?.axes?.length >= 1) rx = gpR.axes[0] ?? 0;
      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown = 0.28;
      }

      // Teleport ray
      const canTeleport = updateTeleportRay(rightCtrl, rightLaser);

      // Right trigger press (fallback: any gamepad button 0)
      const gpTrig = gpR || gpL;
      const pressed = !!gpTrig?.buttons?.[0]?.pressed;

      if (pressed && !lastTeleportPressed && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
        LOG.push("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTeleportPressed = pressed;

    } else {
      laser0.visible = false;
      laser1.visible = false;
      ring.visible = false;
      lastTeleportPressed = false;
    }

    setMetrics([
      ["Build", `${BUILD}`],
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Pos", `${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`],
      ["World", `${World.VERSION || "?"}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 4.6 boot complete ✅ (laser+move restored, 45° snap, 1-press teleport)");
})();
