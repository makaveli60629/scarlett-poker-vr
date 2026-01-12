// /js/index.js — Scarlett Runtime FULL (XR Locomotion + HUD Toggle + Android-safe)
// ✅ HUD: Hide/Show buttons (HUD won't block touch sticks)
// ✅ Quest: Left stick move (forward/back/strafe), Right stick smooth turn
// ✅ No snap-turn (unless enabled)
// ✅ Moves PlayerRig (not camera)
// ✅ Keeps controller lasers

import * as THREE from "three";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js?v=4_8_4_full"; // cache-bust

const log = (...a) => console.log(...a);

const STATE = {
  THREE,
  scene: null,
  renderer: null,
  camera: null,
  player: null,
  controllers: [],
  clock: new THREE.Clock(),

  // locomotion
  speed: 2.2,         // m/s
  turnSpeed: 2.2,     // rad/s (smooth turn)
  deadzone: 0.14,
  snapTurn: false,    // ✅ OFF by default
  snapAngle: Math.PI / 4,
  snapLatch: false,

  // input
  keys: new Set(),
  sticks: { left: null, right: null }, // android touch sticks

  // HUD
  hudEl: null,
  hudHidden: false
};

// -----------------------------
// HUD (Diagnostic overlay) — hide/show + non-blocking
// -----------------------------
function installHudToggle() {
  const hud = document.getElementById("hud") || document.getElementById("diagnostics") || document.body;

  // If you have a dedicated HUD container, we treat it nicely. If not, we create one.
  let container = document.getElementById("scarlettHud");
  if (!container) {
    container = document.createElement("div");
    container.id = "scarlettHud";
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.right = "0";
    container.style.maxHeight = "42vh";
    container.style.overflow = "auto";
    container.style.padding = "12px";
    container.style.zIndex = "99999";
    container.style.pointerEvents = "none"; // ✅ key: don't block sticks
    container.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    container.style.color = "#e8ecff";
    container.style.background = "rgba(5,6,10,0.55)";
    container.style.backdropFilter = "blur(10px)";
    container.style.borderBottom = "1px solid rgba(127,231,255,0.18)";
    document.body.appendChild(container);

    // If your app already prints logs into something else, keep that as-is.
    // This container is just the control surface.
  }

  const btnBar = document.createElement("div");
  btnBar.style.display = "flex";
  btnBar.style.gap = "10px";
  btnBar.style.alignItems = "center";
  btnBar.style.pointerEvents = "auto"; // ✅ buttons clickable
  btnBar.style.marginBottom = "10px";

  const hideBtn = document.createElement("button");
  hideBtn.textContent = "Hide HUD";
  hideBtn.style.padding = "10px 12px";
  hideBtn.style.borderRadius = "14px";
  hideBtn.style.border = "1px solid rgba(127,231,255,0.35)";
  hideBtn.style.background = "rgba(11,13,20,0.85)";
  hideBtn.style.color = "#e8ecff";
  hideBtn.style.cursor = "pointer";

  const showTab = document.createElement("button");
  showTab.textContent = "Show HUD";
  showTab.style.position = "fixed";
  showTab.style.top = "10px";
  showTab.style.right = "10px";
  showTab.style.zIndex = "999999";
  showTab.style.padding = "10px 12px";
  showTab.style.borderRadius = "14px";
  showTab.style.border = "1px solid rgba(127,231,255,0.35)";
  showTab.style.background = "rgba(11,13,20,0.85)";
  showTab.style.color = "#e8ecff";
  showTab.style.cursor = "pointer";
  showTab.style.display = "none";
  showTab.style.pointerEvents = "auto";

  const setHidden = (v) => {
    STATE.hudHidden = v;
    container.style.display = v ? "none" : "block";
    showTab.style.display = v ? "block" : "none";
  };

  hideBtn.onclick = () => setHidden(true);
  showTab.onclick = () => setHidden(false);

  btnBar.appendChild(hideBtn);
  container.prepend(btnBar);
  document.body.appendChild(showTab);

  STATE.hudEl = container;
  log("[hud] hide/show ready ✅");
}

// -----------------------------
// Renderer / Scene / Camera / Rig
// -----------------------------
function makeRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.setSize(window.innerWidth, window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  document.body.appendChild(VRButton.createButton(r));
  log("[index] VRButton appended ✅");
  return r;
}

function makeScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x05060a);
  s.fog = new THREE.Fog(0x05060a, 10, 65);
  return s;
}

function makeCamera() {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 250);
  cam.position.set(0, 1.65, 0);
  return cam;
}

function makePlayerRig(camera) {
  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  return player;
}

// -----------------------------
// Controller lasers (no markers)
// -----------------------------
function installControllerRays(renderer, controllers, scene) {
  const makeRayLine = () => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.6)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
    return new THREE.Line(geo, mat);
  };

  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.name = `XRController_${i}`;
    scene.add(c);
    controllers[i] = c;

    const line = makeRayLine();
    line.name = "ControllerRayLine";
    c.add(line);
  }
  log("[index] controller rays installed ✅ (laser only)");
}

// -----------------------------
// Android dual-stick (touch)
// -----------------------------
function installAndroidDualStick() {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  const mkStick = (side) => {
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.bottom = "18px";
    root.style.width = "160px";
    root.style.height = "160px";
    root.style.borderRadius = "999px";
    root.style.border = "1px solid rgba(255,255,255,0.18)";
    root.style.background = "rgba(10,12,18,0.25)";
    root.style.backdropFilter = "blur(6px)";
    root.style.touchAction = "none";
    root.style.zIndex = "99999";
    root.style.userSelect = "none";
    root.style.webkitUserSelect = "none";
    root.style.pointerEvents = "auto";

    if (side === "left") root.style.left = "18px";
    if (side === "right") root.style.right = "18px";

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.width = "64px";
    nub.style.height = "64px";
    nub.style.borderRadius = "999px";
    nub.style.background = "rgba(127,231,255,0.22)";
    nub.style.border = "1px solid rgba(127,231,255,0.45)";
    nub.style.boxShadow = "0 0 18px rgba(127,231,255,0.25)";
    root.appendChild(nub);

    document.body.appendChild(root);

    const stick = { side, root, nub, active: false, id: -1, cx: 0, cy: 0, x: 0, y: 0 };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    root.addEventListener("pointerdown", (e) => {
      stick.active = true;
      stick.id = e.pointerId;
      const r = root.getBoundingClientRect();
      stick.cx = r.left + r.width / 2;
      stick.cy = r.top + r.height / 2;
      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener("pointermove", (e) => {
      if (!stick.active || e.pointerId !== stick.id) return;
      const dx = e.clientX - stick.cx;
      const dy = e.clientY - stick.cy;
      const max = 52;
      stick.x = clamp(dx / max, -1, 1);
      stick.y = clamp(dy / max, -1, 1);
      nub.style.transform = `translate(${stick.x * 42 - 50}%, ${stick.y * 42 - 50}%)`;
    });

    const end = (e) => {
      if (e.pointerId !== stick.id) return;
      stick.active = false;
      stick.id = -1;
      stick.x = 0;
      stick.y = 0;
      nub.style.transform = "translate(-50%,-50%)";
    };

    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);

    return stick;
  };

  STATE.sticks.left = mkStick("left");
  STATE.sticks.right = mkStick("right");
  log("[android] dual-stick ready ✅");
}

// -----------------------------
// XR Gamepad locomotion (Quest controllers)
// -----------------------------
function getXRGamepads(renderer) {
  const session = renderer.xr.getSession?.();
  if (!session) return [];
  const pads = [];
  for (const src of session.inputSources) {
    if (src && src.gamepad) pads.push({ src, gp: src.gamepad });
  }
  return pads;
}

function applyMoveTurn(dt, moveX, moveZ, turnX) {
  // turn (smooth)
  if (STATE.snapTurn) {
    if (Math.abs(turnX) > 0.7 && !STATE.snapLatch) {
      STATE.snapLatch = true;
      STATE.player.rotation.y -= Math.sign(turnX) * STATE.snapAngle;
    }
    if (Math.abs(turnX) < 0.25) STATE.snapLatch = false;
  } else {
    STATE.player.rotation.y -= turnX * STATE.turnSpeed * dt;
  }

  // move relative to rig yaw
  const yaw = STATE.player.rotation.y;
  const speed = STATE.speed * dt;

  const vx = (moveX * Math.cos(yaw) - moveZ * Math.sin(yaw)) * speed;
  const vz = (moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)) * speed;

  if (Math.abs(vx) > 1e-5 || Math.abs(vz) > 1e-5) {
    STATE.player.position.x += vx;
    STATE.player.position.z += vz;
  }
}

function updateLocomotion(dt) {
  // 1) XR controllers (Quest)
  if (STATE.renderer.xr.isPresenting) {
    const pads = getXRGamepads(STATE.renderer);
    // Heuristic: the first pad we treat as left-hand, second as right-hand.
    // On Quest, axes: [0]=x, [1]=y
    let lx = 0, ly = 0, rx = 0;

    if (pads[0]?.gp?.axes?.length >= 2) {
      lx = pads[0].gp.axes[0] || 0;
      ly = pads[0].gp.axes[1] || 0;
    }
    if (pads[1]?.gp?.axes?.length >= 2) {
      rx = pads[1].gp.axes[0] || 0;
    }

    // deadzone + FIX inverted forward/back:
    const dz = STATE.deadzone;
    const ax = (v) => (Math.abs(v) < dz ? 0 : v);

    // ly is typically: up = -1, down = +1
    // We want: push forward => move forward (negative Z in our math), so moveZ = ly
    const moveX = ax(lx);
    const moveZ = ax(ly); // ✅ correct orientation (no inversion)

    const turnX = ax(rx);

    // Menu/HUD toggle with common buttons (B/Y)
    try {
      for (const p of pads) {
        const b = p.gp.buttons;
        const pressed = (b?.[3]?.pressed || b?.[1]?.pressed); // Y or B
        if (pressed && STATE.hudEl) {
          // toggle once per press by latching
          if (!STATE._hudLatch) {
            STATE._hudLatch = true;
            const hidden = STATE.hudEl.style.display !== "none";
            // hide HUD (we hide the container; the "Show HUD" tab remains)
            const showTab = [...document.querySelectorAll("button")].find(x => x.textContent === "Show HUD");
            STATE.hudEl.style.display = hidden ? "none" : "block";
            if (showTab) showTab.style.display = hidden ? "block" : "none";
          }
        } else {
          STATE._hudLatch = false;
        }
      }
    } catch {}

    applyMoveTurn(dt, moveX, moveZ, turnX);
    return;
  }

  // 2) Android touch sticks
  let mx = 0, mz = 0, yaw = 0;
  if (STATE.sticks.left) {
    mx += STATE.sticks.left.x;
    mz += STATE.sticks.left.y;
  }
  if (STATE.sticks.right) yaw += STATE.sticks.right.x;

  applyMoveTurn(dt, mx, mz, yaw);
}

// -----------------------------
// Boot
// -----------------------------
async function boot() {
  log("[index] runtime start ✅");

  const scene = makeScene();
  const camera = makeCamera();
  const renderer = makeRenderer();

  const player = makePlayerRig(camera);
  scene.add(player);

  STATE.scene = scene;
  STATE.camera = camera;
  STATE.renderer = renderer;
  STATE.player = player;

  installHudToggle();
  installAndroidDualStick();

  installControllerRays(renderer, STATE.controllers, scene);

  log("[index] calling world.build() …");
  await World.build({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: STATE.controllers,
    log
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = STATE.clock.getDelta();
    updateLocomotion(dt);
    World.frame({ THREE, scene, renderer, camera, player, controllers: STATE.controllers }, dt);
    renderer.render(scene, camera);
  });

  log("[index] world start ✅");
}

boot().catch((e) => {
  console.error(e);
  alert("Boot error. Check console.");
});
