import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { State } from "./state.js";
import { Controls } from "./controls.js";
import { World } from "./world.js";
import { Table } from "./table.js";
import { Poker } from "./poker.js";
import { Bots } from "./bots.js";
import { UI } from "./ui.js";
import { Store } from "./store.js";
import { AudioSys } from "./audio.js";

const statusLine = document.getElementById("statusLine");
const canvasWrap = document.getElementById("canvasWrap");
const vrCorner = document.getElementById("vrCorner");

function setStatus(msg) { statusLine.textContent = msg; console.log("[Status]", msg); }

(async function boot(){
  try{
    setStatus("Booting renderer…");

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;

    canvasWrap.appendChild(renderer.domElement);

    // VR button top-right (no overlap)
    vrCorner.appendChild(VRButton.createButton(renderer));

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070c);
    scene.fog = new THREE.Fog(0x06070c, 8, 65);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.05, 200);
    camera.position.set(0, 1.65, 5);

    // Player rig
    const rig = new THREE.Group();
    rig.name = "PlayerRig";
    rig.position.set(0, 0, 6); // safe spawn (open area)
    scene.add(rig);
    rig.add(camera);

    // State
    const state = State.create();

    // Systems
    const controls = Controls.create({ renderer, scene, camera, rig, state, setStatus });
    const audio = AudioSys.create({ state, setStatus });

    // Build world + store + table
    World.build({ scene, rig, state });
    const table = Table.build({ scene, state });
    const store = Store.build({ scene, state });

    // Poker + Bots
    const poker = Poker.create({ scene, table, state, setStatus });
    const bots = Bots.create({ scene, table, poker, state, setStatus });

    // UI overlay (VR + Android)
    const ui = UI.create({ scene, camera, rig, state, poker, bots, store, audio, setStatus, controls });

    // Wire controls to UI
    controls.onMenu = () => ui.toggleMenu();
    controls.onReset = () => ui.resetPlayer();
    controls.onAudio = () => audio.toggle();

    // Start loops
    setStatus("Ready. Loading game loop…");
    poker.startLoop();
    bots.start();

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(0.033, clock.getDelta());
      controls.update(dt);
      poker.update(dt);
      bots.update(dt);
      ui.update(dt);
      renderer.render(scene, camera);
    });

    setStatus("Running ✅ (VR + Android)");
  } catch (err) {
    console.error(err);
    setStatus("FATAL ERROR: " + (err?.message || err));
  }
})();
