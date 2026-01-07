// /js/bots.js — Scarlett Poker VR — BOTS v2 (Tournament Flow + Seating + Crown Walk)
// Behavior:
// - Bots start seated at the table
// - Only ELIMINATED bots stand and walk into lobby
// - Final winner stands, wears crown, walks for 60 seconds
// - Next table game starts while winner is walking (lobby stays lively)
//
// Exports: init({scene, world}) -> { update(dt) }

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

export function init({ scene, world }) {
  const floorY = world?.floorY ?? 0;

  // ----- CONFIG -----
  const CFG = {
    tableCenter: new THREE.Vector3(0, floorY, 0),
    seatCount: 8,              // can be 6 or 8 later
    seatRadius: 3.15,
    seatedY: floorY,           // base Y; avatar is placed on floor (body has its own height)
    lobbyWanderRadius: 12.0,
    walkSpeed: 0.85,
    turnSpeed: 4.0,

    // tournament timing
    handSeconds: 9.5,          // how often an elimination can happen
    minPlayersForElim: 3,      // don't eliminate once only 2 remain
    winnerCrownSeconds: 60.0,  // your requirement
    breakBetweenGames: 0.75,   // tiny pause to re-seat

    // safety clamp to keep bots above floor
    minY: floorY + 0.0015,
  };

  // ----- STATE -----
  const bots = [];
  const lobbyBots = [];     // bots that are out (walking in lobby)
  let activeBots = [];      // bots currently in the table game
  let state = "PLAYING";    // PLAYING -> FINAL2 -> WINNER_WALK -> RESEAT
  let tHand = 0;
  let tWinner = 0;
  let tReseat = 0;

  // Create a simple “crown”
  const crown = makeCrown();
  crown.visible = false;
  scene.add(crown);

  // Spawn bots (8 by default)
  for (let i = 0; i < CFG.seatCount; i++) {
    const hue = (i / CFG.seatCount);
    const shirt = hsvToHex(hue, 0.65, 0.95);

    const av = createAvatar({
      name: `Bot_${i + 1}`,
      height: 1.74,
      shirt,
      accent: 0x00ffaa
    });

    const bot = {
      id: i,
      group: av.group,
      avatar: av,
      mode: "SEATED",        // SEATED | WALKING
      seatIndex: i,
      target: new THREE.Vector3(),
      yaw: 0,
      eliminated: false,
      isWinner: false,
    };

    bot.group.userData.isBot = true;
    bot.group.name = `bot_${i + 1}`;
    scene.add(bot.group);
    bots.push(bot);
  }

  // Seat everybody + start game
  reseatNewGame();

  // ----- UPDATE LOOP -----
  function update(dt) {
    // keep bots above floor (fix “under floor”)
    for (const b of bots) {
      if (b.group.position.y < CFG.minY) b.group.position.y = CFG.minY;
    }

    // state machine
    if (state === "PLAYING") {
      tHand += dt;

      // make eliminated/lobby bots wander
      stepLobby(dt);

      // every handSeconds, eliminate exactly 1 bot until only 2 remain
      if (tHand >= CFG.handSeconds) {
        tHand = 0;

        if (activeBots.length > 2) {
          eliminateOneRandom();
        }

        if (activeBots.length === 2) {
          state = "FINAL2";
        }
      }
    }

    if (state === "FINAL2") {
      // let 1-2 hands “play” then decide winner (keeps drama)
      tHand += dt;
      stepLobby(dt);

      if (tHand >= CFG.handSeconds * 1.25) {
        tHand = 0;

        // choose winner of last 2
        const winner = activeBots[Math.floor(Math.random() * activeBots.length)];
        declareWinner(winner);

        state = "WINNER_WALK";
        tWinner = 0;

        // start the next table game immediately (as you requested)
        // while winner walks for 60 seconds
        startNextGameWhileWinnerWalks(winner);
      }
    }

    if (state === "WINNER_WALK") {
      tWinner += dt;

      // winner keeps walking
      stepWinnerWalk(dt);

      // lobby bots wander
      stepLobby(dt);

      if (tWinner >= CFG.winnerCrownSeconds) {
        // winner finishes crown walk and goes to lobby
        finishWinnerWalk();

        // after a short pause, reseat a fresh game
        state = "RESEAT";
        tReseat = 0;
      }
    }

    if (state === "RESEAT") {
      tReseat += dt;
      stepLobby(dt);

      if (tReseat >= CFG.breakBetweenGames) {
        reseatNewGame();
        state = "PLAYING";
        tHand = 0;
      }
    }
  }

  // ===================== Game Flow Helpers =====================

  function reseatNewGame() {
    // Clear flags
    for (const b of bots) {
      b.eliminated = false;
      b.isWinner = false;
      b.mode = "SEATED";
    }

    // Everyone returns to the table (8 players for now)
    activeBots = bots.slice();

    // Position each bot in a seat
    for (let i = 0; i < activeBots.length; i++) {
      const b = activeBots[i];
      b.seatIndex = i % CFG.seatCount;
      placeBotOnSeat(b);
      sitPose(b);
    }

    // Move any previous lobby bots list to empty
    lobbyBots.length = 0;

    // Hide crown
    crown.visible = false;
    crown.userData.winnerBot = null;
  }

  function eliminateOneRandom() {
    // pick 1 random from active (not last two)
    const idx = Math.floor(Math.random() * activeBots.length);
    const b = activeBots[idx];

    // remove from active
    activeBots.splice(idx, 1);

    // mark eliminated and send to lobby walking
    b.eliminated = true;
    b.mode = "WALKING";
    standPose(b);
    sendBotToLobby(b);

    // keep a separate lobby list
    if (!lobbyBots.includes(b)) lobbyBots.push(b);
  }

  function declareWinner(winnerBot) {
    // Mark winner
    winnerBot.isWinner = true;
    winnerBot.eliminated = true; // winner stands up too
    winnerBot.mode = "WALKING";
    standPose(winnerBot);

    // Crown attach
    crown.visible = true;
    crown.userData.winnerBot = winnerBot;

    // Put crown above head
    attachCrownToBot(winnerBot);

    // Send winner to lobby walking
    sendBotToLobby(winnerBot);
    if (!lobbyBots.includes(winnerBot)) lobbyBots.push(winnerBot);
  }

  function startNextGameWhileWinnerWalks(winnerBot) {
    // The next game begins while winner walks:
    // - keep winner out
    // - fill table seats with the remaining bots that are NOT winner
    const nextPlayers = bots.filter(b => b !== winnerBot);

    // Seat up to seatCount (8) from nextPlayers
    activeBots = nextPlayers.slice(0, CFG.seatCount);

    for (let i = 0; i < activeBots.length; i++) {
      const b = activeBots[i];
      // If they were walking, snap them back seated for new game
      b.mode = "SEATED";
      b.eliminated = false;
      b.isWinner = false;
      b.seatIndex = i % CFG.seatCount;
      placeBotOnSeat(b);
      sitPose(b);
      // Remove from lobby list if present
      const li = lobbyBots.indexOf(b);
      if (li >= 0) lobbyBots.splice(li, 1);
    }

    // Any extra bots (beyond seated set) remain walking as “crowd”
    for (const b of bots) {
      if (b === winnerBot) continue;
      if (!activeBots.includes(b) && !lobbyBots.includes(b)) {
        b.mode = "WALKING";
        b.eliminated = true;
        standPose(b);
        sendBotToLobby(b);
        lobbyBots.push(b);
      }
    }
  }

  function finishWinnerWalk() {
    const winner = crown.userData.winnerBot;
    crown.visible = false;
    crown.userData.winnerBot = null;

    if (winner) {
      // Winner keeps walking in lobby like other crowd
      winner.isWinner = false;
      winner.eliminated = true;
      winner.mode = "WALKING";
      standPose(winner);
      sendBotToLobby(winner);
      if (!lobbyBots.includes(winner)) lobbyBots.push(winner);
    }
  }

  // ===================== Seating / Movement =====================

  function seatTransform(seatIndex) {
    // Seats around the table center, facing the table
    const a = (seatIndex / CFG.seatCount) * Math.PI * 2;

    const x = Math.cos(a) * CFG.seatRadius;
    const z = Math.sin(a) * CFG.seatRadius;

    // Bot should face table center:
    // yaw so forward looks at center
    const yaw = Math.atan2(-x, -z);

    return { x, z, yaw };
  }

  function placeBotOnSeat(b) {
    const t = seatTransform(b.seatIndex);
    b.group.position.set(t.x, CFG.seatedY + 0.0015, t.z);
    b.group.rotation.set(0, t.yaw, 0);
  }

  function sendBotToLobby(b) {
    // pick a random target in lobby ring, away from table
    const angle = Math.random() * Math.PI * 2;
    const r = CFG.lobbyWanderRadius * (0.65 + Math.random() * 0.35);
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;

    // clamp inside bounds if available
    const bounds = world?.bounds;
    if (bounds) {
      b.target.x = THREE.MathUtils.clamp(tx, bounds.min.x, bounds.max.x);
      b.target.z = THREE.MathUtils.clamp(tz, bounds.min.z, bounds.max.z);
    } else {
      b.target.set(tx, 0, tz);
    }
    b.target.y = CFG.seatedY + 0.0015;
  }

  function stepLobby(dt) {
    // walk only those in lobby/walking mode
    for (const b of lobbyBots) {
      if (!b || b.mode !== "WALKING") continue;
      walkTowardTarget(b, dt);

      // if near target, pick a new wander target
      const d2 = b.group.position.distanceToSquared(b.target);
      if (d2 < 0.25) {
        sendBotToLobby(b);
      }
    }
  }

  function stepWinnerWalk(dt) {
    const winner = crown.userData.winnerBot;
    if (!winner) return;

    // keep crown positioned on winner’s head
    attachCrownToBot(winner);

    // winner walks like other lobby bots
    if (winner.mode !== "WALKING") return;
    walkTowardTarget(winner, dt);

    const d2 = winner.group.position.distanceToSquared(winner.target);
    if (d2 < 0.35) sendBotToLobby(winner);
  }

  function walkTowardTarget(b, dt) {
    const pos = b.group.position;

    // direction to target
    const dx = b.target.x - pos.x;
    const dz = b.target.z - pos.z;
    const len = Math.hypot(dx, dz) || 1;

    const vx = dx / len;
    const vz = dz / len;

    // move
    pos.x += vx * CFG.walkSpeed * dt;
    pos.z += vz * CFG.walkSpeed * dt;

    // turn to face movement direction
    const desiredYaw = Math.atan2(vx, vz);
    b.group.rotation.y = dampAngle(b.group.rotation.y, desiredYaw, CFG.turnSpeed, dt);

    // clamp bounds
    const bounds = world?.bounds;
    if (bounds) {
      pos.x = THREE.MathUtils.clamp(pos.x, bounds.min.x, bounds.max.x);
      pos.z = THREE.MathUtils.clamp(pos.z, bounds.min.z, bounds.max.z);
    }

    // floor clamp
    if (pos.y < CFG.minY) pos.y = CFG.minY;
  }

  // ===================== Poses (placeholder) =====================

  function sitPose(b) {
    // simple sit: lower a bit + lean back slightly
    b.group.position.y = CFG.seatedY + 0.0015;
    // (later we can animate actual joints; for now keep stable)
  }

  function standPose(b) {
    b.group.position.y = CFG.seatedY + 0.0015;
  }

  // ===================== Crown =====================

  function makeCrown() {
    const g = new THREE.Group();
    g.name = "WinnerCrown";

    const base = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.03, 10, 22),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x2a1a08, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.75 })
    );
    base.rotation.x = Math.PI / 2;
    g.add(base);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.10, 10), spikeMat);
      spike.position.set(Math.cos(a) * 0.11, 0.06, Math.sin(a) * 0.11);
      spike.rotation.x = 0;
      g.add(spike);
    }
    return g;
  }

  function attachCrownToBot(bot) {
    // Put crown above the bot’s head. Our avatar head is at ~1.55 in local scale.
    // We’ll place crown in world-space relative to bot group.
    const worldPos = new THREE.Vector3();
    bot.group.getWorldPosition(worldPos);

    // crown offset above head
    crown.position.set(worldPos.x, (worldPos.y + 1.72), worldPos.z);
    crown.rotation.y = bot.group.rotation.y;
  }

  // ===================== Math Helpers =====================

  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    const i = Math.floor(h * 6);
    if (i === 0) [r, g, b] = [c, x, 0];
    if (i === 1) [r, g, b] = [x, c, 0];
    if (i === 2) [r, g, b] = [0, c, x];
    if (i === 3) [r, g, b] = [0, x, c];
    if (i === 4) [r, g, b] = [x, 0, c];
    if (i === 5) [r, g, b] = [c, 0, x];

    const rr = Math.round((r + m) * 255);
    const gg = Math.round((g + m) * 255);
    const bb = Math.round((b + m) * 255);
    return (rr << 16) | (gg << 8) | bb;
  }

  function dampAngle(current, target, lambda, dt) {
    // shortest path
    let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    return current + delta * (1 - Math.exp(-lambda * dt));
  }

  // Return update hook
  return { update };
    }
