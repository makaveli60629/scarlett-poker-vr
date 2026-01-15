// /js/scarlett1/spine_android.js — Scarlett Android Debug Sticks (FULL)
// ✅ Only visible/active when NOT in XR
// ✅ Does NOT interfere with Quest
// ✅ Exports initAndroidSticks (required by world/boot)
// ✅ Simple left stick = move, right stick = look

let enabled = true;

const state = {
  root: null,
  left: null,
  right: null,
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  camYaw: 0,
  camPitch: 0,
  player: null,
  camera: null,
  log: console.log,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeStick(label) {
  const wrap = document.createElement("div");
  wrap.style.width = "160px";
  wrap.style.height = "160px";
  wrap.style.borderRadius = "28px";
  wrap.style.background = "rgba(24,36,68,0.35)";
  wrap.style.border = "1px solid rgba(140,180,255,0.18)";
  wrap.style.backdropFilter = "blur(10px)";
  wrap.style.position = "relative";
  wrap.style.touchAction = "none";

  const nub = document.createElement("div");
  nub.style.width = "78px";
  nub.style.height = "78px";
  nub.style.borderRadius = "22px";
  nub.style.background = "rgba(130,170,255,0.22)";
  nub.style.border = "1px solid rgba(140,180,255,0.25)";
  nub.style.position = "absolute";
  nub.style.left = "50%";
  nub.style.top = "50%";
  nub.style.transform = "translate(-50%,-50%)";
  wrap.appendChild(nub);

  const cap = document.createElement("div");
  cap.textContent = label;
  cap.style.position = "absolute";
  cap.style.left = "10px";
  cap.style.top = "8px";
  cap.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  cap.style.fontSize = "12px";
  cap.style.color = "rgba(220,235,255,0.75)";
  wrap.appendChild(cap);

  return { wrap, nub };
}

function attachStick(stick, onMove) {
  const el = stick.wrap;
  const nub = stick.nub;
  let active = false;
  let pid = -1;

  function setNub(dx, dy) {
    const max = 52;
    const nx = clamp(dx, -max, max);
    const ny = clamp(dy, -max, max);
    nub.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    onMove(nx / max, ny / max);
  }

  el.addEventListener("pointerdown", (e) => {
    active = true;
    pid = e.pointerId;
    el.setPointerCapture(pid);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setNub(e.clientX - cx, e.clientY - cy);
  });

  el.addEventListener("pointermove", (e) => {
    if (!active || e.pointerId !== pid) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setNub(e.clientX - cx, e.clientY - cy);
  });

  function end(e) {
    if (e.pointerId !== pid) return;
    active = false;
    pid = -1;
    nub.style.transform = "translate(-50%,-50%)";
    onMove(0, 0);
  }
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

function ensureUI() {
  if (state.root) return;

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.right = "0";
  root.style.bottom = "0";
  root.style.padding = "18px";
  root.style.display = "flex";
  root.style.justifyContent = "space-between";
  root.style.alignItems = "flex-end";
  root.style.zIndex = "99998";
  root.style.pointerEvents = "none";

  const left = makeStick("MOVE");
  const right = makeStick("LOOK");
  left.wrap.style.pointerEvents = "auto";
  right.wrap.style.pointerEvents = "auto";

  root.appendChild(left.wrap);
  root.appendChild(right.wrap);

  document.body.appendChild(root);

  attachStick(left, (x, y) => { state.lx = x; state.ly = y; });
  attachStick(right, (x, y) => { state.rx = x; state.ry = y; });

  state.root = root;
  state.left = left;
  state.right = right;
}

export function setEnabled(v) {
  enabled = !!v;
  if (state.root) state.root.style.display = enabled ? "flex" : "none";
}

export function initAndroidSticks({ player, camera, log }) {
  state.player = player;
  state.camera = camera;
  state.log = log || console.log;

  ensureUI();
  setEnabled(true);

  state.log("Android debug: sticks appear when NOT in XR session. Quest: press “Enter VR”.");
}

export function update(dt) {
  if (!enabled) return;
  // If XR is presenting, don't run (boot2 also disables it)
  // but keep safe if called anyway:
  if (window?.__SCARLETT_XR_PRESENTING) return;

  const THREE = window.THREE;
  if (!THREE || !state.player || !state.camera) return;

  // Move
  const speed = 2.2;
  const forward = new THREE.Vector3();
  state.camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3()
    .addScaledVector(forward, -state.ly * speed * dt)
    .addScaledVector(right,   state.lx * speed * dt);

  state.player.position.add(move);

  // Look (yaw/pitch)
  state.camYaw += state.rx * 1.8 * dt;
  state.camPitch += state.ry * 1.2 * dt;
  state.camPitch = clamp(state.camPitch, -0.55, 0.55);

  state.player.rotation.y = state.camYaw;
  state.camera.rotation.x = -state.camPitch;
                         }
