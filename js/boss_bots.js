import * as THREE from "three";
import { TextureBank } from "./textures.js";
import { RoomManager } from "./room_manager.js";
import { Crown } from "./crown.js";

export const BossBots = {
  bosses: [],
  scene: null,
  _travelClock: 0,
  _nextTravel: 35,

  init(scene) {
    this.scene = scene;

    this.bosses = [
      this.makeBoss("BOSS_1", "King Jericho", 0x7755ff),
      this.makeBoss("BOSS_2", "Lady Nova",    0x55ffaa),
      this.makeBoss("BOSS_3", "Maka V",       0xffaa55),
      this.makeBoss("BOSS_4", "Shadow Ace",   0x55aaff),
      this.makeBoss("BOSS_5", "Crimson",      0xff5566),
      this.makeBoss("BOSS_6", "Dealer Zero",  0xaaaaaa),
    ];

    // All start at lobby table
    this.bosses.forEach((b, i) => {
      b.roomId = "lobby";
      b.mode = "TABLE";
      b.aggression = 1.0;
      b.stack = 10000;
      b.seatIndex = i;
      this.placeAtSeat(b);
    });

    Crown.holder = this.bosses[0].name;

    this._travelClock = 0;
    this._nextTravel = this.randRange(25, 55);
  },

  update(dt) {
    // roaming schedule
    this._travelClock += dt;
    if (this._travelClock > this._nextTravel) {
      this._travelClock = 0;
      this._nextTravel = this.randRange(25, 55);

      // pick 1-2 bosses to roam
      const roamCount = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < roamCount; i++) {
        const b = this.bosses[Math.floor(Math.random() * this.bosses.length)];
        const roomId = RoomManager.randomAggroRoom();
        this.sendToRoom(b, roomId);
      }
    }

    // simple “play” animation at table
    for (const b of this.bosses) {
      b.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.002 + b.seatIndex) * 0.02;
    }

    // Crown indicator: small pulsing emissive if holder
    for (const b of this.bosses) {
      const isHolder = (b.name === Crown.holder);
      const mat = b.mesh.material;
      if (mat && mat.emissive) {
        mat.emissive.setHex(isHolder ? 0x553300 : 0x000000);
      }
    }
  },

  makeBoss(id, name, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 18, 18),
      TextureBank.standard({ color, roughness: 0.55, metalness: 0.05 })
    );
    mesh.castShadow = true;
    mesh.userData.isBoss = true;
    mesh.userData.bossId = id;
    this.scene.add(mesh);

    return { id, name, mesh, roomId: "lobby", mode: "TABLE", aggression: 1.0, stack: 10000, seatIndex: 0 };
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

  randRange(a, b) {
    return a + Math.random() * (b - a);
  }
};
