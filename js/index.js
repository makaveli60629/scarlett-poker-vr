// /js/index.js — Scarlett VR Poker Boot v1.1 (FULL)
// ✅ Always loads Three.js module
// ✅ Boots HybridWorld
// ✅ Adds Emergency Android controls (D-pad move + lookpad drag) that bypass TouchControls

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { HybridWorld } from "./world.js";

const BUILD_STAMP = Date.now();
const overlay = document.getElementById("overlay");

function logLine(msg, cls="muted") {
  const div = document.createElement("div");
  div.className = "row " + cls;
  div.textContent = msg;
  overlay?.appendChild(div);
  if (overlay) overlay.scrollTop = overlay.scrollHeight;
  console.log(msg);
}
const ok = (m)=>logLine("✅ "+m,"ok");
const warn=(m)=>logLine("⚠️ "+m,"warn");
const bad =(m)=>logLine("❌ "+m,"bad");

function showBootHeader() {
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: ${THREE ? "module ok" : "missing"}`);
}

function createRenderer() {
  logLine("WEBGL_CANVAS: creating renderer…");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  ok("Renderer created");
  return renderer;
}

function makeRig() {
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 0);
  camera.name = "MainCamera";
  player.add(camera);

  ok("PlayerRig + Camera created");
  return { player, camera };
}

function makeControllers(renderer) {
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name = "HandLeft";
  handRight.name = "HandRight";
  ok("XR Hands placeholders ready");
  return { handLeft, handRight };
}

// ----------------------------------------------------
// ✅ Emergency controls (works even if touch_controls.js fails)
// ----------------------------------------------------
function installEmergencyControls({ player, camera }) {
  const state = {
    fwd: 0, str: 0,
    yaw: player.rotation.y || 0,
    pitch: camera.rotation.x || 0,
    looking: false,
    lastX: 0,
    lastY: 0
  };

  const dpad = document.getElementById("dpad");
  const lookpad = document.getElementById("lookpad");

  if (!dpad || !lookpad) {
    warn("Emergency controls missing DOM nodes");
    return { update(){} };
  }

  const setDir = (dir, down) => {
    // forward/back
    if (dir === "up") state.fwd = down ? 1 : 0;
    if (dir === "down") state.fwd = down ? -1 : 0;
    // strafe
    if (dir === "left") state.str = down ? -1 : 0;
    if (dir === "right") state.str = down ? 1 : 0;
    // center = stop
    if (dir === "mid" && down) { state.fwd = 0; state.str = 0; }
  };

  const downHandler = (e) => {
    const btn = e.target.closest?.(".btn");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    setDir(btn.dataset.dir, true);
  };

  const upHandler = (e) => {
    const btn = e.target.closest?.(".btn");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    setDir(btn.dataset.dir, false);
  };

  dpad.addEventListener("pointerdown", downHandler, { passive:false });
  dpad.addEventListener("pointerup", upHandler, { passive:false });
  dpad.addEventListener("pointercancel", upHandler, { passive:false });
  dpad.addEventListener("pointerleave", (e)=>{ /* stop movement if finger slides off */
    state.fwd = 0; state.str = 0;
  }, { passive:false });

  // look pad drag
  lookpad.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    state.looking = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    lookpad.setPointerCapture?.(e.pointerId);
  }, { passive:false });

  window.addEventListener("pointermove", (e) => {
    if (!state.looking) return;
    e.preventDefault();

    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    state.yaw -= dx * 0.003;
    state.pitch -= dy * 0.003;
    state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch));

    player.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  }, { passive:false });

  window.addEventListener("pointerup", () => { state.looking = false; }, { passive:false });
  window.addEventListener("pointercancel", () => { state.looking = false; }, { passive:false });

  ok("Emergency controls installed ✅");

  return {
    update(dt) {
      // do not fight XR
      // (in XR, movement should be teleport/roomscale)
      // but leave it harmless
      if (!dt) dt = 0.016;
      if (state.fwd === 0 && state.str === 0) return;

      const speed = 2.6 * dt;

      const dir = new THREE.Vector3();
      player.getWorldDirection(dir);
      dir.y = 0; dir.normalize();

      const right = new THREE.Vector3(dir.z, 0, -dir.x);
      player.position.addScaledVector(dir, state.fwd * speed);
      player.position.addScaledVector(right, state.str * speed);
    }
  };
}

async function boot() {
  overlay.innerHTML = "";
  showBootHeader();

  const renderer = createRenderer();
  const { player, camera } = makeRig();
  const controllers = makeControllers(renderer);

  try {
    document.body.appendChild(VRButton.createButton(renderer));
    ok("VRButton appended");
  } catch (e) {
    warn("VRButton failed (non-fatal): " + (e?.message || e));
  }

  // Emergency movement
  const emergency = installEmergencyControls({ player, camera });

  // Build world
  try {
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log: (m) => logLine(String(m)),
      OPTS: {
        nonvrControls: true,
        allowTeleport: true,
        allowBots: true,
        allowPoker: true,
        allowStream: false
      }
    });
    ok("HybridWorld.build ✅");
  } catch (e) {
    bad("HybridWorld.build FAILED: " + (e?.message || e));
    console.error(e);
  }

  renderer.setAnimationLoop(() => {
    try {
      emergency.update(1/60);
      HybridWorld.frame({ renderer, camera });
    } catch (e) {
      bad("frame crash: " + (e?.message || e));
      console.error(e);
      renderer.setAnimationLoop(null);
    }
  });

  ok("Animation loop running");
}

boot().catch(e => bad("BOOT fatal: " + (e?.message || e)));
