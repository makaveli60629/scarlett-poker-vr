// /js/interactions.js — Seat Join System (GRIP) (9.0)
// - Aim at chair -> press GRIP -> sit
// - Press GRIP again -> stand (returns to teleport pad safe spawn)

import * as THREE from "./three.js";

export const Interactions = {
  renderer: null,
  camera: null,
  player: null,
  world: null,
  pokerSim: null,

  ray: new THREE.Raycaster(),
  tmpMat: new THREE.Matrix4(),

  seated: false,
  seatedSeatIndex: -1,
  cooldown: 0,

  init({ renderer, camera, player, world, pokerSim }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.world = world;
    this.pokerSim = pokerSim;
  },

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);

    const session = this.renderer.xr?.getSession?.();
    if (!session) return;

    const left = findSource(session, "left");
    const right = findSource(session, "right");

    // GRIP is usually buttons[1]
    const gripL = left?.gamepad?.buttons?.[1]?.value ?? 0;
    const gripR = right?.gamepad?.buttons?.[1]?.value ?? 0;

    if ((gripL > 0.85 || gripR > 0.85) && this.cooldown <= 0) {
      this.cooldown = 0.35;
      if (!this.seated) this.trySit();
      else this.stand();
    }
  },

  trySit() {
    // Cast from camera forward (simple + reliable)
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(dir);

    this.ray.set(origin, dir);
    this.ray.far = 4.0;

    const hits = this.ray.intersectObjects(this.world.interactables, true);
    if (!hits.length) return;

    // find chair root
    let obj = hits[0].object;
    while (obj && obj.parent && !obj.userData?.type) obj = obj.parent;

    if (!obj || obj.userData?.type !== "chair") return;

    const seatIndex = obj.userData.seatIndex;
    if (typeof seatIndex !== "number") return;

    // Sit the player on chair
    const sitTarget = obj.userData.sitTarget;
    const targetWorld = new THREE.Vector3();
    sitTarget.getWorldPosition(targetWorld);

    // Align player rig: set XZ to target, and raise camera height a bit
    this.player.position.set(targetWorld.x, 0, targetWorld.z);

    this.seated = true;
    this.seatedSeatIndex = seatIndex;

    // Tell poker sim: player joined seatIndex
    this.pokerSim?.setPlayerSeat(seatIndex);

    // Optional: lock movement if your controls supports it
    window.dispatchEvent(new CustomEvent("nova_player_seated", { detail: { seated: true } }));
  },

  stand() {
    this.seated = false;
    const spawn = this.world.spawn;
    if (spawn?.position) {
      this.player.position.set(spawn.position.x, 0, spawn.position.z);
    }
    this.seatedSeatIndex = -1;
    this.pokerSim?.setPlayerSeat(-1);

    window.dispatchEvent(new CustomEvent("nova_player_seated", { detail: { seated: false } }));
  }
};

function findSource(session, handedness) {
  for (const src of session.inputSources || []) {
    if (src && src.handedness === handedness && src.gamepad) return src;
  }
  return null;
      }
