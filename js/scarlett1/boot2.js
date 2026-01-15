// /js/scarlett1/boot2.js — Scarlett Boot2 (FULL / GitHub Pages Safe)
// ✅ CDN imports only (no "three" bare specifier)
// ✅ Diagnostics HUD
// ✅ VRButton
// ✅ Controllers + Hands (best-effort) + Teleport (ray + simple arc hint)
// ✅ Quest thumbsticks locomotion via /js/core/controls.js (NO three import)
// ✅ Android sticks overlay via ./spine_android.js (non-XR only)

const BUILD = "BOOT2_FULL_v1.0";

const $ = (id) => document.getElementById(id);

const diag = {
  logEl: $("diagLog"),
  statusEl: $("diagStatus"),
  setStatus(text, ok = true) {
    if (!this.statusEl) return;
    this.statusEl.innerHTML = `STATUS: <b style="color:${ok ? "#6df29b" : "#ff6d6d"}">${text}</b>`;
  },
  ts() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}]`;
  },
  write(...a) {
    const line = `${this.ts()} ${a.join(" ")}\n`;
    if (this.logEl) {
      this.logEl.textContent += line;
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
    console.log("[diag]", ...a);
  }
};

function wireHUD() {
  const hide = $("btnHideHud");
  const show = $("btnShowHud");
  const copy = $("btnCopy");
  const clear = $("btnClear");
  const reload = $("btnReload");

  hide?.addEventListener("click", () => document.body.classList.add("hudHidden"));
  show?.addEventListener("click", () => document.body.classList.remove("hudHidden"));
  clear?.addEventListener("click", () => { if (diag.logEl) diag.logEl.textContent = ""; });
  reload?.addEventListener("click", () => location.reload());

  copy?.addEventListener("click", async () => {
    try {
      const txt = diag.logEl?.textContent || "";
      await navigator.clipboard.writeText(txt);
      diag.write("copied ✅");
    } catch (e) {
      diag.write("copy failed ❌", e?.message || e);
    }
  });
}

wireHUD();

diag.write("diag start ✅");
diag.write("href=" + location.href);
diag.write("path=" + location.pathname);
diag.write("base=" + (location.pathname.replace(/\/[^\/]*$/, "/")));
diag.write("secureContext=" + (window.isSecureContext ? "true" : "false"));
diag.write("ua=" + navigator.userAgent);
diag.write("navigator.xr=" + (!!navigator.xr));

let THREE, VRButton;
let renderer, scene, camera, player;
let worldAPI = null;

const CDN_THREE = "https://unpkg.com/three@0.158.0/build/three.module.js";
const CDN_VRBUTTON = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
const CDN_XRHAND = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js";

async function safeImport(url, label) {
  try {
    diag.write(`[boot2] import ${url}`);
    const m = await import(url);
    diag.write(`[boot2] ok ✅ ${label || url}`);
    return m;
  } catch (e) {
    diag.write(`[boot2] fail ❌ ${label || url} :: ${e?.message || e}`);
    throw e;
  }
}

function ensureRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function makeCoreScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.65, 4);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 0);
  player.add(camera);
  scene.add(player);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x203050, 0.8);
  scene.add(hemi);
}

function addVRButton() {
  const btn = VRButton.createButton(renderer);
  btn.style.position = "fixed";
  btn.style.right = "14px";
  btn.style.bottom = "14px";
  btn.style.zIndex = "99999";
  document.body.appendChild(btn);
  diag.write("VRButton ready ✅");
}

function installControllers() {
  const controllers = {
    c0: { grip: null, ctrl: null, gamepad: null },
    c1: { grip: null, ctrl: null, gamepad: null }
  };

  function attach(i) {
    const ctrl = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);

    ctrl.name = `XRController${i}`;
    grip.name = `XRGrip${i}`;

    player.add(ctrl);
    player.add(grip);

    controllers["c" + i].ctrl = ctrl;
    controllers["c" + i].grip = grip;

    ctrl.addEventListener("connected", (e) => {
      controllers["c" + i].gamepad = e.data?.gamepad || null;
      diag.write(`controller${i} connected ✅`, controllers["c" + i].gamepad ? "(gamepad ok)" : "(no gamepad)");
    });

    ctrl.addEventListener("disconnected", () => {
      controllers["c" + i].gamepad = null;
      diag.write(`controller${i} disconnected`);
    });

    return ctrl;
  }

  attach(0);
  attach(1);

  return controllers;
}

function installHandsBestEffort() {
  // If this fails, we continue (teleport + controllers still work).
  return (async () => {
    try {
      const { XRHandModelFactory } = await safeImport(CDN_XRHAND, "XRHands");
      const factory = new XRHandModelFactory();

      const hand0 = renderer.xr.getHand(0);
      const hand1 = renderer.xr.getHand(1);
      hand0.name = "XRHand0";
      hand1.name = "XRHand1";

      player.add(hand0);
      player.add(hand1);

      const m0 = factory.createHandModel(hand0, "mesh");
      const m1 = factory.createHandModel(hand1, "mesh");
      hand0.add(m0);
      hand1.add(m1);

      diag.write("XR hands ready ✅");
      return { hand0, hand1 };
    } catch (e) {
      diag.write("XR hands skipped (ok) :: " + (e?.message || e));
      return null;
    }
  })();
}

function makeTeleportFX() {
  const rayMat = new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.9 });
  const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const rayLine = new THREE.Line(rayGeom, rayMat);
  rayLine.name = "TeleportRay";
  rayLine.visible = false;
  scene.add(rayLine);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 32),
    new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.name = "TeleportRing";
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  return { rayLine, ring };
}

function updateTeleportFX(fx, originObj, hitPoint) {
  if (!fx || !originObj || !hitPoint) return;

  const o = new THREE.Vector3();
  originObj.getWorldPosition(o);

  fx.rayLine.visible = true;
  fx.ring.visible = true;

  const pts = [o, hitPoint.clone()];
  fx.rayLine.geometry.setFromPoints(pts);

  fx.ring.position.copy(hitPoint);
  fx.ring.position.y += 0.01;
}

function hideTeleportFX(fx) {
  if (!fx) return;
  fx.rayLine.visible = false;
  fx.ring.visible = false;
}

async function main() {
  diag.setStatus("Booting…", true);

  // Import THREE
  THREE = await safeImport(CDN_THREE, "three");
  THREE = THREE.default || THREE;
  window.THREE = THREE; // ✅ critical: other modules use injected/global THREE
  diag.write(`[boot2] three import ✅ r${THREE.REVISION}`);

  // Import VRButton
  ({ VRButton } = await safeImport(CDN_VRBUTTON, "VRButton"));

  ensureRenderer();
  makeCoreScene();
  addVRButton();

  // Controllers & hands
  const controllers = installControllers();
  const hands = await installHandsBestEffort();

  // Teleport FX
  const teleportFX = makeTeleportFX();
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  // Load World
  const worldURL = new URL("./world.js", import.meta.url).toString();
  diag.write("[boot2] world url=" + worldURL);
  const worldMod = await safeImport(worldURL, "world.js");

  if (typeof worldMod.initWorld !== "function") {
    throw new Error("world.js missing export initWorld()");
  }

  diag.write("initWorld() start");
  worldAPI = await worldMod.initWorld({
    THREE,
    scene,
    renderer,
    camera,
    player,
    log: (...a) => diag.write(...a),
  });
  diag.write("initWorld() completed ✅");

  // Controls (Quest locomotion)
  let Controls = null;
  try {
    const controlsURL = new URL("../core/controls.js", import.meta.url).toString()
      .replace("/js/scarlett1/", "/js/"); // ensure /js/core/controls.js
    const mod = await safeImport(controlsURL, "controls");
    Controls = mod?.Controls || null;
    if (Controls?.applyLocomotion) diag.write("Quest locomotion module ready ✅");
  } catch (e) {
    diag.write("controls load skipped ❌ " + (e?.message || e));
  }

  // Android sticks overlay (non-XR)
  let androidAPI = null;
  try {
    const spineAndroidURL = new URL("./spine_android.js", import.meta.url).toString();
    const m = await safeImport(spineAndroidURL, "spine_android");
    androidAPI = m || null;
    if (androidAPI?.initAndroidSticks) {
      androidAPI.initAndroidSticks({
        player,
        camera,
        log: (...a) => diag.write(...a),
      });
      diag.write("Android sticks READY ✅");
    }
  } catch (e) {
    diag.write("Android sticks skipped ❌ " + (e?.message || e));
  }

  // XR session hooks
  renderer.xr.addEventListener("sessionstart", () => {
    diag.write("XR session start ✅");
    // Hide android overlay once XR starts
    androidAPI?.setEnabled?.(false);
  });
  renderer.xr.addEventListener("sessionend", () => {
    diag.write("XR session end");
    androidAPI?.setEnabled?.(true);
  });

  // Teleport: triggers OR right index pinch (best effort)
  let pendingTeleport = null;

  function tryTeleportFrom(obj) {
    if (!obj) return null;
    obj.getWorldPosition(tmpV);
    obj.getWorldDirection(tmpDir);
    tmpDir.normalize();

    raycaster.set(tmpV, tmpDir);
    const hit = worldAPI?.raycastFloor?.(raycaster);
    if (hit) return hit;
    return null;
  }

  function bindTeleportController(ctrl) {
    if (!ctrl) return;

    ctrl.addEventListener("selectstart", () => {
      const hit = tryTeleportFrom(ctrl);
      if (hit) pendingTeleport = hit.clone();
    });

    ctrl.addEventListener("selectend", () => {
      if (pendingTeleport) {
        // Move player so camera lands on hit
        const camWorld = new THREE.Vector3();
        camera.getWorldPosition(camWorld);
        const delta = pendingTeleport.clone().sub(camWorld);
        delta.y = 0;
        player.position.add(delta);

        pendingTeleport = null;
        hideTeleportFX(teleportFX);
      }
    });
  }

  bindTeleportController(controllers.c0.ctrl);
  bindTeleportController(controllers.c1.ctrl);

  // Render loop
  let last = performance.now();
  diag.write("render loop start ✅");
  diag.setStatus("World running ✅", true);

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // World updates
    worldAPI?.update?.(dt);

    // Android controls (non-XR only)
    if (!renderer.xr.isPresenting) {
      androidAPI?.update?.(dt);
    }

    // Quest locomotion (XR only)
    if (renderer.xr.isPresenting && Controls?.applyLocomotion) {
      Controls.applyLocomotion({ renderer, player, controllers, camera }, dt);
    }

    // Teleport FX preview
    if (renderer.xr.isPresenting) {
      const src = controllers?.c0?.ctrl || controllers?.c1?.ctrl;
      const hit = src ? tryTeleportFrom(src) : null;
      if (hit) updateTeleportFX(teleportFX, src, hit);
      else hideTeleportFX(teleportFX);
    } else {
      hideTeleportFX(teleportFX);
    }

    renderer.render(scene, camera);
  });
}

main().catch((e) => {
  diag.setStatus("BOOT FAILED ❌", false);
  diag.write("BOOT ERROR:", e?.message || e);
  console.error(e);
});
