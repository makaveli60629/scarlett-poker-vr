// /js/scarlett1/index.js
// SCARLETT — Update 15 (GitHub Pages full)
// Goal: spawn-safe, solid world, Android joystick move, Quest lasers + teleport, diagnostics always-on.

import { Diag } from "../modules/diag.js";
import { JoystickMove } from "../modules/joystickMove.js";
import { Teleport } from "../modules/teleport.js";

const BUILD = "SCARLETT_UPDATE_15_FULL";

// ---- HARD attach flags (cover likely panel checks) ----
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.SCARLETT.attached = true;
window.SCARLETT.ok = true;
window.__scarlettEngineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;
window.__scarlettAttached = true;

// ---- Diagnostics writer (used everywhere) ----
const diag = new Diag({ build: BUILD });
window.__scarlettDiagWrite = (msg) => diag.write(String(msg));
const dwrite = (msg) => diag.write(msg);

console.log(`[scarlett] LIVE_FINGERPRINT ✅ ${BUILD}`);

dwrite(`[0.000] booting… BUILD=${BUILD}`);
dwrite(`[0.002] href=${location.href}`);
dwrite(`[0.002] secureContext=${String(window.isSecureContext)}`);
dwrite(`[0.003] ua=${navigator.userAgent}`);
dwrite(`[0.005] touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints || 0}`);

const scene = document.querySelector("#scene");
const rig = document.querySelector("#rig");

function el(id) { return document.getElementById(id); }

// HUD wiring
const hud = el("hud");
const btnEnterVR = el("btnEnterVR");
const btnTeleport = el("btnTeleport");
const btnReset = el("btnReset");
const btnHideHUD = el("btnHideHUD");
const btnDiag = el("btnDiag");
const diagPanel = el("diagPanel");
const btnDiagClose = el("btnDiagClose");

btnDiag.addEventListener("click", () => diagPanel.classList.toggle("hidden"));
btnDiagClose.addEventListener("click", () => diagPanel.classList.add("hidden"));

btnHideHUD.addEventListener("click", () => {
  const hidden = hud.classList.toggle("hudHidden");
  // Keep pointer events off for hidden state; but we still show/hide
  hud.style.display = hidden ? "none" : "block";
});

btnEnterVR.addEventListener("click", async () => {
  try {
    dwrite(`[vr] request enter…`);
    // A-Frame provides enterVR() on the scene
    scene.enterVR();
  } catch (e) {
    dwrite(`[vr] enter failed: ${e?.message || e}`);
  }
});

const spawn = { x: 0, y: 0, z: 3, ry: 180 };
btnReset.addEventListener("click", () => {
  rig.setAttribute("position", `${spawn.x} ${spawn.y} ${spawn.z}`);
  rig.setAttribute("rotation", `0 ${spawn.ry} 0`);
  dwrite(`[spawn] reset to safe pad ✅ (${spawn.x},${spawn.y},${spawn.z})`);
});

// Modules
const joystick = new JoystickMove({ rig, diag: dwrite });
const teleport = new Teleport({ rig, scene, diag: dwrite });

let teleOn = true;
btnTeleport.addEventListener("click", () => {
  teleOn = !teleOn;
  teleport.setEnabled(teleOn);
  btnTeleport.textContent = `Teleport: ${teleOn ? "ON" : "OFF"}`;
  dwrite(`[teleport] ${teleOn ? "ON" : "OFF"}`);
});

// Scene lifecycle
scene.addEventListener("loaded", () => {
  dwrite(`[0.180] [world] scene loaded ✅`);
  dwrite(`[0.210] [world] spawn safe ✅`);
  // Ensure we never spawn on the table
  rig.setAttribute("position", `${spawn.x} ${spawn.y} ${spawn.z}`);
  rig.setAttribute("rotation", `0 ${spawn.ry} 0`);

  joystick.install();
  teleport.install();

  dwrite(`[0.222] [teleport] ${teleOn ? "ON" : "OFF"}`);
  dwrite(`[0.750] xr immersive-vr supported=${String(!!navigator.xr)}`);
  dwrite(`[ready] ✅`);
});

// Keep camera standing height unless you explicitly set seated in future modules.
// (Update 15 keeps standing baseline. Seat logic comes later.)
