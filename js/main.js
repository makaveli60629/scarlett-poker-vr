// js/main.js
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { Interactions } from "./interactions.js";

/* ================================
   GLOBAL ACTION STATE (CRITICAL FIX)
   Prevents: "actionId is not defined"
================================== */
window.actionId = null;            // current UI/interaction action (string or null)
window.setActionId = (v) => {      // helper for buttons to set the action safely
  window.actionId = v ?? null;
};

/* ================================
   SIMPLE ON-SCREEN CONSOLE
================================== */
function makeConsole() {
  const el = document.createElement("pre");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.width = "calc(100% - 20px)";
  el.style.maxHeight = "160px";
  el.style.overflow = "auto";
  el.style.padding = "10px";
  el.style.margin = "0";
  el.style.background = "rgba(0,0,0,0.65)";
  el.style.color = "#b7ffb7";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "12px";
  el.style.borderRadius = "10px";
  el.style.zIndex = "999999";
  el.textContent = "";
  document.body.appendChild(el);

  const log = (...args) => {
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    el.textContent += msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.log(...args);
  };

  const warn = (...args) => {
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    el.textContent += "WARN: " + msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.warn(...args);
  };

  const fatal = (...args) => {
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    el.textContent += "FATAL ERROR: " + msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.error(...args);
  };

  return { el, log, warn, fatal };
}

const HUD = makeConsole();
HUD.log("Loading…");
HUD.log("Booting Scarlett Poker VR…");

/* ================================
   GLOBAL ERROR TRAP (SO YOU SEE IT)
================================== */
window.addEventListener("error", (e) => {
  HUD.fatal(e?.message || "Unknown error");
});
window.addEventListener("unhandledrejection", (e) => {
  HUD.fatal(e?.reason?.message || String(e?.reason || "Unhandled promise rejection"));
});

/* ================================
   THREE.JS CORE SETUP
================================== */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ================================
   PLAYER RIG (camera sits inside)
================================== */
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

/* ================================
   LIGHTS (SAFE DEFAULTS)
================================== */
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(6, 10, 4);
scene.add(dir);

/* ================================
   AUDIO (USER GESTURE REQUIRED)
================================== */
let bgAudio = null;
let audioReady = false;

async function initAudioOnGesture() {
  if (audioReady) return;
  audioReady = true;

  try {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    bgAudio = new THREE.Audio(listener);

    const loader = new THREE.AudioLoader();
    const url = "assets/audio/lobby_ambience.mp3";

    loader.load(
      url,
      (buffer) => {
        bgAudio.setBuffer(buffer);
        bgAudio.setLoop(true);
        bgAudio.setVolume(0.45);
        bgAudio.play();
        HUD.log("Audio started.");
      },
      undefined,
      (err) => {
        HUD.warn("Audio load failed:", url);
      }
    );
  } catch (e) {
    HUD.warn("Audio init failed:", e?.message || e);
  }
}

// Tap/click/trigger will start audio
window.addEventListener("pointerdown", initAudioOnGesture, { once: true });
window.addEventListener("touchstart", initAudioOnGesture, { once: true });

/* ================================
   BUILD WORLD + SYSTEMS
================================== */
try {
  World.build(scene, playerGroup);
  HUD.log("World loaded.");
  HUD.log("Audio ready (tap/click or trigger to start).");
} catch (e) {
  HUD.fatal("World build failed:", e?.message || e);
}

// Init UI + Controls + Interactions safely
let ui = null;
let controls = null;
let interactions = null;

try {
  ui = UI.init({ scene, camera, renderer, playerGroup, HUD });
} catch (e) {
  HUD.warn("UI init failed:", e?.message || e);
}

try {
  controls = Controls.init({ scene, camera, renderer, playerGroup, HUD });
} catch (e) {
  HUD.warn("Controls init failed:", e?.message || e);
}

try {
  interactions = Interactions.init({ scene, camera, renderer, playerGroup, HUD });
} catch (e) {
  HUD.warn("Interactions init failed:", e?.message || e);
}

/* ================================
   RESIZE
================================== */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================
   MAIN LOOP
================================== */
renderer.setAnimationLoop(() => {
  // Defensive: never allow undefined actionId to crash anything
  if (typeof window.actionId === "undefined") window.actionId = null;

  try {
    controls?.update?.();
  } catch (e) {
    HUD.warn("Controls update error:", e?.message || e);
  }

  try {
    interactions?.update?.({
      actionId: window.actionId,
      setActionId: window.setActionId
    });
  } catch (e) {
    HUD.warn("Interactions update error:", e?.message || e);
  }

  try {
    ui?.update?.({
      actionId: window.actionId,
      setActionId: window.setActionId
    });
  } catch (e) {
    HUD.warn("UI update error:", e?.message || e);
  }

  renderer.render(scene, camera);
});

/* ================================
   XR: ALSO START AUDIO ON ENTER VR
================================== */
renderer.xr.addEventListener("sessionstart", () => {
  initAudioOnGesture();
});
