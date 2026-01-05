import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";
import { registerCollider } from "./state.js";

export const Chair = {
  buildSet(scene, centerX = 0, centerZ = 0) {
    const chairMat = TextureBank.standard({
      mapFile: Textures.SOFA_DIFF,
      normalMapFile: Textures.SOFA_NORM,
      color: 0x666666,
      roughness: 0.95
    });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = centerX + Math.cos(a) * 4.2;
      const z = centerZ + Math.sin(a) * 4.2;

      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), chairMat);
      seat.position.y = 0.45;

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.08), chairMat);
      back.position.set(0, 0.75, -0.26);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 16), chairMat);
      base.position.y = 0.22;

      chair.add(seat, back, base);
      chair.position.set(x, 0, z);
      chair.lookAt(centerX, 0.5, centerZ);
      chair.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
      scene.add(chair);

      registerCollider(chair, {
        min: { x: x - 0.35, y: 0, z: z - 0.35 },
        max: { x: x + 0.35, y: 1.3, z: z + 0.35 }
      });
    }
  }
};
