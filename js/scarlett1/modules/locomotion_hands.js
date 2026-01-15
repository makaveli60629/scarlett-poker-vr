// /js/scarlett1/modules/locomotion_hands.js
export class HandsLocomotion {
  constructor({ THREE, renderer, rig, camera }) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.rig = rig;
    this.camera = camera;

    this.surfaces = [];
    this.pads = [];

    this.ray = new THREE.Raycaster();
    this.ray.far = 30;
    this.ray.camera = camera;

    this.reticle = null;

    this.snapDeg = 30;
    this.lastSnap = 999;
    this.snapCooldown = 0.25;

    this._pinchQueue = []; // {handedness, jointPos, jointQuat, t}
  }

  async init({ world }) {
    const THREE = this.THREE;

    // Reticle ring
    const geo = new THREE.RingGeometry(0.18, 0.22, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x55aaff, side: THREE.DoubleSide });
    this.reticle = new THREE.Mesh(geo, mat);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    world.scene.add(this.reticle);

    // Connect to HandInput (module bus keeps it modular; we discover it)
    const handMod = world.bus.mods.find(m => m?.constructor?.name === "HandInput");
    if (handMod) {
      handMod.onPinch = (e) => this.queuePinch(e);
    }
  }

  setTeleportTargets({ pads = [], surfaces = [] }) {
    this.pads = pads || [];
    this.surfaces = surfaces || [];
  }

  queuePinch(e) {
    this._pinchQueue.push({ ...e, t: performance.now() * 0.001 });
    if (this._pinchQueue.length > 8) this._pinchQueue.shift();
  }

  update({ dt, t }) {
    this.lastSnap += dt;

    // Compute a center-screen ray hit so reticle always exists
    const hit = this._centerRayHit();
    if (hit) {
      this.reticle.position.copy(hit.point);
      this.reticle.position.y += 0.01;
      this.reticle.visible = true;
    } else {
      this.reticle.visible = false;
    }

    // Process pinches
    while (this._pinchQueue.length) {
      const e = this._pinchQueue.shift();

      // Right pinch can snap-turn if you pinch while looking off-center
      if (e.handedness === "right") {
        const turn = this._computeSnapFromLook();
        if (turn !== 0 && this.lastSnap >= this.snapCooldown) {
          this.lastSnap = 0;
          this.rig.rotation.y += this.THREE.MathUtils.degToRad(turn * this.snapDeg);
          continue;
        }
      }

      // Teleport to hit point
      if (hit?.point) {
        this.rig.position.set(hit.point.x, this.rig.position.y, hit.point.z);
      }
    }
  }

  _computeSnapFromLook() {
    // If user is looking left/right enough, snap that direction
    const dir = new this.THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // Use X component as a crude “look offset”
    if (dir.x > 0.35) return -1;
    if (dir.x < -0.35) return +1;
    return 0;
  }

  _centerRayHit() {
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);

    // pads first
    if (this.pads?.length) {
      const hits = this.ray.intersectObjects(this.pads, true);
      if (hits?.length) return hits[0];
    }
    // surfaces next
    if (this.surfaces?.length) {
      const hits = this.ray.intersectObjects(this.surfaces, true);
      if (hits?.length) return hits[0];
    }
    return null;
  }
}
