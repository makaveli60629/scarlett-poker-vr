import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./world.js";
import { PokerTable } from "./table.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";

export async function boot({ statusEl, errEl, vrCorner } = {}) {
  const say = (m) => { if (statusEl) statusEl.innerHTML += `<br/>${m}`; };

  try {
    say("main.js loaded ✅");

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

    // Player Rig (ALL controllers must be parented to rig)
    const rig = new THREE.Group();
    rig.name = "PlayerRig";
    scene.add(rig);

    // Non-XR camera offset (browser)
    const viewer = new THREE.Group();
    viewer.name = "Viewer";
    viewer.position.set(0, 1.65, 0);
    viewer.add(camera);
    rig.add(viewer);

    // Lighting baseline
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(7, 10, 6);
    scene.add(key);

    // VR Button top-right
    const vrBtn = VRButton.createButton(renderer);
    if (vrCorner) vrCorner.appendChild(vrBtn); else document.body.appendChild(vrBtn);
    say("VR button created ✅");

    // Build world & table
    const world = World.build(scene);
    PokerTable.build(scene);

    // UI
    const ui = UI.create({ scene, rig, camera });
    ui.toast("Skylark Poker", "Booted ✅");

    // Spawn points (never on table)
    const spawns = {
      lobby: new THREE.Vector3(0, 0, 7.5),
      poker: new THREE.Vector3(0, 0, 8.5),
      store: new THREE.Vector3(12, 0, 7.0),
    };

    // Colliders + floors
    const colliders = [...world.colliders, ...PokerTable.colliders];
    const floors = [...world.floorPlanes];

    // Controls (XR + Android)
    const controls = Controls.create({
      renderer, scene, camera, rig, viewer,
      floors, colliders,
      ui,
      noTeleportZone: (p) => PokerTable.isPointInNoTeleportZone(p)
    });

    function setRoom(roomName) {
      controls.setRoomSpawn(spawns[roomName] || spawns.lobby);
      ui.toast("Teleport", `Moved to ${roomName}`);
    }

    // Default start
    setRoom("lobby");

    // Hook page buttons
    window.addEventListener("toggle-audio", () => ui.toggleAudio());
    window.addEventListener("toggle-menu", () => ui.toggleMenu(setRoom));
    window.addEventListener("reset-player", () => controls.setRoomSpawn(spawns.lobby));

    // XR session events
    renderer.xr.addEventListener("sessionstart", () => {
      viewer.position.set(0, 0, 0);     // XR controls camera height
      controls.reapplySpawn();
      ui.toast("XR", "Entered VR ✅");
    });

    renderer.xr.addEventListener("sessionend", () => {
      viewer.position.set(0, 1.65, 0);  // restore browser height
      ui.toast("XR", "Exited VR");
    });

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      controls.update(dt);
      ui.update(dt);
      renderer.render(scene, camera);
    });

    say("Boot complete ✅");
  } catch (e) {
    const msg = e?.stack || String(e);
    if (errEl) { errEl.style.display = "block"; errEl.textContent = msg; }
    throw e;
  }
}
