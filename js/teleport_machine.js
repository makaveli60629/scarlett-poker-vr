// /js/TeleportMachine.js
// Scarlett VR Poker — Teleport Machine (refixed / permanent)
// - Self-contained: builds mesh + collider + target ring + pointer sync hooks
// - Works with your existing controller ray/teleport logic (you call setAim / setActive)

import { TeleportVFX } from "./TeleportVFX.js";

export class TeleportMachine {
  constructor({
    scene,
    THREE,
    position = { x: 0, y: 0, z: -6 },
    rotationY = 0,
    scale = 1,
    name = "TeleportMachine",
    ringRadius = 0.55,
  }) {
    this.scene = scene;
    this.THREE = THREE;

    this.group = new THREE.Group();
    this.group.name = name;
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = rotationY;
    this.group.scale.setScalar(scale);

    this.active = true;
    this._aimPoint = new THREE.Vector3();
    this._aimNormal = new THREE.Vector3(0, 1, 0);

    // ===== Base pedestal =====
    const baseGeo = new THREE.CylinderGeometry(0.75, 0.95, 0.35, 32, 1, false);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.7,
      roughness: 0.35,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.175;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // ===== Column =====
    const colGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 24);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      metalness: 0.6,
      roughness: 0.35,
    });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.y = 0.35 + 0.6;
    col.castShadow = true;
    this.group.add(col);

    // ===== Crown “dock” head =====
    const headGeo = new THREE.TorusGeometry(0.35, 0.09, 16, 48);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x252525,
      metalness: 0.85,
      roughness: 0.25,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = Math.PI / 2;
    head.position.y = 1.55;
    head.castShadow = true;
    this.group.add(head);

    // ===== Emissive core (glow base) =====
    const coreGeo = new THREE.SphereGeometry(0.12, 24, 18);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x12051d,
      emissive: 0x7b2cff,
      emissiveIntensity: 1.6,
      metalness: 0.0,
      roughness: 0.25,
    });
    const core = new THREE.Mesh(coreGeo, this.coreMat);
    core.position.y = 1.55;
    this.group.add(core);

    // ===== Target ring (visual landing indicator) =====
    const ringGeo = new THREE.RingGeometry(ringRadius * 0.7, ringRadius, 48);
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x2b0a4d,
      emissive: 0x7b2cff,
      emissiveIntensity: 1.3,
      roughness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.01; // slightly above floor
    this.scene.add(this.ring);

    // ===== Collider (simple cylinder) =====
    // Your collision system can read this.userData.collider if you have one.
    const colliGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.6, 16);
    const colliMat = new THREE.MeshBasicMaterial({ visible: false });
    this.collider = new THREE.Mesh(colliGeo, colliMat);
    this.collider.position.y = 0.3;
    this.collider.userData.isCollider = true;
    this.collider.userData.colliderType = "cylinder";
    this.collider.userData.blocking = true;
    this.group.add(this.collider);

    // ===== VFX =====
    this.vfx = new TeleportVFX({ THREE, parent: this.group });
    this.vfx.setIntensity(1.0);

    this.scene.add(this.group);

    // tick state
    this._t = 0;
    this._ringPulse = 0;
  }

  setActive(on) {
    this.active = !!on;
    this.vfx.setEnabled(this.active);
    if (!this.active) this.hideTarget();
  }

  // Call this from your controller raycast, when you have a hit on the floor.
  setAim(hitPoint, hitNormal = { x: 0, y: 1, z: 0 }) {
    if (!hitPoint) return;
    this._aimPoint.set(hitPoint.x, hitPoint.y, hitPoint.z);
    this._aimNormal.set(hitNormal.x, hitNormal.y, hitNormal.z).normalize();

    // show ring at aim point
    this.ring.position.copy(this._aimPoint);
    // align ring with normal (usually floor -> up)
    // simple: keep ring flat unless you want wall-teleport later
    this.ring.rotation.x = -Math.PI / 2;
    this.showTarget();
  }

  showTarget() {
    this.ringMat.opacity = 0.85;
  }

  hideTarget() {
    this.ringMat.opacity = 0.0;
  }

  // Optional helper: returns a safe teleport destination (e.g., keep Y = floor)
  getTeleportDestination() {
    return { x: this._aimPoint.x, y: this._aimPoint.y, z: this._aimPoint.z };
  }

  update(dt) {
    this._t += dt;

    // core pulse
    const pulse = 1.2 + Math.sin(this._t * 4.0) * 0.45;
    this.coreMat.emissiveIntensity = this.active ? pulse : 0.0;

    // ring pulse
    if (this.ringMat.opacity > 0.01) {
      this._ringPulse += dt;
      const op = 0.55 + Math.sin(this._ringPulse * 5.0) * 0.25;
      this.ringMat.opacity = Math.max(0.25, Math.min(0.95, op));
    }

    this.vfx.update(dt);
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.ring);
    this.vfx.dispose?.();
  }
}
