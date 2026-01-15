// /js/scarlett1/world_pads.js
import { C } from "./world_constants.js";

export function buildPads(THREE, group, mats, layout) {
  const pads = [];

  function makePad(name, position, target, colorMat) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 20), colorMat);
    pad.position.set(position.x, 0.06, position.z);
    pad.userData.teleport = true;
    pad.userData.target = target; // THREE.Vector3
    pad.name = `PAD_${name}`;
    group.add(pad);
    pads.push(pad);
  }

  // Lobby pads (ring)
  makePad("LOBBY_N", new THREE.Vector3(0, 0, C.LOBBY_R * 0.55), new THREE.Vector3(0, 0, C.LOBBY_R * 0.55), mats.neonCyan);
  makePad("LOBBY_E", new THREE.Vector3(C.LOBBY_R * 0.55, 0, 0), new THREE.Vector3(C.LOBBY_R * 0.55, 0, 0), mats.neonMagenta);
  makePad("LOBBY_S", new THREE.Vector3(0, 0, -C.LOBBY_R * 0.55), new THREE.Vector3(0, 0, -C.LOBBY_R * 0.55), mats.neonGreen);
  makePad("LOBBY_W", new THREE.Vector3(-C.LOBBY_R * 0.55, 0, 0), new THREE.Vector3(-C.LOBBY_R * 0.55, 0, 0), mats.neonCyan);

  // Room pads (center of each room)
  for (const [name, room] of Object.entries(layout.rooms)) {
    makePad(name, room.center, room.center, mats.neonMagenta);
  }

  return { pads };
}
