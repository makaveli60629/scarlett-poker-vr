// /js/vr_rig.js — Scarlett Poker VR — VR RIG v2 (Quest Grip Fix + Laser + Ring + HeightLock)
// GitHub Pages safe (CDN three.module.js)
// Fixes: Laser/ring stuck at world center (origin). Uses controller GRIP space properly.
//
// Usage in main.js:
//   import { VRRig } from "./vr_rig.js";
//   const rig = VRRig.create(renderer, scene, camera, playerGroup, hub);
//   VRRig.setWorldRefs({ floors:[...], colliders:[...], bounds, pads });
//   In render loop: VRRig.update(renderer);
//
// Exposes:
//   VRRig.create(...), VRRig.update(renderer), VRRig.setWorldRefs(...)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRRig = (() => {
  // ---- internal state
  let _renderer = null;
  let _scene = null;
  let _camera = null;
  let _player = null; // playerGroup from your main
  let _hub = null;

  let _rigRoot = null;

  // Controller input objects (events)
  let _ctrlL = null;
  let _ctrlR = null;

  // Controller grip objects (visual transforms)
  let _gripL = null;
  let _gripR = null;

  // Visuals
  let _laserL = null;
  let _laserR = null;
  let _ring = null;

  // World references
  let _floors = [];
  let _colliders = [];
  let _bounds = null; // {min: Vector3, max: Vector3}
  let _pads = [];

  // Teleport state
  let _activeHand = "right"; // "left" | "right"
  let _aimValid = false;
  let _aimPoint = new THREE.Vector3();
  let _aimNormal = new THREE.Vector3(0, 1, 0);

  // Height lock
  let _heightLockEnabled = true;
  let _heightLockMeters = 1.80; // your locked standing height
  let _floorY = 0;

  // Raycast helpers
  const _raycaster = new THREE.Raycaster();
  const _tmpMat4 = new THREE.Matrix4();
  const _tmpVec3 = new THREE.Vector3();
  const _tmpQuat = new THREE.Quaternion();

  function _logOk(msg) {
    try { _hub?.ok?.(msg); } catch {}
  }
  function _logWarn(msg) {
    try { _hub?.warn?.(msg); } catch {}
  }

  function setWorldRefs({ floors = null, colliders = null, bounds = null, pads = null, floorY = null } = {}) {
    if (floors) _floors = floors;
    if (colliders) _colliders = colliders;
    if (bounds) _bounds = bounds;
    if (pads) _pads = pads;
    if (typeof floorY === "number") _floorY = floorY;
  }

  function setHeightLock(enabled, meters = 1.8) {
    _heightLockEnabled = !!enabled;
    _heightLockMeters = Math.max(1.2, Math.min(2.5, meters));
  }

  function _makeLaser(color = 0x00ffaa) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const line = new THREE.Line(geom, mat);
    line.name = "LaserLine";
    line.scale.z = 8; // default length, updated each frame
    line.visible = true;
    return line;
  }

  function _makeControllerVisual(color = 0x222222) {
    // Simple ultra-safe controller mesh (no extra modules)
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.08, 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.2 })
    );
    body.rotation.x = Math.PI / 2;
    body.position.set(0, -0.02, -0.01);
    g.add(body);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6, metalness: 0.2, emissive: 0x111111 })
    );
    tip.position.set(0, 0.0, -0.08);
    g.add(tip);

    return g;
  }

  function _makeRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.10, 0.16, 32),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.01, 0);
    ring.visible = false;
    ring.name = "TeleportRing";
    return ring;
  }

  function _clampToBounds(pos) {
    if (!_bounds) return pos;
    pos.x = Math.max(_bounds.min.x, Math.min(_bounds.max.x, pos.x));
    pos.z = Math.max(_bounds.min.z, Math.min(_bounds.max.z, pos.z));
    return pos;
  }

  function _applyHeightLock() {
    if (!_player) return;
    if (!_heightLockEnabled) return;

    // In XR, headset pose overrides camera local Y.
    // We lock "world height" by lifting the PLAYER root to a fixed offset above the floor.
    // This keeps you seeing over the table even if you sit/stand physically.
    _player.position.y = _floorY + _heightLockMeters;
  }

  function _getHandObjects(hand) {
    if (hand === "left") return { ctrl: _ctrlL, grip: _gripL, laser: _laserL };
    return { ctrl: _ctrlR, grip: _gripR, laser: _laserR };
  }

  function _raycastFromGrip(grip, maxDist = 12) {
    if (!grip) return null;

    // Build ray from grip world pose
    grip.getWorldPosition(_tmpVec3);
    grip.getWorldQuaternion(_tmpQuat);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_tmpQuat).normalize();

    _raycaster.ray.origin.copy(_tmpVec3);
    _raycaster.ray.direction.copy(dir);
    _raycaster.far = maxDist;

    // Raycast floors first (preferred)
    if (_floors && _floors.length) {
      const hits = _raycaster.intersectObjects(_floors, true);
      if (hits && hits.length) return hits[0];
    }

    // Fallback: any collider (not ideal for teleport, but better than nothing)
    if (_colliders && _colliders.length) {
      const hits = _raycaster.intersectObjects(_colliders, true);
      if (hits && hits.length) return hits[0];
    }

    return null;
  }

  function _updateAimAndVisuals(renderer) {
    const hand = _activeHand === "left" ? "left" : "right";
    const { grip, laser } = _getHandObjects(hand);

    // If we don't have a grip yet, hide visuals
    if (!grip || !laser) {
      if (_ring) _ring.visible = false;
      return;
    }

    // Raycast
    const hit = _raycastFromGrip(grip, 14);
    if (!hit) {
      _aimValid = false;
      _ring.visible = false;
      laser.scale.z = 8;
      return;
    }

    _aimValid = true;
    _aimPoint.copy(hit.point);
    _aimNormal.copy(hit.face?.normal || _aimNormal);

    // Clamp destination to world bounds (keeps you inside room)
    _clampToBounds(_aimPoint);

    // Ring at hit
    _ring.position.set(_aimPoint.x, _aimPoint.y + 0.012, _aimPoint.z);
    _ring.visible = true;

    // Laser length = distance from grip to hit
    const gripPos = new THREE.Vector3();
    grip.getWorldPosition(gripPos);
    const dist = Math.max(0.5, Math.min(14, gripPos.distanceTo(_aimPoint)));
    laser.scale.z = dist;
  }

  function _teleportTo(point) {
    if (!_player) return;

    // Teleport moves player root in XZ, keep locked Y
    _player.position.x = point.x;
    _player.position.z = point.z;

    // keep height lock applied
    _applyHeightLock();
  }

  function _onSelectStart(hand) {
    _activeHand = hand;
  }

  function _onSelectEnd(hand) {
    // Teleport on release, only if aim is valid
    if (_aimValid) _teleportTo(_aimPoint);
  }

  function _onSqueezeStart(hand) {
    _activeHand = hand;
  }

  function _buildControllerSystem() {
    // Input controllers (events)
    _ctrlL = _renderer.xr.getController(0);
    _ctrlR = _renderer.xr.getController(1);

    // GRIPS (visual transforms)
    _gripL = _renderer.xr.getControllerGrip(0);
    _gripR = _renderer.xr.getControllerGrip(1);

    // Add minimal visuals to grips
    _gripL.add(_makeControllerVisual(0x222222));
    _gripR.add(_makeControllerVisual(0x222222));

    // Add lasers to grips (THIS is the critical fix)
    _laserL = _makeLaser(0x00ffaa);
    _laserR = _makeLaser(0x00ffaa);
    _gripL.add(_laserL);
    _gripR.add(_laserR);

    // Slight forward offset so laser doesn't appear from "inside body"
    _laserL.position.set(0, 0, -0.02);
    _laserR.position.set(0, 0, -0.02);

    // Events on controllers (not grips)
    _ctrlL.addEventListener("selectstart", () => _onSelectStart("left"));
    _ctrlL.addEventListener("selectend", () => _onSelectEnd("left"));
    _ctrlL.addEventListener("squeezestart", () => _onSqueezeStart("left"));

    _ctrlR.addEventListener("selectstart", () => _onSelectStart("right"));
    _ctrlR.addEventListener("selectend", () => _onSelectEnd("right"));
    _ctrlR.addEventListener("squeezestart", () => _onSqueezeStart("right"));

    // Add to rig
    _rigRoot.add(_ctrlL);
    _rigRoot.add(_ctrlR);
    _rigRoot.add(_gripL);
    _rigRoot.add(_gripR);

    _logOk("VRRig: controllers (grip-based) ready");
  }

  function create(renderer, scene, camera, playerGroup, hub = null) {
    _renderer = renderer;
    _scene = scene;
    _camera = camera;
    _player = playerGroup;
    _hub = hub;

    // Rig root that holds controllers; attach to player group so it moves with you
    _rigRoot = new THREE.Group();
    _rigRoot.name = "VRRigRoot";

    if (_player) _player.add(_rigRoot);
    else _scene.add(_rigRoot);

    // Teleport ring in world (not on controller)
    _ring = _makeRing();
    _scene.add(_ring);

    // Build controllers (grip fix)
    _buildControllerSystem();

    // Make sure we start at the locked height
    _applyHeightLock();
    _logOk(`VRRig: heightLock ${_heightLockEnabled ? "ON" : "OFF"} @ ${_heightLockMeters.toFixed(2)}m`);

    return _rigRoot;
  }

  function update(renderer) {
    if (!_renderer) return;

    // Keep height locked every frame
    _applyHeightLock();

    // Update aim + laser + ring from active controller grip
    _updateAimAndVisuals(renderer);
  }

  return {
    create,
    update,
    setWorldRefs,
    setHeightLock,
  };
})();
