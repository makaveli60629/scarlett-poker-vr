// /js/bots.js — Scarlett Poker VR — BOTS v3 (Seats to world.chairs[] + Tournament Flow)
// Requires: /js/avatar.js, world exports chairs[]

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

export function init({ scene, world }) {
  const floorY = world?.floorY ?? 0;
  const chairs = Array.isArray(world?.chairs) ? world.chairs : [];

  const CFG = {
    walkSpeed: 0.85,
    turnSpeed: 4.0,
    lobbyWanderRadius: 12.0,
    handSeconds: 9.5,
    winnerCrownSeconds: 60.0,
    breakBetweenGames: 0.75,
    minY: floorY + 0.0015,
    seatCount: Math.max(6, chairs.length || 8),
  };

  const bots = [];
  const lobbyBots = [];
  let activeBots = [];
  let state = "PLAYING";
  let tHand = 0;
  let tWinner = 0;
  let tReseat = 0;

  const crown = makeCrown();
  crown.visible = false;
  scene.add(crown);

  // Create bots
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
      mode: "SEATED",
      seatIndex: i,
      target: new THREE.Vector3(),
      eliminated: false,
      isWinner: false,
    };

    scene.add(bot.group);
    bots.push(bot);
  }

  reseatNewGame();

  function update(dt) {
    for (const b of bots) {
      if (b.group.position.y < CFG.minY) b.group.position.y = CFG.minY;
    }

    if (state === "PLAYING") {
      tHand += dt;
      stepLobby(dt);

      if (tHand >= CFG.handSeconds) {
        tHand = 0;
        if (activeBots.length > 2) eliminateOneRandom();
        if (activeBots.length === 2) state = "FINAL2";
      }
    }

    if (state === "FINAL2") {
      tHand += dt;
      stepLobby(dt);

      if (tHand >= CFG.handSeconds * 1.25) {
        tHand = 0;
        const winner = activeBots[Math.floor(Math.random() * activeBots.length)];
        declareWinner(winner);
        state = "WINNER_WALK";
        tWinner = 0;
        startNextGameWhileWinnerWalks(winner);
      }
    }

    if (state === "WINNER_WALK") {
      tWinner += dt;
      stepWinnerWalk(dt);
      stepLobby(dt);

      if (tWinner >= CFG.winnerCrownSeconds) {
        finishWinnerWalk();
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

  function reseatNewGame() {
    for (const b of bots) {
      b.eliminated = false;
      b.isWinner = false;
      b.mode = "SEATED";
    }

    activeBots = bots.slice(0, CFG.seatCount);

    for (let i = 0; i < activeBots.length; i++) {
      const b = activeBots[i];
      b.seatIndex = i % CFG.seatCount;
      placeBotOnSeat(b);
      sitPose(b);

      const li = lobbyBots.indexOf(b);
      if (li >= 0) lobbyBots.splice(li, 1);
    }

    // extras roam (crowd)
    for (const b of bots) {
      if (!activeBots.includes(b) && !lobbyBots.includes(b)) {
        b.mode = "WALKING";
        b.eliminated = true;
        standPose(b);
        sendBotToLobby(b);
        lobbyBots.push(b);
      }
    }

    crown.visible = false;
    crown.userData.winnerBot = null;
  }

  function eliminateOneRandom() {
    const idx = Math.floor(Math.random() * activeBots.length);
    const b = activeBots[idx];
    activeBots.splice(idx, 1);

    b.eliminated = true;
    b.mode = "WALKING";
    standPose(b);
    sendBotToLobby(b);
    if (!lobbyBots.includes(b)) lobbyBots.push(b);
  }

  function declareWinner(winnerBot) {
    winnerBot.isWinner = true;
    winnerBot.eliminated = true;
    winnerBot.mode = "WALKING";
    standPose(winnerBot);

    crown.visible = true;
    crown.userData.winnerBot = winnerBot;
    attachCrownToBot(winnerBot);

    sendBotToLobby(winnerBot);
    if (!lobbyBots.includes(winnerBot)) lobbyBots.push(winnerBot);
  }

  function startNextGameWhileWinnerWalks(winnerBot) {
    const nextPlayers = bots.filter(b => b !== winnerBot);
    activeBots = nextPlayers.slice(0, CFG.seatCount);

    for (let i = 0; i < activeBots.length; i++) {
      const b = activeBots[i];
      b.mode = "SEATED";
      b.eliminated = false;
      b.isWinner = false;
      b.seatIndex = i % CFG.seatCount;
      placeBotOnSeat(b);
      sitPose(b);

      const li = lobbyBots.indexOf(b);
      if (li >= 0) lobbyBots.splice(li, 1);
    }

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
      winner.isWinner = false;
      winner.eliminated = true;
      winner.mode = "WALKING";
      standPose(winner);
      sendBotToLobby(winner);
      if (!lobbyBots.includes(winner)) lobbyBots.push(winner);
    }
  }

  function placeBotOnSeat(b) {
    const seat = chairs[b.seatIndex] || chairs[b.seatIndex % Math.max(1, chairs.length)];
    if (seat?.position) {
      b.group.position.copy(seat.position);
      b.group.rotation.set(0, seat.yaw ?? 0, 0);
      return;
    }

    // fallback ring if chairs missing
    const a = (b.seatIndex / CFG.seatCount) * Math.PI * 2;
    const r = 3.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const yaw = Math.atan2(-x, -z);
    b.group.position.set(x, floorY + 0.0015, z);
    b.group.rotation.set(0, yaw, 0);
  }

  function sendBotToLobby(b) {
    const angle = Math.random() * Math.PI * 2;
    const r = CFG.lobbyWanderRadius * (0.65 + Math.random() * 0.35);
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;

    const bounds = world?.bounds;
    if (bounds) {
      b.target.x = THREE.MathUtils.clamp(tx, bounds.min.x, bounds.max.x);
      b.target.z = THREE.MathUtils.clamp(tz, bounds.min.z, bounds.max.z);
    } else {
      b.target.set(tx, 0, tz);
    }
    b.target.y = floorY + 0.0015;
  }

  function stepLobby(dt) {
    for (const b of lobbyBots) {
      if (!b || b.mode !== "WALKING") continue;
      walkTowardTarget(b, dt);
      if (b.group.position.distanceToSquared(b.target) < 0.25) sendBotToLobby(b);
    }
  }

  function stepWinnerWalk(dt) {
    const winner = crown.userData.winnerBot;
    if (!winner) return;
    attachCrownToBot(winner);
    if (winner.mode !== "WALKING") return;
    walkTowardTarget(winner, dt);
    if (winner.group.position.distanceToSquared(winner.target) < 0.35) sendBotToLobby(winner);
  }

  function walkTowardTarget(b, dt) {
    const pos = b.group.position;
    const dx = b.target.x - pos.x;
    const dz = b.target.z - pos.z;
    const len = Math.hypot(dx, dz) || 1;

    const vx = dx / len;
    const vz = dz / len;

    pos.x += vx * CFG.walkSpeed * dt;
    pos.z += vz * CFG.walkSpeed * dt;

    const desiredYaw = Math.atan2(vx, vz);
    b.group.rotation.y = dampAngle(b.group.rotation.y, desiredYaw, CFG.turnSpeed, dt);

    const bounds = world?.bounds;
    if (bounds) {
      pos.x = THREE.MathUtils.clamp(pos.x, bounds.min.x, bounds.max.x);
      pos.z = THREE.MathUtils.clamp(pos.z, bounds.min.z, bounds.max.z);
    }
    if (pos.y < CFG.minY) pos.y = CFG.minY;
  }

  function sitPose(b) { b.group.position.y = floorY + 0.0015; }
  function standPose(b) { b.group.position.y = floorY + 0.0015; }

  function makeCrown() {
    const g = new THREE.Group();
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
      g.add(spike);
    }
    return g;
  }

  function attachCrownToBot(bot) {
    const worldPos = new THREE.Vector3();
    bot.group.getWorldPosition(worldPos);
    crown.position.set(worldPos.x, (worldPos.y + 1.72), worldPos.z);
    crown.rotation.y = bot.group.rotation.y;
  }

  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    if (i === 0) [r,g,b] = [c,x,0];
    if (i === 1) [r,g,b] = [x,c,0];
    if (i === 2) [r,g,b] = [0,c,x];
    if (i === 3) [r,g,b] = [0,x,c];
    if (i === 4) [r,g,b] = [x,0,c];
    if (i === 5) [r,g,b] = [c,0,x];
    const rr = Math.round((r+m) * 255);
    const gg = Math.round((g+m) * 255);
    const bb = Math.round((b+m) * 255);
    return (rr<<16) | (gg<<8) | bb;
  }

  function dampAngle(current, target, lambda, dt) {
    let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    return current + delta * (1 - Math.exp(-lambda * dt));
  }

  return { update };
    }
