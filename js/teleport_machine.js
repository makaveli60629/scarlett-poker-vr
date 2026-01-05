import * as THREE from "three";
import { RoomManager } from "./room_manager.js";

export const TeleportMachine = {
  renderer: null,
  scene: null,
  player: null,
  pads: [],

  init(renderer, scene, player) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = player;

    // Pads are handled by World.build in some setups.
    // But if you want TeleportMachine to build them, keep this:
    if (RoomManager.getRooms) this.buildPads();

    // ✅ Force spawn on pad immediately
    const spawn = this.getBestSpawn();
    this.applySpawn(spawn);

    // Also expose a "safe respawn" event
    window.addEventListener("force_safe_spawn", () => {
      const s = this.getBestSpawn();
      this.applySpawn(s);
    });
  },

  buildPads() {
    // Optional: if you already build pads in World, you can remove this.
    // We keep it light: just register pad locations.
    this.pads = [];
    const rooms = RoomManager.getRooms();
    for (const r of rooms) {
      this.pads.push({
        id: r.id,
        pos: new THREE.Vector3(r.center.x, 0, r.center.z),
        yaw: 0
      });
    }
  },

  getBestSpawn() {
    // Prefer explicitly placed pads (from World.spawnPads if you use that),
    // else use our pad list, else hard fallback.
    const pads = this.pads?.length ? this.pads : null;

    // Hard fallback: lobby safe corner (never table center)
    const fallback = { pos: new THREE.Vector3(0, 0, 10), yaw: Math.PI };

    if (!pads) return fallback;

    // ✅ Choose a pad that is NOT near the boss table (0,0)
    // (table radius ~4.25, so keep > 6.0)
    const safePads = pads.filter(p => {
      const dx = p.pos.x - 0;
      const dz = p.pos.z - 0;
      const dist = Math.sqrt(dx*dx + dz*dz);
      return dist > 6.0;
    });

    // Prefer lobby if it exists
    const lobby = safePads.find(p => p.id === "lobby");
    if (lobby) return lobby;

    // Otherwise any safe pad
    if (safePads.length) return safePads[Math.floor(Math.random() * safePads.length)];

    // If all pads are too close, shove to fallback
    return fallback;
  },

  applySpawn(spawn) {
    if (!spawn?.pos) return;

    // ✅ Final safety: never spawn inside the table zone
    const x = spawn.pos.x;
    const z = spawn.pos.z;
    const dist = Math.sqrt(x*x + z*z);

    // If somehow inside, force to lobby offset
    const safe = (dist < 6.0)
      ? new THREE.Vector3(0, 0, 10)
      : new THREE.Vector3(x, 0, z);

    this.player.position.set(safe.x, 0, safe.z);
    this.player.rotation.y = spawn.yaw || 0;
  },

  update(dt) {
    // If you animate pads, do it here; otherwise keep empty.
  }
};
