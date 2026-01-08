// /js/scorpion_room.js — Update 9.0 Scorpion Room (safe, visual)

import { createTextureKit } from "./textures.js";

export async function initScorpionRoom({ THREE, scene, world, log = console.log }) {
  const kit = createTextureKit(THREE, { log });

  const g = new THREE.Group();
  g.name = "ScorpionRoom";
  g.position.set(5.5, 0, 2.5); // right side of lobby
  world.group.add(g);

  // room box
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 3.2, 5.5),
    new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.95 })
  );
  room.position.set(0, 1.6, 6.0);
  g.add(room);

  // doorway frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1a0b0b, emissive: 0x4a0b0b, emissiveIntensity: 0.25, roughness: 0.7 })
  );
  frame.position.set(0, 1.3, 3.4);
  g.add(frame);

  // sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.35, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 0.35 })
  );
  sign.position.set(0, 2.75, 3.3);
  g.add(sign);

  // scorpion statue (placeholder mesh)
  const statue = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.65, 1),
    new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.65, metalness: 0.15 })
  );
  statue.position.set(0, 1.0, 6.3);
  g.add(statue);

  // wall art (placeholders — swap textures later)
  const picTex1 = await kit.load("assets/textures/walls/pic1.png").catch(() => null);
  const picTex2 = await kit.load("assets/textures/walls/pic2.png").catch(() => null);

  const picMat1 = picTex1
    ? new THREE.MeshStandardMaterial({ map: picTex1, roughness: 0.9 })
    : new THREE.MeshStandardMaterial({ color: 0x202040, roughness: 0.9 });

  const picMat2 = picTex2
    ? new THREE.MeshStandardMaterial({ map: picTex2, roughness: 0.9 })
    : new THREE.MeshStandardMaterial({ color: 0x402020, roughness: 0.9 });

  const pic1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), picMat1);
  pic1.position.set(-2.3, 1.8, 6.0);
  pic1.rotation.y = Math.PI / 2;
  g.add(pic1);

  const pic2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), picMat2);
  pic2.position.set(2.3, 1.8, 6.0);
  pic2.rotation.y = -Math.PI / 2;
  g.add(pic2);

  return {
    group: g,
    tick(dt) {
      statue.rotation.y += dt * 0.35;
    }
  };
}
