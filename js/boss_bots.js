import * as THREE from "three";
import { TextureBank } from "./textures.js";
import { RoomManager } from "./room_manager.js";

function makeNameSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // border
  ctx.strokeStyle = "rgba(0,255,255,0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // text
  ctx.fillStyle = "white";
  ctx.font = "bold 54px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1.25, 0.65, 1.0);
  return spr;
}

function makeBossAvatar(color = 0xffffff) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
    TextureBank.standard({ color, roughness: 0.55, metalness: 0.05 })
  );
  body.castShadow = true;
  body.position.y = 0.95;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.20, 18, 18),
    TextureBank.standard({ color: 0xffffff, roughness: 0.35, metalness: 0.0 })
  );
  head.castShadow = true;
  head.position.y = 1.45;
  group.add(head);

  // Shoulders (small)
  const shoulderMat = TextureBank.standard({ color, roughness: 0.6, metalness: 0.02 });
  const shL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), shoulderMat);
  const shR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), shoulderMat);
  shL.position.set(-0.22, 1.15, 0);
  shR.position.set( 0.22, 1.15, 0);
  group.add(shL, shR);

  // Glow accent ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.02, 10, 24),
    new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      roughness: 0.8
    })
  );
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return group;
}

export const BossBots = {
  bosses: [],
  scene: null,
  _travelClock: 0,
  _nextTravel: 35,
  _thinkClock: 0,
  _thinkEvery: 1.2,

  init(scene) {
    this.scene = scene;

    const defs = [
      ["BOSS_1", "King Jericho", 0x7755ff, "calculating"],
      ["BOSS_2", "Lady Nova",    0x55ffaa, "aggressive"],
      ["BOSS_3", "Maka V",       0xffaa55, "chaotic"],
      ["BOSS_4", "Shadow Ace",   0x55aaff, "silent"],
      ["BOSS_5", "Crimson",      0xff5566, "aggressive"],
      ["BOSS_6", "Dealer Zero",  0xaaaaaa, "calculating"],
    ];

    this.bosses = defs.map((d, i) => this.makeBoss(d[0], d[1], d[2], d[3], i));

    // Start all bosses at lobby table seats
    this.bosses.forEach((b) => {
      b.roomId = "lobby";
      b.mode = "TABLE";
      this.placeAtSeat(b);
    });

    this._travelClock = 0;
    this._nextTravel = this.randRange(25, 55);
    this._thinkClock = 0;
  },

  makeBoss(id, name, color, personality, seatIndex) {
    const avatar = makeBossAvatar(color);
    avatar.userData.isBoss = true;
    avatar.userData.bossId = id;

    // name tag
    const tag = makeNameSprite(name);
    tag.position.y = 2.05;
    avatar.add(tag);

    this.scene.add(avatar);

    return {
      id, name, personality,
      group: avatar,
      tag,
      roomId: "lobby",
      mode: "TABLE",
      aggression: 1.0,
      seatIndex
    };
  },

  update(dt, camera) {
    // roam schedule
    this._travelClock += dt;
    if (this._travelClock > this._nextTravel) {
      this._travelClock = 0;
      this._nextTravel = this.randRange(25, 55);

      // sometimes 1-2 bosses roam to another room
      const roamCount = Math.random() < 0.55 ? 1 : 2;
      for (let i = 0; i < roamCount; i++) {
        const b = this.bosses[Math.floor(Math.random() * this.bosses.length)];
        const roomId = RoomManager.randomAggroRoom();
        this.sendToRoom(b, roomId);
      }
    }

    // keep name tags facing camera
    if (camera) {
      for (const b of this.bosses) {
        b.tag.quaternion.copy(camera.quaternion);
      }
    }

    // idle bob
    const t = performance.now() * 0.002;
    for (const b of this.bosses) {
      b.group.position.y = 0 + Math.sin(t + b.seatIndex) * 0.02;
    }
  },

  placeAtSeat(b) {
    const room = RoomManager.getRoom(b.roomId);
    const cx = room.center.x, cz = room.center.z;

    const seats = [
      [ 3.8, 0.0,  0.0],
      [ 1.9, 0.0,  3.3],
      [-1.9, 0.0,  3.3],
      [-3.8, 0.0,  0.0],
      [-1.9, 0.0, -3.3],
      [ 1.9, 0.0, -3.3],
    ];

    const [sx, sy, sz] = seats[b.seatIndex % 6];
    b.group.position.set(cx + sx, sy, cz + sz);
    b.group.lookAt(cx, 0.9, cz);
    b.aggression = room.aggression;
    b.mode = "TABLE";
  },

  sendToRoom(b, roomId) {
    b.roomId = roomId;
    const room = RoomManager.getRoom(roomId);
    b.group.position.set(room.center.x + this.randRange(-3, 3), 0, room.center.z + this.randRange(-3, 3));
    b.aggression = room.aggression;
    b.mode = "ROAM";

    window.dispatchEvent(new CustomEvent("notify", {
      detail: { text: `${b.name} moved to ${room.name} (aggro ${b.aggression.toFixed(2)})` }
    }));
  },

  randRange(a, b) { return a + Math.random() * (b - a); }
};
