// /js/scarlett1/index.js — Scarlett1 MASTER GLUE ROUTER (FULL)
// BUILD: SCARLETT1_MASTER_GLUE_ROUTER_v3
//
// ✅ Adds legacy API shim: ctx.app + Scarlett.app with room/ui/debug/avatars
// ✅ Fixes module crashes: "reading room/ui/debug/avatars"
// ✅ Keeps everything else the same

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_MASTER_GLUE_ROUTER_v3";
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

  // World
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") throw new Error("world.js missing createWorld()");
  const world = await worldMod.createWorld({ THREE, scene, renderer, camera, rig, Scarlett, diag: push, BASE });
  push?.(`[scarlett1] world ready ✅`);

  // ---------- ✅ LEGACY API SHIM ----------
  // Many of your modules were written to expect:
  //   app.room, app.ui, app.debug, app.avatars, etc.
  // We'll provide that without rewriting the modules.
  const legacyApp = {
    // "room" in old code usually meant "the main scene/world container"
    room: world,                 // includes root, anchors, floorMeshes, etc.
    scene, renderer, camera, rig,

    // UI contract
    ui: world.ui || {},

    // debug contract
    debug: {
      log: (...a) => push?.(`[debug] ${a.join(" ")}`),
      warn: (...a) => push?.(`[warn] ${a.join(" ")}`),
      error: (...a) => push?.(`[err] ${a.join(" ")}`),
      enabled: true,
    },

    // avatars contract (modules that read app.avatars.*)
    avatars: {
      enabled: true,
      list: [],
      local: null,
    },

    // helpers/modules can store references safely here
    services: {},
    state: {},
  };

  // Publish shim where modules usually look
  Scarlett.app = legacyApp;
  globalThis.SCARLETT_APP = legacyApp;

  // ---------- Context bus ----------
  const ctx = {
    THREE, scene, renderer, camera, rig, world, Scarlett, controllers,
    diag: push, BASE, V,
    bus: makeBus(push),
    // ✅ compat alias
    app: legacyApp,
    room: legacyApp.room,
    ui: legacyApp.ui,
    debug: legacyApp.debug,
    avatars: legacyApp.avatars,
  };
  globalThis.SCARLETT_CTX = ctx;
  globalThis.SCARLETT_REGISTRY = globalThis.SCARLETT_REGISTRY || [];

  // UI bridge
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => globalThis.SCARLETT_MODULES?.toggle?.();
  Scarlett.UI.toggleTeleport = () => Scarlett.__controls?.toggleTeleport?.();

  installModulePanel({ Scarlett, push });

  // Always-on fallback locomotion + teleport
  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push });
  Scarlett.__controls = fallback;

  // Modules
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

  renderer.xr.addEventListener("sessionstart", () => push?.(`[xr] sessionstart ✅`));
  renderer.xr.addEventListener("sessionend", () => push?.(`[xr] sessionend ✅`));

  renderer.setAnimationLoop((t) => {
    for (const m of liveModules) m.inst?.tick?.(t);
    fallback.tick(t);
    world?.tick?.(t);

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

    // locomotion_xr.js
    if (typeof m.createLocomotionModule === "function") {
      push?.(`[mod] ${name} entry=createLocomotionModule() starting…`);
      const inst = await m.createLocomotionModule(ctx);
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    // gestureControl.js
    if (typeof m.GestureControl === "function") {
      push?.(`[mod] ${name} entry=GestureControl starting…`);
      let inst = null;
      try { inst = new m.GestureControl(ctx); }
      catch { inst = await m.GestureControl(ctx); }
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    // audioLogic.js
    if (typeof m.PokerAudio === "function") {
      push?.(`[mod] ${name} entry=PokerAudio starting…`);
      let inst = null;
      try { inst = new m.PokerAudio(ctx); }
      catch { inst = await m.PokerAudio(ctx); }
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    // direct named starters
    const direct =
      (typeof m.enable === "function" && { fn: m.enable, label: "enable" }) ||
      (typeof m.init === "function" && { fn: m.init, label: "init" }) ||
      (typeof m.boot === "function" && { fn: m.boot, label: "boot" }) ||
      (typeof m.start === "function" && { fn: m.start, label: "start" }) ||
      (typeof m.setup === "function" && { fn: m.setup, label: "setup" }) ||
      (typeof m.mount === "function" && { fn: m.mount, label: "mount" }) ||
      (typeof m.create === "function" && { fn: m.create, label: "create" }) ||
      null;

    if (direct) {
      push?.(`[mod] ${name} entry=${direct.label}() starting…`);
      const inst = await direct.fn(ctx);
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    // default export glue
    const d = m.default;

    if (typeof d === "function") {
      push?.(`[mod] ${name} entry=default(function) starting…`);
      let inst = null;
      try { inst = new d(ctx); }
      catch { inst = await d(ctx); }
      push?.(`[mod] ${name} started ✅`);
      return { name, inst: inst || m };
    }

    if (d && typeof d === "object") {
      const objEntry =
        (typeof d.enable === "function" && { fn: d.enable.bind(d), label: "default.enable" }) ||
        (typeof d.init === "function" && { fn: d.init.bind(d), label: "default.init" }) ||
        (typeof d.boot === "function" && { fn: d.boot.bind(d), label: "default.boot" }) ||
        (typeof d.start === "function" && { fn: d.start.bind(d), label: "default.start" }) ||
        (typeof d.setup === "function" && { fn: d.setup.bind(d), label: "default.setup" }) ||
        (typeof d.mount === "function" && { fn: d.mount.bind(d), label: "default.mount" }) ||
        (typeof d.create === "function" && { fn: d.create.bind(d), label: "default.create" }) ||
        (typeof d.register === "function" && { fn: d.register.bind(d), label: "default.register" }) ||
        null;

      if (objEntry) {
        push?.(`[mod] ${name} entry=${objEntry.label}() starting…`);
        const inst = await objEntry.fn(ctx);
        push?.(`[mod] ${name} started ✅`);
        return { name, inst: inst || d };
      }

      push?.(`[mod] ${name} default is object (no lifecycle) — keeping reference ✅`);
      return { name, inst: d };
    }

    push?.(`[mod] ${name} loaded (side-effect/no entry) ✅`);
    return { name, inst: m };

  } catch (e) {
    push?.(`[mod] ${name} FAILED ❌ ${String(e?.message || e)}`);
    return null;
  }
}

// -------------------- Bus --------------------
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

// -------------------- Module Panel --------------------
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

// -------------------- Fallback Controls --------------------
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
