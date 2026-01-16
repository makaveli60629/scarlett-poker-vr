// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v2_6_QUEST_STICK_AUTODETECT_HARDENED
// ✅ XR height correct
// ✅ Teleport = RIGHT GRIP (polled) + marker
// ✅ Grab = TRIGGER (polled) with fallbacks
// ✅ Movement stick auto-detects whichever source actually reports axes[0/1]
// ✅ Snap-turn uses best source for axes[2] (fallback axes[0])
// ✅ Android touch unchanged

export function boot() {
  main().catch((e) => fatal(e));
}

const BUILD = "SCARLETT1_FULL_v2_6_QUEST_STICK_AUTODETECT_HARDENED";

function hud() { return document.getElementById("scarlett-mini-hud"); }
function writeHud(line) { const el = hud(); if (el && el.dataset.hidden !== "1") el.textContent += `\n${line}`; }
function fatal(e) {
  const msg = e?.stack || e?.message || String(e);
  console.error("[scarlett1] fatal ❌", msg);
  const el = hud();
  if (el) el.textContent += `\n[ERR] ${msg}`;
}

function ensureHudToggle() {
  const el = hud();
  if (!el) return;
  el.style.pointerEvents = "none";

  let btn = document.getElementById("scarlett-hud-toggle");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "scarlett-hud-toggle";
    btn.textContent = "HUD: ON";
    btn.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 99999;
      padding: 10px 12px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.55);
      color: white; font: 600 14px/1 system-ui, Arial;
      pointer-events: auto; touch-action: manipulation;
    `;
    document.body.appendChild(btn);
  }

  const apply = () => {
    const hidden = el.dataset.hidden === "1";
    el.style.display = hidden ? "none" : "block";
    btn.textContent = hidden ? "HUD: OFF" : "HUD: ON";
  };

  btn.onclick = () => {
    el.dataset.hidden = (el.dataset.hidden === "1") ? "0" : "1";
    apply();
  };

  if (!el.dataset.hidden) el.dataset.hidden = "0";
  apply();
}

async function main() {
  window.addEventListener("error", (e) => {
    const msg = e?.error?.stack || e?.message || String(e);
    writeHud(`[ERR] window.error: ${msg}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.stack || e?.reason?.message || String(e?.reason || e);
    writeHud(`[ERR] unhandledrejection: ${msg}`);
  });

  ensureHudToggle();
  writeHud("[LOG] scarlett1 starting…");
  writeHud(`build=${BUILD}`);

  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  const { VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
  writeHud("[LOG] three loaded ✅");
  writeHud("[LOG] VRButton loaded ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 350);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false
  });
  renderer.shadowMap.enabled = false;

  const basePR = Math.min(1.25, window.devicePixelRatio || 1);
  renderer.setPixelRatio(basePR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  (document.getElementById("app") || document.body).appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 4.2);
  rig.rotation.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  const fallback = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.6, metalness: 0.2, emissive: new THREE.Color(0x00333a) })
  );
  fallback.position.set(0, 1.3, 0);
  fallback.name = "FALLBACK_BOX";
  scene.add(fallback);

  const touch = installTouchControls({ THREE, camera, rig });
  writeHud(touch.enabled ? "[LOG] Android touch controls ✅" : "[LOG] Android touch controls (no touch device)");

  const xr = installXR({ THREE, scene, rig, renderer, floor, camera });
  writeHud("[LOG] XR installed ✅ (stick autodetect hardened)");

  renderer.xr.addEventListener("sessionstart", () => {
    writeHud("[LOG] XR session start ✅");
    renderer.setPixelRatio(1.0);
    rig.position.y = 0; // ✅ correct XR height
  });

  renderer.xr.addEventListener("sessionend", () => {
    writeHud("[LOG] XR session end ⚠️");
    renderer.setPixelRatio(basePR);
    rig.position.y = 1.65;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    try {
      const dt = clock.getDelta();
      scene.userData.worldTick?.(dt);

      if (!renderer.xr.isPresenting) touch.update(dt);
      xr.update(dt);

      renderer.render(scene, camera);
    } catch (e) {
      fatal(e);
      try { renderer.xr.getSession?.()?.end(); } catch (_) {}
    }
  });

  writeHud("[LOG] render loop started ✅");
  loadWorldAsync();

  async function loadWorldAsync() {
    writeHud("[LOG] world async load starting…");
    try {
      const worldMod = await import(`./world.js?v=WORLD_${Date.now()}`);
      if (typeof worldMod?.buildWorld === "function") {
        worldMod.buildWorld({ THREE, scene, rig, renderer, camera, writeHud });
        fallback.visible = false;
        writeHud("[LOG] world loaded ✅ modules active ✅");
      } else {
        writeHud("[ERR] world.js missing export buildWorld()");
      }
    } catch (e) {
      writeHud("[ERR] world import failed ❌");
      writeHud("[ERR] " + (e?.stack || e?.message || e));
    }
  }

  // -----------------------------
  // Touch controls (Android)
  // -----------------------------
  function installTouchControls({ THREE, camera, rig }) {
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    const enabled = !!isTouch;
    if (!enabled) return { enabled: false, update: () => {} };

    const ui = createTouchUI();
    const state = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, yaw: rig.rotation.y || 0, pitch: 0 };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function update(dt) {
      const speed = 2.3;
      const turnSpeed = 2.0;

      state.yaw -= state.lookX * turnSpeed * dt;
      state.pitch -= state.lookY * turnSpeed * dt;
      state.pitch = clamp(state.pitch, -1.2, 1.2);

      rig.rotation.y = state.yaw;
      camera.rotation.set(state.pitch, 0, 0);

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

      const move = new THREE.Vector3();
      move.addScaledVector(forward, state.moveY);
      move.addScaledVector(right, state.moveX);

      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(speed * dt);
        rig.position.add(move);
      }
    }

    ui.onMove = (x, y) => { state.moveX = x; state.moveY = y; };
    ui.onLook = (x, y) => { state.lookX = x; state.lookY = y; };
    return { enabled, update };
  }

  function createTouchUI() {
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99998;`;
    document.body.appendChild(wrap);

    const makePad = (side) => {
      const pad = document.createElement("div");
      pad.style.cssText = `
        position: fixed; bottom: 18px; ${side}: 18px;
        width: 140px; height: 140px; border-radius: 18px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        pointer-events: auto; touch-action: none;
      `;
      wrap.appendChild(pad);
      return pad;
    };

    const left = makePad("left");
    const right = makePad("right");
    const api = { onMove: null, onLook: null };

    bindPad(left, (x, y) => api.onMove && api.onMove(x, y));
    bindPad(right, (x, y) => api.onLook && api.onLook(x, y));
    return api;

    function bindPad(el, cb) {
      let active = false;
      let sx = 0, sy = 0;

      const norm = (dx, dy) => {
        const max = 60;
        const x = Math.max(-max, Math.min(max, dx)) / max;
        const y = Math.max(-max, Math.min(max, dy)) / max;
        return [x, y];
      };

      el.addEventListener("pointerdown", (e) => {
        active = true;
        sx = e.clientX; sy = e.clientY;
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        const [x, y] = norm(e.clientX - sx, e.clientY - sy);
        cb(x, -y);
      });

      const end = () => { active = false; cb(0, 0); };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
    }
  }

  // -----------------------------
  // XR: lasers + teleport + grab + sticks autodetect
  // -----------------------------
  function installXR({ THREE, scene, rig, renderer, floor, camera }) {
    const L_BLUE = 0x00e5ff; // RIGHT
    const L_PINK = 0xff2bd6; // LEFT

    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    const tmpWorldPos = new THREE.Vector3();

    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1); rig.add(c2);

    function bind(ctrl) {
      ctrl.userData.handedness = "unknown";
      ctrl.userData.inputSource = null;
      ctrl.userData.grabbed = null;
      ctrl.userData.grabParent = null;
      ctrl.userData.prevTrig = false;
      ctrl.userData.prevGrip = false;

      ctrl.addEventListener("connected", (e) => {
        ctrl.userData.handedness = e?.data?.handedness || "unknown";
        ctrl.userData.inputSource = e?.data || null;
      });
      ctrl.addEventListener("disconnected", () => {
        ctrl.userData.handedness = "unknown";
        ctrl.userData.inputSource = null;
        ctrl.userData.grabbed = null;
        ctrl.userData.grabParent = null;
      });
    }
    bind(c1); bind(c2);

    function rightController() {
      if (c1.userData.handedness === "right") return c1;
      if (c2.userData.handedness === "right") return c2;
      return c1;
    }

    // Lasers
    const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    function makeLaser(ctrl, initialColor) {
      const mat = new THREE.LineBasicMaterial({ color: initialColor, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(laserGeom, mat);
      line.scale.z = 10;
      ctrl.add(line);
      return { line, mat };
    }
    const laser1 = makeLaser(c1, L_BLUE);
    const laser2 = makeLaser(c2, L_PINK);

    function recolor(ctrl, laser) {
      const h = ctrl.userData.handedness;
      if (h === "left") laser.mat.color.setHex(L_PINK);
      else if (h === "right") laser.mat.color.setHex(L_BLUE);
    }

    // Teleport marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: L_BLUE, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    let aimingTeleport = false;
    const hitPoint = new THREE.Vector3();

    function getFloorHit(ctrl) {
      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hits = raycaster.intersectObject(floor, false);
      if (hits.length) { hitPoint.copy(hits[0].point); return true; }
      return false;
    }

    // Hover dot for interactables
    const hoverDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    hoverDot.visible = false;
    scene.add(hoverDot);

    function getInteractHit(ctrl) {
      const list = scene.userData?.interactables;
      if (!list || !list.length) return null;

      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = raycaster.intersectObjects(list, true);
      if (!hits.length) return null;

      for (const h of hits) {
        let o = h.object;
        while (o && o !== scene && !o.userData?.grabbable) o = o.parent;
        if (o?.userData?.grabbable) return { object: o, point: h.point, distance: h.distance };
      }
      return null;
    }

    function grab(ctrl, obj) {
      if (!obj || ctrl.userData.grabbed) return;
      ctrl.userData.grabbed = obj;
      ctrl.userData.grabParent = obj.parent;

      obj.getWorldPosition(tmpWorldPos);
      scene.attach(obj);
      ctrl.attach(obj);
      obj.position.set(0, 0, -0.18);
      obj.rotation.set(0, 0, 0);
    }

    function release(ctrl) {
      const obj = ctrl.userData.grabbed;
      if (!obj) return;

      const parent = ctrl.userData.grabParent || scene;
      scene.attach(obj);
      parent.attach(obj);

      if (obj.userData?.dropLift) obj.position.y += obj.userData.dropLift;

      ctrl.userData.grabbed = null;
      ctrl.userData.grabParent = null;
    }

    function getSources(session) {
      return Array.from(session?.inputSources || []).filter(s => s?.gamepad);
    }

    // Strong button detection
    function readButtons(src) {
      const gp = src?.gamepad;
      if (!gp) return { trigger: false, grip: false };

      const b = gp.buttons || [];

      const pressedOrAnalog = (idx, thr=0.12) => {
        const bb = b[idx];
        if (!bb) return false;
        if (bb.pressed) return true;
        const v = (typeof bb.value === "number") ? bb.value : 0;
        return v > thr;
      };

      const trigger = pressedOrAnalog(0) || pressedOrAnalog(2) || pressedOrAnalog(3) || pressedOrAnalog(5);
      const grip = pressedOrAnalog(1) || pressedOrAnalog(4);

      return { trigger, grip };
    }

    // Find best sources each frame
    function pickMoveSource(sources, DEADZONE) {
      // pick the source with biggest |axes0|+|axes1|
      let best = null;
      let bestScore = 0;

      for (const s of sources) {
        const a = s.gamepad?.axes || [];
        if (a.length < 2) continue;
        const x = a[0] || 0;
        const y = a[1] || 0;
        const score = Math.abs(x) + Math.abs(y);
        if (score > bestScore) {
          bestScore = score;
          best = s;
        }
      }

      // If nothing “active”, still return a stable default so moving starts instantly when touched:
      if (best) return best;

      // Prefer left-handed if present
      return sources.find(s => s.handedness === "left") || sources[0] || null;
    }

    function pickSnapSource(sources) {
      // prefer a source that has axes[2] (common for right stick)
      const hasA2 = sources.find(s => (s.gamepad?.axes || []).length >= 4);
      if (hasA2) return hasA2;
      return sources.find(s => s.handedness === "right") || sources[0] || null;
    }

    function getSourceForController(ctrl, sessionSources) {
      const hand = ctrl.userData.handedness;
      if (hand) {
        const m = sessionSources.find(s => s.handedness === hand);
        if (m) return m;
      }
      // fallback: first
      return sessionSources[0] || null;
    }

    function getCameraYaw() {
      const q = new THREE.Quaternion();
      camera.getWorldQuaternion(q);
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      return e.y;
    }

    const MOVE_SPEED = 2.55;
    const DEADZONE = 0.18;
    const SNAP_ANGLE = Math.PI / 4;
    const SNAP_COOLDOWN = 0.22;
    let snapTimer = 0;

    function update(dt) {
      const inXR = renderer.xr.isPresenting;
      laser1.line.visible = inXR;
      laser2.line.visible = inXR;
      hoverDot.visible = false;

      if (!inXR) { marker.visible = false; aimingTeleport = false; return; }

      recolor(c1, laser1);
      recolor(c2, laser2);

      const session = renderer.xr.getSession();
      snapTimer = Math.max(0, snapTimer - dt);

      const sources = getSources(session);

      // ---- Teleport = right grip
      const rc = rightController();
      const srcR = getSourceForController(rc, sources);
      const btnR = readButtons(srcR);

      const gripDown = btnR.grip && !rc.userData.prevGrip;
      const gripUp   = !btnR.grip && rc.userData.prevGrip;
      rc.userData.prevGrip = btnR.grip;

      if (gripDown) aimingTeleport = true;

      if (aimingTeleport) {
        const ok = getFloorHit(rc);
        marker.visible = ok;
        if (ok) marker.position.copy(hitPoint);
      } else marker.visible = false;

      if (gripUp) {
        if (getFloorHit(rc)) {
          rig.position.x = hitPoint.x;
          rig.position.z = hitPoint.z;
        }
        aimingTeleport = false;
        marker.visible = false;
      }

      // ---- Grab = trigger (either hand)
      for (const ctrl of [c1, c2]) {
        const src = getSourceForController(ctrl, sources);
        const btn = readButtons(src);

        const trigDown = btn.trigger && !ctrl.userData.prevTrig;
        const trigUp   = !btn.trigger && ctrl.userData.prevTrig;
        ctrl.userData.prevTrig = btn.trigger;

        if (trigDown) {
          if (!ctrl.userData.grabbed) {
            const hit = getInteractHit(ctrl);
            if (hit?.object) grab(ctrl, hit.object);
          }
        }
        if (trigUp) {
          if (ctrl.userData.grabbed) release(ctrl);
        }
      }

      // ---- Movement: AUTODETECT the source that actually reports axes[0/1]
      if (sources.length) {
        const moveSrc = pickMoveSource(sources, DEADZONE);
        if (moveSrc?.gamepad) {
          const a = moveSrc.gamepad.axes || [];
          let x = a[0] || 0;
          let y = a[1] || 0;

          x = (Math.abs(x) < DEADZONE) ? 0 : x;
          y = (Math.abs(y) < DEADZONE) ? 0 : y;

          if (x !== 0 || y !== 0) {
            const yaw = getCameraYaw();
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            const rightv  = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

            const move = new THREE.Vector3();
            move.addScaledVector(forward, -y);
            move.addScaledVector(rightv, x);

            if (move.lengthSq() > 0.0001) {
              move.normalize().multiplyScalar(MOVE_SPEED * dt);
              rig.position.add(move);
            }
          }
        }

        // Snap turn: use best snap source (axes[2] if exists)
        const snapSrc = pickSnapSource(sources);
        if (snapSrc?.gamepad) {
          const a = snapSrc.gamepad.axes || [];
          let sx = 0;
          if (a.length >= 4) sx = a[2] || 0;
          else if (a.length >= 2) sx = a[0] || 0;

          sx = (Math.abs(sx) < DEADZONE) ? 0 : sx;
          if (Math.abs(sx) > 0.6 && snapTimer === 0) {
            rig.rotation.y += (sx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
            snapTimer = SNAP_COOLDOWN;
          }
        }
      }

      // Hover dot
      const h1 = !c1.userData.grabbed ? getInteractHit(c1) : null;
      const h2 = !c2.userData.grabbed ? getInteractHit(c2) : null;
      const best = (h1 && h2) ? (h1.distance < h2.distance ? h1 : h2) : (h1 || h2);
      if (best) {
        hoverDot.visible = true;
        hoverDot.position.copy(best.point);
      }
    }

    return { update };
  }
                          }
