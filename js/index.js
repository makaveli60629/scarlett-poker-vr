// /js/index.js — Scarlett MASTER (DIAG HUD + COPY + NO HANG + ROBUST MOVE)
import { THREE, VRButton } from "./three.js";

const VERSION = Date.now();
const BASE = (location.pathname.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/");

const LogBuf = [];
function LOG(...a) {
  const s = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  console.log(s);
  LogBuf.push(s);
  if (LogBuf.length > 1200) LogBuf.shift();
  if (ui.log) {
    ui.log.textContent = LogBuf.slice(-220).join("\n");
    ui.log.scrollTop = ui.log.scrollHeight;
  }
}
LOG(`[index] start v=${VERSION} base=${BASE}`);

const ui = makeDiagUI();

const S = {
  scene: null,
  camera: null,
  renderer: null,
  player: null,
  head: null,
  clock: null,
  controllers: [],
  pads: [],
  world: null,
};

function makeDiagUI() {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed; left:12px; top:12px; z-index:999999;
    width:min(520px, 92vw);
    background:rgba(0,0,0,.62); color:#d7e6ff;
    border:1px solid rgba(127,231,255,.35);
    border-radius:14px; padding:10px; font:12px/1.35 system-ui,Segoe UI,Roboto,Arial;
    box-shadow:0 12px 40px rgba(0,0,0,.45);
  `;

  const row = document.createElement("div");
  row.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;";

  const btnCopy = document.createElement("button");
  btnCopy.textContent = "COPY LOG";
  btnCopy.style.cssText = btnStyle();
  btnCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(LogBuf.join("\n"));
      LOG("[HUD] copied ✅");
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = LogBuf.join("\n");
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      LOG("[HUD] copied (fallback) ✅");
    }
  };

  const btnHide = document.createElement("button");
  btnHide.textContent = "HIDE";
  btnHide.style.cssText = btnStyle();
  btnHide.onclick = () => {
    const isHidden = wrap.dataset.hidden === "1";
    wrap.dataset.hidden = isHidden ? "0" : "1";
    logArea.style.display = isHidden ? "block" : "none";
  };

  const status = document.createElement("div");
  status.textContent = "status: booting…";
  status.style.cssText = "opacity:.95; font-weight:700;";

  row.appendChild(btnCopy);
  row.appendChild(btnHide);
  row.appendChild(status);

  const logArea = document.createElement("pre");
  logArea.style.cssText = `
    margin:0; padding:10px; border-radius:10px;
    background:rgba(10,12,18,.65); max-height:38vh; overflow:auto;
    border:1px solid rgba(255,255,255,.08);
    white-space:pre-wrap;
  `;
  logArea.textContent = "";

  wrap.appendChild(row);
  wrap.appendChild(logArea);
  document.body.appendChild(wrap);

  return { wrap, status, log: logArea };
}

function btnStyle() {
  return `
    padding:8px 10px; border-radius:12px;
    border:1px solid rgba(127,231,255,.5);
    background:rgba(10,12,18,.75);
    color:#e8ecff; font-weight:800;
  `;
}

function setStatus(t) {
  ui.status.textContent = "status: " + t;
  LOG("[status]", t);
}

function setSpawn(pos, yaw = 0) {
  S.player.position.copy(pos);
  S.player.rotation.set(0, yaw, 0);
}

function init() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#05060a";

  S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  S.renderer.setSize(innerWidth, innerHeight);
  S.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  S.renderer.xr.enabled = true;
  document.body.appendChild(S.renderer.domElement);

  document.body.appendChild(VRButton.createButton(S.renderer));
  LOG("[index] VRButton appended ✅");

  S.scene = new THREE.Scene();
  S.scene.fog = new THREE.Fog(0x05060a, 8, 80);

  S.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);

  S.player = new THREE.Group();
  S.player.name = "PlayerRig";

  S.head = new THREE.Group();
  S.head.add(S.camera);
  S.player.add(S.head);

  S.scene.add(S.player);

  S.clock = new THREE.Clock();

  setupControllers();

  addEventListener("resize", () => {
    S.camera.aspect = innerWidth / innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(innerWidth, innerHeight);
  });

  // Render loop ALWAYS starts
  S.renderer.setAnimationLoop(tick);

  // Init world with a watchdog (but this world.js should finish instantly now)
  startWorld();
}

function setupControllers() {
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });

  for (let i = 0; i < 2; i++) {
    const c = S.renderer.xr.getController(i);
    c.userData.index = i;
    const line = new THREE.Line(rayGeo, rayMat);
    line.scale.z = 8;
    c.add(line);
    S.scene.add(c);
    S.controllers.push(c);
  }
  LOG("[index] controllers ready ✅", S.controllers.length);
}

async function startWorld() {
  setStatus("importing world.js…");
  const mod = await import(`./world.js?v=${VERSION}`);
  if (!mod?.World?.init) {
    setStatus("world.js missing World.init ❌");
    return;
  }

  const World = mod.World;
  S.world = World;

  setStatus("World.init()…");

  let done = false;
  setTimeout(() => {
    if (!done) setStatus("WORLD INIT TIMEOUT ❌ (but loop still running)");
  }, 8000);

  try {
    // NOTE: World.init is synchronous in the new world.js
    World.init({
      THREE,
      scene: S.scene,
      renderer: S.renderer,
      camera: S.camera,
      player: S.player,
      controllers: S.controllers,
      BASE,
      log: (...a) => LOG("[world]", ...a),
      registerTeleportPad: (p) => S.pads.push(p),
      setSpawn,
    });
    done = true;
    setStatus("world init ✅");
  } catch (e) {
    done = true;
    setStatus("world init FAILED ❌");
    LOG("[world] init crash:", e?.message || e);
  }
}

// --------- ROBUST MOVE (Quest) ---------
function tick() {
  const dt = Math.min(S.clock.getDelta(), 0.05);

  applyMove(dt);

  // keep standing height (no crouch)
  if (S.camera.position.y < 1.2) S.camera.position.y = 1.65;

  // world update hook
  try {
    S.scene.userData.WORLD_UPDATE?.(dt);
  } catch (e) {
    LOG("[WORLD_UPDATE] error:", e?.message || e);
  }

  S.renderer.render(S.scene, S.camera);
}

function dead(v, dz = 0.12) {
  return Math.abs(v) < dz ? 0 : v;
}

function applyMove(dt) {
  // prefer WebXR inputSources
  const session = S.renderer.xr.getSession?.();
  let leftAxes = null;
  let rightAxes = null;

  if (session?.inputSources) {
    for (const src of session.inputSources) {
      const gp = src?.gamepad;
      if (!gp || !gp.axes) continue;

      const axes = gp.axes;
      // Some controllers report 4 axes; use first pair
      const pair = [axes[0] ?? 0, axes[1] ?? 0];

      if (src.handedness === "left") leftAxes = pair;
      if (src.handedness === "right") rightAxes = pair;
    }
  }

  // fallback: navigator.getGamepads (some builds only populate here)
  if (!leftAxes || !rightAxes) {
    const gps = navigator.getGamepads?.() || [];
    for (const gp of gps) {
      if (!gp?.axes) continue;
      const id = (gp.id || "").toLowerCase();
      const pair = [gp.axes[0] ?? 0, gp.axes[1] ?? 0];
      if (!leftAxes && (id.includes("oculus") || id.includes("quest"))) leftAxes = pair;
      // if we can’t distinguish, reuse for right as well
      if (!rightAxes && (id.includes("oculus") || id.includes("quest"))) rightAxes = pair;
    }
  }

  // movement with left stick
  if (leftAxes) {
    const x = dead(leftAxes[0]);
    const y = dead(leftAxes[1]);

    // IMPORTANT: forward should move forward; many pads give -1 forward so invert
    const forward = -y;
    const strafe = x;

    const speed = 2.3;
    const move = new THREE.Vector3(strafe, 0, -forward).multiplyScalar(speed * dt);
    move.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.player.rotation.y);
    S.player.position.add(move);
  }

  // rotate with right stick x
  if (rightAxes) {
    const rx = dead(rightAxes[0]);
    const rotSpeed = 1.8;
    S.player.rotation.y -= rx * rotSpeed * dt;
  }
}

init();
