import { THREE } from '../core/engine.js';
import { log } from '../core/diag.js';

export function SpawnModule() {
  return {
    name: 'spawn',
    init(engine) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.06, 32),
        new THREE.MeshStandardMaterial({ color: 0x1b2bff, emissive: 0x0b0f66, metalness: 0.3, roughness: 0.25 })
      );
      pad.position.set(0, 0.03, 3.2);
      pad.name = 'spawnPad';
      engine.scene.add(pad);

      // initial spawn on pad
      engine.rig.position.set(0, 0, 0);
      engine.camera.position.set(0, 1.65, 3.2);
      log('[spawn] ready');
    }
  };
}
