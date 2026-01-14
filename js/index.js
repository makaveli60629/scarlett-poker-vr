// /js/index.js — ScarlettVR Prime Entry (FULL) v14.1
// SINGLE ENTRY • CORE CONTROLS ONLY • NO DUPLICATES

const BUILD = "INDEX_FULL_v14_1";

const log = (...a) => console.log("[index]", ...a);
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
    boot(`✖ ${label}: ${e.message}`);
    return null;
  }
}

(async () => {
  try {
    boot(`BOOT ${BUILD}`);
    boot(`ua=${navigator.userAgent}`);

    // THREE
    const threeMod = await safeImport("three.js", "three");
    const THREE = threeMod?.THREE || threeMod?.default || threeMod;
    if (!THREE) throw "THREE failed";

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Scene + camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
    camera.position.set(0, 1.65, 2);

    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);

    // Light
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1);
    scene.add(hemi);

    // VRButton
    const vrMod = await safeImport("VRButton.js", "VRButton");
    if (vrMod?.VRButton?.createButton) {
      document.body.appendChild(vrMod.VRButton.createButton(renderer));
    }

    // Core systems
    const controlsMod = await safeImport("core/controls.js", "core/controls");
    const worldMod = await safeImport("world.js", "world");

    const Controls = controlsMod?.Controls;
    const World = worldMod?.World;

    if (!Controls || !World) throw "Core systems missing";

    Controls.init({ THREE, renderer, camera, player });
    await World.init({ THREE, scene, renderer, camera, player });

    renderer.setAnimationLoop((t) => {
      Controls.update(0.016);
      renderer.render(scene, camera);
    });

    boot("RUNNING ✅");
    console.log("[index] EOF_OK ✅ v14.1");

  } catch (e) {
    err("FATAL", e);
    boot("FATAL ❌ " + e);
  }
})();
