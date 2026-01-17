// /js/scarlett1/index.js — Scarlett1 Router (FULL RESTORE)
// Responsibilities:
// - import Three + XRButton safely via URL modules
// - create renderer/scene/camera
// - load /js/scarlett1/world.js
// - load modules from /js/modules/ (safe order, won't crash if missing)
// - restore XR + Android controls and toggles

export async function boot({ Scarlett, BASE, V }) {
  const BUILD = "SCARLETT1_ROUTER_RESTORE_v1";
  const NOW = () => new Date().toISOString().slice(11, 19);
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.router = BUILD;

  push?.(`[scarlett1] build=${BUILD}`);

  // --- Imports (NO bare specifiers) ---
  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const VRBTN_URL = "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

  let THREE, VRButton;
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

  // --- Renderer / Scene / Camera ---
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
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.Fog(0x050508, 10, 70);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.65, 3.2);

  // Player rig (move this, not the XR camera directly)
  const rig = new THREE.Group();
  rig.name = "playerRig";
  rig.add(camera);
  scene.add(rig);

  // Lights (stable)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.8);
  d.position.set(6, 10, 4);
  scene.add(d);

  // Resize
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // --- Load World (Scarlett1 world) ---
  const worldUrl = `${BASE}js/scarlett1/world.js?v=${encodeURIComponent(V)}`;
  push?.(`[scarlett1] importing world ${worldUrl}`);
  const worldMod = await import(worldUrl);
  if (typeof worldMod.createWorld !== "function") {
    throw new Error("world.js missing createWorld()");
  }

  const world = await worldMod.createWorld({
    THREE, scene, renderer, camera, rig, Scarlett,
    diag: (msg) => push?.(msg),
    BASE
  });
  push?.(`[scarlett1] world ready ✅`);

  // --- UI bridge for Android buttons ---
  Scarlett.UI = Scarlett.UI || {};
  Scarlett.UI.toggleHud = () => world?.ui?.toggleHud?.();
  Scarlett.UI.toggleModules = () => world?.ui?.toggleModules?.();
  Scarlett.UI.toggleTeleport = () => world?.ui?.toggleTeleport?.();

  // --- Load Modules (safe, ordered, non-fatal) ---
  // Put your real module filenames here. If you’re not sure: leave as-is; missing modules won’t crash.
  const moduleList = [
    // core input + hud
    ["input", `${BASE}js/modules/input.js?v=${encodeURIComponent(V)}`],
    ["hud", `${BASE}js/modules/hud.js?v=${encodeURIComponent(V)}`],
    ["teleport", `${BASE}js/modules/teleport.js?v=${encodeURIComponent(V)}`],
    // gameplay
    ["poker", `${BASE}js/modules/poker.js?v=${encodeURIComponent(V)}`],
    ["chips", `${BASE}js/modules/chips.js?v=${encodeURIComponent(V)}`],
    ["cards", `${BASE}js/modules/cards.js?v=${encodeURIComponent(V)}`],
    // extras
    ["avatars", `${BASE}js/modules/avatars.js?v=${encodeURIComponent(V)}`],
    ["store", `${BASE}js/modules/store.js?v=${encodeURIComponent(V)}`],
  ];

  const modules = [];
  async function safeImport(name, url) {
    try {
      push?.(`[mod] import ${name}…`);
      const m = await import(url);
      push?.(`[mod] ${name} ✅`);
      return m;
    } catch (e) {
      push?.(`[mod] ${name} ❌ ${String(e?.message || e)}`);
      return null;
    }
  }

  for (const [name, url] of moduleList) {
    const m = await safeImport(name, url);
    if (m && typeof m.enable === "function") {
      try {
        const inst = await m.enable({ THREE, scene, renderer, camera, rig, world, Scarlett });
        modules.push({ name, inst });
        push?.(`[mod] enabled ${name} ✅`);
      } catch (e) {
        push?.(`[mod] enable fail ${name} ❌ ${String(e?.message || e)}`);
      }
    }
  }

  // --- Minimal built-in controller/Android fallback (so controls still work even if module missing) ---
  const fallback = createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push });
  modules.push({ name: "__fallbackControls", inst: fallback });

  // XR session logs
  renderer.xr.addEventListener("sessionstart", () => push?.(`[xr] sessionstart ✅`));
  renderer.xr.addEventListener("sessionend", () => push?.(`[xr] sessionend ✅`));

  // Main loop
  renderer.setAnimationLoop((t) => {
    for (const m of modules) m.inst?.tick?.(t);
    world?.tick?.(t);
    renderer.render(scene, camera);
  });

  push?.(`[scarlett1] started ✅`);
}

// --- Fallback controls (does not overload, but keeps you playable) ---
function createFallbackControls({ THREE, renderer, camera, rig, world, Scarlett, push }) {
  const state = {
    teleportMode: false,
    snapCooldown: 0,
    moveSpeed: 2.2,
    snapAngle: Math.PI / 4,
  };

  // Simple “toggle” API for Android HUD
  world.ui = world.ui || {};
  world.ui.toggleTeleport = () => { state.teleportMode = !state.teleportMode; push?.(`[move] teleport=${state.teleportMode}`); };
  world.ui.toggleHud = () => { world.ui.setHudVisible?.(!(world.ui._hudVisible = !world.ui._hudVisible)); };
  world.ui.toggleModules = () => { Scarlett?.MODULES?.toggle?.(); };

  // Teleport reticle
  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0x44ff77, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  renderer.scene?.add?.(ret);

  const ray = new THREE.Raycaster();
  const hit = new THREE.Vector3();

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

  return {
    tick(t) {
      const dt = 1 / 72;

      // Desktop/Android non-XR touch fallback: nothing heavy here.
      // XR pads:
      const { left, right } = getPads();
      const la = left?.axes || [];
      const ra = right?.axes || [];
      const lb = left?.buttons || [];
      const rb = right?.buttons || [];

      // Mapping (best-effort):
      const btnY = !!lb[4]?.pressed;
      const btnX = !!lb[3]?.pressed;
      const btnB = !!rb[4]?.pressed;

      // Y toggles DIAG (restored)
      if (btnY && !state._lastY) {
        globalThis.SCARLETT_DIAG?.toggle?.();
      }
      state._lastY = btnY;

      // X toggles HUD
      if (btnX && !state._lastX) {
        world.ui?.toggleHud?.();
      }
      state._lastX = btnX;

      // B toggles teleport mode
      if (btnB && !state._lastB) {
        state.teleportMode = !state.teleportMode;
        push?.(`[move] teleport=${state.teleportMode}`);
      }
      state._lastB = btnB;

      // Smooth move: right stick (or whatever exists)
      const mx = deadzone(ra.length >= 4 ? ra[2] : ra[0] || 0);
      const my = deadzone(ra.length >= 4 ? ra[3] : ra[1] || 0);

      // Snap turn: left stick X
      const tx = deadzone(la[0] || 0);

      state.snapCooldown = Math.max(0, state.snapCooldown - dt);

      if (!state.teleportMode) {
        // Move in camera yaw on XZ
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
        // Teleport ray from camera center to floor meshes
        ray.setFromCamera({ x: 0, y: 0 }, camera);
        const hits = ray.intersectObjects(world.floorMeshes || [], true);
        if (hits.length) {
          ret.visible = true;
          ret.position.copy(hits[0].point);
          // Confirm teleport on right grip
          const grip = !!rb[1]?.pressed;
          if (grip && !state._lastGrip) {
            rig.position.set(hits[0].point.x, rig.position.y, hits[0].point.z);
            state.teleportMode = false;
            ret.visible = false;
            push?.(`[move] teleported ✅`);
          }
          state._lastGrip = grip;
        } else {
          ret.visible = false;
        }
      }
    }
  };
    }
