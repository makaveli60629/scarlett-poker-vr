import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRController = {
  renderer: null,
  scene: null,
  rig: null,
  camera: null,
  getWorld: null,

  leftCtrl: null,
  rightCtrl: null,

  ray: null,
  laser: null,
  ring: null,

  _hit: new THREE.Vector3(),
  _dir: new THREE.Vector3(),
  _tmp: new THREE.Vector3(),

  init({ renderer, scene, rig, camera, getWorld }) {
    this.renderer = renderer;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;
    this.getWorld = getWorld;

    this.ray = new THREE.Raycaster();

    this.leftCtrl = this.renderer.xr.getController(0);
    this.rightCtrl = this.renderer.xr.getController(1);
    this.scene.add(this.leftCtrl);
    this.scene.add(this.rightCtrl);

    // Visible hands (simple)
    this.leftCtrl.add(this._mkHand(0x2bd7ff));
    this.rightCtrl.add(this._mkHand(0x00ffaa));

    // Laser from RIGHT controller
    const laserGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 10);
    const laserMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.9,
      roughness: 0.25,
      metalness: 0.0,
    });
    this.laser = new THREE.Mesh(laserGeo, laserMat);
    this.laser.rotation.x = Math.PI / 2;
    this.laser.position.z = -0.5;
    this.rightCtrl.add(this.laser);

    // Teleport ring (on floor)
    const ringGeo = new THREE.TorusGeometry(0.32, 0.03, 10, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
  },

  _mkHand(color) {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.03, 0.09),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, emissive: color, emissiveIntensity: 0.15 })
    );
    palm.position.set(0, 0, -0.04);
    g.add(palm);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.25 })
    );
    tip.position.set(0, 0, -0.10);
    g.add(tip);
    return g;
  },

  update() {
    const session = this.renderer.xr.getSession?.();
    if (!session) {
      this.ring.visible = false;
      return;
    }

    // Always raycast from RIGHT controller, so it never sticks to center
    const gp = this._getGamepad(session, "right");
    const isTrigger = (gp?.buttons?.[0]?.value ?? 0) > 0.25;

    // Ray origin/direction from controller pose
    this.rightCtrl.getWorldPosition(this._tmp);
    this._dir.set(0, 0, -1).applyQuaternion(this.rightCtrl.quaternion).normalize();

    this.ray.set(this._tmp, this._dir);

    // Floor hit at y=floorY
    const world = this.getWorld?.();
    const floorY = world?.floorY ?? 0;

    // Solve ray-plane intersection
    const t = (floorY - this._tmp.y) / (this._dir.y || -0.00001);
    const valid = isFinite(t) && t > 0.1 && t < 30;

    if (valid) {
      this._hit.copy(this._tmp).addScaledVector(this._dir, t);
      this.ring.position.set(this._hit.x, floorY + 0.01, this._hit.z);
      this.ring.visible = true;
    } else {
      this.ring.visible = false;
    }

    // If trigger pressed hard, teleport (pad snap if close)
    if ((gp?.buttons?.[0]?.value ?? 0) > 0.80 && this.ring.visible) {
      // Snap to pad if within radius
      let dest = this._hit.clone();
      const pads = world?.pads || [];
      for (const p of pads) {
        if (!p?.position) continue;
        if (p.position.distanceTo(dest) <= (p.radius ?? 1.0) + 0.35) {
          dest = p.position.clone();
          break;
        }
      }

      // Ask Controls to teleport by putting rig there (we call globally if present)
      // Controls is in main system; we can’t import it safely here without chaining.
      window.__scarlettTeleportTo?.(dest);
    }
  },

  _getGamepad(session, hand) {
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === hand) return src.gamepad;
    }
    return null;
  },
};

// Bridge: main.js can set this to Controls.teleportTo
window.__scarlettTeleportTo = window.__scarlettTeleportTo || null;
