// /js/bot.js — Bots v2 (Seated + Elimination Walk + Winner Crown AFTER game)
// Eliminated bots leave during the game. Winner walks with crown for 60s AFTER game.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

export const BotManager = {
  scene: null,
  world: null,

  bots: [],
  alive: [],
  eliminated: [],
  winner: null,

  secondsPerElimination: 10,
  crownHoldSeconds: 60,

  _t: 0,
  _phase: "idle",

  init({ scene, world }) {
    this.scene = scene;
    this.world = world;
    this.reset();
  },

  reset() {
    for (const b of this.bots) this.scene.remove(b.avatar.group);
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
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, floorY, 11.5);

    for (let i = 0; i < count; i++) {
      const avatar = createAvatar({
        name: `BOT_${i+1}`,
        height: 1.78,
      });

      // color variety
      avatar.setShirtColor(i % 2 === 0 ? 0x2bd7ff : 0xff2bd6);
      avatar.setAura({ type:"ring", color: i % 2 === 0 ? 0x2bd7ff : 0xff2bd6 });

      const bot = {
        id: `BOT_${i+1}`,
        avatar,
        state: "lobby_walk", // or seated, eliminated_walk, winner_walk
        speed: 0.9 + i*0.03,
        target: new THREE.Vector3(),
        crown: null,
      };

      if (i < Math.min(6, seats.length)) {
        const s = seats[i];
        bot.state = "seated";
        avatar.group.position.set(s.position.x, floorY, s.position.z);
        avatar.group.rotation.y = s.yaw;
      } else {
        avatar.group.position.set(lobby.x + (Math.random()*2-1), floorY, lobby.z + (Math.random()*2-1));
        bot.target.copy(avatar.group.position);
      }

      this.scene.add(avatar.group);
      this.bots.push(bot);
      this.alive.push(bot);
    }

    this._phase = "running";
    this._t = 0;
  },

  update(dt) {
    const floorY = this.world?.floorY ?? 0;
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, floorY, 11.5);

    // idle lobby walkers
    for (const b of this.bots) {
      if (b.state !== "lobby_walk") continue;

      if (b.avatar.group.position.distanceTo(b.target) < 0.25) {
        b.target.set(
          lobby.x + (Math.random() * 6 - 3),
          lobby.y,
          lobby.z + (Math.random() * 6 - 3)
        );
      }
      this._walkTo(b, b.target, dt);
    }

    if (this._phase === "running") {
      this._t += dt;

      if (this._t >= this.secondsPerElimination && this.alive.length > 1) {
        this._t = 0;
        // eliminate someone NOT already eliminated and not “seated only”
        const idx = Math.floor(Math.random() * this.alive.length);
        const loser = this.alive.splice(idx, 1)[0];
        this._eliminate(loser);
      }

      // winner
      if (this.alive.length === 1 && !this.winner) {
        this.winner = this.alive[0];
        this._giveCrown(this.winner);
        this.winner.state = "winner_walk";
        this._phase = "crown";
        this._t = 0;
      }
    }

    if (this._phase === "crown") {
      this._t += dt;

      // winner stroll
      if (this.winner) {
        const w = this.winner;
        if (w.avatar.group.position.distanceTo(w.target) < 0.3) {
          w.target.set(
            lobby.x + (Math.random() * 7 - 3.5),
            lobby.y,
            lobby.z + (Math.random() * 7 - 3.5)
          );
        }
        this._walkTo(w, w.target, dt);
      }

      // start new game
      if (this._t >= this.crownHoldSeconds) {
        this._startNextGame();
      }
    }

    // eliminated bots walking to lobby
    for (const b of this.bots) {
      if (b.state !== "eliminated_walk") continue;
      this._walkTo(b, b.target, dt);
      if (b.avatar.group.position.distanceTo(b.target) < 0.35) {
        b.state = "lobby_walk";
      }
    }
  },

  _eliminate(bot) {
    const floorY = this.world?.floorY ?? 0;
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, floorY, 11.5);

    bot.state = "eliminated_walk";
    this.eliminated.push(bot);

    bot.target.set(
      lobby.x + (Math.random() * 6 - 3),
      lobby.y,
      lobby.z + (Math.random() * 6 - 3)
    );
  },

  _giveCrown(bot) {
    if (bot.crown) bot.avatar.group.remove(bot.crown);

    const crown = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0x2a1a08,
        emissiveIntensity: 0.75,
        roughness: 0.35,
        metalness: 0.85
      })
    );
    base.rotation.x = Math.PI / 2;
    crown.add(base);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 10), spikeMat);
      const a = (i / 8) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
      crown.add(sp);
    }

    crown.position.set(0, 1.85, 0);
    bot.avatar.group.add(crown);
    bot.crown = crown;

    // winner starts at lobby
    const floorY = this.world?.floorY ?? 0;
    const lobby = this.world?.padById?.lobby?.position || new THREE.Vector3(0, floorY, 11.5);
    bot.target.copy(lobby);
  },

  _startNextGame() {
    // remove crown
    if (this.winner?.crown) {
      this.winner.avatar.group.remove(this.winner.crown);
      this.winner.crown = null;
    }

    // reset alive
    this.alive = [...this.bots];
    this.eliminated = [];
    this.winner = null;

    // reseat first 6, rest lobby
    const seats = this.world?.seats || [];
    const floorY = this.world?.floorY ?? 0;

    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (i < Math.min(6, seats.length)) {
        const s = seats[i];
        b.state = "seated";
        b.avatar.group.position.set(s.position.x, floorY, s.position.z);
        b.avatar.group.rotation.y = s.yaw;
      } else {
        b.state = "lobby_walk";
      }
    }

    this._phase = "running";
    this._t = 0;
  },

  _walkTo(bot, target, dt) {
    const pos = bot.avatar.group.position;
    const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
    const d = dir.length();

    if (d < 0.18) return;

    dir.normalize();
    pos.addScaledVector(dir, bot.speed * dt);

    bot.avatar.group.rotation.y = Math.atan2(dir.x, dir.z);
  }
};
