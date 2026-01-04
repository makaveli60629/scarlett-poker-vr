import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

export const Controls = {
  renderer: null,
  scene: null,
  player: null,
  runtime: null,

  controllers: [],
  rays: [],
  reticle: null,

  raycaster: new THREE.Raycaster(),
  tmpMat: new THREE.Matrix4(),
  tmpPos: new THREE.Vector3(),
  tmpDir: new THREE.Vector3(),
  moveVec: new THREE.Vector3(),

  // Smooth locomotion (thumbstick)
  speed: 1.6, // meters/sec
  turnSpeed: 2.2,
  lastTime: 0,

  init(renderer, scene, playerGroup, worldRuntime) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = playerGroup;
    this.runtime = worldRuntime;

    // Reticle
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.18, 28),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    scene.add(this.reticle);

    // Controllers with rays
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const line = new THREE.Line(geom, mat);
      line.name = "teleRay";
      line.scale.z = 10;
      c.add(line);

      // Teleport on trigger
      c.addEventListener('selectstart', () => {
        if (this._teleportValid) {
          this.player.position.x = this._teleportPoint.x;
          this.player.position.z = this._teleportPoint.z;
        }
      });

      this.player.add(c);
      this.controllers.push(c);
      this.rays.push(line);
    }

    // Desktop fallback movement
    this.keys = { w:false, a:false, s:false, d:false };
    window.addEventListener('keydown', (e)=>{ if (e.key in this.keys) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e)=>{ if (e.key in this.keys) this.keys[e.key] = false; });

    this._teleportPoint = new THREE.Vector3();
    this._teleportValid = false;
  },

  update() {
    const t = this.renderer.clock?.getElapsedTime?.() ?? performance.now()/1000;
    const dt = Math.min(0.033, Math.max(0.001, t - (this.lastTime || t)));
    this.lastTime = t;

    // 1) Update teleport ray (use right controller if present, else left)
    this.updateTeleportRay();

    // 2) Smooth locomotion if thumbstick present
    this.updateSmoothMove(dt);

    // 3) Desktop WASD fallback
    this.updateKeyboard(dt);
  },

  updateTeleportRay() {
    // Choose a controller for pointing (prefer right)
    const c = this.controllers[1] || this.controllers[0];
    if (!c) return;

    // Ray origin/direction from controller
    c.updateMatrixWorld(true);
    this.tmpMat.identity().extractRotation(c.matrixWorld);

    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpMat).normalize();

    this.raycaster.set(origin, dir);

    // Only intersect teleportables
    const targets = this.runtime?.teleportables || [];
    const hits = this.raycaster.intersectObjects(targets, false);

    if (hits.length > 0) {
      const hit = hits[0];

      this._teleportValid = true;
      this._teleportPoint.copy(hit.point);

      // reticle
      this.reticle.visible = true;
      this.reticle.position.set(hit.point.x, hit.point.y + 0.02, hit.point.z);

      // green ray
      for (const r of this.rays) r.material.color.setHex(0x00ff00);
      this.reticle.material.color.setHex(0x00ff88);
    } else {
      this._teleportValid = false;
      this.reticle.visible = false;

      // red ray (blocked)
      for (const r of this.rays) r.material.color.setHex(0xff3355);
    }
  },

  updateSmoothMove(dt) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    // Find a gamepad input source (controller)
    let gp = null;
    for (const src of session.inputSources) {
      if (src.gamepad) { gp = src.gamepad; break; }
    }
    if (!gp) return;

    // Oculus thumbstick is usually axes[2], axes[3] on some devices; fallback axes[0], axes[1]
    const axX = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
    const axY = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];

    const dead = 0.15;
    const x = Math.abs(axX) > dead ? axX : 0;
    const y = Math.abs(axY) > dead ? axY : 0;

    if (x === 0 && y === 0) return;

    // Move relative to headset yaw
    const cam = this.player.children.find(o => o.isCamera);
    if (!cam) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    forward.y = 0; forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    right.y = 0; right.normalize();

    this.moveVec.set(0,0,0);
    this.moveVec.addScaledVector(forward, -y);
    this.moveVec.addScaledVector(right, x);
    this.moveVec.normalize().multiplyScalar(this.speed * dt);

    // Try move + resolve collisions
    this.tryMove(this.moveVec);
  },

  updateKeyboard(dt) {
    this.moveVec.set(0,0,0);
    if (this.keys.w) this.moveVec.z -= 1;
    if (this.keys.s) this.moveVec.z += 1;
    if (this.keys.a) this.moveVec.x -= 1;
    if (this.keys.d) this.moveVec.x += 1;
    if (this.moveVec.lengthSq() === 0) return;

    this.moveVec.normalize().multiplyScalar(1.6 * dt);
    this.tryMove(this.moveVec);
  },

  tryMove(delta) {
    const next = this.player.position.clone().add(delta);

    // Basic collision resolution against AABBs (player as circle)
    const radius = 0.35; // player body radius
    const colliders = this.runtime?.colliders || [];

    // resolve X then Z (simple and stable)
    let px = next.x;
    let pz = this.player.position.z;

    // X axis
    ({ px } = this.resolveAxis(px, pz, radius, colliders, 'x'));

    // Z axis
    pz = next.z;
    ({ pz } = this.resolveAxis(px, pz, radius, colliders, 'z'));

    this.player.position.x = px;
    this.player.position.z = pz;
  },

  resolveAxis(px, pz, r, colliders, axis) {
    for (const c of colliders) {
      if (c.type !== 'aabb') continue;

      // Check circle vs AABB (2D XZ)
      const minX = c.min.x - r;
      const maxX = c.max.x + r;
      const minZ = c.min.z - r;
      const maxZ = c.max.z + r;

      if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
        // push out along axis
        if (axis === 'x') {
          const pushLeft = Math.abs(px - minX);
          const pushRight = Math.abs(maxX - px);
          px = (pushLeft < pushRight) ? minX : maxX;
        } else {
          const pushBack = Math.abs(pz - minZ);
          const pushFront = Math.abs(maxZ - pz);
          pz = (pushBack < pushFront) ? minZ : maxZ;
        }
      }
    }
    return { px, pz };
  }
};
