// js/collision.js — Patch 6.3
// Lightweight VR-safe collision + spawn rescue (GitHub-safe, no external deps)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// We treat colliders as simple world-space AABBs expanded by player radius.
// Register ONLY big objects (walls, couch, fountain, kiosk, tables, etc.)
const _colliders = [];
const _tmpBox = new THREE.Box3();
const _tmpBox2 = new THREE.Box3();
const _tmpVec = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector3();

export function registerCollider(obj, opts = {}) {
  if (!obj) return;

  // Accept Group or Mesh: store root + options
  _colliders.push({
    obj,
    pad: opts.pad ?? 0.06,        // extra padding for stability
    enabled: opts.enabled ?? true,
    name: opts.name || obj.name || "collider"
  });
}

export function clearColliders() {
  _colliders.length = 0;
}

export function getColliderCount() {
  return _colliders.length;
}

// Compute AABB for any Object3D
function getWorldAABB(obj, outBox) {
  outBox.setFromObject(obj);
  return outBox;
}

// Push player out of a box in XZ plane (keeps Y unchanged)
function resolveXZ(playerPos, box, radius) {
  // Expand box by radius
  _tmpBox2.copy(box);
  _tmpBox2.min.x -= radius; _tmpBox2.min.z -= radius;
  _tmpBox2.max.x += radius; _tmpBox2.max.z += radius;

  if (!_tmpBox2.containsPoint(playerPos)) return false;

  // Find smallest push direction in X or Z
  const dxMin = playerPos.x - _tmpBox2.min.x;
  const dxMax = _tmpBox2.max.x - playerPos.x;
  const dzMin = playerPos.z - _tmpBox2.min.z;
  const dzMax = _tmpBox2.max.z - playerPos.z;

  const minPush = Math.min(dxMin, dxMax, dzMin, dzMax);

  if (minPush === dxMin) playerPos.x = _tmpBox2.min.x;
  else if (minPush === dxMax) playerPos.x = _tmpBox2.max.x;
  else if (minPush === dzMin) playerPos.z = _tmpBox2.min.z;
  else playerPos.z = _tmpBox2.max.z;

  return true;
}

export const Collision = {
  // Comfort defaults
  playerRadius: 0.22,
  maxPushPerFrame: 0.38,     // prevents jitter/teleport-like pushes
  enabled: true,

  // Spawn rescue
  rescueEnabled: true,
  rescueCooldown: 0,
  rescueCooldownTime: 1.2,   // seconds
  stuckFrames: 0,
  stuckFramesThreshold: 35,  // ~0.6s at 60fps

  // Internal tracking
  _lastSafePos: new THREE.Vector3(0, 0, 0),
  _lastPos: new THREE.Vector3(0, 0, 0),

  setPlayerRadius(r) {
    this.playerRadius = Math.max(0.12, r);
  },

  markSafe(playerRig) {
    if (!playerRig) return;
    this._lastSafePos.copy(playerRig.position);
  },

  // called every frame
  update(dt, playerRig, getSafeSpawnFn, toastFn) {
    if (!this.enabled || !playerRig) return;

    const pos = playerRig.position;

    // Track "stuck" if barely moving but colliding repeatedly
    const moved = pos.distanceTo(this._lastPos);
    this._lastPos.copy(pos);

    let collided = false;
    let pushTotal = 0;

    for (let i = 0; i < _colliders.length; i++) {
      const c = _colliders[i];
      if (!c.enabled || !c.obj) continue;

      // Skip invisible
      if (c.obj.visible === false) continue;

      // Compute world AABB
      getWorldAABB(c.obj, _tmpBox);

      // Ignore very tall or far Y ranges? (we keep XZ only but require overlap in Y a bit)
      const y = pos.y;
      if (y < _tmpBox.min.y - 2.0 || y > _tmpBox.max.y + 2.0) continue;

      // Resolve XZ
      const beforeX = pos.x, beforeZ = pos.z;
      if (resolveXZ(pos, _tmpBox, this.playerRadius + c.pad)) {
        collided = true;

        const push = Math.hypot(pos.x - beforeX, pos.z - beforeZ);
        pushTotal += push;

        // Clamp pushes to prevent “snaps”
        if (pushTotal > this.maxPushPerFrame) {
          // rollback partially toward before position
          const over = pushTotal - this.maxPushPerFrame;
          const dirX = pos.x - beforeX;
          const dirZ = pos.z - beforeZ;
          const len = Math.hypot(dirX, dirZ) || 1;
          pos.x -= (dirX / len) * over;
          pos.z -= (dirZ / len) * over;
          break;
        }
      }
    }

    // If not colliding, mark safe
    if (!collided) {
      this.stuckFrames = 0;
      this.markSafe(playerRig);
    } else {
      // Colliding and not moving much -> stuck counter
      if (moved < 0.003) this.stuckFrames++;
      else this.stuckFrames = Math.max(0, this.stuckFrames - 2);
    }

    // Spawn rescue: if stuck too long, teleport back to safe spawn pad
    if (this.rescueEnabled) {
      this.rescueCooldown = Math.max(0, this.rescueCooldown - dt);

      const shouldRescue = this.stuckFrames >= this.stuckFramesThreshold && this.rescueCooldown <= 0;
      if (shouldRescue) {
        this.stuckFrames = 0;
        this.rescueCooldown = this.rescueCooldownTime;

        const safe = (typeof getSafeSpawnFn === "function") ? getSafeSpawnFn() : null;
        if (safe?.position) {
          playerRig.position.copy(safe.position);
          playerRig.rotation.y = safe.rotationY || 0;
          toastFn?.("Spawn Rescue: returned to Teleport Pad");
        } else {
          // fallback to last safe pos
          playerRig.position.copy(this._lastSafePos);
          toastFn?.("Spawn Rescue: returned to last safe location");
        }
      }
    }
  }
};
