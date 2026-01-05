import * as THREE from "three";

/**
 * Controls.js – XR locomotion + teleport + snap turn + menu toggle
 * Left stick: move
 * Right stick: snap-turn 45°
 * Left trigger: teleport (if halo valid)
 * Y button: toggle menu (watch UI)
 */
export const Controls = {
  rig: null,
  camera: null,
  renderer: null,
  spawns: null,
  colliders: [],
  onMenuToggle: null,
  onNavigate: null, // (roomName)=>void
  onReset: null,
  onAudioToggle: null,

  // Internal
  _tmpDir: new THREE.Vector3(),
  _tmpRight: new THREE.Vector3(),
  _tmpMove: new THREE.Vector3(),
  _raycaster: new THREE.Raycaster(),
  _floorPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // y=0
  _teleportPoint: new THREE.Vector3(),
  _teleportValid: false,

  // halo mesh
  halo: null,

  // input state
  _snapCooldown: 0,
  _menuCooldown: 0,
  _lastButtons: new Map(), // key -> array of pressed states

  init({ rig, camera, renderer, spawns, colliders = [] }) {
    this.rig = rig;
    this.camera = camera;
    this.renderer = renderer;
    this.spawns = spawns || {};
    this.colliders = colliders;

    // Halo target marker
    const haloGeo = new THREE.RingGeometry(0.18, 0.28, 48);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.visible = false;
    this.halo.position.set(0, 0.02, 0);
    rig.parent?.add(this.halo) || renderer.scene?.add(this.halo); // fallback safe
    // If rig.parent is null, halo will be attached later by main; still works if we re-add
  },

  setHaloParent(scene) {
    // call once from main after scene exists
    if (this.halo && this.halo.parent !== scene) scene.add(this.halo);
  },

  // Utility: get standard axes from input source
  _getAxes(src) {
    const gp = src.gamepad;
    if (!gp) return { lx: 0, ly: 0, rx: 0, ry: 0 };

    // Oculus typically:
    // axes[0]=LX, axes[1]=LY, axes[2]=RX, axes[3]=RY
    const a = gp.axes || [];
    const lx = a[0] ?? 0;
    const ly = a[1] ?? 0;
    const rx = a[2] ?? 0;
    const ry = a[3] ?? 0;
    return { lx, ly, rx, ry };
  },

  _btnPressed(src, index) {
    const gp = src.gamepad;
    if (!gp || !gp.buttons || !gp.buttons[index]) return false;
    return gp.buttons[index].pressed === true;
  },

  _edgePressed(src, index, keyName) {
    // rising edge detect
    const key = `${keyName}:${index}:${src.handedness || "u"}`;
    const prev = this._lastButtons.get(key) || false;
    const now = this._btnPressed(src, index);
    this._lastButtons.set(key, now);
    return now && !prev;
  },

  // Move rig on XZ plane based on camera forward direction
  _applyMove(lx, ly, dt) {
    const dz = 0.18;
    const x = Math.abs(lx) > dz ? lx : 0;
    const y = Math.abs(ly) > dz ? ly : 0;
    if (x === 0 && y === 0) return;

    // forward direction from camera (flattened)
    this.camera.getWorldDirection(this._tmpDir);
    this._tmpDir.y = 0;
    this._tmpDir.normalize();

    // right vector
    this._tmpRight.crossVectors(this._tmpDir, new THREE.Vector3(0, 1, 0)).normalize();

    // speed
    const speed = 3.2;

    this._tmpMove.set(0, 0, 0)
      .addScaledVector(this._tmpDir, -y * speed * dt)
      .addScaledVector(this._tmpRight, x * speed * dt);

    this.rig.position.add(this._tmpMove);

    // keep on floor
    this.rig.position.y = 0;
  },

  _applySnapTurn(rx, dt) {
    // snap turn on right stick X
    const dz = 0.45;
    if (this._snapCooldown > 0) {
      this._snapCooldown -= dt;
      return;
    }
    if (rx > dz) {
      this.rig.rotation.y -= Math.PI / 4;
      this._snapCooldown = 0.22;
    } else if (rx < -dz) {
      this.rig.rotation.y += Math.PI / 4;
      this._snapCooldown = 0.22;
    }
  },

  _updateTeleport(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    // Use LEFT controller ray (handedness left) if available, else controller 0
    let srcLeft = null;
    for (const s of session.inputSources) if (s.handedness === "left") srcLeft = s;
    if (!srcLeft) return;

    // Build a ray from camera forward but offset slightly to the left for stability.
    // (We can’t reliably get the exact controller pose without extra plumbing here)
    const origin = new THREE.Vector3().copy(this.camera.getWorldPosition(new THREE.Vector3()));
    origin.y = Math.max(1.0, origin.y);

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.normalize();

    // intersect with floor plane y=0
    const ray = new THREE.Ray(origin, dir);
    const hit = new THREE.Vector3();
    const ok = ray.intersectPlane(this._floorPlane, hit);

    if (ok) {
      // limit distance
      const maxDist = 10.0;
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

  _applyTeleport(srcLeft) {
    // Left trigger = button 0 in many XR pads (index trigger)
    const triggerEdge = this._edgePressed(srcLeft, 0, "teleportTrigger");
    if (!triggerEdge) return;

    if (this._teleportValid) {
      this.rig.position.set(this._teleportPoint.x, 0, this._teleportPoint.z);
    }
  },

  _handleMenuButtons(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    this._menuCooldown = Math.max(0, this._menuCooldown - dt);

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;

      // Y button is usually index 3 (A=0 B=1 X=2 Y=3)
      const yEdge = this._edgePressed(src, 3, "menuY");
      if (yEdge && this._menuCooldown <= 0) {
        this._menuCooldown = 0.25;
        if (typeof this.onMenuToggle === "function") this.onMenuToggle();
      }

      // Optional: Reset on B (1)
      const bEdge = this._edgePressed(src, 1, "resetB");
      if (bEdge && typeof this.onReset === "function") this.onReset();
    }
  },

  // Public call from main.js
  update(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    // locate left & right sources
    let left = null, right = null;
    for (const src of session.inputSources) {
      if (src.handedness === "left") left = src;
      if (src.handedness === "right") right = src;
    }

    // Movement from LEFT stick (if available)
    if (left?.gamepad) {
      const { lx, ly } = this._getAxes(left);
      this._applyMove(lx, ly, dt);
    } else if (right?.gamepad) {
      // fallback: if left not found, allow move on right stick
      const { lx, ly } = this._getAxes(right);
      this._applyMove(lx, ly, dt);
    }

    // Snap turn from RIGHT stick
    if (right?.gamepad) {
      const { rx } = this._getAxes(right);
      this._applySnapTurn(rx, dt);
    } else if (left?.gamepad) {
      const { rx } = this._getAxes(left);
      this._applySnapTurn(rx, dt);
    }

    // Teleport preview + teleport trigger
    this._updateTeleport(dt);
    if (left) this._applyTeleport(left);

    // Menu toggle
    this._handleMenuButtons(dt);
  }
};
