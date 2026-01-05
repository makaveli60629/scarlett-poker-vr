// js/poker_simulation.js — Poker Simulation (8.1.9)
// IMPORTANT:
// This file MUST export PokerSim or World.js will crash.
// Fixes:
// - export name is PokerSim (matches World import)
// - stable update loop
// - simple 10-round tournament leaderboard data

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const PokerSim = {
  _scene: null,
  _tableAnchor: null,
  _t: 0,
  _round: 0,
  _maxRounds: 10,
  _bots: [],
  _pot: 0,
  _log: [],
  _leaderboard: [], // {name,wins,stack}

  start(scene, tableAnchor) {
    this._scene = scene;
    this._tableAnchor = tableAnchor;

    this._round = 0;
    this._pot = 0;
    this._log = [];
    this._bots = [];

    // Create table (simple placeholder, your boss_table can replace later)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.75, 2.9, 0.22, 44),
      new THREE.MeshStandardMaterial({ color: 0x5a0b0b, roughness: 0.65, emissive: 0x120000, emissiveIntensity: 0.35 })
    );
    table.position.y = 0.92;
    tableAnchor.add(table);

    // Chairs + bots
    const seatR = 3.4;
    const botCount = 6;
    for (let i = 0; i < botCount; i++) {
      const a = (i / botCount) * Math.PI * 2;

      // chair
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 })
      );
      chair.position.set(Math.cos(a) * seatR, 0.4, Math.sin(a) * seatR);
      chair.rotation.y = -a + Math.PI;
      tableAnchor.add(chair);

      // bot body
      const bot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.55, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x9aa7ff, roughness: 0.6 })
      );
      bot.position.set(Math.cos(a) * seatR, 1.05, Math.sin(a) * seatR);
      bot.rotation.y = -a + Math.PI;
      tableAnchor.add(bot);

      const name = `BOT ${i + 1}`;
      const stack = 20000;

      this._bots.push({
        name,
        stack,
        wins: 0,
        mesh: bot,
        crown: null,
      });
    }

    this._leaderboard = this._bots.map(b => ({ name: b.name, wins: 0, stack: b.stack }));

    this._logPush(`PokerSim 8.1.9 started — ${this._bots.length} bots @ 20,000 chips`);
  },

  update(dt) {
    this._t += dt;

    // Every ~6 seconds, play one full “hand” (placeholder logic)
    if (this._t > 6.0) {
      this._t = 0;
      this._playHand();
    }
  },

  // Called by World to paint leaderboard board
  renderLeaderboardTo(boardGroup) {
    // Our board group created in world.js has the mesh with canvas in child[1]
    const mesh = boardGroup.children?.[1];
    if (!mesh?.userData?._lbCtx) return;

    const ctx = mesh.userData._lbCtx;
    const canvas = mesh.userData._lbCanvas;
    const tex = mesh.userData._lbTex;

    ctx.fillStyle = "#070a10";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ffaa";
    ctx.font = "bold 54px Arial";
    ctx.fillText("BOSS TOURNAMENT (Top 10)", 40, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "30px Arial";
    ctx.fillText(`Round: ${Math.min(this._round, this._maxRounds)} / ${this._maxRounds}`, 40, 140);

    // Sort by wins then stack
    const top = [...this._leaderboard].sort((a, b) => (b.wins - a.wins) || (b.stack - a.stack)).slice(0, 10);

    ctx.font = "28px Arial";
    let y = 200;
    for (let i = 0; i < top.length; i++) {
      const row = top[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•";
      ctx.fillStyle = i < 3 ? "#ffcc00" : "#cfd6ff";
      ctx.fillText(`${medal} ${row.name}  — Wins: ${row.wins}  — Stack: ${row.stack}`, 40, y);
      y += 34;
    }

    // Last event
    ctx.fillStyle = "#00ffaa";
    ctx.font = "26px Arial";
    ctx.fillText("Last:", 40, 500);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this._log[this._log.length - 1] || "—", 120, 500);

    tex.needsUpdate = true;
  },

  _playHand() {
    if (!this._bots.length) return;

    // reset crowns
    for (const b of this._bots) this._removeCrown(b);

    // Pot + actions
    this._pot = 0;

    // Simple betting: each bot randomly folds/calls/raises
    for (const b of this._bots) {
      if (b.stack <= 0) continue;

      const r = Math.random();
      let bet = 0;
      let action = "CALL";

      if (r < 0.20) {
        action = "FOLD";
        bet = 0;
      } else if (r < 0.80) {
        action = "CALL";
        bet = Math.min(200, b.stack);
      } else {
        action = "RAISE";
        bet = Math.min(600 + Math.floor(Math.random() * 600), b.stack);
      }

      if (bet > 0) {
        b.stack -= bet;
        this._pot += bet;
      }
    }

    // Winner among bots with stack > 0 (random for now)
    const alive = this._bots.filter(b => b.stack > 0);
    if (alive.length === 0) {
      // everybody busted (rare) — reset
      for (const b of this._bots) b.stack = 20000;
      this._logPush("All bots busted — stacks reset.");
      return;
    }

    const winner = alive[Math.floor(Math.random() * alive.length)];
    winner.stack += this._pot;
    winner.wins += 1;

    // Update leaderboard data
    const row = this._leaderboard.find(x => x.name === winner.name);
    if (row) {
      row.wins = winner.wins;
      row.stack = winner.stack;
    }

    const handLabel = this._randomHandLabel();
    this._round += 1;

    this._giveCrown(winner);

    this._logPush(`${winner.name} wins ${this._pot} chips with: ${handLabel}`);

    // If tournament ended, announce champion & restart after 1 “pause” hand
    if (this._round >= this._maxRounds) {
      const champ = [...this._leaderboard].sort((a, b) => (b.wins - a.wins) || (b.stack - a.stack))[0];
      this._logPush(`🏆 TOURNAMENT COMPLETE — Champion: ${champ.name} (Wins: ${champ.wins}) — restarting…`);

      // reset
      this._round = 0;
      for (const b of this._bots) {
        b.stack = 20000;
        b.wins = 0;
      }
      for (const r of this._leaderboard) {
        r.stack = 20000;
        r.wins = 0;
      }
    }
  },

  _randomHandLabel() {
    const hands = [
      "High Card", "One Pair", "Two Pair", "Three of a Kind",
      "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"
    ];
    return hands[Math.floor(Math.random() * hands.length)];
  },

  _giveCrown(bot) {
    // Crown: higher, shiny, then removed on next hand
    const crown = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.10, 0.03, 90, 12),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.2, roughness: 0.3 })
    );
    crown.position.set(0, 0.95, 0);
    bot.mesh.add(crown);
    bot.crown = crown;
  },

  _removeCrown(bot) {
    if (!bot.crown) return;
    bot.mesh.remove(bot.crown);
    bot.crown.geometry?.dispose?.();
    bot.crown.material?.dispose?.();
    bot.crown = null;
  },

  _logPush(s) {
    this._log.push(s);
    if (this._log.length > 30) this._log.shift();
  },
};
