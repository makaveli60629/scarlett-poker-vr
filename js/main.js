// /js/main.js — Scarlett Poker VR — GitHub + Oculus SAFE (NO top-level imports)
// Fixes: missing VRButton, hidden button, CDN import failures, silent crashes.

const overlay = document.getElementById("overlay");
const cacheBtn = document.getElementById("btn");

function stamp() {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}]`;
}
function logLine(msg, ok = true) {
  if (!overlay) return;
  overlay.textContent += `\n${ok ? "✅" : "⚠️"} ${stamp()} ${msg}`;
}
function logFail(msg) {
  if (!overlay) return;
  overlay.textContent += `\n❌ ${stamp()} ${msg}`;
  if (cacheBtn) cacheBtn.style.display = "block";
}

if (cacheBtn) {
  cacheBtn.onclick = () => {
    const v = Date.now();
    location.href = location.pathname + `?v=${v}`;
  };
}

overlay && (overlay.textContent = "Scarlett Poker VR — loading…\n");

async function safeImport(path) {
  try {
    const mod = await import(path);
    logLine(`Loaded ${path}`);
    return mod;
  } catch (e) {
    logLine(`Skipped ${path} (${String(e?.message || e)})`, false);
    return null;
  }
}

function makeEnterVRButton() {
  const b = document.createElement("button");
  b.textContent = "ENTER VR";
  b.style.position = "fixed";
  b.style.right = "16px";
  b.style.bottom = "16px";
  b.style.padding = "14px 16px";
  b.style.borderRadius = "14px";
  b.style.border = "1px solid #00ff66";
  b.style.background = "#001a0a";
  b.style.color = "#00ff66";
  b.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
  b.style.fontSize = "14px";
  b.style.zIndex = "99999";
  b.style.boxShadow = "0 0 18px rgba(0,255,102,.18)";
  b.style.display = "none";
  document.body.appendChild(b);
  return b;
}

(async () => {
  try {
    // 1) Load THREE from CDN (catch failures instead of crashing)
    const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
    const THREE = await import(THREE_URL);
    logLine("Three.js CDN loaded");

    // 2) Create renderer + scene
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    logLine("Renderer ready");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 2, 80);

    const rig = new THREE.Group();
    scene.add(rig);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    camera.position.set(0, 1.65, 4);
    rig.add(camera);

    // Lighting (bright)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-7, 6, -7);
    scene.add(fill);
    logLine("Lighting added");

    // Fallback floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0e0f14, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 3) Load your modules safely
    const World = (await safeImport("./world.js"))?.World || null;
    const Controls = (await safeImport("./controls.js"))?.Controls || null;
    const UI = (await safeImport("./ui.js"))?.UI || null;
    const PokerSimulation = (await safeImport("./poker_simulation.js"))?.PokerSimulation || null;
    const Audio = (await safeImport("./audio.js"))?.Audio || null;
    const LightsPack = (await safeImport("./lights_pack.js"))?.LightsPack || null;
    const XRRigFix = (await safeImport("./xr_rig_fix.js"))?.XRRigFix || null;
    const XRLocomotion = (await safeImport("./xr_locomotion.js"))?.XRLocomotion || null;

    // IMPORTANT: We do NOT import vr_locomotion.js (your old 404 offender)

    // 4) Build world
    let bundle = null;
    if (World?.build) {
      bundle = World.build(scene, rig) || null;
      logLine("World built");
    } else {
      logLine("World.build missing", false);
    }

    // 5) Optional packs
    try { LightsPack?.build?.(scene); logLine("LightsPack built"); } catch (e) { logLine(`LightsPack skipped (${e?.message||e})`, false); }
    try { XRRigFix?.apply?.({ renderer, rig, camera }); logLine("XR rig fix applied"); } catch (e) { logLine(`XR rig fix skipped (${e?.message||e})`, false); }

    // 6) Init controls
    try {
      const bounds = bundle?.bounds || null;
      const colliders = bundle?.colliders || [];
      const spawn = bundle?.spawn ? { position: bundle.spawn, yaw: 0 } : { position: new THREE.Vector3(0,0,8), yaw: 0 };

      Controls?.init?.({ renderer, camera, player: rig, colliders, bounds, spawn });
      logLine("Controls.init OK");
    } catch (e) {
      logLine(`Controls skipped (${String(e?.message || e)})`, false);
    }

    // 7) Init UI / Poker / Audio
    try { UI?.init?.(scene, camera); logLine("UI.init OK"); } catch (e) { logLine(`UI skipped (${e?.message||e})`, false); }
    try { PokerSimulation?.build?.({ players: [], bots: [] }); logLine("PokerSimulation built"); } catch (e) { logLine(`PokerSimulation skipped (${e?.message||e})`, false); }
    try { Audio?.init?.(scene, camera); logLine("Audio init OK"); } catch (e) { logLine(`Audio skipped (${e?.message||e})`, false); }

    // 8) ENTER VR button (no VRButton dependency)
    const enterVR = makeEnterVRButton();

    if (!navigator.xr) {
      logFail("WebXR not available (navigator.xr missing). Are you in Oculus Browser?");
    } else {
      logLine("WebXR detected (navigator.xr exists)");
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      if (!supported) {
        logFail("immersive-vr not supported on this browser/device.");
      } else {
        logLine("immersive-vr supported ✅");
        enterVR.style.display = "block";

        enterVR.onclick = async () => {
          try {
            const session = await navigator.xr.requestSession("immersive-vr", {
              optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"]
            });
            renderer.xr.setSession(session);
            logLine("XR session started");
          } catch (e) {
            logFail(`Failed to start VR session: ${String(e?.message || e)}`);
          }
        };
      }
    }

    // 9) Render loop
    const clock = new THREE.Clock();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      try { Controls?.update?.(dt); } catch {}
      try { UI?.update?.(dt); } catch {}
      renderer.render(scene, camera);
    });

    logLine("Boot complete.");
  } catch (e) {
    console.error(e);
    logFail(`Boot failed: ${String(e?.message || e)}`);
  }
})();
