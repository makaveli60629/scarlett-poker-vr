// /js/index.js — ScarlettVR Poker (Update 4.3) — Hands-only + Modules
// Runs on Meta Quest Browser (WebXR)

const BUILD = "UPDATE_4_3_FULL";

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const log = (...a) => {
  const s = a.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
  console.log("[index]", ...a);
  if (logEl) {
    logEl.textContent = (s + "\n" + logEl.textContent).slice(0, 4000);
  }
};

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { XRHandModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js";

import { World } from "./world.js";
import { Security } from "./modules/moderation.js";
import { Jackpot } from "./modules/jackpot.js";

let renderer, scene, camera;
let teleportEnabled = true;
let hudVisible = true;

// --- UI ---
function wireUI() {
  const btnHud = $("btnHud");
  const btnTeleport = $("btnTeleport");
  const btnTest = $("btnTest");

  if (btnHud) {
    btnHud.onclick = () => {
      hudVisible = !hudVisible;
      $("hud").style.display = hudVisible ? "block" : "none";
    };
  }

  if (btnTeleport) {
    btnTeleport.onclick = () => {
      teleportEnabled = !teleportEnabled;
      btnTeleport.textContent = `Teleport: ${teleportEnabled ? "On" : "Off"}`;
      World.setTeleportEnabled(teleportEnabled);
    };
  }

  if (btnTest) {
    btnTest.onclick = () => {
      const result = World.runModuleTest();
      log("Module Test:", result);
    };
  }
}

// --- Bootstrap ---
async function init() {
  wireUI();
  log("booting…", BUILD);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 1.6, 2.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // Basic light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9);
  dl.position.set(2, 6, 2);
  scene.add(dl);

  // Init world
  World.init({ THREE, scene, camera, renderer, log });

  // Hands (visual models)
  const handFactory = new XRHandModelFactory();
  for (let i = 0; i < 2; i++) {
    const hand = renderer.xr.getHand(i);
    const handModel = handFactory.createHandModel(hand, "mesh");
    hand.add(handModel);
    scene.add(hand);
    World.registerHand(hand, i);
  }

  // Demonstrate module hooks: (kept lightweight, you can wire to your actual game events)
  World.on("hand:rareHand", (handCode) => {
    const reward = Jackpot.checkHand(handCode);
    if (!reward) return;
    World.awardChips(reward.chips);
    World.playFX(reward.fx);
    log(`JACKPOT: ${handCode} +${reward.chips}`);
  });

  World.on("moderation:voteKick", (targetId) => {
    Security.processVote(targetId);
  });

  window.addEventListener('resize', onResize);

  renderer.setAnimationLoop(tick);
  log("ready ✅ enter VR when prompted");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function tick(t) {
  World.update(t);
  renderer.render(scene, camera);
}

init().catch((e) => {
  console.error(e);
  log("FATAL:", e?.message || e);
});
