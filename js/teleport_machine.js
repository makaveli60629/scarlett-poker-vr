import * as THREE from "three";
import { State } from "./state.js";

export const TeleportMachine = {
  renderer: null,
  scene: null,
  player: null,

  controller: null,
  ray: new THREE.Raycaster(),
  marker: null,
  lastPoint: null,

  init(renderer, scene, player) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = player;

    // LEFT controller
    this.controller = renderer.xr.getController(0);
    scene.add(this.controller);

    this.marker = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff66 })
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker);

    this.controller.addEventListener("selectend", () => {
      if (!this.marker.visible || !this.lastPoint) return;
      const { x, z } = this.lastPoint;
      if (this.isPointBlocked(x, z)) return;
      this.player.position.set(x, State.player.height, z);
    });
  },

  update() {
    const floor = this.scene.children.find(o => o.name === "floor");
    if (!floor) return;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    this.controller.getWorldPosition(origin);
    dir.applyQuaternion(this.controller.getWorldQuaternion(new THREE.Quaternion())).normalize();

    this.ray.set(origin, dir);
    const hits = this.ray.intersectObject(floor, false);

    if (!hits.length) {
      this.marker.visible = false;
      this.lastPoint = null;
      return;
    }

    const p = hits[0].point;
    const blocked = this.isPointBlocked(p.x, p.z);

    this.lastPoint = p;
    this.marker.visible = !blocked;
    if (!blocked) this.marker.position.set(p.x, 0.02, p.z);
  },

  isPointBlocked(x, z) {
    const r = State.player.radius + 0.05;
    for (const obj of State.world.colliders) {
      const aabb = obj.userData?.aabb;
      if (!aabb) continue;
      if (x > aabb.min.x - r && x < aabb.max.x + r && z > aabb.min.z - r && z < aabb.max.z + r) return true;
    }
    return false;
  }
};
