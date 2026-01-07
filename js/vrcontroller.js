// /js/vrcontroller.js — Scarlett Poker VR — VR Ray (Laser + Floor Ring) v1
// Attaches to XR controllers (not the world center).
// Right trigger (button 0) while pointing at kiosk => toggles Store.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRController = {
  renderer: null,
  scene: null,
  camera: null,

  raycaster: new THREE.Raycaster(),
  tempMatrix: new THREE.Matrix4(),

  controllers: [],
  lines: [],
  rings: [],

  floorY: 0,
  getRayTargets: null,
  onKioskActivate: null,

  _pressed: { rightTrigger: false },

  init({ renderer, scene, camera, floorY = 0, getRayTargets, onKioskActivate }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.floorY = floorY;
    this.getRayTargets = getRayTargets;
    this.onKioskActivate = onKioskActivate;

    // Build two controllers (0/1)
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.userData.index = i;
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

      // Floor ring marker
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.12, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      this.rings.push(ring);

      // Input events
      c.addEventListener("connected", (e) => {
        c.userData.gamepad = e.data?.gamepad || null;
        c.userData.handedness = e.data?.handedness || "";
      });

      c.addEventListener("disconnected", () => {
        c.userData.gamepad = null;
        c.userData.handedness = "";
      });
    }
  },

  update() {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) {
      // hide ring when not in VR
      for (const r of this.rings) r.visible = false;
      return;
    }

    // Determine "right hand controller" if possible
    let rightIndex = 0;
    // Try to map handedness from inputSources
    const sources = session.inputSources || [];
    for (let i = 0; i < sources.length; i++) {
      if (sources[i]?.handedness === "right") rightIndex = i;
    }

    const targets = (typeof this.getRayTargets === "function") ? this.getRayTargets() : [];

    // Update each controller ray
    for (let i = 0; i < this.controllers.length; i++) {
      const c = this.controllers[i];
      const line = this.lines[i];
      const ring = this.rings[i];

      // Build ray from controller
      this.tempMatrix.identity().extractRotation(c.matrixWorld);

      this.raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

      // Intersect with scene targets first
      const hit = this.raycaster.intersectObjects(targets, true)[0];

      if (hit) {
        line.scale.z = hit.distance;
        ring.visible = true;
        ring.position.set(hit.point.x, this.floorY + 0.01, hit.point.z);

        // If aiming at store kiosk and right trigger pressed => activate
        if (i === rightIndex) {
          const gp = this._getGamepadFor(session, "right") || this._getGamepadForIndex(session, rightIndex);
          const trig = gp?.buttons?.[0]?.value ?? 0;
          const pressed = trig > 0.75;

          if (pressed && !this._pressed.rightTrigger) {
            this._pressed.rightTrigger = true;

            // only activate if hit object is part of kiosk
            const isKiosk = !!hit.object?.parent?.userData?.isStoreKiosk || !!hit.object?.userData?.isStoreKiosk;
            if (isKiosk) this.onKioskActivate?.();
          }
          if (!pressed) this._pressed.rightTrigger = false;
        }
      } else {
        // default extend to floor plane intersection
        const t = (this.floorY - this.raycaster.ray.origin.y) / this.raycaster.ray.direction.y;
        if (isFinite(t) && t > 0) {
          const p = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(t));
          line.scale.z = Math.min(10, t);
          ring.visible = true;
          ring.position.set(p.x, this.floorY + 0.01, p.z);
        } else {
          ring.visible = false;
          line.scale.z = 10;
        }
      }
    }
  },

  _getGamepadFor(session, handedness) {
    for (const src of session.inputSources || []) {
      if (src?.handedness === handedness && src?.gamepad) return src.gamepad;
    }
    return null;
  },

  _getGamepadForIndex(session, idx) {
    const src = (session.inputSources || [])[idx];
    return src?.gamepad || null;
  }
};
