// /js/main.js — Scarlett Poker VR — Update 9.0 (GitHub Pages + Oculus SAFE)
// What this does:
// - Robust boot logger (never hard-crashes on missing modules)
// - CDN Three.js + VRButton
// - Adds visible controllers (hands) + laser pointers
// - Loads your world + controls + ui + poker + audio + lights + xr fixes
// - Skips optional modules safely (no more dead site)

// CDN Three (do NOT use `import from "three"` on GitHub Pages)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

// ---------- Overlay logger ----------
const overlay = document.getElementById("overlay");
const btn = document.getElementById("btn");

function nowStamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}
function line(msg, ok = true) {
  if (!overlay) return;
  overlay.textContent += `\n${ok ? "✅" : "⚠️"} ${nowStamp()} ${msg}`;
}
function fail(msg) {
  if (!overlay) return;
  overlay.textContent += `\n❌ ${nowStamp()} ${msg}`;
  if (btn) btn.style.display = "block";
}

if (btn) {
  btn.onclick = () => {
    const v = Date.now();
    location.href = location.pathname + `?v=${v}`;
  };
}

overlay && (overlay.textContent = "Scarlett Poker VR — loading...\n");

// ---------- Safe module loader ----------
async function safeImport(path) {
  try {
    const mod = await import(path);
    line(`Loaded ${path}`);
    return mod;
  } catch (e) {
    line(`Skipped ${path} (${String(e?.message || e)})`, false);
    return null;
  }
}

// ---------- App ----------
const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  rig: null,

  // modules
  World: null,
  Controls: null,
  UI: null,
  PokerSimulation: null,
  Audio: null,
  LightsPack: null,
  XRRigFix: null,
  XRLocomotion: null,
  VIPRoom: null,

  // world return bundle
  worldBundle: null,

  // controllers
  controllerGrip0: null,
  controllerGrip1: null,
  controller0: null,
  controller1: null,
  ray0: null,
  ray1: null,

  async init() {
    try {
      this.clock = new THREE.Clock();

      // renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.xr.enabled = true;

      document.body.appendChild(this.renderer.domElement);
      document.body.appendChild(VRButton.createButton(this.renderer));
      line("Renderer + VRButton ready");

      // scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x05060a);
      this.scene.fog = new THREE.Fog(0x05060a, 2, 80);

      // rig (player root)
      this.rig = new THREE.Group();
      this.scene.add(this.rig);

      // camera
      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
      this.camera.position.set(0, 1.65, 4);
      this.rig.add(this.camera);

      // base lighting (bright enough to never be “black room”)
      this.addBaseLighting();
      line("Lighting added (bright mode)");

      // floor fallback (world.js will replace/extend)
      this.addFallbackFloor();

      // load core modules (these should exist)
      this.World = (await safeImport("./world.js"))?.World || null;
      this.Controls = (await safeImport("./controls.js"))?.Controls || null;
      this.UI = (await safeImport("./ui.js"))?.UI || null;
      this.PokerSimulation = (await safeImport("./poker_simulation.js"))?.PokerSimulation || null;
      this.Audio = (await safeImport("./audio.js"))?.Audio || null;
      this.LightsPack = (await safeImport("./lights_pack.js"))?.LightsPack || null;
      this.XRRigFix = (await safeImport("./xr_rig_fix.js"))?.XRRigFix || null;
      this.XRLocomotion = (await safeImport("./xr_locomotion.js"))?.XRLocomotion || null;

      // optional modules (safe)
      // NOTE: we intentionally DO NOT import vr_locomotion.js (your 404 offender)
      this.VIPRoom = (await safeImport("./vip_room.js"))?.VIPRoom || null;
      await safeImport("./watch_ui.js");      // may still skip until we fix its imports
      await safeImport("./store_kiosk.js");   // may still skip until file/path exists
      await safeImport("./store.js");         // may still skip until state export fixed
      await safeImport("./tournament.js");    // may still skip until state export fixed

      // build world
      if (this.World?.build) {
        this.worldBundle = this.World.build(this.scene, this.rig) || null;
        line("World built");
      } else {
        line("World.build missing (world.js not loaded?)", false);
      }

      // add controllers/hands + laser pointers
      this.setupControllers();
      line("Controllers + lasers ready");

      // XR rig fix (optional)
      try {
        this.XRRigFix?.apply?.({ renderer: this.renderer, rig: this.rig, camera: this.camera });
        line("XR rig fix applied");
      } catch (e) {
        line(`XR rig fix skipped (${String(e?.message || e)})`, false);
      }

      // lights pack (optional)
      try {
        this.LightsPack?.build?.(this.scene);
        line("LightsPack built");
      } catch (e) {
        line(`LightsPack skipped (${String(e?.message || e)})`, false);
      }

      // vip room (optional)
      try {
        this.VIPRoom?.build?.(this.scene);
        line("VIP room built");
      } catch (e) {
        line(`VIP room skipped (${String(e?.message || e)})`, false);
      }

      // init controls (your controls.js locomotion is the primary)
      try {
        const bounds = this.worldBundle?.bounds || null;
        const colliders = this.worldBundle?.colliders || [];
        const spawn = this.worldBundle?.spawn
          ? { position: this.worldBundle.spawn, yaw: 0 }
          : { position: new THREE.Vector3(0, 0, 8), yaw: 0 };

        this.Controls?.init?.({
          renderer: this.renderer,
          camera: this.camera,
          player: this.rig,
          colliders,
          bounds,
          spawn,
        });
        line("Controls.init() OK");
      } catch (e) {
        line(`Controls skipped (${String(e?.message || e)})`, false);
      }

      // init UI
      try {
        this.UI?.init?.(this.scene, this.camera);
        line("UI.init() OK");
      } catch (e) {
        line(`UI skipped (${String(e?.message || e)})`, false);
      }

      // start poker sim (crash-safe)
      try {
        this.PokerSimulation?.build?.({ players: [], bots: [] });
        line("PokerSimulation built");
      } catch (e) {
        line(`PokerSimulation skipped (${String(e?.message || e)})`, false);
      }

      // init audio
      try {
        this.Audio?.init?.(this.scene, this.camera);
        line("Audio init OK");
      } catch (e) {
        line(`Audio skipped (${String(e?.message || e)})`, false);
      }

      window.addEventListener("resize", () => this.onResize());
      this.renderer.setAnimationLoop(() => this.animate());

      line("Boot complete. Enter VR.");
      line("main.js imported");
    } catch (e) {
      fail(`Main init failed: ${String(e?.message || e)}`);
      console.error(e);
    }
  },

  addBaseLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.25);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 6);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-7, 6, -7);
    this.scene.add(fill);
  },

  addFallbackFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0e0f14, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
  },

  setupControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // raw controllers (for rays + buttons)
    this.controller0 = this.renderer.xr.getController(0);
    this.controller1 = this.renderer.xr.getController(1);
    this.scene.add(this.controller0);
    this.scene.add(this.controller1);

    // grips (for visible hands/models)
    this.controllerGrip0 = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(1);
    this.controllerGrip0.add(controllerModelFactory.createControllerModel(this.controllerGrip0));
    this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
    this.scene.add(this.controllerGrip0);
    this.scene.add(this.controllerGrip1);

    // lasers
    this.ray0 = this.buildLaser();
    this.ray1 = this.buildLaser();
    this.controller0.add(this.ray0);
    this.controller1.add(this.ray1);

    // show lasers only in VR session
    this.renderer.xr.addEventListener("sessionstart", () => {
      this.ray0.visible = true;
      this.ray1.visible = true;
    });
    this.renderer.xr.addEventListener("sessionend", () => {
      this.ray0.visible = false;
      this.ray1.visible = false;
    });
  },

  buildLaser() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 8; // length
    line.visible = false;
    return line;
  },

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    const dt = this.clock.getDelta();

    try { this.Controls?.update?.(dt); } catch {}
    try { this.UI?.update?.(dt); } catch {}

    // tiny ray animation pulse (so you know it’s alive)
    if (this.ray0) this.ray0.scale.z = 7.5 + Math.sin(performance.now() * 0.004) * 0.2;
    if (this.ray1) this.ray1.scale.z = 7.5 + Math.cos(performance.now() * 0.004) * 0.2;

    this.renderer.render(this.scene, this.camera);
  },
};

App.init();
