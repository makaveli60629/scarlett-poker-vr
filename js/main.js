import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { Table } from "./table.js";
import { Chair } from "./chair.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { Interactions } from "./interactions.js";

/* ================================
   GLOBAL STATE (NO CRASH GUARANTEE)
================================== */
window.actionId = null;
window.setActionId = function (v) {
  window.actionId = (v === undefined || v === null) ? null : v;
};

/* ================================
   ON-SCREEN CONSOLE (PHONE FRIENDLY)
================================== */
function makeConsole() {
  const el = document.createElement("pre");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.width = "calc(100% - 20px)";
  el.style.maxHeight = "180px";
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

  function _line(prefix, args) {
    const msg = Array.prototype.slice.call(args).map(function (a) {
      return (typeof a === "string") ? a : JSON.stringify(a);
    }).join(" ");
    el.textContent += prefix + msg + "\n";
    el.scrollTop = el.scrollHeight;
  }

  return {
    log: function () { _line("", arguments); console.log.apply(console, arguments); },
    warn: function () { _line("WARN: ", arguments); console.warn.apply(console, arguments); },
    fatal: function () { _line("FATAL ERROR: ", arguments); console.error.apply(console, arguments); }
  };
}

const HUD = makeConsole();
HUD.log("Loading...");
HUD.log("Booting Scarlett Poker VR...");

/* ================================
   ERROR TRAPS
================================== */
window.addEventListener("error", function (e) {
  HUD.fatal(e && e.message ? e.message : "Unknown error");
});
window.addEventListener("unhandledrejection", function (e) {
  const r = e && e.reason ? e.reason : "Unhandled promise rejection";
  HUD.fatal(r && r.message ? r.message : String(r));
});

/* ================================
   THREE CORE
================================== */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  250
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
playerGroup.name = "playerGroup";
playerGroup.add(camera);
scene.add(playerGroup);

/* ================================
   LIGHTS (ALWAYS VISIBLE)
================================== */
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(6, 10, 4);
scene.add(dir);

/* ================================
   AUDIO (GESTURE SAFE)
================================== */
let bgAudio = null;
let audioInitialized = false;
let audioWarned = false;

function initAudioOnGesture() {
  if (audioInitialized) return;
  audioInitialized = true;

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
          audioInitialized = false;
          if (!audioWarned) {
            audioWarned = true;
            HUD.warn("Audio blocked — tap again to allow.");
          }
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
let worldRefs = null;
try {
  worldRefs = World.build(scene, playerGroup);
  HUD.log("World loaded.");
  HUD.log("Audio ready (tap/click or trigger to start).");
} catch (e) {
  HUD.fatal("World build failed:", e && e.message ? e.message : e);
}

/* ================================
   TABLE + CHAIRS
================================== */
try {
  const table = Table.create();
  table.position.set(0, 0, 0);
  scene.add(table);

  // 6 chairs around table (nice spacing)
  const radius = 1.55;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const ch = Chair.create();
    ch.position.set(x, 0, z);
    ch.lookAt(0, 0, 0);
    scene.add(ch);
  }

  HUD.log("Table + chairs loaded.");
} catch (e) {
  HUD.warn("Table/chair build failed:", e && e.message ? e.message : e);
}

/* ================================
   INIT UI + CONTROLS + INTERACTIONS
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
   LOOP
================================== */
renderer.setAnimationLoop(function () {
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
