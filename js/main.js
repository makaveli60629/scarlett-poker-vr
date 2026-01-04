// js/main.js
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { Interactions } from "./interactions.js";

/* ================================
   GLOBAL ACTION STATE (CRITICAL FIX)
================================== */
window.actionId = null;
window.setActionId = function (v) {
  window.actionId = (v === undefined || v === null) ? null : v;
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
  el.style.maxHeight = "170px";
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

  function log() {
    const msg = Array.prototype.slice.call(arguments).map(function (a) {
      return (typeof a === "string") ? a : JSON.stringify(a);
    }).join(" ");
    el.textContent += msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.log.apply(console, arguments);
  }

  function warn() {
    const msg = Array.prototype.slice.call(arguments).map(function (a) {
      return (typeof a === "string") ? a : JSON.stringify(a);
    }).join(" ");
    el.textContent += "WARN: " + msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.warn.apply(console, arguments);
  }

  function fatal() {
    const msg = Array.prototype.slice.call(arguments).map(function (a) {
      return (typeof a === "string") ? a : JSON.stringify(a);
    }).join(" ");
    el.textContent += "FATAL ERROR: " + msg + "\n";
    el.scrollTop = el.scrollHeight;
    console.error.apply(console, arguments);
  }

  return { el: el, log: log, warn: warn, fatal: fatal };
}

const HUD = makeConsole();
HUD.log("Loading...");
HUD.log("Booting Scarlett Poker VR...");

/* ================================
   GLOBAL ERROR TRAP (SO YOU SEE IT)
================================== */
window.addEventListener("error", function (e) {
  HUD.fatal(e && e.message ? e.message : "Unknown error");
});
window.addEventListener("unhandledrejection", function (e) {
  const reason = e && e.reason ? e.reason : "Unhandled promise rejection";
  HUD.fatal(reason && reason.message ? reason.message : String(reason));
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
   PLAYER RIG
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
   AUDIO (GESTURE REQUIRED)
================================== */
let bgAudio = null;
let audioReady = false;

function initAudioOnGesture() {
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
      function (buffer) {
        bgAudio.setBuffer(buffer);
        bgAudio.setLoop(true);
        bgAudio.setVolume(0.45);
        try {
          bgAudio.play();
          HUD.log("Audio started.");
        } catch (e) {
          HUD.warn("Audio blocked - try again.");
          audioReady = false;
        }
      },
      undefined,
      function () {
        HUD.warn("Audio load failed:", url);
      }
    );
  } catch (e) {
    HUD.warn("Audio init failed:", e && e.message ? e.message : e);
  }
}

window.addEventListener("pointerdown", initAudioOnGesture);
window.addEventListener("touchstart", initAudioOnGesture);
renderer.xr.addEventListener("sessionstart", initAudioOnGesture);

/* ================================
   BUILD WORLD
================================== */
try {
  World.build(scene, playerGroup);
  HUD.log("World loaded.");
  HUD.log("Audio ready (tap/click or trigger to start).");
} catch (e) {
  HUD.fatal("World build failed:", e && e.message ? e.message : e);
}

/* ================================
   INIT SYSTEMS
================================== */
let ui = null;
let controls = null;
let interactions = null;

try {
  ui = UI.init({ scene: scene, camera: camera, renderer: renderer, playerGroup: playerGroup, HUD: HUD });
} catch (e) {
  HUD.fatal("UI init failed:", e && e.message ? e.message : e);
}

try {
  controls = Controls.init({ scene: scene, camera: camera, renderer: renderer, playerGroup: playerGroup, HUD: HUD });
} catch (e) {
  HUD.fatal("Controls init failed:", e && e.message ? e.message : e);
}

try {
  // Pass uiClickable so interactions can raycast UI buttons
  interactions = Interactions.init({
    scene: scene,
    camera: camera,
    renderer: renderer,
    playerGroup: playerGroup,
    HUD: HUD,
    uiClickable: (ui && ui.clickable) ? ui.clickable : []
  });
} catch (e) {
  HUD.fatal("Interactions init failed:", e && e.message ? e.message : e);
}

/* ================================
   RESIZE
================================== */
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================
   MAIN LOOP
================================== */
renderer.setAnimationLoop(function () {
  // Never allow undefined to crash
  if (typeof window.actionId === "undefined") window.actionId = null;

  if (controls && controls.update) {
    try { controls.update(); } catch (e) { HUD.warn("Controls update error:", e && e.message ? e.message : e); }
  }

  if (ui && ui.update) {
    try { ui.update(); } catch (e) { HUD.warn("UI update error:", e && e.message ? e.message : e); }
  }

  if (interactions && interactions.update) {
    try { interactions.update(); } catch (e) { HUD.warn("Interactions update error:", e && e.message ? e.message : e); }
  }

  renderer.render(scene, camera);
});
