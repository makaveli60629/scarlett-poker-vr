// /js/scarlett1/index.js
// SCARLETT1 ENTRY — SCRIPT LOADER (NO dynamic import). Works when module imports fail.
const BUILD = "SCARLETT1_INDEX_FULL_v12_SCRIPT_LOADER_GLOBAL_THREE";

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

function setBanner(text) {
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
    b.style.maxWidth = "92vw";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }
  b.textContent = text;
}

function setRed(text) {
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
    p.style.maxWidth = "72vw";
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
    setRed("❌ ERROR\n" + msg);
    setBanner("❌ ERROR\n" + msg);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason || e);
    err("unhandledrejection:", msg);
    setRed("❌ REJECTION\n" + msg);
    setBanner("❌ REJECTION\n" + msg);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load: " + src));
    document.head.appendChild(s);
  });
}

async function bootGlobalThree() {
  setBanner(`✅ Scarlett\n${BUILD}\nstep: loading THREE (global)`);

  // Global (non-module) builds (more compatible)
  // THREE:
  await loadScript("https://unpkg.com/three@0.158.0/build/three.min.js");

  if (!window.THREE) throw new Error("window.THREE missing after three.min.js");

  setBanner(`✅ Scarlett\n${BUILD}\nstep: THREE ok`);

  // Minimal scene (2D proof)
  const THREE = window.THREE;

  const app = document.getElementById("app") || document.body;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.id = "scarlettCanvas";

  // replace old
  const old = document.getElementById("scarlettCanvas");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  app.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

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

  camera.lookAt(0, 1.0, 0);

  function loop() {
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setBanner(`✅ Scarlett\n${BUILD}\nstep: 2D world ready ✅`);
  setRed(`✅ STARTED\n${BUILD}\n(2D proof)`);
}

export function start() {
  // SYNC proof
  ensureRoot();
  installGuards();
  setBanner(`✅ Scarlett\n${BUILD}\nstep: SYNC start() ran`);
  setRed(`SYNC OK\n${BUILD}`);

  if (window.__scarlettRan) return true;
  window.__scarlettRan = true;

  // Continue
  bootGlobalThree().catch((e) => {
    const msg = String(e?.message || e);
    setRed("❌ BOOT FAILED\n" + msg);
    setBanner("❌ BOOT FAILED\n" + msg);
  });

  return true;
}

// fallback
try { start(); } catch (e) {}
