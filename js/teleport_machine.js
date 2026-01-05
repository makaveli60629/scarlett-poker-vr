import * as THREE from "three";
import { RoomManager } from "./room_manager.js";

export const TeleportMachine = {
  scene: null,
  player: null,
  pads: new Map(),
  currentRoomId: "lobby",

  init(renderer, scene, player) {
    this.scene = scene;
    this.player = player;

    // Build pads for every room spawn
    this.buildSpawnPads();

    // Always start at lobby spawn pad
    this.respawn("lobby");

    // External respawn request
    window.addEventListener("respawn_room", (e) => {
      const roomId = e?.detail?.roomId || this.currentRoomId || "lobby";
      this.respawn(roomId);
    });
  },

  buildSpawnPads() {
    // remove old pads
    for (const pad of this.pads.values()) this.scene.remove(pad.mesh);
    this.pads.clear();

    const rooms = RoomManager.getRooms();
    for (const r of rooms) {
      const pad = this.makePad(r.spawn.x, 0.02, r.spawn.z, r.id);
      this.scene.add(pad.mesh);
      this.pads.set(r.id, pad);
    }
  },

  makePad(x, y, z, roomId) {
    const ringGeo = new THREE.RingGeometry(0.6, 0.85, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.userData.isSpawnPad = true;
    mesh.userData.roomId = roomId;

    return {
      id: roomId,
      mesh,
      pos: new THREE.Vector3(x, 0, z)
    };
  },

  respawn(roomId) {
    const room = RoomManager.getRoom(roomId);
    this.currentRoomId = room.id;

    // Final safety: spawn is always the room.spawn, never room.center
    const x = room.spawn.x;
    const z = room.spawn.z;

    // Clear/empty zone enforcement: if something is placed there later,
    // we can offset slightly (spiral search).
    const safe = this.findClearSpot(x, z);

    this.player.position.set(safe.x, 0, safe.z);
    this.player.rotation.y = room.spawn.yaw || 0;

    window.dispatchEvent(new CustomEvent("notify", {
      detail: { text: `Respawned at ${room.name} pad.` }
    }));
  },

  findClearSpot(x, z) {
    // For now: simple “guaranteed clear” offsets.
    // We keep this deterministic + safe for GitHub.
    // If you later add collision checks, we can upgrade this to raycast.
    const candidates = [
      { x, z },
      { x: x + 1.2, z },
      { x: x - 1.2, z },
      { x, z: z + 1.2 },
      { x, z: z - 1.2 },
      { x: x + 1.2, z: z + 1.2 },
      { x: x - 1.2, z: z + 1.2 },
      { x: x + 1.2, z: z - 1.2 },
      { x: x - 1.2, z: z - 1.2 }
    ];

    // We assume spawn zones are kept clear by design.
    // Return first candidate.
    return candidates[0];
  },

  update(dt) {
    // Animate pads (optional pulse)
    const t = performance.now() * 0.002;
    for (const pad of this.pads.values()) {
      const s = 0.95 + Math.sin(t) * 0.06;
      pad.mesh.scale.set(s, 1, s);
    }
  }
};
