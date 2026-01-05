import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { PokerTable } from "./table.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";

export async function boot({ statusEl, errEl, vrCorner } = {}) {
  try {
    const log = (m) => { if (statusEl) statusEl.innerHTML += `<br/>${m}`; };
    log("main.js loaded ✅");

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    document.body.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

    // Player Rig (floor at y=0)
    const rig = new THREE.Group();
    rig.name = "PlayerRig";
    scene.add(rig);

    // Viewer group: non-XR height only
    const viewer = new THREE.Group();
    viewer.name = "Viewer";
    viewer.position.set(0, 1.65, 0);
    viewer.add(camera);
    rig.add(viewer);

    // VR Button (TOP RIGHT)
    const btn = VRButton.createButton(renderer);
    if (vrCorner) vrCorner.appendChild(btn);
    else document.body.appendChild(btn);
    log("VR button created ✅ (top-right)");

    // Build world + table
    log("Building world…");
    const world = World.build(scene);

    log("Building poker table…");
    const table = PokerTable.build(scene);

    // Colliders / floors for teleport
    const colliders = [...world.colliders, ...table.colliders];
    const floors = [...world.floorPlanes];

    // UI
    const ui = UI.create({ scene, rig, camera });
    ui.toast("Skylark Poker", "Loaded ✅");

    // Controls (XR + mobile)
    const controls = Controls.create({
      renderer, scene, camera, rig, viewer,
      floors, colliders,
      noTeleportZone: (p) => table.isPointInNoTeleportZone(p),
      ui
    });

    // Room spawns (never in table)
    const spawns = {
      lobby: new THREE.Vector3(0, 0, 7.5),
      poker: new THREE.Vector3(0, 0, 8.5),
      store: new THREE.Vector3(12, 0, 7.0),
    };

    function setRoom(name) {
      controls.setRoomSpawn(spawns[name] || spawns.lobby);
      ui.toast("Teleport", `Moved to ${name}`);
    }

    // initial spawn
    setRoom("lobby");

    // UI events from index buttons
    window.addEventListener("toggle-audio", () => ui.toggleAudio());
    window.addEventListener("toggle-menu", () => ui.toggleMenu(setRoom));

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // XR session: adjust viewer height correctly
    renderer.xr.addEventListener("sessionstart", () => {
      viewer.position.set(0, 0, 0);        // XR supplies head height
      controls.reapplySpawn();             // prevents snapping to table/origin
      ui.toast("XR", "Entered VR ✅");
    });

    renderer.xr.addEventListener("sessionend", () => {
      viewer.position.set(0, 1.65, 0);     // restore non-XR height
      ui.toast("XR", "Exited VR");
    });

    // Render Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      controls.update(dt);
      table.update(dt, camera);
      ui.update(dt);
      renderer.render(scene, camera);
    });

    log("Boot complete ✅");
  } catch (e) {
    const msg = e?.stack || String(e);
    if (errEl) errEl.textContent = msg;
    throw e;
  }
}
