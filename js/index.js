// /js/index.js — ScarlettVR Prime Entry (FULL) v14.3
// ✅ NEVER silent black: always shows overlay logs + test geometry
// ✅ Uses ONLY core controls: /js/core/controls.js
// ✅ Supports World.init OR class World
// ✅ Keeps rendering even if world/controls fail (so you always see something)

const BUILD = "INDEX_FULL_v14_3";

function makeOverlay() {
  let el = document.getElementById("bootlog");
  if (el) return el;

  // Create our own visible overlay if bootlog not present or hidden
  el = document.createElement("pre");
  el.id = "bootlog";
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.top = "10px";
  el.style.right = "10px";
  el.style.maxHeight = "45vh";
  el.style.overflow = "auto";
  el.style.zIndex = "999999";
  el.style.padding = "10px";
  el.style.margin = "0";
  el.style.font = "12px/1.25 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  el.style.color = "#cfe8ff";
  el.style.background = "rgba(0,0,0,0.65)";
  el.style.border = "1px solid rgba(120,180,255,0.35)";
  el.style.borderRadius = "10px";
  el.textContent = "";
  document.body.appendChild(el);
  return el;
}

const overlay = makeOverlay();

function boot(line) {
  try {
    overlay.textContent += (overlay.textContent ? "\n" : "") + line;
    overlay.scrollTop = overlay.scrollHeight;
  } catch {}
  console.log(line);
}

function basePath() {
  return location.pathname.includes("scarlett-poker-vr") ? "/scarlett-poker-vr/" : "/";
}

async function safeImport(path, label) {
  const url = basePath() + "js/" + path + "?v=" + Date.now();
  boot(`[import] ${label} -> ${url}`);
  try {
    const mod = await import(url);
    boot(`[import] ${label} ✅`);
    return mod;
  } catch (e) {
    boot(`[import] ${label} ❌ ${e?.message || e}`);
    return null;
  }
}

function pickExport(mod, names = []) {
  if (!mod) return null;
  for (const n of names) if (mod[n]) return mod[n];
  return mod.default || null;
}

function ensureCanvasWrap() {
  let wrap = document.getElementById("canvasWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "canvasWrap";
    wrap.style.position = "fixed";
    wrap.style.inset = "0";
    wrap.style.zIndex = "0";
    document.body.appendChild(wrap);
  }
  return wrap;
}

(async () => {
  boot(`BOOT ${BUILD}`);
  boot(`href=${location.href}`);
  boot(`secureContext=${!!window.isSecureContext}`);
  boot(`ua=${navigator.userAgent}`);
  boot(`base=${basePath()}`);

  // Catch global errors on-screen
  window.addEventListener("error", (e) => boot(`[ERR] ${e?.message || e}`));
  window.addEventListener("unhandledrejection", (e) => boot(`[PROMISE] ${e?.reason?.message || e?.reason || e}`));

  // THREE (local wrapper)
  const threeMod = await safeImport("three.js", "three");
  const THREE = threeMod?.THREE || threeMod?.default || threeMod;
  if (!THREE) {
    boot("FATAL ❌ THREE missing");
    return;
  }

  // Renderer
  const wrap = ensureCanvasWrap();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.setClearColor(0x05070d, 1);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  wrap.innerHTML = "";
  wrap.appendChild(renderer.domElement);
  boot("[renderer] created ✅");

  // Scene + rig
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 2);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  // Lights (strong so you ALWAYS see)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 1.25);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // ✅ TEST GEOMETRY (if you still see black after this, it’s not world/controls)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x203050, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x223355) })
  );
  cube.position.set(0, 1.4, -1.2);
  scene.add(cube);

  boot("[scene] test floor + cube ✅");

  // VRButton
  const vrMod = await safeImport("VRButton.js", "VRButton");
  const VRButton = vrMod?.VRButton || vrMod?.default || vrMod;
  if (VRButton?.createButton) {
    document.body.appendChild(VRButton.createButton(renderer));
    boot("[vr] VRButton appended ✅");
  } else {
    boot("[vr] VRButton missing ⚠");
  }

  // Load CORE controls + world (but do NOT let them black-screen you)
  const controlsMod = await safeImport("core/controls.js", "core/controls");
  const worldMod = await safeImport("world.js", "world");

  const Controls = pickExport(controlsMod, ["Controls"]);
  const WorldExport = pickExport(worldMod, ["World"]);

  // Init controls (optional)
  try {
    if (Controls?.init) {
      Controls.init({ THREE, renderer, camera, player, scene });
      boot("[core] Controls.init ✅");
    } else {
      boot("[core] Controls missing ⚠ (movement may not work yet)");
    }
  } catch (e) {
    boot("[core] Controls.init ❌ " + (e?.message || e));
  }

  // Init world (optional)
  let worldApi = null;
  try {
    if (WorldExport?.init) {
      worldApi = await WorldExport.init({ THREE, scene, renderer, camera, player, BUILD, log: boot });
      boot("[world] World.init ✅");
    } else if (typeof WorldExport === "function") {
      worldApi = new WorldExport(scene, renderer, camera);
      boot("[world] new World() ✅");
    } else {
      boot("[world] World missing ⚠ (still showing test world)");
    }
  } catch (e) {
    boot("[world] init ❌ " + (e?.message || e));
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
      Controls?.update?.(dt);

      if (worldApi?.tick) worldApi.tick(dt, now / 1000);
      else if (worldApi?.update) worldApi.update(dt, now / 1000);

      cube.rotation.y += dt * 0.9;
      renderer.render(scene, camera);
    } catch (e) {
      boot("[loop] ❌ " + (e?.message || e));
      renderer.setAnimationLoop(null);
    }
  });

  boot("RUNNING ✅ (If you see the cube, rendering is working)");
})();
