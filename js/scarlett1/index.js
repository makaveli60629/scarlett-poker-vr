// /js/scarlett1/index.js
// BUILD: SCARLETT1_MASTER_GLUE_ROUTER_v5_APPROOM
//
// ✅ Keeps Android sticks + finger-look
// ✅ Fixes failing modules by providing ctx.app.room / ctx.app.ui / ctx.app.debug / ctx.app.avatars
// ✅ Safe mode ?safe=1
// ✅ Stable even if modules throw

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_MASTER_GLUE_ROUTER_v5_APPROOM";
  const NOW = () => new Date().toISOString().slice(11, 19);
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  const Q = new URLSearchParams(location.search);
  const SAFE_MODE = Q.get("safe") === "1";

  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.router = BUILD;

  push?.(`[scarlett1] build=${BUILD}`);
  push?.(`[scarlett1] safeMode=${SAFE_MODE}`);

  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const VRBTN_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

  const THREE = await import(THREE_URL);
  push?.(`[scarlett1] three ✅ r${THREE.REVISION}`);
  const { VRButton } = await import(VRBTN_URL);
  push?.(`[scarlett1] VRButton ✅`);

  const appEl = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  appEl.appendChild(renderer.domElement);

  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "10px";
  vrBtn.style.bottom = "60px";
  vrBtn.style.zIndex = "99999";
  document.body.appendChild(vrBtn);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a10);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 260);
  camera.position.set(0, 1.65, 0);

  const rig = new THREE.Group();
  rig.name = "playerRig";
  rig.add(camera);
  scene.add(rig);

  // baseline lights (world adds more)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
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

  // World
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") throw new Error("world.js missing createWorld()");
  const world = await worldMod.createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag: push, BASE });
  push?.(`[scarlett1] world ready ✅`);

  // ✅ Legacy APP shim — IMPORTANT: modules are reading ctx.app.room (not ctx.room)
  const legacyApp = {
    room: world,
    ui: world.ui || {},
    debug: {
      log: (...a) => push?.(`[debug] ${a.join(" ")}`),
      warn: (...a) => push?.(`[warn] ${a.join(" ")}`),
      error: (...a) => push?.(`[err] ${a.join(" ")}`),
      enabled: true,
    },
    avatars: { enabled: true, list: [], local: null },
    services: {},
    state: {},
    scene, renderer, camera, rig,
  };
  Scarlett.app = legacyApp;
  globalThis.SCARLETT_APP = legacyApp;

  const ctx = {
    THREE, scene, renderer, camera, rig, world, Scarlett, controllers,
    diag: push, BASE, V,
    bus: makeBus(push),

    // compat
    app: legacyApp,
    room: world,
    ui: legacyApp.ui,
    debug: legacyApp.debug,
    avatars: legacyApp.avatars,
  };
  globalThis.SCARLETT_CTX = ctx;
  globalThis.SCARLETT_REGISTRY = globalThis.SCARLETT_REGISTRY || [];

  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES?.toggle?.();
  Scarlett.UI.toggleTeleport = () => Scarlett.__controls?.toggleTeleport?.();

  installModulePanel({ Scarlett, push });

  const touchLook = createTouchLook({ renderer, rig, camera });

  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push, touchLook });
  Scarlett.__controls = fallback;

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
      const started = await safeLoadAndStartModule({ name, url, ctx, push });
      if (started) liveModules.push(started);
    }
    for (const item of (globalThis.SCARLETT_REGISTRY || [])) {
      liveModules.push({ name: item.name || "registry", inst: item });
    }
  } else {
    push?.(`[mod] SAFE MODE: skipping module start calls`);
  }

  renderer.setAnimationLoop((t) => {
    for (const m of liveModules) m.inst?.tick?.(t);
    touchLook.tick();
    fallback.tick(t);
    world?.tick?.(t);
    renderer.render(scene, camera);
  });

  push?.(`[scarlett1] started ✅`);
}

async function safeLoadAndStartModule({ name, url, ctx, push }) {
  try {
    push?.(`[mod] import ${name} → ${url}`);
    const m = await import(url);
    const keys = Object.keys(m || {});
    push?.(`[mod] ${name} exports: ${keys.length ? keys.join(", ") : "(none)"}`);

    if (typeof m.createLocomotionModule === "function") {
      push?.(`[mod] ${name} entry=createLocomotionModule() starting…`);
      const inst = await m.createLocomotionModule(ctx);
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    const d = m.default;

    if (d && typeof d === "object") {
      const objEntry =
        (typeof d.init === "function" && { fn: d.init.bind(d), label: "default.init" }) ||
        (typeof d.start === "function" && { fn: d.start.bind(d), label: "default.start" }) ||
        (typeof d.setup === "function" && { fn: d.setup.bind(d), label: "default.setup" }) ||
        (typeof d.mount === "function" && { fn: d.mount.bind(d), label: "default.mount" }) ||
        (typeof d.enable === "function" && { fn: d.enable.bind(d), label: "default.enable" }) ||
        (typeof d.register === "function" && { fn: d.register.bind(d), label: "default.register" }) ||
        null;

      if (objEntry) {
        push?.(`[mod] ${name} entry=${objEntry.label}() starting…`);
        const inst = await objEntry.fn(ctx);
        push?.(`[mod] ${name} started ✅`);
        return { name, inst: inst || d };
      }
      return { name, inst: d };
    }

    return { name, inst: m };
  } catch (e) {
    push?.(`[mod] ${name} FAILED ❌ ${String(e?.message || e)}`);
    return null;
  }
}

function createTouchLook({ renderer, rig, camera }) {
  const el = renderer.domElement;
  const st = {
    active: false, lastX: 0, lastY: 0,
    yaw: rig.rotation.y || 0,
    pitch: camera.rotation.x || 0,
    yawSpeed: 0.0032,
    pitchSpeed: 0.0026,
    pitchMin: -0.95,
    pitchMax: 0.95,
    twoFingerTurnOnly: false,
  };

  function down(e) {
    if (renderer.xr.getSession?.()) return;
    st.active = true;
    st.twoFingerTurnOnly = (e.touches && e.touches.length >= 2);
    const p = e.touches ? e.touches[0] : e;
    st.lastX = p.clientX; st.lastY = p.clientY;
  }

  function move(e) {
    if (!st.active) return;
    if (renderer.xr.getSession?.()) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - st.lastX;
    const dy = p.clientY - st.lastY;
    st.lastX = p.clientX; st.lastY = p.clientY;
    st.yaw -= dx * st.yawSpeed;
    if (!st.twoFingerTurnOnly) {
      st.pitch -= dy * st.pitchSpeed;
      st.pitch = Math.max(st.pitchMin, Math.min(st.pitchMax, st.pitch));
    }
    e.preventDefault?.();
  }

  function up() { st.active = false; st.twoFingerTurnOnly = false; }

  el.addEventListener("pointerdown", down, { passive: true });
  el.addEventListener("pointermove", move, { passive: false });
  el.addEventListener("pointerup", up, { passive: true });
  el.addEventListener("pointercancel", up, { passive: true });

  el.addEventListener("touchstart", down, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", up, { passive: true });
  el.addEventListener("touchcancel", up, { passive: true });

  return {
    tick() {
      if (renderer.xr.getSession?.()) return;
      rig.rotation.y = st.yaw;
      camera.rotation.x = st.pitch;
    }
  };
}

function createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push }) {
  const state = {
    teleportMode: false,
    moveSpeed: 2.85,
    turnSpeed: 2.2,
  };

  function deadzone(v, dz = 0.15) {
    const a = Math.abs(v);
    if (a < dz) return 0;
    const s = (a - dz) / (1 - dz);
    return Math.sign(v) * Math.max(0, Math.min(1, s));
  }

  function applyMove(moveX, moveY, dt) {
    const yawQ = new THREE.Quaternion();
    camera.getWorldQuaternion(yawQ);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yawQ);
    fwd.y = 0; fwd.normalize();
    const rightV = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQ);
    rightV.y = 0; rightV.normalize();

    rig.position.add(
      new THREE.Vector3()
        .addScaledVector(fwd, moveY)   // ✅ Up forward
        .addScaledVector(rightV, moveX)
        .multiplyScalar(state.moveSpeed * dt)
    );
  }

  return {
    toggleTeleport() {
      state.teleportMode = !state.teleportMode;
      push?.(`[move] teleport=${state.teleportMode}`);
    },
    tick() {
      const dt = 1 / 72;
      if (renderer.xr.getSession?.()) return; // XR locomotion module handles in VR

      const a = Scarlett.ANDROID_INPUT || { moveX: 0, moveY: 0, turnX: 0 };
      const mx = deadzone(a.moveX || 0);
      const my = deadzone(a.moveY || 0);
      const tx = deadzone(a.turnX || 0);

      applyMove(mx, my, dt);
      if (tx) rig.rotation.y -= tx * state.turnSpeed * dt;
    }
  };
}

function makeBus() {
  const map = new Map();
  return {
    on(ev, fn) { if (!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return () => map.get(ev)?.delete(fn); },
    emit(ev, payload) { (map.get(ev) || []).forEach((fn) => { try { fn(payload); } catch {} }); }
  };
}

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
    <div style="opacity:0.8;">Recovery: add <b>?safe=1</b> to boot without modules.</div>
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
