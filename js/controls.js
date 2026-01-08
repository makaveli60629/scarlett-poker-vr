// /js/controls.js
// Scarlett VR Poker — Controls (FULL)
// WebXR + Desktop fallback
//
// ✅ VR: Smooth move (left stick), Snap turn (right stick), Teleport aim/confirm (right trigger)
// ✅ Desktop: WASD + mouse look (pointer lock), Shift sprint, Q/E snap turn, Space teleport
// ✅ Interaction: "use" ray (right controller trigger press OR desktop F) hits objects with userData.isInteractable
// ✅ Collision: simple box-distance blocking against colliders (good enough starter)
//
// Usage:
//   import { Controls } from "./controls.js";
//   const controls = new Controls({ THREE, renderer, scene, camera, floorMeshes, colliders });
//   controls.setTeleportMachine(teleportMachine); // optional
//   controls.onInteract = (hit) => { console.log("interact", hit.object.userData); };
//   // in loop:
//   controls.update(dt);

export class Controls {
  constructor({
    THREE,
    renderer,
    scene,
    camera,

    // Teleport raycast targets
    floorMeshes = [],

    // Blocking colliders (walls/rails/table bases etc.)
    colliders = [],

    // Player config
    playerRadius = 0.28,
    moveSpeed = 1.9,
    sprintMult = 1.6,

    // Turning
    snapTurnDegrees = 35,
    snapTurnCooldown = 0.22,

    // Teleport
    teleportMaxDist = 18,
    enableTeleport = true,
    enableSmoothMove = true,
    enableSnapTurn = true,

    // Interaction
    interactMaxDist = 5.0,
  }) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.floorMeshes = floorMeshes;
    this.colliders = colliders;

    this.playerRadius = playerRadius;
    this.moveSpeed = moveSpeed;
    this.sprintMult = sprintMult;

    this.snapTurnRadians = (snapTurnDegrees * Math.PI) / 180;
    this.snapTurnCooldown = snapTurnCooldown;
    this._snapCooldown = 0;

    this.teleportMaxDist = teleportMaxDist;
    this.enableTeleport = enableTeleport;
    this.enableSmoothMove = enableSmoothMove;
    this.enableSnapTurn = enableSnapTurn;

    this.interactMaxDist = interactMaxDist;

    // Callbacks
    this.onInteract = null;   // (hit) => void
    this.onTeleport = null;   // ({from,to}) => void

    // Player rig
    this.rig = new THREE.Group();
    this.rig.name = "PlayerRig";
    this.rig.position.set(0, 0, 0);
    scene.add(this.rig);
    this.rig.add(camera);

    // Teleport machine hook
    this.teleportMachine = null;

    // Internals
    this._raycaster = new THREE.Raycaster();
    this._tmpV3 = new THREE.Vector3();
    this._tmpV3b = new THREE.Vector3();
    this._tmpV3c = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();

    // XR controllers
    this.controllers = [];
    this.teleportActive = false;
    this.teleportHit = null; // { point, normal, object }

    // Interaction targets list (set via setInteractables)
    this.interactables = [];

    // Visual marker for teleport
    this._teleportMarker = this._makeTeleportMarker();

    // Desktop controls
    this.desktop = {
      enabled: true,
      keys: Object.create(null),
      pointerLocked: false,
      yaw: 0,
      pitch: 0,
      mouseSens: 0.0022,
      queuedSnap: 0,
      queuedTeleport: false,
      queuedUse: false,
    };

    this._installXRControllers();
    this._installDesktop();
  }

  // ---------- public ----------
  setTeleportMachine(tm) {
    this.teleportMachine = tm;
  }

  setFloorMeshes(meshes) {
    this.floorMeshes = meshes || [];
  }

  setColliders(meshes) {
    this.colliders = meshes || [];
  }

  setInteractables(meshes) {
    this.interactables = meshes || [];
  }

  setPosition(x, y, z) {
    this.rig.position.set(x, y, z);
  }

  getPosition(out = new this.THREE.Vector3()) {
    return out.copy(this.rig.position);
  }

  update(dt) {
    this._snapCooldown = Math.max(0, this._snapCooldown - dt);

    const xr = this.renderer.xr && this.renderer.xr.isPresenting;
    if (xr) this._updateXR(dt);
    else this._updateDesktop(dt);

    // marker + teleport machine visuals
    if (this._teleportMarker) {
      if (this.teleportActive && this.teleportHit) {
        this._teleportMarker.visible = true;
        this._teleportMarker.position.copy(this.teleportHit.point);
      } else {
        this._teleportMarker.visible = false;
      }
    }

    if (this.teleportMachine) {
      if (this.teleportActive && this.teleportHit) {
        this.teleportMachine.setActive?.(true);
        this.teleportMachine.setAim?.(this.teleportHit.point, this.teleportHit.normal);
      } else {
        this.teleportMachine.hideTarget?.();
      }
    }
  }

  // ---------- XR ----------
  _installXRControllers() {
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      c.name = `XRController${i}`;
      c.userData.index = i;

      // Teleport: right controller trigger (select)
      c.addEventListener("selectstart", () => this._xrSelectStart(c));
      c.addEventListener("selectend", () => this._xrSelectEnd(c));

      // Optional: squeeze for "use"
      c.addEventListener("squeezestart", () => this._xrSqueezeStart(c));

      this.scene.add(c);
      this.controllers.push(c);
    }
  }

  _getXRInputSources() {
    const session = this.renderer.xr.getSession?.();
    return session?.inputSources || [];
  }

  _getAxesForHand(inputSource) {
    const gp = inputSource?.gamepad;
    if (!gp || !gp.axes) return { x: 0, y: 0 };

    // Common: left [0,1], right [2,3] (Quest)
    if (gp.axes.length >= 4) {
      if (inputSource.handedness === "right") return { x: gp.axes[2] || 0, y: gp.axes[3] || 0 };
      return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
    }
    return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
  }

  _updateXR(dt) {
    const sources = this._getXRInputSources();

    let leftSrc = null, rightSrc = null;
    for (const s of sources) {
      if (s.handedness === "left") leftSrc = s;
      if (s.handedness === "right") rightSrc = s;
    }

    // Smooth move (left stick)
    if (this.enableSmoothMove && leftSrc) {
      const a = this._getAxesForHand(leftSrc);
      this._applyMoveAxes(a.x, a.y, dt, false);
    }

    // Snap turn (right stick X)
    if (this.enableSnapTurn && rightSrc) {
      const a = this._getAxesForHand(rightSrc);
      this._applySnapTurnAxis(a.x);
    }

    // Teleport aim while active
    if (this.enableTeleport && this.teleportActive) {
      const rightController = this.controllers[1] || this.controllers[0];
      this._updateTeleportAimFromObject(rightController);
    }
  }

  _xrSelectStart(controller) {
    if (!this.enableTeleport) return;
    // Prefer right controller (index 1), but allow fallback if only one
    if (controller.userData.index === 0 && this.controllers.length > 1) return;

    this.teleportActive = true;
    this._updateTeleportAimFromObject(controller);
  }

  _xrSelectEnd(controller) {
    if (!this.enableTeleport) return;
    if (controller.userData.index === 0 && this.controllers.length > 1) return;

    this._confirmTeleport();
    this.teleportActive = false;
    this.teleportHit = null;
  }

  _xrSqueezeStart(controller) {
    // Treat squeeze as "use" (interaction)
    // Prefer right hand if present
    if (controller.userData.index === 0 && this.controllers.length > 1) return;
    this._tryInteractFromObject(controller);
  }

  // ---------- Desktop ----------
  _installDesktop() {
    const canvas = this.renderer.domElement;

    const onKey = (e, down) => {
      this.desktop.keys[e.code] = down;

      if (down) {
        if (e.code === "KeyQ") this.desktop.queuedSnap = 1;
        if (e.code === "KeyE") this.desktop.queuedSnap = -1;
        if (e.code === "Space") this.desktop.queuedTeleport = true;
        if (e.code === "KeyF") this.desktop.queuedUse = true;
      }
    };

    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    canvas.addEventListener("click", () => {
      if (this.renderer.xr?.isPresenting) return;
      canvas.requestPointerLock?.();
    });

    document.addEventListener("pointerlockchange", () => {
      this.desktop.pointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.desktop.pointerLocked) return;
      this.desktop.yaw -= e.movementX * this.desktop.mouseSens;
      this.desktop.pitch -= e.movementY * this.desktop.mouseSens;
      const lim = Math.PI / 2 - 0.08;
      this.desktop.pitch = Math.max(-lim, Math.min(lim, this.desktop.pitch));
    });
  }

  _updateDesktop(dt) {
    // yaw on rig, pitch on camera
    this.rig.rotation.y = this.desktop.yaw;
    this.camera.rotation.x = this.desktop.pitch;

    const k = this.desktop.keys;
    const forward = (k["KeyW"] ? 1 : 0) + (k["KeyS"] ? -1 : 0);
    const strafe = (k["KeyD"] ? 1 : 0) + (k["KeyA"] ? -1 : 0);
    const sprint = !!k["ShiftLeft"] || !!k["ShiftRight"];

    if (forward !== 0 || strafe !== 0) {
      // note: _applyMoveAxes expects stick y where up is negative; we pass (-forward)
      this._applyMoveAxes(strafe, -forward, dt, sprint);
    }

    if (this.desktop.queuedSnap !== 0 && this._snapCooldown <= 0) {
      this.rig.rotation.y += this.desktop.queuedSnap * this.snapTurnRadians;
      this.desktop.yaw = this.rig.rotation.y;
      this.desktop.queuedSnap = 0;
      this._snapCooldown = this.snapTurnCooldown;
    }

    // Aim teleport always from camera center for desktop
    if (this.enableTeleport) {
      this._updateTeleportAimFromCamera();

      if (this.desktop.queuedTeleport) {
        this.desktop.queuedTeleport = false;
        this.teleportActive = true;
        this._confirmTeleport();
        this.teleportActive = false;
      }
    }

    // Desktop interact (F) uses camera ray
    if (this.desktop.queuedUse) {
      this.desktop.queuedUse = false;
      this._tryInteractFromCamera();
    }
  }

  // ---------- Movement ----------
  _applyMoveAxes(strafeX, stickY, dt, sprint) {
    const dz = 0.14;
    const ax = Math.abs(strafeX) < dz ? 0 : strafeX;
    const ay = Math.abs(stickY) < dz ? 0 : stickY;
    if (ax === 0 && ay === 0) return;

    // stickY: forward is negative on most controllers -> forward = -ay
    const forward = -ay;
    const strafe = ax;

    const camQ = this.camera.getWorldQuaternion(this._tmpQuat);

    const fwd = this._tmpV3.set(0, 0, -1).applyQuaternion(camQ);
    fwd.y = 0; fwd.normalize();

    const right = this._tmpV3b.set(1, 0, 0).applyQuaternion(camQ);
    right.y = 0; right.normalize();

    const dir = this._tmpV3c.set(0, 0, 0)
      .addScaledVector(fwd, forward)
      .addScaledVector(right, strafe);

    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();

    const speed = this.moveSpeed * (sprint ? this.sprintMult : 1);
    const step = speed * dt;

    this._tryMove(dir, step);
  }

  _applySnapTurnAxis(xAxis) {
    const dz = 0.55;
    if (Math.abs(xAxis) < dz) return;
    if (this._snapCooldown > 0) return;

    const dir = xAxis > 0 ? -1 : 1;
    this.rig.rotation.y += dir * this.snapTurnRadians;
    this._snapCooldown = this.snapTurnCooldown;
  }

  _tryMove(dir, step) {
    const desired = this.rig.position.clone().addScaledVector(dir, step);
    desired.y = 0;

    if (this._isWalkable(desired)) {
      this.rig.position.copy(desired);
      return;
    }

    // slide attempt
    const tryX = this.rig.position.clone(); tryX.x = desired.x;
    if (this._isWalkable(tryX)) { this.rig.position.copy(tryX); return; }

    const tryZ = this.rig.position.clone(); tryZ.z = desired.z;
    if (this._isWalkable(tryZ)) { this.rig.position.copy(tryZ); return; }
  }

  _isWalkable(pos) {
    const r = this.playerRadius;

    for (const c of this.colliders) {
      if (!c || !c.isObject3D) continue;

      // allow invisible colliders if explicitly marked
      if (c.visible === false && !c.userData?.isCollider) continue;

      const box = new this.THREE.Box3().setFromObject(c);
      box.min.x -= r; box.max.x += r;
      box.min.z -= r; box.max.z += r;

      if (pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
        return false;
      }
    }
    return true;
  }

  // ---------- Teleport ----------
  _updateTeleportAimFromObject(obj3d) {
    obj3d.getWorldPosition(this._tmpV3);
    obj3d.getWorldQuaternion(this._tmpQuat);

    const dir = this._tmpV3b.set(0, 0, -1).applyQuaternion(this._tmpQuat).normalize();
    this._raycaster.set(this._tmpV3, dir);
    this._raycaster.far = this.teleportMaxDist;

    const hits = this._raycaster.intersectObjects(this.floorMeshes, true);
    if (!hits || hits.length === 0) {
      this.teleportHit = null;
      return;
    }

    const hit = hits[0];
    const point = hit.point.clone();
    const normal = hit.face?.normal
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : new this.THREE.Vector3(0, 1, 0);

    this.teleportHit = { point, normal, object: hit.object };
  }

  _updateTeleportAimFromCamera() {
    this.camera.getWorldPosition(this._tmpV3);
    this.camera.getWorldQuaternion(this._tmpQuat);

    const dir = this._tmpV3b.set(0, 0, -1).applyQuaternion(this._tmpQuat).normalize();
    this._raycaster.set(this._tmpV3, dir);
    this._raycaster.far = this.teleportMaxDist;

    const hits = this._raycaster.intersectObjects(this.floorMeshes, true);
    if (!hits || hits.length === 0) {
      this.teleportHit = null;
      return;
    }

    const hit = hits[0];
    const point = hit.point.clone();
    const normal = hit.face?.normal
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : new this.THREE.Vector3(0, 1, 0);

    this.teleportHit = { point, normal, object: hit.object };
  }

  _confirmTeleport() {
    if (!this.teleportHit) return;

    // Move rig so camera ends up on hit point (preserve camera offset within rig)
    const camWorld = this.camera.getWorldPosition(this._tmpV3);
    const rigPos = this.rig.position.clone();
    const offset = camWorld.sub(rigPos);

    const from = this.rig.position.clone();

    const dest = this.teleportHit.point.clone().sub(offset);
    dest.y = 0;

    if (!this._isWalkable(dest)) return;

    this.rig.position.copy(dest);

    this.onTeleport?.({ from, to: dest.clone() });
  }

  _makeTeleportMarker() {
    const THREE = this.THREE;
    const geo = new THREE.RingGeometry(0.22, 0.32, 40);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2b0a4d,
      emissive: 0x9b4dff,
      emissiveIntensity: 1.5,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.01;
    m.visible = false;
    m.name = "TeleportMarker";
    this.scene.add(m);

    // pulse (no heavy allocations)
    const tick = () => {
      if (m.visible) mat.opacity = 0.55 + Math.sin(performance.now() * 0.01) * 0.25;
      else mat.opacity = 0.0;
      requestAnimationFrame(tick);
    };
    tick();

    return m;
  }

  // ---------- Interaction ----------
  _tryInteractFromObject(obj3d) {
    if (!this.interactables || this.interactables.length === 0) return;

    obj3d.getWorldPosition(this._tmpV3);
    obj3d.getWorldQuaternion(this._tmpQuat);
    const dir = this._tmpV3b.set(0, 0, -1).applyQuaternion(this._tmpQuat).normalize();

    this._raycaster.set(this._tmpV3, dir);
    this._raycaster.far = this.interactMaxDist;

    const hits = this._raycaster.intersectObjects(this.interactables, true);
    if (!hits || hits.length === 0) return;

    const hit = hits[0];
    const root = this._findInteractRoot(hit.object);
    if (!root?.userData?.isInteractable) return;

    this.onInteract?.({ ...hit, object: root });
  }

  _tryInteractFromCamera() {
    if (!this.interactables || this.interactables.length === 0) return;

    this.camera.getWorldPosition(this._tmpV3);
    this.camera.getWorldQuaternion(this._tmpQuat);
    const dir = this._tmpV3b.set(0, 0, -1).applyQuaternion(this._tmpQuat).normalize();

    this._raycaster.set(this._tmpV3, dir);
    this._raycaster.far = this.interactMaxDist;

    const hits = this._raycaster.intersectObjects(this.interactables, true);
    if (!hits || hits.length === 0) return;

    const hit = hits[0];
    const root = this._findInteractRoot(hit.object);
    if (!root?.userData?.isInteractable) return;

    this.onInteract?.({ ...hit, object: root });
  }

  _findInteractRoot(obj) {
    let cur = obj;
    while (cur) {
      if (cur.userData?.isInteractable) return cur;
      cur = cur.parent;
    }
    return obj;
  }
  }
