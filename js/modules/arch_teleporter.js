import { THREE } from '../core/engine.js';

export function ArchTeleporterModule() {
  return {
    name: 'arch_teleporter',
    init(engine) {
      const s = engine.scene;
      const root = new THREE.Group();
      root.position.set(0, 0, -10);
      root.name = 'teleportArch';
      s.add(root);

      const mat = new THREE.MeshStandardMaterial({ color: 0x0b1b2d, emissive: 0x0033ff, emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.35 });
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), mat);
      left.position.set(-1.2, 1.6, 0);
      const right = left.clone();
      right.position.x = 1.2;
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.35, 0.35), mat);
      top.position.set(0, 3.1, 0);
      root.add(left, right, top);

      const ringMat = new THREE.MeshStandardMaterial({ color: 0x08111d, emissive: 0x00c8ff, emissiveIntensity: 2.0, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 12, 48), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 1.65, 0);
      root.add(ring);

      // Platform under arch (teleport target)
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.12, 48),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x001122, emissiveIntensity: 0.6, roughness: 0.9, metalness: 0.05 })
      );
      pad.position.set(0, 0.06, 0);
      root.add(pad);
      engine.addTeleportTarget(pad);

      // Simple "portal" interaction: if you teleport onto pad, nudge you forward into the stage
      this._cool = 0;
      this._padWorld = new THREE.Vector3();
      this._tmp = new THREE.Vector3();
      this.update = (dt, eng) => {
        this._cool = Math.max(0, this._cool - dt);
        if (this._cool > 0) return;
        pad.getWorldPosition(this._padWorld);
        eng.camera.getWorldPosition(this._tmp);
        const d = this._tmp.distanceTo(this._padWorld);
        if (d < 1.1) {
          eng.rig.position.add(new THREE.Vector3(0, 0, -6));
          this._cool = 2.0;
        }
      };
    }
  };
}
