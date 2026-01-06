// /js/vr_locomotion.js — Update 9.1
// - Hold trigger: rainbow beam + triple neon reticle
// - Release trigger: teleport
// - Right stick: 45° snap turn
// - Keeps player height stable (standing feel)

import * as THREE from "./three.js";

export class VRLocomotion {
  constructor(opts = {}) {
    this.renderer = opts.renderer;
    this.scene = opts.scene;
    this.camera = opts.camera;

    // rig objects
    this.playerRig = opts.playerRig;      // THREE.Group (moves around)
    this.head = opts.head;                // camera or a head group
    this.controllerL = opts.controllerL;  // left controller object
    this.controllerR = opts.controllerR;  // right controller object

    // config
    this.snapAngle = THREE.MathUtils.degToRad(45);
    this._snapCooldown = 0;

    // teleport state
    this._isAiming = false;
    this._aimController = null;
    this._hit = new THREE.Vector3();
    this._hasHit = false;

    // raycasting
    this.raycaster = new THREE.Raycaster();
    this._tmpDir = new THREE.Vector3();

    // floor objects to raycast
    this.floorMeshes = opts.floorMeshes || [];

    // visuals
    this._beam = this._makeRainbowBeam();
    this._reticle = this._makeTripleReticle();
    this._beam.visible = false;
    this._reticle.visible = false;
    this.scene.add(this._beam);
    this.scene.add(this._reticle);

    // stable height
    this.standingY = opts.standingY ?? 1.65; // comfortable view height
    this._forceStanding = true;

    // bindings
    this._onSelectStart = (e) => this._startAim(e?.target);
    this._onSelectEnd = (e) => this._endAim(e?.target);
  }

  attach() {
    if (this.controllerL) {
      this.controllerL.addEventListener("selectstart", this._onSelectStart);
      this.controllerL.addEventListener("selectend", this._onSelectEnd);
    }
    if (this.controllerR) {
      // allow right trigger too, but left is the main
      this.controllerR.addEventListener("selectstart", (e) => this._startAim(e?.target));
      this.controllerR.addEventListener("selectend", (e) => this._endAim(e?.target));
    }
  }

  detach() {
    if (this.controllerL) {
      this.controllerL.removeEventListener("selectstart", this._onSelectStart);
      this.controllerL.removeEventListener("selectend", this._onSelectEnd);
    }
  }

  setFloorMeshes(meshes) {
    this.floorMeshes = meshes || [];
  }

  setStandingLock(on) {
    this._forceStanding = !!on;
  }

  _startAim(controllerObj) {
    this._isAiming = true;
    this._aimController = controllerObj || this.controllerL || this.controllerR;
    this._beam.visible = true;
    this._reticle.visible = true;
  }

  _endAim() {
    if (this._isAiming && this._hasHit) {
      // teleport rig so the camera ends up at hit point
      // keep standing height stable
      const camWorld = new THREE.Vector3();
      this.camera.getWorldPosition(camWorld);

      // rig position + camera offset = world cam
      // so newRig = hit - (camWorld - rigWorld)
      const rigWorld = new THREE.Vector3();
      this.playerRig.getWorldPosition(rigWorld);

      const offset = camWorld.sub(rigWorld);
      const newRig = this._hit.clone().sub(offset);

      // keep us above floor (no sinking)
      newRig.y = 0;

      this.playerRig.position.set(newRig.x, newRig.y, newRig.z);
    }

    this._isAiming = false;
    this._aimController = null;
    this._beam.visible = false;
    this._reticle.visible = false;
  }

  _makeRainbowBeam() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(2 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // simple “rainbow-ish” gradient via vertex colors
    const colors = new Float32Array([
      1, 0, 0,  // red
      0, 1, 1   // cyan
    ]);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    return new THREE.Line(geo, mat);
  }

  _makeTripleReticle() {
    const g = new THREE.Group();

    const mk = (r, op) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.01, r, 40),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: op,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      return ring;
    };

    // three neon rings
    const r1 = mk(0.16, 0.95);
    const r2 = mk(0.24, 0.65);
    const r3 = mk(0.32, 0.40);

    // soft glow disc
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 30),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.18 })
    );
    disc.rotation.x = -Math.PI / 2;

    g.add(r1, r2, r3, disc);
    return g;
  }

  _updateBeam(start, end) {
    const pos = this._beam.geometry.attributes.position.array;
    pos[0] = start.x; pos[1] = start.y; pos[2] = start.z;
    pos[3] = end.x;   pos[4] = end.y;   pos[5] = end.z;
    this._beam.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    // keep “standing feel”
    if (this._forceStanding && this.renderer?.xr?.isPresenting) {
      // maintain a stable playerRig Y (prevents sinking into floor)
      this.playerRig.position.y = 0;
    }

    // snap turn on RIGHT stick (controller gamepad)
    this._snapCooldown = Math.max(0, this._snapCooldown - dt);

    const gpR = this.controllerR?.gamepad;
    if (gpR?.axes?.length >= 2) {
      const x = gpR.axes[2] ?? gpR.axes[0]; // varies by device; try common indices
      if (this._snapCooldown <= 0) {
        if (x > 0.7) {
          this.playerRig.rotation.y -= this.snapAngle;
          this._snapCooldown = 0.28;
        } else if (x < -0.7) {
          this.playerRig.rotation.y += this.snapAngle;
          this._snapCooldown = 0.28;
        }
      }
    }

    // aiming raycast
    if (!this._isAiming || !this._aimController) return;

    const start = new THREE.Vector3();
    this._aimController.getWorldPosition(start);

    // forward direction from controller
    this._aimController.getWorldDirection(this._tmpDir);
    this._tmpDir.normalize();

    this.raycaster.set(start, this._tmpDir);
    this.raycaster.far = 40;

    const hits = this.raycaster.intersectObjects(this.floorMeshes, true);
    this._hasHit = hits && hits.length > 0;

    if (this._hasHit) {
      this._hit.copy(hits[0].point);
      // clamp to floor plane
      this._hit.y = 0.001;

      this._reticle.position.copy(this._hit);
      this._updateBeam(start, this._hit);
    } else {
      // show beam but no reticle lock
      const end = start.clone().add(this._tmpDir.clone().multiplyScalar(12));
      this._reticle.visible = false;
      this._updateBeam(start, end);
    }

    if (this._isAiming) this._reticle.visible = this._hasHit;
  }
        }
