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

  moveSpeed: 3.6,          // faster
  turnMode: 'snap',
  snapAngle: THREE.MathUtils.degToRad(45),
  deadzone: 0.18,

  lastTime: 0,
  _snapReady: true,

  _teleportPoint: new THREE.Vector3(),
  _teleportValid: false,
  _uiHover: null,

  _hop: { active:false, t0:0, dur:0.22, start:null, end:null },

  init(renderer, scene, playerGroup, worldRuntime) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = playerGroup;
    this.runtime = worldRuntime;

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.10, 0.16, 28),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    scene.add(this.reticle);

    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
      line.scale.z = 10;
      c.add(line);

      c.addEventListener('selectstart', () => {
        // UI click has priority
        if (this._uiHover?.userData?.onClick) {
          this._uiHover.userData.onClick();
          return;
        }
        // Otherwise hop-teleport
        if (this._teleportValid) this.startHopTeleport(this._teleportPoint);
      });

      this.player.add(c);
      this.controllers.push(c);
      this.rays.push(line);
    }

    // Desktop fallback
    this.keys = { w:false, a:false, s:false, d:false };
    window.addEventListener('keydown', (e)=>{ if (e.key in this.keys) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e)=>{ if (e.key in this.keys) this.keys[e.key] = false; });
  },

  update() {
    const t = performance.now()/1000;
    const dt = Math.min(0.033, Math.max(0.001, t - (this.lastTime || t)));
    this.lastTime = t;

    this.updateHop();
    this.updateLaserAndTargets();
    this.updateXRMoveTurn(dt);
    this.updateKeyboard(dt);
  },

  // -------- Hop Teleport --------
  startHopTeleport(point) {
    this._hop.active = true;
    this._hop.t0 = performance.now() / 1000;
    this._hop.start = this.player.position.clone();
    this._hop.end = new THREE.Vector3(point.x, 0, point.z);
  },

  updateHop() {
    if (!this._hop.active) return;

    const t = performance.now() / 1000;
    const u = (t - this._hop.t0) / this._hop.dur;

    if (u >= 1) {
      this.player.position.x = this._hop.end.x;
      this.player.position.z = this._hop.end.z;
      this.player.position.y = 0;
      this._hop.active = false;
      return;
    }

    const s = u * u * (3 - 2 * u);
    const hopY = 0.22 * (4 * u * (1 - u));

    this.player.position.x = THREE.MathUtils.lerp(this._hop.start.x, this._hop.end.x, s);
    this.player.position.z = THREE.MathUtils.lerp(this._hop.start.z, this._hop.end.z, s);
    this.player.position.y = hopY;
  },

  // -------- Laser: UI click OR Teleport --------
  updateLaserAndTargets() {
    const c = this.controllers[1] || this.controllers[0];
    if (!c) return;

    c.updateMatrixWorld(true);
    this.tmpMat.identity().extractRotation(c.matrixWorld);

    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpMat).normalize();

    this.raycaster.set(origin, dir);

    // 1) UI targets first
    const uiTargets = this.runtime?.interactables || [];
    const uiHits = this.raycaster.intersectObjects(uiTargets, false);
    if (uiHits.length > 0) {
      this._uiHover = uiHits[0].object;
      this._teleportValid = false;

      for (const r of this.rays) r.material.color.setHex(0x00e5ff); // cyan
      this.reticle.visible = true;
      this.reticle.position.copy(uiHits[0].point).add(new THREE.Vector3(0, 0.02, 0));
      this.reticle.material.color.setHex(0x00e5ff);
      return;
    }
    this._uiHover = null;

    // 2) Teleportables
    const targets = this.runtime?.teleportables || [];
    const hits = this.raycaster.intersectObjects(targets, false);

    if (hits.length > 0) {
      const hit = hits[0];
      this._teleportValid = true;
      this._teleportPoint.copy(hit.point);

      this.reticle.visible = true;
      this.reticle.position.set(hit.point.x, hit.point.y + 0.02, hit.point.z);

      for (const r of this.rays) r.material.color.setHex(0x00ff00);
      this.reticle.material.color.setHex(0x00ff88);
    } else {
      this._teleportValid = false;
      this.reticle.visible = false;
      for (const r of this.rays) r.material.color.setHex(0xff3355);
    }
  },

  // -------- XR move + snap turn --------
  updateXRMoveTurn(dt) {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    let left = null, right = null;
    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === 'left') left = src;
      if (src.handedness === 'right') right = src;
    }
    const gps = [...session.inputSources].filter(s => s.gamepad);
    if (!left && gps[0]) left = gps[0];
    if (!right && gps[1]) right = gps[1];

    if (left?.gamepad) {
      const { x:lx, y:ly } = this.readStick(left.gamepad, 'left');
      this.applyMove(lx, ly, dt);
    }
    if (right?.gamepad) {
      const { x:rx } = this.readStick(right.gamepad, 'right');
      this.applySnapTurn(rx);
    }
  },

  readStick(gamepad, which) {
    const axes = gamepad.axes || [];
    let x = 0, y = 0;

    // Common mapping: left=[2,3], right=[0,1]
    if (axes.length >= 4) {
      if (which === 'left')  { x = axes[2]; y = axes[3]; }
      if (which === 'right') { x = axes[0]; y = axes[1]; }
    } else if (axes.length >= 2) {
      if (which === 'left') { x = axes[0]; y = axes[1]; }
    }

    x = Math.abs(x) > this.deadzone ? x : 0;
    y = Math.abs(y) > this.deadzone ? y : 0;
    return { x, y };
  },

  applyMove(stickX, stickY, dt) {
    if (stickX === 0 && stickY === 0) return;

    const cam = this.player.children.find(o => o.isCamera);
    if (!cam) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    forward.y = 0; forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    right.y = 0; right.normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -stickY);
    move.addScaledVector(right, stickX);

    if (move.lengthSq() < 1e-6) return;
    move.normalize().multiplyScalar(this.moveSpeed * dt);

    this.tryMove(move);
  },

  applySnapTurn(stickX) {
    if (stickX === 0) { this._snapReady = true; return; }

    const threshold = 0.6;
    if (Math.abs(stickX) < threshold) { this._snapReady = true; return; }

    if (this._snapReady) {
      this._snapReady = false;
      this.player.rotation.y -= Math.sign(stickX) * this.snapAngle;
    }
  },

  // -------- Collision (XZ) --------
  tryMove(delta) {
    const next = this.player.position.clone().add(delta);
    const r = 0.35;
    const colliders = this.runtime?.colliders || [];

    let px = next.x;
    let pz = this.player.position.z;

    ({ px } = this.resolveAxis(px, pz, r, colliders, 'x'));
    pz = next.z;
    ({ pz } = this.resolveAxis(px, pz, r, colliders, 'z'));

    this.player.position.x = px;
    this.player.position.z = pz;
  },

  resolveAxis(px, pz, r, colliders, axis) {
    for (const c of colliders) {
      if (c.type !== 'aabb') continue;

      const minX = c.min.x - r, maxX = c.max.x + r;
      const minZ = c.min.z - r, maxZ = c.max.z + r;

      if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
        if (axis === 'x') {
          const dl = Math.abs(px - minX);
          const dr = Math.abs(maxX - px);
          px = (dl < dr) ? minX : maxX;
        } else {
          const db = Math.abs(pz - minZ);
          const df = Math.abs(maxZ - pz);
          pz = (db < df) ? minZ : maxZ;
        }
      }
    }
    return { px, pz };
  },

  updateKeyboard(dt) {
    const move = new THREE.Vector3();
    if (this.keys.w) move.z -= 1;
    if (this.keys.s) move.z += 1;
    if (this.keys.a) move.x -= 1;
    if (this.keys.d) move.x += 1;
    if (move.lengthSq() === 0) return;

    move.normalize().multiplyScalar(2.0 * dt);
    this.tryMove(move);
  }
};
