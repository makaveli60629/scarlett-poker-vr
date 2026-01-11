// /js/diag.js — Scarlett Simple Diagnostic Harness (DOES NOT TOUCH world.js)
// Goal: show exactly what's broken (paths, imports, XR, WebGL) without guessing.

const $ = (id) => document.getElementById(id);

const buildStamp = $("buildStamp");
const statusEl = $("status");
const reportEl = $("report");

const btnRun = $("btnRun");
const btnXR = $("btnXR");
const btnCopy = $("btnCopy");
const btnHard = $("btnHard");

const LINES = [];
const add = (s="") => { LINES.push(String(s)); };
const now = () => new Date().toLocaleString();

function setStatus(s) {
  statusEl.textContent = String(s);
}

function setReport() {
  reportEl.textContent = LINES.join("\n");
}

function ok(s){ return `✅ ${s}`; }
function bad(s){ return `❌ ${s}`; }
function warn(s){ return `⚠️ ${s}`; }

function stampLine() {
  const v = Date.now();
  buildStamp.textContent = `v=${v}`;
  add(`BUILD_STAMP: ${v}`);
}

function infoHeader() {
  add(`TIME: ${now()}`);
  add(`HREF: ${location.href}`);
  add(`UA: ${navigator.userAgent}`);
  add(`THREE_GLOBAL: ${typeof THREE}`);
  add(`NAVIGATOR_XR: ${!!navigator.xr}`);
}

async function fetchCheck(path) {
  // Use cache-bust so we don't get stale GH Pages cached behavior.
  const url = `${path}?v=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const ct = res.headers.get("content-type") || "";
    add(`FILE ${path}: ${res.status} ${res.ok ? "OK" : "FAIL"} (type=${ct.split(";")[0] || "?"})`);
    // If GitHub serves HTML for missing files, flag it:
    if (res.ok && ct.includes("text/html")) add(warn(`FILE ${path} returned HTML (often means 404 page) — check path/case.`));
    return { ok: res.ok, status: res.status, ct };
  } catch (e) {
    add(`FILE ${path}: FETCH_ERROR ${e?.name || ""} ${e?.message || e}`);
    return { ok: false, status: 0, ct: "" };
  }
}

async function importCheck(path) {
  // Dynamic import with cache bust. Prints real error (syntax, wrong export, bad relative imports).
  const url = `${path}?v=${Date.now()}`;
  try {
    const mod = await import(url);
    add(ok(`IMPORT ${path} succeeded`));
    add(`  exports: ${Object.keys(mod).join(", ") || "(none)"}`);
    return { ok: true, mod };
  } catch (e) {
    add(bad(`IMPORT ${path} failed: ${e?.name || ""} ${e?.message || e}`));
    // stack helps identify the exact nested import that failed
    if (e?.stack) add(`  stack: ${String(e.stack).slice(0, 800)}`);
    return { ok: false, mod: null };
  }
}

function webglCheckAndRender() {
  add(`WEBGL_CANVAS: creating renderer…`);

  if (typeof THREE === "undefined") {
    add(bad("THREE is undefined — Three.js did not load in index.html."));
    return false;
  }

  const host = $("canvas");
  if (!host) {
    add(bad("Missing #canvas div in HTML."));
    return false;
  }

  // Create a visible render so “black screen” is diagnosable.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    add(bad(`WebGLRenderer failed: ${e?.message || e}`));
    return false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);
  host.innerHTML = "";
  host.appendChild(renderer.domElement);

  const gl = renderer.getContext();
  const glOk = !!gl;
  add(glOk ? ok("WebGL context created") : bad("No WebGL context"));

  // Quick render test: bright cube + floor + lights
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101225);

  const camera = new THREE.PerspectiveCamera(70, (renderer.domElement.width / renderer.domElement.height) || 1, 0.05, 50);
  camera.position.set(0, 1.2, 3);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.2));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(2, 5, 2);
  scene.add(dl);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 }));
  cube.position.set(0, 1.2, 0);
  scene.add(cube);

  let t = 0;
  function anim() {
    t += 0.016;
    cube.rotation.y += 0.02;
    cube.rotation.x += 0.01;
    cube.position.y = 1.2 + Math.sin(t) * 0.05;
    renderer.render(scene, camera);
    requestAnimationFrame(anim);
  }
  anim();

  add(ok("Render test running (you should see a glowing cube)."));
  return true;
}

async function xrRequestTest() {
  add("");
  add("=== XR REQUEST TEST ===");
  if (!navigator.xr) {
    add(bad("navigator.xr missing"));
    setReport();
    return;
  }

  // IMPORTANT: we do a minimal check, but don’t promise it will start if not a user gesture.
  try {
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    add(`isSessionSupported(immersive-vr): ${supported ? "YES" : "NO"}`);
    if (!supported) {
      setReport();
      return;
    }
  } catch (e) {
    add(warn(`isSessionSupported error: ${e?.message || e}`));
  }

  // Must be called from a user gesture — this function is wired to a button click.
  const sessionInit = { optionalFeatures: ["local-floor", "hand-tracking"] };
  add(`requestSession init: ${JSON.stringify(sessionInit)}`);

  try {
    const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
    add(ok("requestSession succeeded ✅"));
    // Immediately end it so this stays diagnostic-only.
    await session.end();
    add(ok("session ended ✅"));
  } catch (e) {
    add(bad(`requestSession failed: ${e?.name || ""} ${e?.message || e}`));
    if (e?.stack) add(`stack: ${String(e.stack).slice(0, 800)}`);
  }

  setReport();
}

async function runDiagnostics() {
  LINES.length = 0;
  setStatus("Running diagnostics…");
  stampLine();
  infoHeader();
  add("");

  // 1) Render test (proves WebGL + Three is alive)
  const glOK = webglCheckAndRender();
  add("");

  // 2) File existence checks (this is the #1 GitHub Pages failure source)
  add("=== FILE CHECKS (/js) ===");
  const files = [
    "/js/index.js",
    "/js/world.js",
    "/js/boss_table.js",
    "/js/table_factory.js",
    "/js/bots.js",
    "/js/poker_sim.js",
    "/js/room_manager.js",
    "/js/teleport_machine.js",
    "/js/teleport.js",
  ];

  for (const f of files) await fetchCheck(f);

  add("");
  add("=== IMPORT CHECKS (REAL ERROR OUTPUT) ===");

  // 3) Try importing your main entrypoints (does NOT execute your whole app unless those modules self-run)
  // If your /js/index.js auto-starts the game, you can comment this out later.
  await importCheck("/js/world.js");
  await importCheck("/js/index.js");

  add("");
  add("=== SUMMARY ===");
  add(glOK ? ok("WebGL/Three render OK") : bad("WebGL/Three render FAILED"));
  add("If FILE says 404 or returned HTML, it’s a path/case problem.");
  add("If IMPORT fails, the printed error is the real reason (syntax, missing export, bad relative import).");

  setReport();
  setStatus("Done ✅ Scroll report, then hit Copy Report.");
}

// UI wiring
btnRun.addEventListener("click", runDiagnostics);
btnXR.addEventListener("click", xrRequestTest);

btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportEl.textContent || "");
    setStatus("Report copied ✅ Paste it here.");
  } catch (e) {
    setStatus("Copy blocked. Take a screenshot or manually select text.");
  }
});

btnHard.addEventListener("click", () => location.reload());

// Auto-run on load
runDiagnostics();
