// /js/vrcontroller.js — VR Ray v2 (controller-attached laser + floor ring + primary action)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRController = {
  renderer: null,
  scene: null,
  camera: null,
  floorY: 0,

  controllers: [],
  lines: [],
  rings: [],

  raycaster: new THREE.Raycaster(),
  tempMatrix: new THREE.Matrix4(),

  getRayTargets: null,
  onPrimaryAction: null,

  _pressed: false,

  init({ renderer, scene, camera, floorY = 0, getRayTargets, onPrimaryAction }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.floorY = floorY;
    this.getRayTargets = getRayTargets;
    this.onPrimaryAction = onPrimaryAction;

    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      scene.add(c);
      this.controllers.push(c);

      // Laser line
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
      const line = new THREE.Line(geo, mat);
      line.scale.z = 10;
      c.add(line);
      this.lines.push(line);

      // Floor ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.14, 32),
        new THREE.MeshBasicMaterial({
          color: 0x00ffaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      this.rings.push(ring);
    }
  },

  update() {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) {
      for (const r of this.rings) r.visible = false;
      return;
    }

    const targets = (typeof this.getRayTargets === "function") ? this.getRayTargets() : [];

    // Find right-hand gamepad if possible
    let rightGP = null;
    for (const src of session.inputSources || []) {
      if (src?.handedness === "right" && src?.gamepad) rightGP = src.gamepad;
    }

    for (let i = 0; i < this.controllers.length; i++) {
      const c = this.controllers[i];
      const line = this.lines[i];
      const ring = this.rings[i];

      this.tempMatrix.identity().extractRotation(c.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

      const hit = targets.length ? this.raycaster.intersectObjects(targets, true)[0] : null;

      if (hit) {
        line.scale.z = hit.distance;
        ring.visible = true;
        ring.position.set(hit.point.x, this.floorY + 0.01, hit.point.z);
      } else {
        // intersect floor plane for ring
        const dir = this.raycaster.ray.direction;
        const org = this.raycaster.ray.origin;
        const t = (this.floorY - org.y) / dir.y;

        if (isFinite(t) && t > 0) {
          const p = org.clone().add(dir.clone().multiplyScalar(t));
          line.scale.z = Math.min(10, t);
          ring.visible = true;
          ring.position.set(p.x, this.floorY + 0.01, p.z);
        } else {
          ring.visible = false;
          line.scale.z = 10;
        }
      }

      // Primary action on RIGHT trigger (use right gamepad)
      if (rightGP) {
        const trig = rightGP.buttons?.[0]?.value ?? 0;
        const down = trig > 0.75;

        if (down && !this._pressed) {
          this._pressed = true;
          if (hit) this.onPrimaryAction?.(hit);
        }
        if (!down) this._pressed = false;
      }
    }
  }
};
