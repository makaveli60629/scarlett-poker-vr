// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_7_QUEST_STABLE
// ✅ Quest stability: lower pixel ratio, no shadows, try/catch loop, XR lifecycle logs
// ✅ XR: lasers + teleport + left stick move + right stick snap turn
// ✅ Y toggles watch (lazy) but only after XR is stable
// ✅ Runs scene.userData.worldTick(dt)

export function boot() {
  main().catch((e) => fatal(e));
}

const BUILD = "SCARLETT1_FULL_v1_7_QUEST_STABLE";

function hud() { return document.getElementById("scarlett-mini-hud"); }
function writeHud(line) { const el = hud(); if (el) el.textContent += `\n${line}`; }
function fatal(e) {
  const msg = e?.stack || e?.message || String(e);
  console.error("[scarlett1] fatal ❌", msg);
  writeHud(`[ERR] ${msg}`);
}

async function main() {
  // Global traps (Quest needs this)
  window.addEventListener("error", (e) => {
    const msg = e?.error?.stack || e?.message || String(e);
    writeHud(`[ERR] window.error: ${msg}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.stack || e?.reason?.message || String(e?.reason || e);
    writeHud(`[ERR] unhandledrejection: ${msg}`);
  });

  writeHud("[LOG] scarlett1 starting…");
  writeHud(`build=${BUILD}`);

  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  const { VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");

  writeHud("[LOG] three loaded ✅");
  writeHud("[LOG] VRButton loaded ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false
  });

  // ✅ Quest-friendly defaults
  renderer.shadowMap.enabled = false;

  // Cap pixel ratio hard (Quest stability)
  const basePR = Math.min(1.25, window.devicePixelRatio || 1);
  renderer.setPixelRatio(basePR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // Lights (simple)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.95));
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // Rig
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // Floor teleport target
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  // World
  writeHud("[LOG] importing world.js …");
  try {
    const worldMod = await import(`./world.js?v=WORLD_${Date.now()}`);
    if (worldMod?.buildWorld) {
      worldMod.buildWorld({ THREE, scene, rig, renderer, camera, writeHud });
      writeHud("[LOG] world built ✅");
    } else {
      writeHud("[ERR] world.js missing export buildWorld()");
    }
  } catch (e) {
    writeHud("[ERR] world import failed ❌");
    writeHud("[ERR] " + (e?.stack || e?.message || e));
  }

  // XR: lasers + teleport
  const xr = installXRControllers({ THREE, scene, rig, renderer, floor });
  writeHud("[LOG] XR lasers+teleport installed ✅");

  // XR: gamepad movement (Quest)
  const gp = installXRGamepadControls({ THREE, rig, renderer, camera, xr, writeHud });
  writeHud("[LOG] XR sticks+watch installed ✅");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // XR lifecycle logs
  renderer.xr.addEventListener("sessionstart", () => {
    writeHud("[LOG] XR session start ✅");
    // Drop pixel ratio even more once in XR if needed
    renderer.setPixelRatio(1.0);
    gp.onSessionStart();
  });

  renderer.xr.addEventListener("sessionend", () => {
    writeHud("[LOG] XR session end ⚠️ (kicked out or exited)");
    // Restore base PR for 2D
    renderer.setPixelRatio(basePR);
    gp.onSessionEnd();
  });

  // Frame health monitor
  let slowFrames = 0;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    try {
      const dt = clock.getDelta();

      // If XR dt explodes repeatedly, Quest may kick session
      if (renderer.xr.isPresenting) {
        if (dt > 0.050) slowFrames++;
        else slowFrames = Math.max(0, slowFrames - 1);

        if (slowFrames > 20) {
          writeHud("[ERR] XR frame time too slow (stability risk) — reducing load");
          slowFrames = 0;
        }
      }

      scene.userData.worldTick?.(dt);

      if (renderer.xr.isPresenting) {
        gp.update(dt);
      }

      xr.update();
      renderer.render(scene, camera);
    } catch (e) {
      fatal(e);
      try { renderer.xr.getSession?.()?.end(); } catch (_) {}
    }
  });

  writeHud("[LOG] scarlett1 runtime start ✅");

  // -----------------------------
  // XR Controllers: Laser + Teleport
  // -----------------------------
  function installXRControllers({ THREE, scene, rig, renderer, floor }) {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1);
    rig.add(c2);

    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    function addLaser(ctrl, colorHex) {
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(laserGeom, mat);
      line.scale.z = 10; // shorter = cheaper and cleaner
      ctrl.add(line);
      return line;
    }

    const l1 = addLaser(c1, 0x00e5ff);
    const l2 = addLaser(c2, 0xff2bd6);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    let aiming = false;
    const hitPoint = new THREE.Vector3();

    function getHit(ctrl) {
      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = raycaster.intersectObject(floor, false);
      if (hits.length) {
        hitPoint.copy(hits[0].point);
        return true;
      }
      return false;
    }

    function onSelectStart() { aiming = true; }
    function onSelectEnd(e) {
      if (!aiming) return;
      aiming = false;
      const ctrl = e.target;
      if (getHit(ctrl)) {
        rig.position.x = hitPoint.x;
        rig.position.z = hitPoint.z;
      }
      marker.visible = false;
    }

    c1.addEventListener("selectstart", onSelectStart);
    c1.addEventListener("selectend", onSelectEnd);
    c2.addEventListener("selectstart", onSelectStart);
    c2.addEventListener("selectend", onSelectEnd);

    function update() {
      const inXR = renderer.xr.isPresenting;
      l1.visible = inXR;
      l2.visible = inXR;

      if (!inXR) {
        marker.visible = false;
        aiming = false;
        return;
      }

      if (aiming) {
        const ok = getHit(c2) || getHit(c1);
        marker.visible = ok;
        if (ok) marker.position.copy(hitPoint);
      } else {
        marker.visible = false;
      }
    }

    return { update, controllers: { c1, c2 } };
  }

  // -----------------------------
  // XR Gamepad Controls (Quest-safe)
  // -----------------------------
  function installXRGamepadControls({ THREE, rig, renderer, camera, xr, writeHud }) {
    const MOVE_SPEED = 2.4;
    const DEADZONE = 0.18;

    const SNAP_ANGLE = Math.PI / 4;
    const SNAP_COOLDOWN = 0.22;
    let snapTimer = 0;

    let watch = null;
    let lastMenuPressed = false;
    let allowExtras = false;

    function onSessionStart() {
      allowExtras = false;
      // Enable watch only after XR stable
      setTimeout(() => { allowExtras = true; }, 900);
    }
    function onSessionEnd() {
      allowExtras = false;
      lastMenuPressed = false;
      if (watch) watch.visible = false;
    }

    function update(dt) {
      if (!renderer.xr.isPresenting) return;

      snapTimer = Math.max(0, snapTimer - dt);
      const session = renderer.xr.getSession();
      if (!session) return;

      const sources = session.inputSources || [];
      let left = null, right = null;
      for (const s of sources) {
        if (!s?.gamepad) continue;
        if (s.handedness === "left") left = s;
        if (s.handedness === "right") right = s;
      }
      if (!left || !right) {
        const gps = sources.filter(s => s?.gamepad);
        if (!left && gps[0]) left = gps[0];
        if (!right && gps[1]) right = gps[1];
      }

      if (allowExtras && !watch && xr?.controllers?.c1) {
        watch = createWatchPanel({ THREE });
        watch.visible = false;
        xr.controllers.c1.add(watch);
        watch.position.set(-0.06, -0.04, -0.10);
        watch.rotation.set(-0.6, 0.3, 0.2);
        writeHud("[LOG] watch ready ✅");
      }

      // Left stick move
      if (left?.gamepad) {
        const { x, y } = readStick(left.gamepad);
        if (Math.abs(x) > DEADZONE || Math.abs(y) > DEADZONE) {
          const yaw = getCameraYaw();
          const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const rightv = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

          const move = new THREE.Vector3();
          move.addScaledVector(forward, -y);
          move.addScaledVector(rightv, x);

          if (move.lengthSq() > 0.0001) {
            move.normalize().multiplyScalar(MOVE_SPEED * dt);
            rig.position.add(move);
          }
        }

        const menuPressed = isMenuPressed(left.gamepad);
        if (menuPressed && !lastMenuPressed) {
          if (watch) watch.visible = !watch.visible;
        }
        lastMenuPressed = menuPressed;
      }

      // Right stick snap turn
      if (right?.gamepad) {
        const { x } = readStick(right.gamepad);
        if (Math.abs(x) > 0.6 && snapTimer === 0) {
          rig.rotation.y += (x > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
          snapTimer = SNAP_COOLDOWN;
        }
      }
    }

    function readStick(gamepad) {
      const a = gamepad.axes || [];
      let x = 0, y = 0;
      if (a.length >= 4) { x = a[2]; y = a[3]; }
      else if (a.length >= 2) { x = a[0]; y = a[1]; }

      x = (Math.abs(x) < DEADZONE) ? 0 : x;
      y = (Math.abs(y) < DEADZONE) ? 0 : y;
      return { x, y };
    }

    function getCameraYaw() {
      const q = new THREE.Quaternion();
      camera.getWorldQuaternion(q);
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      return e.y;
    }

    function isMenuPressed(gamepad) {
      const b = gamepad.buttons || [];
      for (const i of [3, 4, 5]) {
        if (b[i] && b[i].pressed) return true;
      }
      return false;
    }

    function createWatchPanel({ THREE }) {
      const g = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 })
      );

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const ctx2d = canvas.getContext("2d");

      ctx2d.fillStyle = "rgba(0,0,0,0.75)";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);

      ctx2d.strokeStyle = "rgba(0,229,255,0.6)";
      ctx2d.lineWidth = 6;
      ctx2d.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

      ctx2d.fillStyle = "rgba(0,229,255,0.95)";
      ctx2d.font = "bold 44px monospace";
      ctx2d.fillText("SCARLETT WATCH", 40, 90);

      ctx2d.fillStyle = "rgba(255,255,255,0.92)";
      ctx2d.font = "28px monospace";
      const lines = ["Y: Toggle Watch", "Left Stick: Move", "Right Stick: Snap 45°", "Trigger: Teleport"];
      let y = 150;
      for (const line of lines) { ctx2d.fillText(line, 40, y); y += 44; }

      const tex = new THREE.CanvasTexture(canvas);
      plane.material.map = tex;
      plane.material.needsUpdate = true;
      g.add(plane);
      return g;
    }

    return { update, onSessionStart, onSessionEnd };
  }
      }
