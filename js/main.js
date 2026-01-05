import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { PokerTable } from "./table.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";

export async function boot({ statusEl, errEl, vrCorner } = {}) {
  try {
    const log = (m) => { if (statusEl) statusEl.innerHTML += `<br/>${m}`; };

    log("main.js running ✅");

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

    // Player Rig
    const rig = new THREE.Group();
    rig.name = "PlayerRig";
    scene.add(rig);

    // Viewer (non-XR camera height)
    const viewer = new THREE.Group();
    viewer.name = "Viewer";
    viewer.position.set(0, 1.65, 0);
    viewer.add(camera);
    rig.add(viewer);

    // VR Button (top-right)
    const btn = VRButton.createButton(renderer);
    if (vrCorner) vrCorner.appendChild(btn); else document.body.appendChild(btn);
    log("VR button created ✅");

    // World + Table
    const world = World.build(scene);
    const table = PokerTable.build(scene);

    const colliders = [...world.colliders, ...table.colliders];
    const floors = [...world.floorPlanes];

    // UI
    const ui = UI.create({ scene, rig, camera });
    ui.toast("Skylark Poker", "Loaded ✅");

    // Controls
    const controls = Controls.create({
      renderer, scene, camera, rig, viewer,
      floors, colliders,
      noTeleportZone: (p) => table.isPointInNoTeleportZone(p),
      ui
    });

    // Spawns (safe: NOT on table)
    const spawns = {
      lobby: new THREE.Vector3(0, 0, 7.5),
      poker: new THREE.Vector3(0, 0, 8.5),
      store: new THREE.Vector3(12, 0, 7.0),
    };

    function setRoom(name) {
      controls.setRoomSpawn(spawns[name] || spawns.lobby);
      ui.toast("Teleport", `Moved to ${name}`);
    }

    setRoom("lobby");

    // UI events
    window.addEventListener("toggle-audio", () => ui.toggleAudio());
    window.addEventListener("toggle-menu", () => ui.toggleMenu(setRoom));
    window.addEventListener("reset-player", () => controls.setRoomSpawn(spawns.lobby));

    // XR start/end
    renderer.xr.addEventListener("sessionstart", () => {
      viewer.position.set(0, 0, 0); // XR supplies head height
      controls.reapplySpawn();
      ui.toast("XR", "Entered VR ✅");
    });

    renderer.xr.addEventListener("sessionend", () => {
      viewer.position.set(0, 1.65, 0);
      ui.toast("XR", "Exited VR");
    });

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Loop
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
    if (errEl) { errEl.style.display = "block"; errEl.textContent = msg; }
    throw e;
  }
}
