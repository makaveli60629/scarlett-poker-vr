import * as THREE from "three";
import { TextureBank } from "./textures.js";
import { RoomManager } from "./room_manager.js";
import { CoreBridge } from "./core_bridge.js";

export const BossBots = {
  bosses: [],
  scene: null,
  _travelClock: 0,
  _nextTravel: 35,
  _thinkClock: 0,
  _thinkEvery: 1.2, // seconds between decisions

  init(scene) {
    this.scene = scene;

    this.bosses = [
      this.makeBoss("BOSS_1", "King DaDa 420", 0x7755ff, "calculating"),
      this.makeBoss("BOSS_2", "Lady Nova",    0x55ffaa, "aggressive"),
      this.makeBoss("BOSS_3", "Makaveli 420",       0xffaa55, "chaotic"),
      this.makeBoss("BOSS_4", "Shadow",   0x55aaff, "silent"),
      this.makeBoss("BOSS_5", "Queen Scarlett 420",      0xff5566, "aggressive"),
      this.makeBoss("BOSS_6", "KoolVibez420",  0xaaaaaa, "calculating"),
    ];

    this.bosses.forEach((b, i) => {
      b.roomId = "lobby";
      b.mode = "TABLE";
      b.seatIndex = i;
      this.placeAtSeat(b);
    });

    this._travelClock = 0;
    this._nextTravel = this.randRange(25, 55);
    this._thinkClock = 0;
  },

  update(dt) {
    // roaming schedule
    this._travelClock += dt;
    if (this._travelClock > this._nextTravel) {
      this._travelClock = 0;
      this._nextTravel = this.randRange(25, 55);

      const roamCount = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < roamCount; i++) {
        const b = this.bosses[Math.floor(Math.random() * this.bosses.length)];
        const roomId = RoomManager.randomAggroRoom();
        this.sendToRoom(b, roomId);
      }
    }

    // Decision loop: core-driven when available
    this._thinkClock += dt;
    if (this._thinkClock >= this._thinkEvery) {
      this._thinkClock = 0;

      const tableState = CoreBridge.getTableState();
      if (CoreBridge.api?.hasPoker && CoreBridge.api?.hasTable && tableState) {
        // Ask core for a move per boss (only if boss is "at table")
        for (const b of this.bosses) {
          if (b.mode !== "TABLE") continue;

          const ctx = {
            actorId: b.id,
            actorName: b.name,
            personality: b.personality,
            aggression: b.aggression,
            roomId: b.roomId,
            tableState
          };

          const action = CoreBridge.decideBossAction(ctx);
          if (action) CoreBridge.applyAction(action);
        }
      }
    }

    // idle animation
    for (const b of this.bosses) {
      b.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.002 + b.seatIndex) * 0.02;
    }
  },

  makeBoss(id, name, color, personality) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 18, 18),
      TextureBank.standard({ color, roughness: 0.55, metalness: 0.05 })
    );
    mesh.castShadow = true;
    mesh.userData.isBoss = true;
    mesh.userData.bossId = id;
    this.scene.add(mesh);

    return { id, name, personality, mesh, roomId: "lobby", mode: "TABLE", aggression: 1.0, seatIndex: 0 };
  },

  placeAtSeat(b) {
    const room = RoomManager.getRoom(b.roomId);
    const cx = room.center.x, cz = room.center.z;

    const seats = [
      [ 3.8, 1.0,  0.0],
      [ 1.9, 1.0,  3.3],
      [-1.9, 1.0,  3.3],
      [-3.8, 1.0,  0.0],
      [-1.9, 1.0, -3.3],
      [ 1.9, 1.0, -3.3],
    ];

    const [sx, sy, sz] = seats[b.seatIndex % 6];
    b.mesh.position.set(cx + sx, sy, cz + sz);
    b.aggression = room.aggression;
    b.mode = "TABLE";
  },

  sendToRoom(b, roomId) {
    b.roomId = roomId;
    const room = RoomManager.getRoom(roomId);
    b.mesh.position.set(room.center.x + this.randRange(-3, 3), 1.0, room.center.z + this.randRange(-3, 3));
    b.aggression = room.aggression;
    b.mode = "ROAM";

    window.dispatchEvent(new CustomEvent("notify", {
      detail: { text: `${b.name} moved to ${room.name} (aggro ${b.aggression.toFixed(2)})` }
    }));
  },

  randRange(a, b) { return a + Math.random() * (b - a); }
};
