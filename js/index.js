import * as THREE from "three";

// IMPORTANT: VRButton import can fail if examples path blocks.
// So we use dynamic import + 2 fallbacks.
let VRButton = null;

async function loadVRButton() {
  // Try importmap path first
  try {
    const mod = await import("three/addons/webxr/VRButton.js");
    VRButton = mod.VRButton;
    return { ok: true, via: "three/addons/webxr/VRButton.js" };
  } catch (e1) {
    // Fallback direct URL
    try {
      const mod = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
      VRButton = mod.VRButton;
      return { ok: true, via: "unpkg examples/jsm/webxr/VRButton.js" };
    } catch (e2) {
      return { ok: false, e1, e2 };
    }
  }
}

// ---------- HUD logging helpers ----------
const ui = {
  logBox: document.getElementById("logBox"),
  grid: document.getElementById("diagGrid"),
  capXR: document.getElementById("capXR"),
  capImm: document.getElementById("capImm"),
};

const LOG = {
  lines: [],
  max: 240,
  push(kind, msg){
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${kind.toUpperCase()}: ${msg}`;
    this.lines.push(line);
    if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
    if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
    (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
  }
};

addEventListener("error", (e)=> LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
addEventListener("unhandledrejection", (e)=>{
  const reason = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
  LOG.push("error", `UnhandledPromiseRejection: ${reason}`);
});

function setMetrics(rows){
  if (!ui.grid) return;
  ui.grid.innerHTML = "";
  for (const [k,v] of rows){
    const row = document.createElement("div");
    row.className = "kv";
    const kk = document.createElement("div");
    kk.className = "k";
    kk.textContent = k;
    const vv = document.createElement("div");
    vv.className = "v";
    vv.textContent = v;
    row.appendChild(kk);
    row.appendChild(vv);
    ui.grid.appendChild(row);
  }
}

async function setCaps(){
  const xr = !!navigator.xr;
  ui.capXR.textContent = xr ? "YES" : "NO";
  let immersive = false;
  try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
  ui.capImm.textContent = immersive ? "YES" : "NO";
}

// ---------- Scene Boot (Bright test world) ----------
let scene, camera, renderer;
let last = performance.now();
let fpsAcc=0, fpsCount=0, fps=0;

function buildBrightWorld() {
  // BIG VISUALS so you can’t miss them
  scene.background = new THREE.Color(0x05060a);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid helper
  const grid = new THREE.GridHelper(60, 60, 0x00ffff, 0x223344);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.01;
  scene.add(grid);

  // Big neon pillar
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.2, 20),
    new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      roughness: 0.4,
      metalness: 0.2,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.25
    })
  );
  pillar.position.set(0, 1.1, -2.2);
  scene.add(pillar);

  // Poker table placeholder
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.12, 40),
    new THREE.MeshStandardMaterial({
      color: 0x0c2a22, roughness: 0.9, metalness: 0.05
    })
  );
  table.position.set(0, 0.78, -1.2);
  scene.add(table);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.07, 16, 80),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.6, metalness: 0.12
    })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(table.position);
  rim.position.y += 0.07;
  scene.add(rim);

  // Lights (never black)
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.05));
  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(6, 12, 4);
  scene.add(dir);

  // “You are here” marker
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a })
  );
  marker.position.set(0, 1.55, -0.6);
  scene.add(marker);
}

// ---------- VR Button creation ----------
async function attachVRButton() {
  const res = await loadVRButton();
  if (!res.ok) {
    LOG.push("error", "VRButton import FAILED.");
    LOG.push("error", `Importmap path error: ${res.e1?.message || res.e1}`);
    LOG.push("error", `Unpkg fallback error: ${res.e2?.message || res.e2}`);

    // Fallback: manual button that calls navigator.xr.requestSession
    if (navigator.xr) {
      const btn = document.createElement("button");
      btn.id = "VRButton";
      btn.textContent = "ENTER VR (Fallback)";
      btn.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:999999;padding:12px 14px;border-radius:14px;font-weight:900;";
      btn.onclick = async () => {
        try {
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
          });
          renderer.xr.setSession(session);
          LOG.push("log", "Fallback XR session started ✅");
        } catch (e) {
          LOG.push("error", `Fallback requestSession failed: ${e?.message || e}`);
        }
      };
      document.body.appendChild(btn);
      LOG.push("warn", "Using fallback VR button (manual requestSession).");
      return;
    }

    LOG.push("error", "navigator.xr not available — cannot create fallback VR button.");
    return;
  }

  try {
    const btn = VRButton.createButton(renderer, {
      optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
    });
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", `VRButton appended ✅ via ${res.via}`);
  } catch (e) {
    LOG.push("error", `VRButton.createButton failed: ${e?.message || e}`);
  }
}

// ---------- Init ----------
async function init() {
  await setCaps();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 2.8);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  buildBrightWorld();
  await attachVRButton();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.xr.addEventListener("sessionstart", () => LOG.push("log", "XR sessionstart event ✅"));
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR sessionend event"));

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    setMetrics([
      ["FPS", `${fps}`],
      ["WebXR", ui.capXR?.textContent || "?"],
      ["immersive-vr", ui.capImm?.textContent || "?"],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Renderer", "OK"],
      ["World", "Bright Test World ✅"],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Boot ✅ If no VR button, check log errors above.");
}

init();
