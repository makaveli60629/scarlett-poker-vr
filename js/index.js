// /js/index.js — ScarlettVR Prime Entry (FULL) v14.2
// SINGLE ENTRY • CORE CONTROLS ONLY • NO DUPLICATES • ROBUST WORLD EXPORT SUPPORT

const BUILD = "INDEX_FULL_v14_2";

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

function $(id) { return document.getElementById(id); }

function boot(line) {
  const el = $("bootlog");
  if (el) el.textContent += "\n" + line;
  console.log(line);
}

function basePath() {
  return location.pathname.includes("scarlett-poker-vr")
    ? "/scarlett-poker-vr/"
    : "/";
}

async function safeImport(path, label) {
  try {
    const mod = await import(basePath() + "js/" + path + "?v=" + Date.now());
    boot(`✔ ${label}`);
    return mod;
  } catch (e) {
    boot(`✖ ${label}: ${e.message || e}`);
    return null;
  }
}

function pickExport(mod, names = []) {
  if (!mod) return null;
  for (const n of names) if (mod[n]) return mod[n];
  return mod.default || null;
}

(async () => {
  try {
    boot(`BOOT ${BUILD}`);
    boot(`ua=${navigator.userAgent}`);
    boot(`base=${basePath()}`);

    // THREE (local wrapper)
    const threeMod = await safeImport("three.js", "three");
    const THREE = threeMod?.THREE || threeMod?.default || threeMod;
    if (!THREE) throw "THREE failed";

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;

    // Ensure only one canvas
    const wrap = $("canvasWrap") || document.body;
    wrap.appendChild(renderer.domElement);

    // Scene + camera + player rig
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
    camera.position.set(0, 1.65, 2);

    const player = new THREE.Group();
    player.name = "PlayerRig";
    player.add(camera);
    scene.add(player);

    // Light baseline
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    // VRButton (local)
    const vrMod = await safeImport("VRButton.js", "VRButton");
    const VRButton = vrMod?.VRButton || vrMod?.default || vrMod;
    if (VRButton?.createButton) {
      document.body.appendChild(VRButton.createButton(renderer));
      boot("✔ VRButton appended");
    } else {
      boot("⚠ VRButton missing (manual ENTER VR may still work)");
    }

    // Core systems (CORE ONLY — NO /js/controls.js)
    const controlsMod = await safeImport("core/controls.js", "core/controls");
    const worldMod = await safeImport("world.js", "world");

    const Controls = pickExport(controlsMod, ["Controls"]);
    const WorldExport = pickExport(worldMod, ["World"]);

    if (!Controls) throw "Controls missing (core/controls.js export Controls)";
    if (!WorldExport) throw "World missing (world.js export World)";

    // Init controls (pass scene so reticles always attach)
    Controls.init({ THREE, renderer, camera, player, scene });

    // Init world — supports BOTH styles:
    // A) export const World = { init({..}){} }
    // B) export class World { constructor(scene, renderer, camera) ... update() ... }
    let worldApi = null;

    if (typeof WorldExport?.init === "function") {
      worldApi = await WorldExport.init({ THREE, scene, renderer, camera, player, BUILD });
      boot("✔ World.init()");
    } else if (typeof WorldExport === "function") {
      // class/constructor style
      const w = new WorldExport(scene, renderer, camera);
      worldApi = w;
      boot("✔ new World()");
    } else {
      throw "World export invalid (needs init() or class)";
    }

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Loop (real dt)
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      try {
        Controls.update(dt);

        // World update hook
        if (worldApi?.update) worldApi.update(dt, now / 1000);
        else if (worldApi?.tick) worldApi.tick(dt, now / 1000);

        // Optional HUD debug (if your html has #hudStatus)
        const hud = $("hudStatus");
        if (hud && Controls.getPadDebug) {
          hud.textContent =
            `XR:${renderer.xr.isPresenting ? "on" : "off"}\n` +
            `pos: x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}\n` +
            `${Controls.getPadDebug?.() || ""}\n` +
            `${Controls.getButtonDebug?.() || ""}`;
        }

        renderer.render(scene, camera);
      } catch (e) {
        err("Loop error", e);
        boot("Loop error ❌ " + (e?.message || e));
        renderer.setAnimationLoop(null);
      }
    });

    boot("RUNNING ✅");
    console.log("[index] EOF_OK ✅ v14.2");

  } catch (e) {
    err("FATAL", e);
    boot("FATAL ❌ " + (e?.message || e));
  }
})();
