import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { DIMS, getCardinals } from "./world_constants.js";

export function buildLights(world, renderer, quality = "quest") {
  const { FLOOR_Y } = DIMS;
  const { roomN, roomS, roomE, roomW } = getCardinals();

  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const g = new THREE.Group();
  g.name = "Lights";
  world.group.add(g);

  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  g.add(amb);
  world.lights.push(amb);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(8, 12, 6);
  dir.target.position.set(0, 0, 0);
  g.add(dir);
  g.add(dir.target);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -25;
  dir.shadow.camera.right = 25;
  dir.shadow.camera.top = 25;
  dir.shadow.camera.bottom = -25;
  world.lights.push(dir);

  function addRoomGlow(room, color, intensity = 1.1) {
    const p = new THREE.PointLight(color, intensity, 22, 2);
    p.position.set(room.x, FLOOR_Y + 3.2, room.z);
    g.add(p);
    world.lights.push(p);
  }

  addRoomGlow(roomN, 0x2aa6ff, 1.0);
  addRoomGlow(roomS, 0xf3c969, 0.95);
  addRoomGlow(roomE, 0xff2aa6, 1.1);
  addRoomGlow(roomW, 0x2aa6ff, 1.0);

  return g;
}
