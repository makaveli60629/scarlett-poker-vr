// /js/world.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { JumbotronManager } from './jumbotron_manager.js';

export async function buildWorld({ scene, log }) {
  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9);
  dl.position.set(5, 8, 3);
  scene.add(dl);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Simple "table" for reference
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f6b3a, roughness: 0.75 })
  );
  table.position.set(0, 0.75, 0);
  scene.add(table);

  // Four jumbotrons around the lobby
  const jumboMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x111111, emissiveIntensity: 0.25 });
  const jumboGeo = new THREE.PlaneGeometry(3.2, 1.8);

  const mk = () => new THREE.Mesh(jumboGeo, jumboMat.clone());
  const j1 = mk(); const j2 = mk(); const j3 = mk(); const j4 = mk();

  // Positions (a ring)
  j1.position.set(0, 2.2, -6.4); j1.lookAt(0, 2.2, 0);
  j2.position.set(6.4, 2.2, 0);  j2.lookAt(0, 2.2, 0);
  j3.position.set(0, 2.2, 6.4);  j3.lookAt(0, 2.2, 0);
  j4.position.set(-6.4, 2.2, 0); j4.lookAt(0, 2.2, 0);

  scene.add(j1, j2, j3, j4);

  // Frames
  const frameGeo = new THREE.BoxGeometry(3.35, 1.95, 0.08);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.9 });
  for (const j of [j1, j2, j3, j4]) {
    const f = new THREE.Mesh(frameGeo, frameMat);
    f.position.copy(j.position);
    f.quaternion.copy(j.quaternion);
    f.translateZ(-0.05);
    scene.add(f);
  }

  // Streaming manager
  const jumbos = new JumbotronManager({ channelsUrl: './streams/channels.json', log });
  await jumbos.addScreen(j1, 0);
  await jumbos.addScreen(j2, 1);
  await jumbos.addScreen(j3, 2);
  await jumbos.addScreen(j4, 3);

  return { jumbos };
}
