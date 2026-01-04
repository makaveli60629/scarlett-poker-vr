import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

export const Controls = {
  keys: { w: false, a: false, s: false, d: false },
  speed: 0.06,

  init(renderer, scene, playerGroup) {
    this.renderer = renderer;
    this.scene = scene;
    this.playerGroup = playerGroup;

    // Desktop keyboard fallback (does NOT run every frame)
    window.addEventListener('keydown', (e) => { if (e.key in this.keys) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { if (e.key in this.keys) this.keys[e.key] = false; });

    // XR controllers + visible lasers
    this.controllers = [];
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const line = new THREE.Line(geom, mat);
      line.name = 'laser';
      line.scale.z = 6;
      c.add(line);

      // Teleport “step forward” (baseline)
      c.addEventListener('selectstart', () => {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
        this.playerGroup.position.x += dir.x * 1.5;
        this.playerGroup.position.z += dir.z * 1.5;
      });

      this.playerGroup.add(c);
      this.controllers.push(c);
    }
  },

  update() {
    if (!this.playerGroup) return;

    // Desktop movement only (VR movement is via controller selectstart step)
    if (this.keys.w) this.playerGroup.position.z -= this.speed;
    if (this.keys.s) this.playerGroup.position.z += this.speed;
    if (this.keys.a) this.playerGroup.position.x -= this.speed;
    if (this.keys.d) this.playerGroup.position.x += this.speed;
  }
};
