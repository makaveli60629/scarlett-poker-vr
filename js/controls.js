import * as THREE from "three";

/**
 * Controls.js – stable locomotion + teleport + snap-turn + robust menu
 *
 * - Left stick = smooth move (forward/back/strafe)
 * - Right stick X = snap turn 45°
 * - Teleport preview halo = camera-forward (stable) + left trigger to teleport
 * - Menu toggle tries MANY button indices (Y, menu, start, etc)
 * - Also provides menu navigation (left stick up/down) + confirm (right trigger/A)
 */
export const Controls = {
  rig: null,
  camera: null,
  renderer: null,
  spawns: null,
  colliders: [],

  // callbacks
  onMenuToggle: null,
  onReset: null,

  // Internal
  _tmpDir: new THREE.Vector3(),
  _tmpRight: new THREE.Vector3(),
  _tmpMove: new THREE.Vector3(),
  _floorPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  _teleportPoint: new THREE.Vector3(),
  _teleportValid: false,

  halo: null,

  // button edge tracking
  _last: new Map(),

  // snap turn
  _snapCooldown: 0,

  // movement smoothing
  _vel: new THREE.Vector3(),
  _accel: 18.0,
  _damp: 10.0,

  // menu input state exported to WatchUI
  inputForMenu: {
    menuNavY: 0,
    confirm: false,
  },

  init({ rig, camera, renderer, spawns, colliders = [], halo }) {
    this.rig = rig;
    this.camera = camera;
    this.renderer = renderer;
    this.spawns = spawns || {};
    this.colliders = colliders;

    // If main supplies halo, use it. Otherwise create one.
    if (halo) {
      this.halo = halo;
    } else {
      const haloGeo = new THREE.RingGeometry(0.18, 0.28, 48);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      this.halo = new THREE.Mesh(haloGeo, haloMat);
      this.halo.rotation.x = -Math.PI / 2;
      this.halo.visible = false;
    }
  },

  attachHaloToScene(scene) {
    if (this.halo && !this.halo.parent) scene.add(this.halo);
  },

  _btn(src, index) {
    const gp = src?.gamepad;
    if (!gp?.buttons?.[index]) return false;
    return gp.buttons[index].pressed === true;
  },

  _edge(src, index, key) {
    const k = `${key}:${index}:${src?.handedness || "u"}`;
    const prev = this._last.get(k) || false;
    const now = this._btn(src, index);
    this._last.set(k, now);
    return now && !prev;
  },

  _axes(src) {
    const gp = src?.gamepad;
    const a = gp?.axes || [];
    // Typical: [LX, LY, RX, RY]
    return {
      lx: a[0] ?? 0,
      ly: a[1] ?? 0,
      rx: a[2] ?? 0,
      ry: a[3] ?? 0,
    };
  },

  _deadzone(v, dz = 0.16) {
    return Math.abs(v) < dz ? 0 : v;
  },

  _applyMove(lx, ly, dt) {
    // Fix common “weird”: invert LY so pushing forward moves forward
    lx = this._deadzone(lx);
    ly = this._deadzone(ly);

    // Many controllers report up as -1, so forward push is negative.
    // We want forward push to move forward => use (-ly)
    const forwardAmt = -ly;
    const strafeAmt = lx;

    if (forwardAmt === 0 && strafeAmt === 0) {
      // damp velocity to stop drift
      this._vel.multiplyScalar(Math.max(0, 1 - this._damp * dt));
      return;
    }

    // camera forward flattened
    this.camera.getWorldDirection(this._tmpDir);
    this._tmpDir.y = 0;
    this._tmpDir.normalize();

    // right vector
    this._tmpRight.crossVectors(this._tmpDir, new THREE.Vector3(0, 1, 0)).normalize();

    // desired movement direction
    this._tmpMove.set(0, 0, 0)
      .addScaledVector(this._tmpDir, forwardAmt)
      .addScaledVector(this._tmpRight, strafeAmt);

    if (this._tmpMove.lengthSq() > 0) this._tmpMove.normalize();

    const speed = 3.0; // m/s
    const desiredVel = this._tmpMove.multiplyScalar(speed);

    // accelerate towards desiredVel
    const t = Math.min(1, this._accel * dt);
    this._vel.lerp(desiredVel, t);

    // apply
    this.rig.position.addScaledVector(this._vel, dt);
    this.rig.position.y = 0; // keep on floor
  },

  _applySnapTurn(rx, dt) {
    rx = this._deadzone(rx, 0.35);

    if (this._snapCooldown > 0) {
      this._snapCooldown -= dt;
      return;
    }
    if (rx > 0.7) {
      this.rig.rotation.y -= Math.PI / 4;
      this._snapCooldown = 0.22;
    } else if (rx < -0.7) {
      this.rig.rotation.y += Math.PI / 4;
      this._snapCooldown = 0.22;
    }
  },

  _updateTeleport() {
    // stable teleport ray: from camera forward to floor y=0
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    origin.y = Math.max(1.0, origin.y);

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.normalize();

    const ray = new THREE.Ray(origin, dir);
    const hit = new THREE.Vector3();
    const ok = ray.intersectPlane(this._floorPlane, hit);

    if (ok) {
      const maxDist = 12;
      const dist = origin.distanceTo(hit);
      if (dist <= maxDist) {
        this._teleportPoint.copy(hit);
        this._teleportValid = true;
        if (this.halo) {
          this.halo.visible = true;
          this.halo.position.set(hit.x, 0.02, hit.z);
        }
        return;
      }
    }

    this._teleportValid = false;
    if (this.halo) this.halo.visible = false;
  },

  update(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    let left = null, right = null;
    for (const s of session.inputSources) {
      if (s.handedness === "left") left = s;
      if (s.handedness === "right") right = s;
    }

    // ----- locomotion -----
    const srcMove = left?.gamepad ? left : (right?.gamepad ? right : null);
    if (srcMove) {
      const { lx, ly } = this._axes(srcMove);
      this._applyMove(lx, ly, dt);

      // menu navigation uses left stick Y
      this.inputForMenu.menuNavY = ly; // raw so WatchUI decides direction
    } else {
      this.inputForMenu.menuNavY = 0;
    }

    // snap turn from right stick X (fallback left)
    const srcTurn = right?.gamepad ? right : left;
    if (srcTurn?.gamepad) {
      const { rx } = this._axes(srcTurn);
      this._applySnapTurn(rx, dt);
    }

    // teleport preview always
    this._updateTeleport();

    // teleport confirm: left trigger edge
    if (left) {
      const triggerEdge = this._edge(left, 0, "teleportTrigger");
      if (triggerEdge && this._teleportValid) {
        this.rig.position.set(this._teleportPoint.x, 0, this._teleportPoint.z);
      }
    }

    // ----- Menu toggle: try many buttons -----
    // Oculus mapping varies; we try:
    // 3(Y), 2(X), 7(Menu), 9(Start), 8(Stick press)
    let menuEdge = false;
    for (const src of [left, right]) {
      if (!src?.gamepad) continue;
      if (this._edge(src, 3, "menu")) menuEdge = true;   // Y
      if (this._edge(src, 7, "menu")) menuEdge = true;   // Menu
      if (this._edge(src, 9, "menu")) menuEdge = true;   // Start
      if (this._edge(src, 8, "menu")) menuEdge = true;   // Stick press
    }
    if (menuEdge && typeof this.onMenuToggle === "function") this.onMenuToggle();

    // Confirm for menu: right trigger or A/X
    let confirmEdge = false;
    if (right?.gamepad) {
      if (this._edge(right, 0, "confirm")) confirmEdge = true; // trigger
      if (this._edge(right, 0, "confirm2")) confirmEdge = true;
      if (this._edge(right, 0, "confirm3")) confirmEdge = true;
      if (this._edge(right, 0, "confirm4")) confirmEdge = true;
      // A is usually 0 (but it's already trigger sometimes). Also check 0/1
      if (this._edge(right, 0, "confirmA")) confirmEdge = true;
      if (this._edge(right, 1, "confirmB")) confirmEdge = true;
    }
    if (left?.gamepad) {
      if (this._edge(left, 0, "confirmLTrig")) confirmEdge = true;
      if (this._edge(left, 2, "confirmX")) confirmEdge = true; // X
    }
    this.inputForMenu.confirm = confirmEdge;

    // Optional reset on B (index 1) long used in your builds
    let resetEdge = false;
    for (const src of [left, right]) {
      if (!src?.gamepad) continue;
      if (this._edge(src, 1, "resetB")) resetEdge = true;
    }
    if (resetEdge && typeof this.onReset === "function") this.onReset();
  }
};
