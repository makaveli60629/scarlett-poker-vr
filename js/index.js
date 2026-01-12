// /js/index.js — Scarlett Poker VR MASTER ENTRY (HARDENED)
// ✅ Never stalls after import
// ✅ Safe-loads your /js/three.js wrapper
// ✅ VRButton always appended
// ✅ Passes THREE into World (no globals)
// ✅ Fail-safe audio listener + optional modules

const VERSION = Date.now();

console.log("[index] file evaluated ✅", "v=" + VERSION);

const S = {
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  clock: null,
  player: null,
  controllers: [],
  hands: [],
  base: "",
  sounds: null,
  raf: 0,
};

function getBasePath() {
  // Works for github pages subfolder deployments
  // e.g. /scarlett-poker-vr/
  const p = location.pathname;
  if (p.endsWith("/")) return p;
  return p.substring(0, p.lastIndexOf("/") + 1);
}

function domReady(fn) {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", fn, { once: true });
  } else fn();
}

// ---------- SAFE IMPORT HELPERS ----------
async function safeImport(path) {
  try {
    const m = await import(path + (path.includes("?") ? "" : `?v=${VERSION}`));
    return m;
  } catch (e) {
    console.warn("[index] import failed:", path, e);
    return null;
  }
}

function pickExport(mod, keys = []) {
  if (!mod) return null;
  for (const k of keys) if (mod[k]) return mod[k];
  if (mod.default) return mod.default;
  return mod;
}

function ensureOverlayRoot() {
  // boot.js typically makes a HUD/log overlay; we won’t fight it.
  // But we ensure body is usable.
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
}

// ---------- MAIN BOOT ----------
async function boot() {
  try {
    console.log("[index] boot() start…");

    ensureOverlayRoot();

    S.base = getBasePath();
    console.log("[index] base=", S.base);

    // 1) Load THREE wrapper (your repo has /js/three.js)
    const threeMod = await safeImport("./three.js");
    const THREE = pickExport(threeMod, ["THREE"]);
    if (!THREE) throw new Error("THREE wrapper missing (./three.js did not export THREE/default)");
    S.THREE = THREE;

    // 2) Clock safe
    // Some wrappers may not include Clock; we polyfill a tiny clock if missing.
    if (typeof S.THREE.Clock !== "function") {
      console.warn("[index] THREE.Clock missing -> polyfill");
      S.THREE.Clock = class {
        constructor() {
          this._last = performance.now();
          this.elapsedTime = 0;
        }
        getDelta() {
          const now = performance.now();
          const d = (now - this._last) / 1000;
          this._last = now;
          this.elapsedTime += d;
          return d;
        }
      };
    }
    S.clock = new S.THREE.Clock();
    console.log("[index] Clock ✅");

    // 3) Scene + Camera + Renderer
    S.scene = new S.THREE.Scene();
    S.scene.fog = new S.THREE.Fog(0x05060a, 8, 70);

    S.camera = new S.THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      200
    );
    S.camera.position.set(0, 1.65, 6);

    S.renderer = new S.THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    S.renderer.outputColorSpace = S.THREE.SRGBColorSpace || undefined;
    S.renderer.xr.enabled = true;

    document.body.appendChild(S.renderer.domElement);

    window.addEventListener("resize", () => {
      S.camera.aspect = window.innerWidth / window.innerHeight;
      S.camera.updateProjectionMatrix();
      S.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 4) Player rig (minimal)
    S.player = new S.THREE.Group();
    S.player.name = "PlayerRig";
    S.player.position.set(0, 0, 0);
    S.player.add(S.camera);
    S.scene.add(S.player);

    // 5) AudioListener (fail safe; ok if no sounds)
    try {
      const listener = new S.THREE.AudioListener();
      S.camera.add(listener);
      S.sounds = { listener };
      console.log("[index] AudioListener ✅");
    } catch (e) {
      console.warn("[index] AudioListener failed (ok):", e);
      S.sounds = null;
    }

    // 6) VRButton
    const vrMod = await safeImport("./VRButton.js");
    const VRButton = pickExport(vrMod, ["VRButton"]);
    if (VRButton?.createButton) {
      const btn = VRButton.createButton(S.renderer);
      btn.style.position = "absolute";
      btn.style.left = "50%";
      btn.style.transform = "translateX(-50%)";
      btn.style.bottom = "18px";
      btn.style.zIndex = "99999";
      document.body.appendChild(btn);
      console.log("[index] VRButton appended ✅");
    } else {
      console.warn("[index] VRButton missing createButton (ok, continuing)");
    }

    // 7) Controllers (basic)
    setupControllers();

    // 8) Load world
    const worldMod = await safeImport("./world.js");
    const World = pickExport(worldMod, ["World"]);
    if (!World?.init) throw new Error("World.init missing in world.js");

    console.log("[index] world.init() …");
    await World.init({
      THREE: S.THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      sounds: S.sounds,
      log: (...a) => console.log("[world]", ...a),
      BASE: S.base,
    });

    console.log("[index] world init ✅");

    // 9) Loop
    S.renderer.setAnimationLoop(tick);

    console.log("[index] ready ✅");
  } catch (err) {
    console.error("[index] init FAILED ❌", err);
  }
}

function setupControllers() {
  const THREE = S.THREE;

  // WebXR controllers
  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = "controller_" + i;
    S.player.add(c);
    S.controllers.push(c);
  }

  // Controller rays (laser is attached to each controller, NOT world center)
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  for (const c of S.controllers) {
    const line = new THREE.Line(rayGeo, rayMat);
    line.name = "LaserRay";
    line.scale.z = 8;
    c.add(line);
  }

  console.log("[index] controllers ready ✅", S.controllers.length);
}

function tick() {
  const dt = S.clock ? S.clock.getDelta() : 0.016;

  // Keep player standing in lobby (never forced crouch)
  // (If you later implement seating, you can override height there.)
  if (S.camera && S.camera.position.y < 1.2) S.camera.position.y = 1.65;

  // world update
  if (S.scene?.userData?.WORLD_UPDATE) {
    try {
      S.scene.userData.WORLD_UPDATE(dt);
    } catch (e) {
      console.warn("[index] WORLD_UPDATE error (non-fatal):", e);
    }
  }

  S.renderer.render(S.scene, S.camera);
}

// ---------- HARD START (never stalls) ----------
domReady(() => {
  console.log("[index] DOM ready → boot()");
  boot();
});
