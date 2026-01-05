import * as THREE from "three";
import { State } from "./state.js";

export const XrLocomotion = {
  renderer: null,
  player: null,
  camera: null,

  moveSpeed: 2.1,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  snapTimer: 0,

  init(renderer, player, camera) {
    this.renderer = renderer;
    this.player = player;
    this.camera = camera;

    this.spawnAtBestPad();
    this.resolveCollisions(this.player.position);
  },

  update(dt) {
    this.snapTimer = Math.max(0, this.snapTimer - dt);

    const move = this.getStick("left");
    const turn = this.getStick("right");

    if (this.snapTimer === 0 && Math.abs(turn.x) > 0.8) {
      const dir = Math.sign(turn.x);
      this.player.rotation.y -= dir * this.snapAngle;
      this.snapTimer = this.snapCooldown;
    }

    const dead = 0.15;
    const f = (Math.abs(move.y) < dead) ? 0 : -move.y;
    const s = (Math.abs(move.x) < dead) ? 0 : move.x;

    if (f !== 0 || s !== 0) {
      const yaw = this.getHeadsetYaw();
      const sin = Math.sin(yaw), cos = Math.cos(yaw);

      const dx = (s * cos - f * sin) * this.moveSpeed * dt;
      const dz = (s * sin + f * cos) * this.moveSpeed * dt;

      this.player.position.x += dx;
      this.player.position.z += dz;
      this.resolveCollisions(this.player.position);
    }

    this.player.position.y = State.player.height;
  },

  spawnAtBestPad() {
    const pads = State.world.spawnPads || [];
    if (!pads.length) {
      this.player.position.set(0, State.player.height, 6);
      return;
    }
    for (let i = 0; i < pads.length; i++) {
      const p = new THREE.Vector3();
      pads[i].getWorldPosition(p);
      if (!this.isPointBlocked(p.x, p.z)) {
        State.world.activePadIndex = i;
        this.player.position.set(p.x, State.player.height, p.z);
        this.player.rotation.y = pads[i].rotation.y || 0;
        return;
      }
    }
    const p0 = new THREE.Vector3();
    pads[0].getWorldPosition(p0);
    this.player.position.set(p0.x, State.player.height, p0.z);
  },

  isPointBlocked(x, z) {
    const r = State.player.radius + 0.05;
    for (const obj of State.world.colliders) {
      const aabb = obj.userData?.aabb;
      if (!aabb) continue;
      if (x > aabb.min.x - r && x < aabb.max.x + r && z > aabb.min.z - r && z < aabb.max.z + r) return true;
    }
    return false;
  },

  resolveCollisions(pos) {
    const r = State.player.radius;

    for (const obj of State.world.colliders) {
      const aabb = obj.userData?.aabb;
      if (!aabb) continue;

      const minX = aabb.min.x - r, maxX = aabb.max.x + r;
      const minZ = aabb.min.z - r, maxZ = aabb.max.z + r;

      const inside = (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ);
      if (!inside) continue;

      const pushLeft = Math.abs(pos.x - minX);
      const pushRight = Math.abs(maxX - pos.x);
      const pushBack = Math.abs(pos.z - minZ);
      const pushFwd = Math.abs(maxZ - pos.z);

      const m = Math.min(pushLeft, pushRight, pushBack, pushFwd);

      if (m === pushLeft) pos.x = minX;
      if (m === pushRight) pos.x = maxX;
      if (m === pushBack) pos.z = minZ;
      if (m === pushFwd) pos.z = maxZ;
    }

    // Room clamp (prevents drift outside)
    pos.x = Math.max(-15.2, Math.min(15.2, pos.x));
    pos.z = Math.max(-15.2, Math.min(15.2, pos.z));
  },

  getHeadsetYaw() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    return Math.atan2(dir.x, dir.z);
  },

  getStick(hand) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return { x: 0, y: 0 };

    for (const src of session.inputSources) {
      if (src.handedness === hand && src.gamepad) {
        const axes = src.gamepad.axes || [];
        return { x: axes[2] ?? axes[0] ?? 0, y: axes[3] ?? axes[1] ?? 0 };
      }
    }
    return { x: 0, y: 0 };
  }
};
