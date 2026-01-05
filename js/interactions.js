import * as THREE from "three";
import { State } from "./state.js";

export const Interactions = {
  renderer: null,
  scene: null,
  camera: null,
  controller: null,
  ray: new THREE.Raycaster(),
  laser: null,
  active: false,

  init(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // LEFT controller
    this.controller = renderer.xr.getController(0);
    scene.add(this.controller);

    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
    this.laser.visible = false;
    this.controller.add(this.laser);

    // Grip = enable pointer
    this.controller.addEventListener("squeezestart", () => {
      this.active = true;
      this.laser.visible = true;
    });
    this.controller.addEventListener("squeezeend", () => {
      this.active = false;
      this.laser.visible = false;
    });

    // Trigger click when pointer active
    this.controller.addEventListener("selectstart", () => {
      if (!this.active) return;
      const hit = this.getHit();
      if (hit?.object?.userData?.onClick) hit.object.userData.onClick();
    });
  },

  update() {
    if (!this.active) return;
    const hit = this.getHit();
    const dist = hit ? hit.distance : 5;
    this.laser.geometry.attributes.position.setZ(1, -dist);
    this.laser.geometry.attributes.position.needsUpdate = true;
  },

  getHit() {
    const interactables = State.world.interactables || [];
    if (!interactables.length) return null;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    this.controller.getWorldPosition(origin);
    dir.applyQuaternion(this.controller.getWorldQuaternion(new THREE.Quaternion())).normalize();

    this.ray.set(origin, dir);
    const hits = this.ray.intersectObjects(interactables, true);
    return hits.length ? hits[0] : null;
  }
};
