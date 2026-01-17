// /js/scarlett1/index.js — Scarlett1 Router (FULL)
// BUILD: SCARLETT1_ROUTER_FULL_MODULEMAP_v5
//
// ✅ Keeps boot chain intact
// ✅ World visible (camera spawn + lighting baseline)
// ✅ Loads YOUR modules from /js/modules/
// ✅ Auto-detects module entrypoint (enable/init/boot/start/setup/mount/default)
// ✅ Supports side-effect modules too
// ✅ Keeps Android sticks + fallback controls

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_ROUTER_FULL_MODULEMAP_v5";
  const NOW = () => new Date().toISOString().slice(11, 19);
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.router = BUILD;
  push?.(`[scarlett1] build=${BUILD}`);

  // ---------- Imports (NO bare specifiers) ----------
  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const VRBTN_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

  let THREE, VRButton;
  THREE = await import(THREE_URL);
  push?.(`[scarlett1] three ✅ r${THREE.REVISION}`);
  ({ VRButton } = await import(VRBTN_URL));
  push?.(`[scarlett1] VRButton ✅`);

  // ---------- Renderer / Scene / Camera / Rig ----------
  const app = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "10px";
  vrBtn.style.bottom = "60px";
  vrBtn.style.zIndex = "99999";
  document.body.appendChild(vrBtn);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080b);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 240);
  camera.position.set(0, 1.65, 0);

  const rig = new THREE.Group();
  rig.name = "playerRig";
  rig.add(camera);
  scene.add(rig);

  // baseline lights (modules can add more)
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(7, 12, 6);
  scene.add(key);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const controllers = {
    c0: renderer.xr.getController(0),
    c1: renderer.xr.getController(1),
  };
  scene.add(controllers.c0, controllers.c1);

  // ---------- Load World ----------
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") throw new Error("js/scarlett1/world.js missing createWorld()");
  const world = await worldMod.createWorld({
    THREE, scene, renderer, camera, rig, Scarlett,
    diag: (msg) => push?.(msg),
    BASE
  });
  push?.(`[scarlett1] world ready ✅`);

  // ---------- Context (so modules can also “self-register” if they were built that way) ----------
  const ctx = {
    THREE, scene, renderer, camera, rig, world, Scarlett, controllers,
    diag: push, BASE, V
  };
  globalThis.SCARLETT_CTX = ctx;

  // ---------- UI bridge ----------
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES?.toggle?.();
  Scarlett.UI.toggleTeleport = () => {
    if (Scarlett.__controls?.toggleTeleport) Scarlett.__controls.toggleTeleport();
    else world?.ui?.toggleTeleport?.();
  };

  installModulePanel({ Scarlett, push });

  // ---------- MODULE LOADER (calls module entrypoints) ----------
  const modules = [];
  const MODULE_BASE = `${BASE}js/modules/`;

  const MODULE_MAP = [
    ["environmentLighting", "environmentLighting.module.js"],
    ["hud", "hud.module.js"],
    ["menuUI", "menuUI.module.js"],

    ["localPlayer", "localPlayer.module.js"],
    ["avatars", "avatars.module.js"],
    ["avatarUI", "avatarUI.module.js"],
    ["avatarAnimation", "avatarAnimation.module.js"],
    ["avatarCustomization", "avatarCustomization.module.js"],

    ["interactionHands", "interactionHands.module.js"],
    ["gestureControl", "gestureControl.js"],

    ["locomotionXR", "locomotion_xr.js"],

    ["cards", "cards.module.js"],
    ["chips", "chips.module.js"],
    ["audioLogic", "audioLogic.js"],

    ["lobbyStations", "lobbyStations.module.js"],
    ["lobbyMatchmaking", "lobbyMatchmaking.module.js"],
  ];

  for (const [name, file] of MODULE_MAP) {
    const url = `${MODULE_BASE}${file}?v=${encodeURIComponent(V)}`;
    try {
      push?.(`[mod] importing ${name} → ${file}`);
      const m = await import(url);

      const keys = Object.keys(m || {});
      push?.(`[mod] ${name} exports: ${keys.length ? keys.join(", ") : "(none)"}`);

      // Try to find an entry function in order of preference
      const entry =
        (typeof m.enable === "function" && { fn: m.enable, label: "enable" }) ||
        (typeof m.init === "function" && { fn: m.init, label: "init" }) ||
        (typeof m.boot === "function" && { fn: m.boot, label: "boot" }) ||
        (typeof m.start === "function" && { fn: m.start, label: "start" }) ||
        (typeof m.setup === "function" && { fn: m.setup, label: "setup" }) ||
        (typeof m.mount === "function" && { fn: m.mount, label: "mount" }) ||
        (typeof m.create === "function" && { fn: m.create, label: "create" }) ||
        (typeof m.default === "function" && { fn: m.default, label: "default" }) ||
        null;

      let inst = null;

      if (entry) {
        push?.(`[mod] ${name} entry=${entry.label}() calling…`);
        inst = await entry.fn(ctx);
        push?.(`[mod] ${name} started ✅`);
      } else {
        // side-effect module: treat import as success
        push?.(`[mod] ${name} loaded (side-effect/no entry) ✅`);
      }

      modules.push({ name, inst, mod: m });

    } catch (e) {
      push?.(`[mod] ${name} FAILED ❌ ${file} → ${String(e?.message || e)}`);
    }
  }

  // ---------- Fallback Controls (ALWAYS) ----------
  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push });
  Scarlett.__controls = fallback;
  modules.push({ name: "__fallbackControls", inst: fallback });

  renderer.xr.addEventListener("sessionstart", () => push?.(`[xr] sessionstart ✅`));
  renderer.xr.addEventListener("sessionend", () => push?.(`[xr] sessionend ✅`));

  renderer.setAnimationLoop((t) => {
    for (const m of modules) m.inst?.tick?.(t);
    world?.tick?.(t);
    if (!renderer.xr.getSession?.()) camera.lookAt(0, 1.2, 0);
    renderer.render(scene, camera);
  });

  push?.(`[scarlett1] started ✅`);
}

// -------------------- Built-in Module Panel --------------------
function installModulePanel({ Scarlett, push }) {
  if (document.getElementById("scarlettModsPanel")) return;

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
      <div style="font-weight:900;">MODULES</div>
      <button id="modsClose" style="cursor:pointer;border-radius:10px;padding:6px 10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#fff;">close</button>
    </div>
    <div style="opacity:0.8; margin-bottom:10px;">Modules are loaded via /js/modules/*.module.js and started if they expose an entry function.</div>
  `;
  document.body.appendChild(panel);
  panel.querySelector("#modsClose").onclick = () => (panel.style.display = "none");

  globalThis.SCARLETT_MODULES = {
    show() { panel.style.display = "block"; },
    hide() { panel.style.display = "none"; },
    toggle() { panel.style.display = (panel.style.display === "none" || !panel.style.display) ? "block" : "none"; },
  };

  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES.toggle();

  push?.(`[mods] panel ready ✅`);
}

// -------------------- Fallback Controls (XR + Android sticks) --------------------
function createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push }) {
  const state = {
    teleportMode: false,
    snapCooldown: 0,
    moveSpeed: 2.2,
    turnSpeed: 2.0,
    snapAngle: Math.PI / 4,
    _lastY: false,
    _lastX: false,
    _lastB: false,
    _lastGrip: false,
  };

  // Teleport reticle
  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0x44ff77, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  try { world.root?.add?.(ret); } catch {}

  const ray = new THREE.Raycaster();

  function deadzone(v, dz = 0.15) {
    const av = Math.abs(v);
    if (av < dz) return 0;
    const s = (av - dz) / (1 - dz);
    return Math.sign(v) * Math.max(0, Math.min(1, s));
  }

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

  function toggleTeleport() {
    state.teleportMode = !state.teleportMode;
    push?.(`[move] teleport=${state.teleportMode}`);
    if (!state.teleportMode) ret.visible = false;
  }

  function applyMoveTurn(moveX, moveY, turnX, dt) {
    if (turnX) rig.rotation.y -= turnX * state.turnSpeed * dt;

    const yaw = new THREE.Quaternion();
    camera.getWorldQuaternion(yaw);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw);
    fwd.y = 0; fwd.normalize();

    const rightV = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw);
    rightV.y = 0; rightV.normalize();

    const forward = moveY;
    const strafe = moveX;

    if (forward || strafe) {
      const v = new THREE.Vector3()
        .addScaledVector(fwd, forward)
        .addScaledVector(rightV, strafe)
        .multiplyScalar(state.moveSpeed * dt);
      rig.position.add(v);
    }
  }

  return {
    toggleTeleport,
    tick() {
      const dt = 1 / 72;
      const session = renderer.xr.getSession?.();
      const android = Scarlett.ANDROID_INPUT || { moveX: 0, moveY: 0, turnX: 0 };

      if (session) {
        const { left, right } = getPads();
        const la = left?.axes || [];
        const ra = right?.axes || [];
        const lb = left?.buttons || [];
        const rb = right?.buttons || [];

        const btnX = !!lb[3]?.pressed;
        const btnY = !!lb[4]?.pressed;
        const btnB = !!rb[4]?.pressed;
        const rGrip = !!rb[1]?.pressed;

        if (btnY && !state._lastY) globalThis.SCARLETT_DIAG?.toggle?.();
        state._lastY = btnY;

        if (btnX && !state._lastX) world.ui?.toggleHud?.();
        state._lastX = btnX;

        if (btnB && !state._lastB) toggleTeleport();
        state._lastB = btnB;

        const haveAxes = (ra.length + la.length) > 0;

        if (!state.teleportMode) {
          if (haveAxes) {
            const mx = deadzone(ra.length >= 4 ? ra[2] : (ra[0] || 0));
            const my = deadzone(ra.length >= 4 ? ra[3] : (ra[1] || 0));
            const tx = deadzone(la[0] || 0);

            applyMoveTurn(mx, -my, 0, dt);

            state.snapCooldown = Math.max(0, state.snapCooldown - dt);
            if (state.snapCooldown === 0 && Math.abs(tx) > 0.85) {
              rig.rotation.y -= Math.sign(tx) * state.snapAngle;
              state.snapCooldown = 0.22;
            }
          } else {
            applyMoveTurn(android.moveX || 0, android.moveY || 0, android.turnX || 0, dt);
          }
          ret.visible = false;
        } else {
          ray.setFromCamera({ x: 0, y: 0 }, camera);
          const hits = ray.intersectObjects(world.floorMeshes || [], true);
          if (hits.length) {
            ret.visible = true;
            ret.position.copy(hits[0].point);
            if (rGrip && !state._lastGrip) {
              rig.position.set(hits[0].point.x, rig.position.y, hits[0].point.z);
              toggleTeleport();
              push?.(`[move] teleported ✅`);
            }
            state._lastGrip = rGrip;
          } else {
            ret.visible = false;
            state._lastGrip = rGrip;
          }
        }

        return;
      }

      // Non-XR: Android sticks drive
      if (!state.teleportMode) {
        applyMoveTurn(android.moveX || 0, android.moveY || 0, android.turnX || 0, dt);
        ret.visible = false;
      } else {
        ray.setFromCamera({ x: 0, y: 0 }, camera);
        const hits = ray.intersectObjects(world.floorMeshes || [], true);
        if (hits.length) {
          ret.visible = true;
          ret.position.copy(hits[0].point);
        } else {
          ret.visible = false;
        }
      }
    },
  };
      }
