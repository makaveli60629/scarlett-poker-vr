// /js/scarlett1/index.js
// SCARLETT1 ENTRY — INLINE WORLD (NO dynamic import). Router-proof.
const BUILD = "SCARLETT1_INDEX_FULL_v11_INLINE_WORLD_NOIMPORT";

const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function ensureRoot() {
  let root = document.getElementById("app");
  if (!root) {
    root = document.createElement("div");
    root.id = "app";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.appendChild(root);
  }
  return root;
}

function setBannerText(text) {
  let b = document.getElementById("scarlettBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "scarlettBanner";
    b.style.position = "fixed";
    b.style.left = "10px";
    b.style.bottom = "10px";
    b.style.zIndex = "999999";
    b.style.padding = "10px 12px";
    b.style.borderRadius = "12px";
    b.style.background = "rgba(0,0,0,0.80)";
    b.style.color = "#fff";
    b.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    b.style.whiteSpace = "pre-wrap";
    b.style.maxWidth = "90vw";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }
  b.textContent = text;
}

function setPanicLabel(text) {
  let p = document.getElementById("scarlettPanic");
  if (!p) {
    p = document.createElement("div");
    p.id = "scarlettPanic";
    p.style.position = "fixed";
    p.style.right = "10px";
    p.style.top = "10px";
    p.style.zIndex = "1000000";
    p.style.padding = "10px 12px";
    p.style.borderRadius = "12px";
    p.style.background = "rgba(160,0,0,0.85)";
    p.style.color = "#fff";
    p.style.font = "12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    p.style.whiteSpace = "pre-wrap";
    p.style.maxWidth = "70vw";
    p.style.pointerEvents = "none";
    document.body.appendChild(p);
  }
  p.textContent = text;
}

function installGuards() {
  if (window.__scarlettGuardsInstalled) return;
  window.__scarlettGuardsInstalled = true;

  window.addEventListener("error", (e) => {
    const msg = String(e?.message || e);
    err("window.error:", msg);
    setPanicLabel("❌ ERROR\n" + msg);
    setBannerText("❌ ERROR\n" + msg);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason || e);
    err("unhandledrejection:", msg);
    setPanicLabel("❌ REJECTION\n" + msg);
    setBannerText("❌ REJECTION\n" + msg);
  });
}

async function inlineWorld() {
  setBannerText(`✅ Scarlett\n${BUILD}\nstep: importing three`);
  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");

  setBannerText(`✅ Scarlett\n${BUILD}\nstep: importing VRButton`);
  const VRButton = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");

  setBannerText(`✅ Scarlett\n${BUILD}\nstep: building scene`);

  const app = document.getElementById("app") || document.body;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  // replace old canvas if any
  const old = document.getElementById("scarlettCanvas");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  renderer.domElement.id = "scarlettCanvas";
  app.appendChild(renderer.domElement);

  // VR button
  try {
    const btn = VRButton.VRButton.createButton(renderer);
    btn.style.zIndex = "99998";
    document.body.appendChild(btn);
    setBannerText(`✅ Scarlett\n${BUILD}\nstep: VRButton ok`);
  } catch (e) {
    setBannerText(`✅ Scarlett\n${BUILD}\nstep: VRButton failed (2D ok)`);
  }

  // lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

  // floor + table (always visible)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 3.2);
  rig.add(camera);
  scene.add(rig);

  camera.lookAt(0, 1.0, 0);

  // render loop always
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // immediate render
  try { renderer.render(scene, camera); } catch (e) {}

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setBannerText(`✅ Scarlett\n${BUILD}\nstep: world ready ✅`);
  setPanicLabel(`✅ STARTED\n${BUILD}`);
}

export function start() {
  // SYNC proof first
  ensureRoot();
  installGuards();
  setBannerText(`✅ Scarlett\n${BUILD}\nstep: SYNC start() ran`);
  setPanicLabel(`SYNC OK\n${BUILD}`);

  // run once
  if (window.__scarlettInlineRan) return true;
  window.__scarlettInlineRan = true;

  // async continue (but only depends on external CDN imports, not local module import)
  Promise.resolve().then(() => inlineWorld());
  return true;
}

// fallback
try { start(); } catch (e) {}
