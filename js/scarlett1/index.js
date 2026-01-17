// /js/scarlett1/index.js — Scarlett1 Router (FULL) ✅ RESTORE + AUTO-PROBE MODULES
// KEEP BOOT CHAIN: index.html -> /js/boot.js -> /js/index.js -> /js/scarlett1/index.js -> /js/scarlett1/world.js
// This file:
// - imports Three + VRButton via URL (no bare specifiers)
// - creates renderer/scene/camera/rig
// - loads /js/scarlett1/world.js
// - AUTO-PROBES modules from common folders and enables only what exists (no overload)
// - provides Android UI bridge (Scarlett.UI.*) and fallback controls if no module exists

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_ROUTER_FULL_AUTOPROBE_v2";
  const NOW = () => new Date().toISOString().slice(11, 19);
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.router = BUILD;

  push?.(`[scarlett1] build=${BUILD}`);

  // ---------- Imports (NO bare specifiers) ----------
  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const VRBTN_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
  const XRCMF_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";

  let THREE, VRButton, XRControllerModelFactory;
  try {
    push?.(`[scarlett1] import three…`);
    THREE = await import(THREE_URL);
    push?.(`[scarlett1] three ✅ r${THREE.REVISION}`);
  } catch (e) {
    push?.(`[scarlett1] three FAILED ❌ ${String(e?.message || e)}`);
    throw e;
  }

  try {
    push?.(`[scarlett1] import VRButton…`);
    ({ VRButton } = await import(VRBTN_URL));
    push?.(`[scarlett1] VRButton ✅`);
  } catch (e) {
    push?.(`[scarlett1] VRButton FAILED ❌ ${String(e?.message || e)}`);
    throw e;
  }

  try {
    push?.(`[scarlett1] import XRControllerModelFactory…`);
    ({ XRControllerModelFactory } = await import(XRCMF_URL));
    push?.(`[scarlett1] XRControllerModelFactory ✅`);
  } catch (e) {
    // Not fatal — controller models are optional
    push?.(`[scarlett1] XRControllerModelFactory missing (ok) ⚠️ ${String(e?.message || e)}`);
    XRControllerModelFactory = null;
  }

  // ---------- Renderer / Scene / Camera / Rig ----------
  const app = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "10px";
  vrBtn.style.bottom = "60px"; // leave space for Android HUD
  vrBtn.style.zIndex = "99999";
  document.body.appendChild(vrBtn);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.Fog(0x050508, 10, 80);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 240);
  camera.position.set(0, 1.65, 3.2);

  // Move rig, not XR camera directly
  const rig = new THREE.Group();
  rig.name = "playerRig";
  rig.add(camera);
  scene.add(rig);

  // Lights (stable + cheap)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.85);
  d.position.set(7, 12, 6);
  scene.add(d);

  // Resize
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- XR Controllers (optional visuals) ----------
  const controllers = {
    c0: renderer.xr.getController(0),
    c1: renderer.xr.getController(1),
    g0: renderer.xr.getControllerGrip(0),
    g1: renderer.xr.getControllerGrip(1),
  };
  scene.add(controllers.c0, controllers.c1, controllers.g0, controllers.g1);

  if (XRControllerModelFactory) {
    try {
      const f = new XRControllerModelFactory();
      controllers.g0.add(f.createControllerModel(controllers.g0));
      controllers.g1.add(f.createControllerModel(controllers.g1));
      push?.(`[scarlett1] controller models ✅`);
    } catch (e) {
      push?.(`[scarlett1] controller models failed (ok) ⚠️ ${String(e?.message || e)}`);
    }
  }

  // ---------- Load World (Scarlett1 world) ----------
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") {
    throw new Error("js/scarlett1/world.js missing createWorld()");
  }

  const world = await worldMod.createWorld({
    THREE,
    scene,
    renderer,
    camera,
    rig,
    Scarlett,
    diag: (msg) => push?.(msg),
    BASE,
  });

  push?.(`[scarlett1] world ready ✅`);

  // ---------- UI bridge (Android HUD buttons call these) ----------
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES?.toggle?.();
  Scarlett.UI.toggleTeleport = () => {
    // Prefer module teleport toggle if present; fallback controls also sets it.
    if (Scarlett.__controls && typeof Scarlett.__controls.toggleTeleport === "function") {
      Scarlett.__controls.toggleTeleport();
    } else {
      world?.ui?.toggleTeleport?.();
    }
  };

  // ---------- Module Test Panel (built-in, always available) ----------
  installModulePanel({ Scarlett, push });

  // ---------- AUTO-PROBE MODULE LOADER (no overload, no crash) ----------
  const modules = [];

  const candidates = [
    `${BASE}js/modules/`,
    `${BASE}js/scarlett1/modules/`,
    `${BASE}js/scarlett1/`,
  ];

  async function tryImport(url) {
    try {
      return await import(url);
    } catch {
      return null;
    }
  }

  async function loadFirstWorking(name) {
    for (const base of candidates) {
      let url = `${base}${name}.js?v=${encodeURIComponent(V)}`;
      let m = await tryImport(url);
      if (m) return { url, m };

      url = `${base}${name}/index.js?v=${encodeURIComponent(V)}`;
      m = await tryImport(url);
      if (m) return { url, m };
    }
    return null;
  }

  // Stable order: controls first, UI next, then game systems
  const ordered = [
    "input",
    "controls",
    "controllers",
    "hud",
    "world_ui",
    "teleport",
    "hands",
    "hands_only",
    "avatars",
    "poker",
    "cards",
    "chips",
    "store",
  ];

  for (const name of ordered) {
    push?.(`[mod] probe ${name}…`);
    const found = await loadFirstWorking(name);

    if (!found) {
      push?.(`[mod] ${name} (not found)`);
      addModuleRow(name, false, "");
      continue;
    }

    push?.(`[mod] ${name} found ✅ ${found.url}`);
    addModuleRow(name, true, found.url);

    // Enable if module exposes enable()
    if (typeof found.m.enable === "function") {
      try {
        const inst = await found.m.enable({
          THREE,
          scene,
          renderer,
          camera,
          rig,
          world,
          Scarlett,
          controllers,
          diag: push,
          BASE,
          V,
        });
        modules.push({ name, inst });
        push?.(`[mod] enabled ${name} ✅`);
      } catch (e) {
        push?.(`[mod] enable fail ${name} ❌ ${String(e?.message || e)}`);
      }
    } else {
      push?.(`[mod] ${name} loaded (no enable())`);
    }
  }

  // ---------- Fallback Controls (always) ----------
  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push });
  Scarlett.__controls = fallback;
  modules.push({ name: "__fallbackControls", inst: fallback });

  // XR session logs
  renderer.xr.addEventListener("sessionstart", () => push?.(`[xr] sessionstart ✅`));
  renderer.xr.addEventListener("sessionend", () => push?.(`[xr] sessionend ✅`));

  // ---------- Main loop ----------
  renderer.setAnimationLoop((t) => {
    for (const m of modules) m.inst?.tick?.(t);
    world?.tick?.(t);
    renderer.render(scene, camera);
  });

  push?.(`[scarlett1] started ✅`);

  // ---------- Local helpers for module panel ----------
  function addModuleRow(name, ok, url) {
    const panel = document.getElementById("scarlettModsPanel");
    if (!panel) return;
    const list = panel.querySelector("#scarlettModsList");
    if (!list) return;

    const row = document.createElement("div");
    row.style.cssText = `
      display:flex; gap:8px; align-items:flex-start; justify-content:space-between;
      padding:6px 8px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.12);
      background:${ok ? "rgba(60,140,60,0.18)" : "rgba(140,60,60,0.14)"};
    `;

    const left = document.createElement("div");
    left.style.cssText = "display:flex; flex-direction:column; gap:2px; max-width: 78%;";
    const title = document.createElement("div");
    title.textContent = `${ok ? "✅" : "⬜"} ${name}`;
    title.style.cssText = "font-weight:700; color:#fff;";
    const sub = document.createElement("div");
    sub.textContent = ok ? url : "(missing)";
    sub.style.cssText = "opacity:0.75; font-size:11px; word-break:break-word;";
    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement("button");
    right.textContent = "toggle";
    right.style.cssText = `
      cursor:pointer; border-radius:10px; padding:6px 10px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(0,0,0,0.25); color:#fff;
      font-size:12px;
    `;
    right.onclick = () => {
      // Minimal: toggle the panel itself; real module toggling depends on module design
      globalThis.SCARLETT_MODULES?.toggle?.();
    };

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
}

// -------------------- Built-in Module Panel (always available) --------------------
function installModulePanel({ Scarlett, push }) {
  // Create once
  if (document.getElementById("scarlettModsPanel")) {
    globalThis.SCARLETT_MODULES = globalThis.SCARLETT_MODULES || {
      toggle() {
        const p = document.getElementById("scarlettModsPanel");
        if (!p) return;
        p.style.display = (p.style.display === "none" || !p.style.display) ? "block" : "none";
      }
    };
    return;
  }

  const panel = document.createElement("div");
  panel.id = "scarlettModsPanel";
  panel.style.cssText = `
    position:fixed; left:10px; bottom:10px; z-index:99999;
    width:min(560px, calc(100vw - 20px));
    max-height:55vh; overflow:auto;
    border-radius:14px;
    border:1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.62);
    color:#fff;
    font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
    padding:10px;
    display:none;
  `;

  panel.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
      <div style="font-weight:800;">MODULES</div>
      <div style="display:flex; gap:8px;">
        <button id="modsClose" style="cursor:pointer;border-radius:10px;padding:6px 10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#fff;">close</button>
      </div>
    </div>
    <div style="opacity:0.8; margin-bottom:10px;">
      This panel is built-in. It will list modules as they’re discovered. Missing modules won’t crash the game.
    </div>
    <div id="scarlettModsList" style="display:flex; flex-direction:column; gap:6px;"></div>
  `;

  document.body.appendChild(panel);

  panel.querySelector("#modsClose").onclick = () => (panel.style.display = "none");

  globalThis.SCARLETT_MODULES = {
    show() { panel.style.display = "block"; },
    hide() { panel.style.display = "none"; },
    toggle() { panel.style.display = (panel.style.display === "none" || !panel.style.display) ? "block" : "none"; },
  };

  // Also allow Android HUD "MODULES" button to work
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES.toggle();

  push?.(`[mods] panel ready ✅`);
}

// -------------------- Fallback Controls (always on, lightweight) --------------------
function createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push }) {
  const state = {
    teleportMode: false,
    teleportValid: false,
    snapCooldown: 0,
    moveSpeed: 2.2,
    snapAngle: Math.PI / 4,
    _lastY: false,
    _lastX: false,
    _lastB: false,
    _lastGrip: false,
  };

  // Provide UI toggles even if modules missing
  world.ui = world.ui || {};
  if (typeof world.ui.toggleHud !== "function") {
    world.ui._hudVisible = true;
    world.ui.toggleHud = () => {
      world.ui._hudVisible = !world.ui._hudVisible;
      push?.(`[ui] hud=${world.ui._hudVisible}`);
      // if world implements setHudVisible, call it
      world.ui.setHudVisible?.(world.ui._hudVisible);
    };
  }

  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0x44ff77, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  // add to scene safely
  try { world.root?.add?.(ret); } catch { /* ignore */ }
  try { renderer.scene?.add?.(ret); } catch { /* ignore */ }

  const ray = new THREE.Raycaster();

  function getPads() {
    const session = renderer.xr.getSession?.();
    if (!session) return { left: null, right: null };
    const out = { left: null, right: null };
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") out.left = src.gamepad;
      if (src.handedness === "right") out.right = src.gamepad;
    }
    return out;
  }

  function deadzone(v, dz = 0.15) {
    const av = Math.abs(v);
    if (av < dz) return 0;
    const s = (av - dz) / (1 - dz);
    return Math.sign(v) * Math.max(0, Math.min(1, s));
  }

  function toggleTeleport() {
    state.teleportMode = !state.teleportMode;
    push?.(`[move] teleport=${state.teleportMode}`);
    if (!state.teleportMode) {
      ret.visible = false;
      state.teleportValid = false;
    }
  }

  return {
    toggleTeleport,
    tick() {
      const dt = 1 / 72;

      const { left, right } = getPads();
      const la = left?.axes || [];
      const ra = right?.axes || [];
      const lb = left?.buttons || [];
      const rb = right?.buttons || [];

      // Buttons (best-effort on Quest touch)
      const btnX = !!lb[3]?.pressed; // X
      const btnY = !!lb[4]?.pressed; // Y
      const btnB = !!rb[4]?.pressed; // B
      const rGrip = !!rb[1]?.pressed; // grip

      // Y toggles DIAG
      if (btnY && !state._lastY) globalThis.SCARLETT_DIAG?.toggle?.();
      state._lastY = btnY;

      // X toggles HUD
      if (btnX && !state._lastX) world.ui?.toggleHud?.();
      state._lastX = btnX;

      // B toggles teleport
      if (btnB && !state._lastB) toggleTeleport();
      state._lastB = btnB;

      // Move axes (right stick preferred; tolerate different axis lengths)
      const mx = deadzone(ra.length >= 4 ? ra[2] : (ra[0] || 0));
      const my = deadzone(ra.length >= 4 ? ra[3] : (ra[1] || 0));

      // Snap turn on left stick X
      const tx = deadzone(la[0] || 0);
      state.snapCooldown = Math.max(0, state.snapCooldown - dt);

      if (!state.teleportMode) {
        // Smooth locomotion in camera yaw
        const yaw = new THREE.Quaternion();
        camera.getWorldQuaternion(yaw);

        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw);
        fwd.y = 0; fwd.normalize();
        const rightV = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw);
        rightV.y = 0; rightV.normalize();

        const forward = -my;
        const strafe = mx;

        if (forward || strafe) {
          const v = new THREE.Vector3()
            .addScaledVector(fwd, forward)
            .addScaledVector(rightV, strafe)
            .multiplyScalar(state.moveSpeed * dt);
          rig.position.add(v);
        }

        if (state.snapCooldown === 0 && Math.abs(tx) > 0.85) {
          rig.rotation.y -= Math.sign(tx) * state.snapAngle;
          state.snapCooldown = 0.22;
        }

        ret.visible = false;
      } else {
        // Teleport ray from center to floor meshes
        ray.setFromCamera({ x: 0, y: 0 }, camera);
        const hits = ray.intersectObjects(world.floorMeshes || [], true);

        if (hits.length) {
          state.teleportValid = true;
          ret.visible = true;
          ret.position.copy(hits[0].point);

          if (rGrip && state.teleportValid && !state._lastGrip) {
            rig.position.set(hits[0].point.x, rig.position.y, hits[0].point.z);
            toggleTeleport(); // turns off + hides reticle
            push?.(`[move] teleported ✅`);
          }
          state._lastGrip = rGrip;
        } else {
          state.teleportValid = false;
          ret.visible = false;
          state._lastGrip = rGrip;
        }
      }
    },
  };
  }
