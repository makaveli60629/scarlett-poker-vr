// /js/index.js — Scarlett Poker VR MASTER ENTRY (HARDENED, WRAPPER-AUTHORITATIVE)
// ✅ Uses ./three.js as the only THREE + VRButton source
// ✅ ENTER VR button always appended
// ✅ Passes THREE into world.js (no globals)
// ✅ No "Clock is not a constructor" issues (polyfills if ever missing)

const VERSION = Date.now();
console.log("[index] runtime start ✅ v=" + VERSION);

const S = {
  THREE: null,
  VRButton: null,
  renderer: null,
  scene: null,
  camera: null,
  clock: null,
  player: null,
  controllers: [],
  base: "",
};

function getBasePath() {
  const p = location.pathname;
  if (p.endsWith("/")) return p;
  return p.substring(0, p.lastIndexOf("/") + 1);
}

function domReady(fn) {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", fn, { once: true });
  } else fn();
}

function ensureBody() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
}

async function boot() {
  try {
    ensureBody();

    S.base = getBasePath();
    console.log("[index] base=", S.base);

    // ✅ AUTHORITATIVE THREE WRAPPER
    const wrapper = await import(`./three.js?v=${VERSION}`);
    S.THREE = wrapper.THREE;
    S.VRButton = wrapper.VRButton;

    if (!S.THREE) throw new Error("THREE missing from ./three.js export");
    if (!S.VRButton) console.warn("[index] VRButton missing from ./three.js export (unexpected)");

    // Clock safety (should exist in real THREE, but we guard anyway)
    if (typeof S.THREE.Clock !== "function") {
      console.warn("[index] THREE.Clock missing -> polyfill");
      S.THREE.Clock = class {
        constructor() { this._last = performance.now(); this.elapsedTime = 0; }
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

    // Scene / Camera / Renderer
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
    S.renderer.xr.enabled = true;

    document.body.appendChild(S.renderer.domElement);

    window.addEventListener("resize", () => {
      S.camera.aspect = window.innerWidth / window.innerHeight;
      S.camera.updateProjectionMatrix();
      S.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Player rig
    S.player = new S.THREE.Group();
    S.player.name = "PlayerRig";
    S.player.add(S.camera);
    S.scene.add(S.player);

    // ✅ ENTER VR BUTTON (from wrapper)
    if (S.VRButton?.createButton) {
      const btn = S.VRButton.createButton(S.renderer);
      btn.style.position = "absolute";
      btn.style.left = "50%";
      btn.style.transform = "translateX(-50%)";
      btn.style.bottom = "18px";
      btn.style.zIndex = "99999";
      document.body.appendChild(btn);
      console.log("[index] VRButton appended ✅");
    } else {
      console.warn("[index] VRButton.createButton missing (unexpected)");
    }

    // Controllers + rays
    setupControllers();

    // World
    const worldMod = await import(`./world.js?v=${VERSION}`);
    const World = worldMod.World || worldMod.default || worldMod;

    if (!World?.init) throw new Error("World.init missing in world.js");

    console.log("[index] calling world.init() …");
    await World.init({
      THREE: S.THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      log: (...a) => console.log("[world]", ...a),
      BASE: S.base,
    });

    console.log("[index] world init ✅");

    // Loop
    S.renderer.setAnimationLoop(tick);
    console.log("[index] ready ✅");
  } catch (err) {
    console.error("[index] init FAILED ❌", err);
  }
}

function setupControllers() {
  const THREE = S.THREE;

  S.controllers.length = 0;

  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.name = "controller_" + i;
    S.player.add(c);
    S.controllers.push(c);
  }

  // Laser lines attached to controllers only
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

  // keep standing height in lobby
  if (S.camera && S.camera.position.y < 1.2) S.camera.position.y = 1.65;

  // world update hook
  const upd = S.scene?.userData?.WORLD_UPDATE;
  if (typeof upd === "function") {
    try { upd(dt); } catch (e) { console.warn("[index] WORLD_UPDATE error:", e); }
  }

  S.renderer.render(S.scene, S.camera);
}

domReady(() => boot());
