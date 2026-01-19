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
      // Place spawn pad in front of the Teleport Arch (promo entry point).
      // (Arch module is at z=-10.)
      pad.position.set(0, 0.03, -7.2);
      pad.name = 'spawnPad';
      engine.scene.add(pad);
      engine.addTeleportTarget(pad);

      // initial spawn on pad
      // IMPORTANT: set rig position (camera is a child of rig).
      engine.rig.position.set(0, 0, -7.2);
      engine.rig.rotation.set(0, Math.PI, 0); // face the arch / stage
      // keep camera local at human height
      engine.camera.position.set(0, 1.65, 0);
      log('[spawn] ready');
    }
  };
}
