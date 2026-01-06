// /js/controls.js — Update 9.0
// Quest-friendly locomotion + snap turn + collision + trigger-hold teleport (NO lasers)
//
// Imports local three.js wrapper for GitHub Pages stability.
import * as THREE from "./three.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,        // THREE.Group (your player rig)
  colliders: [],       // array of AABB boxes { min: Vector3, max: Vector3 }
  bounds: null,        // { minX,maxX,minZ,maxZ } for quick clamp
  teleport: null,      // { group, ring } built by World
  teleportTarget: null,

  // tuning
  eyeHeight: 1.65,
  playerRadius: 0.28,
  moveSpeed: 2.25,
  sprintMult: 1.65,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.22,

  // state
  _yaw: 0,
  _snapT: 0,
  _tpHolding: false,
  _tpHoldValue: 0,
  _tmpV3: new THREE.Vector3(),
  _tmpV3b: new THREE.Vector3(),

  init({ renderer, camera, player, colliders = [], bounds = null, teleport = null, spawn = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;
    this.teleport = teleport;

    // hard lock player y (standing always)
    this.player.position.y = 0;

    // initial yaw
    this._yaw = 0;
    this.player.rotation.set(0, this._yaw, 0);

    // spawn
    if (spawn && spawn.position) {
      this.player.position.set(spawn.position.x, 0, spawn.position.z);
      this._yaw = spawn.yaw || 0;
      this.player.rotation.y = this._yaw;
    }
  },

  // Call every frame with dt seconds
  update(dt) {
    // lock standing height (prevents sit/stand changing game height)
    // We do NOT move the headset; we keep the RIG at stable ground Y.
    this.player.position.y = 0;

    const session = this.renderer.xr?.getSession?.();
    if (!session) return; // desktop can be handled separately if you want

    // Find gamepads
    const sources = session.inputSources || [];
    let leftGP = null, rightGP = null;
    for (const src of sources) {
      const gp = src.gamepad;
      if (!gp) continue;
      // Heuristic: left hand has handedness "left"
      if (src.handedness === "left") leftGP = gp;
      if (src.handedness === "right") rightGP = gp;
    }

    // If missing, just bail
    if (!leftGP && !rightGP) return;

    // Axis mapping (Quest usually):
    // left stick = axes[2], axes[3]
    // right stick = axes[2], axes[3] on right controller
    const lx = leftGP ? (leftGP.axes[2] || 0) : 0;
    const ly = leftGP ? (leftGP.axes[3] || 0) : 0;

    const rx = rightGP ? (rightGP.axes[2] || 0) : 0;

    // Buttons:
    // trigger = buttons[0].value, grip = buttons[1].value (common Quest mapping)
    const lTrigger = leftGP ? (leftGP.buttons[0]?.value || 0) : 0;
    const lGrip = leftGP ? (leftGP.buttons[1]?.value || 0) : 0;

    // --- TELEPORT: hold LEFT trigger, aim with LEFT stick, release to jump ---
    this._handleTeleport(dt, lTrigger, lx, ly);

    // If teleport is active, do not locomote
    if (this._tpHolding) {
      // snap turn still allowed while holding teleport? (I keep it allowed)
      this._handleSnapTurn(dt, rx);
      return;
    }

    // --- SNAP TURN: right stick left/right => 45 deg ---
    this._handleSnapTurn(dt, rx);

    // --- MOVE: left stick ---
    const dead = 0.15;
    let mx = Math.abs(lx) > dead ? lx : 0;
    let mz = Math.abs(ly) > dead ? ly : 0;

    // In VR, forward is -Z on stick (ly negative)
    // We'll treat ly as forward/back directly.
    const inputLen = Math.hypot(mx, mz);
    if (inputLen > 1) {
      mx /= inputLen;
      mz /= inputLen;
    }

    // Sprint if grip held a bit
    const sprint = lGrip > 0.35 ? this.sprintMult : 1.0;

    // Convert stick move into world direction using yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), this._yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this._yaw);

    // forward/back uses mz (ly)
    const move = new THREE.Vector3()
      .addScaledVector(right, mx)
      .addScaledVector(forward, mz);

    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(this.moveSpeed * sprint * dt);
      this._moveWithCollision(move);
    }
  },

  _handleSnapTurn(dt, rx) {
    this._snapT -= dt;
    if (this._snapT > 0) return;

    const dead = 0.55;
    if (rx > dead) {
      this._yaw -= this.snapAngle;
      this.player.rotation.y = this._yaw;
      this._snapT = this.snapCooldown;
    } else if (rx < -dead) {
      this._yaw += this.snapAngle;
      this.player.rotation.y = this._yaw;
      this._snapT = this.snapCooldown;
    }
  },

  _handleTeleport(dt, triggerValue, lx, ly) {
    if (!this.teleport || !this.teleport.rings) return;

    const startHold = triggerValue > 0.20;
    const releasing = this._tpHolding && triggerValue < 0.12;

    if (startHold && !this._tpHolding) {
      this._tpHolding = true;
      this._tpHoldValue = triggerValue;
      this.teleport.rings.visible = true;

      // initial target: forward a bit
      this.teleportTarget = this.player.position.clone().add(new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), this._yaw).multiplyScalar(2.0));
    }

    if (this._tpHolding) {
      // aim with stick: target around player within radius
      const dead = 0.12;
      const ax = Math.abs(lx) > dead ? lx : 0;
      const az = Math.abs(ly) > dead ? ly : 0;

      const aim = new THREE.Vector3(ax, 0, az);
      if (aim.lengthSq() > 0.0001) {
        // stick "forward" is negative ly, but here we want it intuitive for target,
        // so we invert z
        aim.z *= 1;
        aim.normalize();

        // rotate by yaw so it matches your facing direction
        aim.applyAxisAngle(new THREE.Vector3(0,1,0), this._yaw);

        const dist = 4.5; // teleport range
        this.teleportTarget = this.player.position.clone().add(aim.multiplyScalar(dist));
      }

      // clamp to room bounds
      if (this.bounds && this.teleportTarget) {
        this.teleportTarget.x = THREE.MathUtils.clamp(this.teleportTarget.x, this.bounds.minX, this.bounds.maxX);
        this.teleportTarget.z = THREE.MathUtils.clamp(this.teleportTarget.z, this.bounds.minZ, this.bounds.maxZ);
      }

      // keep target out of colliders
      if (this.teleportTarget) {
        this._pushOutOfColliders(this.teleportTarget);
      }

      // update rings position
      this.teleport.rings.position.set(this.teleportTarget.x, 0.01, this.teleportTarget.z);

      // release to teleport
      if (releasing) {
        this.player.position.set(this.teleportTarget.x, 0, this.teleportTarget.z);
        this._tpHolding = false;
        this.teleport.rings.visible = false;
      }
    }
  },

  _moveWithCollision(delta) {
    // step X then Z for stable collision
    const p = this.player.position;

    const nextX = this._tmpV3.copy(p).add(new THREE.Vector3(delta.x, 0, 0));
    this._resolveCollisions(nextX);
    p.x = nextX.x;

    const nextZ = this._tmpV3.copy(p).add(new THREE.Vector3(0, 0, delta.z));
    this._resolveCollisions(nextZ);
    p.z = nextZ.z;

    // bounds clamp
    if (this.bounds) {
      p.x = THREE.MathUtils.clamp(p.x, this.bounds.minX, this.bounds.maxX);
      p.z = THREE.MathUtils.clamp(p.z, this.bounds.minZ, this.bounds.maxZ);
    }
  },

  _resolveCollisions(pos) {
    // push player circle out of AABBs
    for (const b of this.colliders) {
      if (!b || !b.min || !b.max) continue;

      const nearestX = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
      const nearestZ = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);

      const dx = pos.x - nearestX;
      const dz = pos.z - nearestZ;
      const d2 = dx*dx + dz*dz;

      const r = this.playerRadius;
      if (d2 < r*r) {
        const d = Math.max(0.0001, Math.sqrt(d2));
        const push = (r - d) + 0.001;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      }
    }
  },

  _pushOutOfColliders(pos) {
    // Same as resolve but for teleport target (small radius)
    const savedRadius = this.playerRadius;
    this.playerRadius = 0.30;
    this._resolveCollisions(pos);
    this.playerRadius = savedRadius;
  }
};
