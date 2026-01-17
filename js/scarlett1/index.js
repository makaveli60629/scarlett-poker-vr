// /js/scarlett1/index.js — Scarlett1 MASTER GLUE ROUTER (FULL)
// BUILD: SCARLETT1_MASTER_GLUE_ROUTER_v1
//
// ✅ Boot chain unchanged
// ✅ Loads MASTER world
// ✅ Safe module integration (won’t destroy work if module fails)
// ✅ Safe Mode: add ?safe=1 to URL
// ✅ Movement always available (XR + Android sticks) via fallback controls
// ✅ Module entry auto-detect: enable/init/boot/start/setup/mount/default
// ✅ Also supports side-effect modules that self-register onto global registry

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_MASTER_GLUE_ROUTER_v1";
  const NOW = () => new Date().toISOString().slice(11, 19);
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  const Q = new URLSearchParams(location.search);
  const SAFE_MODE = Q.get("safe") === "1";

  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.router = BUILD;

  push?.(`[scarlett1] build=${BUILD}`);
  push?.(`[scarlett1] safeMode=${SAFE_MODE}`);

  // ---------- Imports (NO bare specifiers) ----------
  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const VRBTN_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

  const THREE = await import(THREE_URL);
  push?.(`[scarlett1] three ✅ r${THREE.REVISION}`);
  const { VRButton } = await import(VRBTN_URL);
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
  scene.background = new THREE.Color(0x070a10); // not pure black

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 260);
  camera.position.set(0, 1.65, 0);

  const rig = new THREE.Group();
  rig.name = "playerRig";
  rig.add(camera);
  scene.add(rig);

  // baseline lighting (modules can enhance)
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
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

  // ---------- Load MASTER world ----------
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") throw new Error("world.js missing createWorld()");
  const world = await worldMod.createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag: push, BASE });
  push?.(`[scarlett1] world ready ✅`);

  // ---------- Context bus (modules + debugging) ----------
  const ctx = {
    THREE, scene, renderer, camera, rig, world, Scarlett, controllers,
    diag: push, BASE, V,
    // lightweight pub/sub so modules can listen without tight coupling
    bus: makeBus(push),
  };
  globalThis.SCARLETT_CTX = ctx;

  // ---------- UI bridge ----------
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES?.toggle?.();
  Scarlett.UI.toggleTeleport = () => Scarlett.__controls?.toggleTeleport?.();

  installModulePanel({ Scarlett, push });

  // ---------- ALWAYS-ON fallback controls (movement + teleport) ----------
  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push });
  Scarlett.__controls = fallback;

  // ---------- Safe module integration ----------
  // The modules you showed live in /js/modules/ with *.module.js naming + locomotion_xr.js
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

  const liveModules = [];

  if (!SAFE_MODE) {
    for (const [name, file] of MODULE_MAP) {
      const url = `${MODULE_BASE}${file}?v=${encodeURIComponent(V)}`;

      // Each module is sandboxed: import + start is isolated
      const started = await safeLoadAndStartModule({ name, url, ctx, push });
      if (started) liveModules.push(started);
    }

    // Also support modules that self-register after import (side-effect style):
    // If any module does: globalThis.SCARLETT_REGISTRY.push({name, tick, ...})
    const reg = (globalThis.SCARLETT_REGISTRY = globalThis.SCARLETT_REGISTRY || []);
    for (const item of reg) liveModules.push({ name: item.name || "registry", inst: item });
  } else {
    push?.(`[mod] SAFE MODE: skipping module start calls`);
  }

  // session logs
  renderer.xr.addEventListener("sessionstart", () => push?.(`[xr] sessionstart ✅`));
  renderer.xr.addEventListener("sessionend", () => push?.(`[xr] sessionend ✅`));

  // ---------- Main loop ----------
  renderer.setAnimationLoop((t) => {
    // tick started modules
    for (const m of liveModules) m.inst?.tick?.(t);

    // fallback controls (movement always)
    fallback.tick(t);

    // world tick
    world?.tick?.(t);

    // non-XR: keep camera oriented
    if (!renderer.xr.getSession?.()) camera.lookAt(0, 1.2, 0);

    renderer.render(scene, camera);
  });

  push?.(`[scarlett1] started ✅`);
}

// -------------------- Safe module loader / starter --------------------
async function safeLoadAndStartModule({ name, url, ctx, push }) {
  try {
    push?.(`[mod] import ${name} → ${url}`);
    const m = await import(url);

    const keys = Object.keys(m || {});
    push?.(`[mod] ${name} exports: ${keys.length ? keys.join(", ") : "(none)"}`);

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
      push?.(`[mod] ${name} entry=${entry.label}() starting…`);
      inst = await entry.fn(ctx);
      push?.(`[mod] ${name} started ✅`);
    } else {
      push?.(`[mod] ${name} loaded (side-effect/no entry) ✅`);
      inst = null;
    }

    return { name, inst: inst || m };

  } catch (e) {
    push?.(`[mod] ${name} FAILED ❌ ${String(e?.message || e)}`);
    return null;
  }
}

// -------------------- Lightweight bus --------------------
function makeBus(push) {
  const map = new Map();
  return {
    on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => map.get(ev)?.delete(fn);
    },
    emit(ev, payload) {
      const set = map.get(ev);
      if (!set) return;
      for (const fn of set) {
        try { fn(payload); } catch (e) { push?.(`[bus] ${ev} listener error ❌ ${String(e?.message || e)}`); }
      }
    }
  };
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
    <div style="opacity:0.8;">If something breaks, use <b>?safe=1</b> to boot without modules.</div>
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
    moveSpeed: 2.35,
    turnSpeed: 2.0,
    snapAngle: Math.PI / 4,
    snapCooldown: 0,
    _lastB: false,
    _lastGrip: false,
  };

  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0x44ff77, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  try { world.root?.add?.(ret); } catch {}

  const ray = new THREE.Raycaster();

  function deadzone(v, dz = 0.15) {
    const a = Math.abs(v);
    if (a < dz) return 0;
    const s = (a - dz) / (1 - dz);
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

    const v = new THREE.Vector3()
      .addScaledVector(fwd, moveY)
      .addScaledVector(rightV, moveX)
      .multiplyScalar(state.moveSpeed * dt);

    rig.position.add(v);
  }

  return {
    toggleTeleport,
    tick() {
      const dt = 1 / 72;

      const session = renderer.xr.getSession?.();
      const android = Scarlett.ANDROID_INPUT || { moveX: 0, moveY: 0, turnX: 0 };

      if (!session) {
        // Android/2D
        if (!state.teleportMode) {
          applyMoveTurn(android.moveX || 0, android.moveY || 0, android.turnX || 0, dt);
          ret.visible = false;
        } else {
          ray.setFromCamera({ x: 0, y: 0 }, camera);
          const hits = ray.intersectObjects(world.floorMeshes || [], true);
          if (hits.length) { ret.visible = true; ret.position.copy(hits[0].point); } else ret.visible = false;
        }
        return;
      }

      // XR
      const { left, right } = getPads();
      const la = left?.axes || [];
      const ra = right?.axes || [];
      const rb = right?.buttons || [];

      const btnB = !!rb[4]?.pressed;
      const rGrip = !!rb[1]?.pressed;

      if (btnB && !state._lastB) toggleTeleport();
      state._lastB = btnB;

      if (!state.teleportMode) {
        const mx = deadzone(ra.length >= 4 ? ra[2] : (ra[0] || 0));
        const my = deadzone(ra.length >= 4 ? ra[3] : (ra[1] || 0));
        const tx = deadzone(la[0] || 0);

        state.snapCooldown = Math.max(0, state.snapCooldown - dt);
        applyMoveTurn(mx, -my, 0, dt);

        if (state.snapCooldown === 0 && Math.abs(tx) > 0.85) {
          rig.rotation.y -= Math.sign(tx) * state.snapAngle;
          state.snapCooldown = 0.22;
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
        } else ret.visible = false;
        state._lastGrip = rGrip;
      }
    }
  };
    }
