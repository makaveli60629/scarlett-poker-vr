// /js/LobbyCrowd.js
// Crowd manager: assigns some bots to table seats (playing) and others to roam/observe.

export class LobbyCrowd {
  constructor({ THREE, scene, bots = [], tableSeats = [], roamArea = null }) {
    this.THREE = THREE;
    this.scene = scene;
    this.bots = bots; // array of bot groups/meshes
    this.tableSeats = tableSeats; // array of { x,y,z, yaw }
    this.roamArea = roamArea || { minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 0 };

    this.playingCount = Math.min(8, this.tableSeats.length);
    this.states = new Map(); // bot -> state
    this.targets = new Map(); // bot -> {x,y,z,yaw}

    // init
    this.assignInitial();
  }

  assignInitial() {
    // first N bots to seats
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (i < this.playingCount) {
        this.setPlaying(bot, i);
      } else {
        this.setRoaming(bot);
      }
    }
  }

  setPlaying(bot, seatIndex) {
    const s = this.tableSeats[seatIndex];
    this.states.set(bot, "PLAYING");
    this.targets.set(bot, { x: s.x, y: s.y, z: s.z, yaw: s.yaw });
    bot.userData.role = "PLAYING";
    bot.userData.seatIndex = seatIndex;
  }

  setRoaming(bot) {
    this.states.set(bot, "ROAM");
    bot.userData.role = "ROAM";
    bot.userData.seatIndex = -1;

    // pick a roam target
    this.targets.set(bot, this._randomRoamTarget());
  }

  // call when a hand ends
  // winnerBot becomes KING for 60s (your crown system), losers may step out
  onHandEnded({ winnerBot, losers = [] }) {
    // Move losers out to roam
    for (const b of losers) this.setRoaming(b);

    // Ensure table seats are filled by the next available roam bots
    this._refillTableSeats();
  }

  _refillTableSeats() {
    // collect who is playing in seats
    const seatTaken = new Array(this.playingCount).fill(false);
    for (const bot of this.bots) {
      if (this.states.get(bot) === "PLAYING") {
        const idx = bot.userData.seatIndex;
        if (idx >= 0 && idx < this.playingCount) seatTaken[idx] = true;
      }
    }
    // fill empty seats with roaming bots
    for (let si = 0; si < this.playingCount; si++) {
      if (seatTaken[si]) continue;
      const candidate = this.bots.find(b => this.states.get(b) === "ROAM");
      if (!candidate) break;
      this.setPlaying(candidate, si);
    }
  }

  _randomRoamTarget() {
    const a = this.roamArea;
    const x = a.minX + Math.random() * (a.maxX - a.minX);
    const z = a.minZ + Math.random() * (a.maxZ - a.minZ);
    const yaw = Math.random() * Math.PI * 2;
    return { x, y: a.y, z, yaw };
  }

  update(dt) {
    // simple steering: move toward target, pick new target when near
    for (const bot of this.bots) {
      const st = this.states.get(bot) || "ROAM";
      const t = this.targets.get(bot);
      if (!t) continue;

      if (st === "PLAYING") {
        // snap to seat with smoothing
        this._moveBotToward(bot, t, dt, 2.5, 8.0);
        continue;
      }

      // roam
      const reached = this._moveBotToward(bot, t, dt, 0.8, 3.0);
      if (reached) this.targets.set(bot, this._randomRoamTarget());
    }
  }

  _moveBotToward(bot, target, dt, speed, turnSpeed) {
    const dx = target.x - bot.position.x;
    const dz = target.z - bot.position.z;
    const dist = Math.hypot(dx, dz);

    // rotate toward movement
    if (dist > 0.001) {
      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = bot.rotation.y;
      let dYaw = desiredYaw - currentYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      bot.rotation.y += dYaw * Math.min(1, dt * turnSpeed);
    }

    // move
    const step = speed * dt;
    if (dist > step) {
      bot.position.x += (dx / dist) * step;
      bot.position.z += (dz / dist) * step;
      bot.position.y = target.y ?? bot.position.y;
      return false;
    } else {
      bot.position.set(target.x, target.y ?? bot.position.y, target.z);
      return true;
    }
  }
      }
