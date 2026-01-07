// /js/bot.js — Scarlett Poker VR — Bots v1 (Seated + Elimination Walk + Winner Crown)
// Uses createAvatar() from ./avatar.js
// Uses world.seats + world.padById.lobby for walk targets

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

export const BotManager = {
  scene: null,
  world: null,

  bots: [],
  alive: [],
  eliminated: [],
  winner: null,

  // tournament timings (placeholder demo pacing)
  secondsPerElimination: 10,
  crownHoldSeconds: 60,
  _t: 0,
  _phase: "idle", // idle | running | crown

  init({ scene, world }) {
    this.scene = scene;
    this.world = world;
    this.reset();
  },

  reset() {
    // remove old bots
    for (const b of this.bots) this.scene.remove(b.group);
    this.bots = [];
    this.alive = [];
    this.eliminated = [];
    this.winner = null;
    this._t = 0;
    this._phase = "idle";
  },

  spawnBots({ count = 8 } = {}) {
    const seats = this.world?.seats || [];
    const floorY = this.world?.floorY ?? 0;

    // 6 seated, rest wander in lobby
    for (let i = 0; i < count; i++) {
      const isSeated = i < Math.min(6, seats.length);
      const name = `BOT_${i + 1}`;

      const avatar = createAvatar({
        name,
        height: 1.78,
        shirt: (i % 2 === 0) ? 0x2bd7ff : 0xff2bd6,
        accent: 0x00ffaa,
      });

      avatar.group.position.y = floorY; // IMPORTANT: no under-floor
      avatar.group.userData.isBot = true;

      const bot = {
        id: name,
        group: avatar.group,
        api: avatar,
        state: isSeated ? "seated" : "lobby_walk",
        seatIndex: isSeated ? i : -1,
        speed: 0.8 + (i * 0.03),
        target: new THREE.Vector3(),
        crown: null,
      };

      if (isSeated) {
        const s = seats[i];
        bot.group.position.set(s.position.x, floorY, s.position.z);
        bot.group.rotation.y = s.yaw;
      } else {
        const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, floorY, 11.5);
        bot.group.position.set(lobby.x + (Math.random() * 2 - 1), floorY, lobby.z + (Math.random() * 2 - 1));
        bot.target.copy(bot.group.position);
      }

      this.scene.add(bot.group);
      this.bots.push(bot);
      this.alive.push(bot);
    }

    this._phase = "running";
    this._t = 0;
  },

  update(dt) {
    if (this._phase === "idle") return;

    // lobby walkers gentle motion
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, this.world?.floorY ?? 0, 11.5);
    for (const b of this.bots) {
      if (b.state !== "lobby_walk") continue;
      // pick target if close
      if (b.group.position.distanceTo(b.target) < 0.25) {
        b.target.set(
          lobby.x + (Math.random() * 5 - 2.5),
          lobby.y,
          lobby.z + (Math.random() * 5 - 2.5)
        );
      }
      this._walkTo(b, b.target, dt);
    }

    if (this._phase === "running") {
      this._t += dt;

      // Every N seconds eliminate one (demo tournament)
      if (this._t >= this.secondsPerElimination && this.alive.length > 1) {
        this._t = 0;
        // eliminate a random alive that isn't already eliminated
        const idx = Math.floor(Math.random() * this.alive.length);
        const loser = this.alive.splice(idx, 1)[0];
        this._eliminate(loser);
      }

      // If one left => winner
      if (this.alive.length === 1 && !this.winner) {
        this.winner = this.alive[0];
        this._giveCrown(this.winner);
        this._phase = "crown";
        this._t = 0;
      }
    }

    if (this._phase === "crown") {
      this._t += dt;

      // winner walks around lobby with crown
      const win = this.winner;
      if (win) {
        // ensure winner is lobby walking
        if (win.state !== "winner_walk") {
          win.state = "winner_walk";
          win.target.copy(lobby);
        }
        if (win.group.position.distanceTo(win.target) < 0.3) {
          win.target.set(
            lobby.x + (Math.random() * 6 - 3),
            lobby.y,
            lobby.z + (Math.random() * 6 - 3)
          );
        }
        this._walkTo(win, win.target, dt);
      }

      // After crown hold => new game: reseat alive + respawn eliminated back to lobby
      if (this._t >= this.crownHoldSeconds) {
        this._t = 0;
        this._startNextGame();
      }
    }
  },

  _eliminate(bot) {
    bot.state = "eliminated_walk";
    this.eliminated.push(bot);

    // send to lobby
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, this.world?.floorY ?? 0, 11.5);
    bot.target.set(
      lobby.x + (Math.random() * 5 - 2.5),
      lobby.y,
      lobby.z + (Math.random() * 5 - 2.5)
    );

    // Once they reach, they wander
    // (handled in update: when state set to lobby_walk after reaching)
    bot._onArrive = () => {
      bot.state = "lobby_walk";
    };
  },

  _giveCrown(bot) {
    // simple crown: gold torus + spikes
    const crown = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x2a1a08, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.75 })
    );
    base.rotation.x = Math.PI / 2;
    crown.add(base);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.75 });
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 10), spikeMat);
      const a = (i / 8) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
      crown.add(sp);
    }

    // attach above head (avatar has no bones, so approximate)
    crown.position.set(0, 1.85, 0);
    bot.group.add(crown);
    bot.crown = crown;
  },

  _startNextGame() {
    const seats = this.world?.seats || [];
    const floorY = this.world?.floorY ?? 0;

    // remove crown
    if (this.winner?.crown) {
      this.winner.group.remove(this.winner.crown);
      this.winner.crown = null;
    }

    // everyone becomes alive again
    this.alive = [...this.bots];
    this.eliminated = [];
    this.winner = null;

    // reseat first 6, rest lobby
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];

      if (i < Math.min(6, seats.length)) {
        const s = seats[i];
        b.state = "seated";
        b.seatIndex = i;
        b.group.position.set(s.position.x, floorY, s.position.z);
        b.group.rotation.y = s.yaw;
      } else {
        b.state = "lobby_walk";
        b.seatIndex = -1;
      }
    }

    this._phase = "running";
  },

  _walkTo(bot, target, dt) {
    const pos = bot.group.position;
    const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
    const d = dir.length();

    if (d < 0.18) {
      if (bot._onArrive) { bot._onArrive(); bot._onArrive = null; }
      return;
    }

    dir.normalize();
    pos.addScaledVector(dir, bot.speed * dt);

    // face direction
    const yaw = Math.atan2(dir.x, dir.z);
    bot.group.rotation.y = yaw;
  }
};
