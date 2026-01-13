// /js/world.js — ScarlettVR Prime 10.0 ORCHESTRATOR (FULL)
// ✅ Builds your world shell + anchors
// ✅ Inits CORE: Signals, Manifest, DebugHUD, XRHands, Interaction, Persistence
// ✅ Inits SYSTEMS: PokerSystem (instanced), PokerRules (logic), BotSystem (AI)
// ✅ Runs tick loop + emits GAME_INIT

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { PokerRules } from "./systems/poker_rules.js";
import { BotSystem } from "./systems/bot_system.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    // --- init core ---
    Manifest.init();

    const saved = Persistence.load() || {};
    if (saved.flags?.safeMode === true) Manifest.set("flags.safeMode", true);

    const ctx = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      root: new THREE.Group(),
      Signals,
      manifest: Manifest,
      log: (m) => { DebugHUD.log(m); log?.(m); }
    };

    ctx.root.name = "WORLD_ROOT";
    scene.add(ctx.root);

    // basic env
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 12, 95);

    // lights
    {
      const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, Manifest.get("flags.safeMode") ? 1.0 : 1.15);
      hemi.position.set(0, 70, 0);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffffff, Manifest.get("flags.safeMode") ? 0.85 : 1.15);
      sun.position.set(35, 70, 35);
      scene.add(sun);

      if (!Manifest.get("flags.safeMode")) {
        const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.05, 95, 2);
        lobbyGlow.position.set(0, 9.0, 0);
        ctx.root.add(lobbyGlow);
      }
    }

    // anchors
    const anchors = {
      lobby:    { pos: new THREE.Vector3(0, 0, 13.5),  yaw: Math.PI },
      poker:    { pos: new THREE.Vector3(0, 0, -9.5),  yaw: 0 },
      store:    { pos: new THREE.Vector3(-26, 0, 0),   yaw: Math.PI / 2 },
      scorpion: { pos: new THREE.Vector3(26, 0, 0),    yaw: -Math.PI / 2 },
      spectate: { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 }
    };

    // move rig helper
    function setRig(anchor) {
      player.position.copy(anchor.pos);
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchor.yaw, 0);
    }

    // build your lobby ring + pit + balcony (lightweight version)
    buildLobby(THREE, ctx.root, Manifest.get("flags.safeMode"));
    buildPit(THREE, ctx.root, Manifest.get("flags.safeMode"));
    buildBalcony(THREE, ctx.root, Manifest.get("flags.safeMode"));
    buildRooms(THREE, ctx.root);

    setRig(anchors.lobby);

    // XR hands (hands-only)
    const hands = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });

    // interaction (targets can be registered later; currently UI-driven)
    const interaction = Interaction.init({ THREE, Signals, hands, log: ctx.log });

    // Android sticks (move + look) — emits local axes that we apply in tick
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // systems
    const poker = PokerSystem.init({
      THREE,
      root: ctx.root,
      Signals,
      manifest: Manifest,
      log: ctx.log
    });

    const rules = PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    // --- room/menu wiring ---
    let room = saved.room || "lobby";

    Signals.on("ROOM_SET", (p) => {
      const r = String(p?.room || "lobby");
      room = anchors[r] ? r : "lobby";
      setRig(anchors[room]);
      DebugHUD.setRoom(room);
      Persistence.save({ ...saved, room, flags: Manifest.get("flags") });
      ctx.log(`[rm] room=${room}`);
    });

    Signals.on("UI_CLICK", (p) => {
      const id = String(p?.id || "");
      if (id === "NEW_HAND") Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });
      if (id === "LOBBY") Signals.emit("ROOM_SET", { room: "lobby" });
      if (id === "POKER") Signals.emit("ROOM_SET", { room: "poker" });
      if (id === "STORE") Signals.emit("ROOM_SET", { room: "store" });
      if (id === "SCORPION") Signals.emit("ROOM_SET", { room: "scorpion" });
      if (id === "SPECTATE") Signals.emit("ROOM_SET", { room: "spectate" });
      if (id === "HEALTHCHECK") Signals.emit("DEBUG_DUMP", {});
    });

    // hook HUD buttons (from index.js ensureHUD)
    hookButton("btnNewHand", () => Signals.emit("UI_CLICK", { id: "NEW_HAND" }));
    hookButton("btnLobby", () => Signals.emit("UI_CLICK", { id: "LOBBY" }));
    hookButton("btnPoker", () => Signals.emit("UI_CLICK", { id: "POKER" }));
    hookButton("btnStore", () => Signals.emit("UI_CLICK", { id: "STORE" }));
    hookButton("btnScorpion", () => Signals.emit("UI_CLICK", { id: "SCORPION" }));
    hookButton("btnSpectate", () => Signals.emit("UI_CLICK", { id: "SPECTATE" }));

    // healthcheck
    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // auto-start a hand
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    // apply saved room
    Signals.emit("ROOM_SET", { room });

    ctx.log("[world] Prime 10.0 init ✅");

    // tick loop
    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    function applySticks(dt) {
      if (renderer.xr.isPresenting) return; // in XR, user uses head/body; keep sticks as diagnostics only if you want
      const ax = sticks.getAxes();
      const moveX = ax.lx;
      const moveY = ax.ly;
      const lookX = ax.rx;
      const lookY = ax.ry;

      // look
      player.rotation.y -= lookX * 1.6 * dt;
      camera.rotation.x -= lookY * 1.2 * dt;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

      // move in camera forward/right (flat)
      tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpForward.y = 0; tmpForward.normalize();
      tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      tmpRight.y = 0; tmpRight.normalize();

      tmpMove.set(0, 0, 0);
      tmpMove.addScaledVector(tmpRight, moveX);
      tmpMove.addScaledVector(tmpForward, -moveY);

      const len = tmpMove.length();
      if (len > 0.001) {
        tmpMove.multiplyScalar((2.2 * dt) / len);
        player.position.add(tmpMove);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        applySticks(dt);

        // HUD pos/xr
        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}`);

        // update systems
        poker?.update?.(dt, t);
        bots?.update?.(dt);

        // periodic autosave flags
        if ((t | 0) % 10 === 0) {
          Persistence.save({ room, flags: Manifest.get("flags") });
        }
      }
    };

    // ---- local helpers ----
    function hookButton(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
  }
};

// --------- world builders (lightweight, stable) ---------
function matFloor(THREE, color = 0x121c2c) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

function buildLobby(THREE, root, safe) {
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: safe ? 0.35 : 0.55
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x121c2c)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);
}

function buildPit(THREE, root, safe) {
  const pitRadius = 7.1;
  const pitDepth = 3.0;
  const pitFloorY = -pitDepth;

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
    matFloor(THREE, 0x0c1220)
  );
  pitFloor.position.set(0, pitFloorY - 0.175, 0);
  root.add(pitFloor);

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  // ramp entrance
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, pitDepth, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, pitFloorY / 2, pitRadius + 8.4 * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, 8.4);
  root.add(ramp);

  // simple center pad (table goes in PokerSystem)
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.3, 0.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.55, metalness: 0.2 })
  );
  pad.position.set(0, pitFloorY + 0.9, 0);
  root.add(pad);
}

function buildBalcony(THREE, root, safe) {
  const y = 3.0;
  const outerR = 16.8;
  const innerR = 14.2;

  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(innerR, outerR, 96),
    matFloor(THREE, 0x10192a)
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = y;
  root.add(balcony);

  if (!safe) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x121c2c, roughness: 0.55, metalness: 0.25,
      emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.08
    });
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 12), railMat);
      post.position.set(Math.cos(a) * outerR, y + 0.45, Math.sin(a) * outerR);
      root.add(post);
    }
  }
}

function buildRooms(THREE, root) {
  const roomDist = 28, roomSize = 10, wallH = 4.6;
  const rooms = [
    { name: "north", x: 0, z: -roomDist },
    { name: "south", x: 0, z: roomDist },
    { name: "west",  x: -roomDist, z: 0 },
    { name: "east",  x: roomDist, z: 0 },
  ];

  for (const r of rooms) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, 0.35, roomSize * 2.2),
      matFloor(THREE, 0x111a28)
    );
    floor.position.set(r.x, -0.175, r.z);
    root.add(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize * 2.2, wallH, roomSize * 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220, roughness: 0.92, metalness: 0.08,
        transparent: true, opacity: 0.35
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);
  }
  }
