// /js/world.js — ScarlettVR Prime 10.0 WORLD (FULL) v10.0.1
// ✅ Clean guaranteed spawn (no clipping)
// ✅ UNSTUCK system + button hook
// ✅ Movement works even if sticks fail (tick+update + drag fallback)
// ✅ More lights + walls + glass (kept away from spawn)
// ✅ Keeps Signals architecture + Poker/Bots/Rules

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { PokerRules } from "./core/poker_rules.js";
import { BotSystem } from "./systems/bot_system.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    // ---------------- CORE INIT ----------------
    Manifest.init();
    const saved = Persistence.load() || {};
    if (saved.flags?.safeMode === true) Manifest.set("flags.safeMode", true);
    const safe = !!Manifest.get("flags.safeMode");

    const ctx = {
      THREE, scene, renderer, camera, player,
      root: new THREE.Group(),
      Signals,
      manifest: Manifest,
      log: (m) => { DebugHUD.log(m); log?.(m); }
    };
    ctx.root.name = "WORLD_ROOT";
    scene.add(ctx.root);

    // ---------------- VISIBILITY ----------------
    camera.near = 0.06;
    camera.far = 800;
    camera.updateProjectionMatrix();

    scene.background = new THREE.Color(0x03050b);
    scene.fog = new THREE.Fog(0x03050b, 55, 420);

    addLights(ctx, safe);

    // ---------------- WORLD GEOMETRY ----------------
    // Keep heavy geometry near origin, NOT near spawn.
    buildLobbyShell(ctx, safe);
    buildLobbyFloor(ctx);
    buildPit(ctx);
    buildBalcony(ctx);
    buildRooms(ctx);
    buildGlassAccents(ctx, safe);

    // ---------------- ANCHORS ----------------
    // IMPORTANT: spawn is FAR from any geometry (z=40) so you never clip.
    const anchors = {
      spawn:    { name: "spawn",    pos: new THREE.Vector3(0, 0, 40),   yaw: Math.PI },
      lobby:    { name: "lobby",    pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI },
      poker:    { name: "poker",    pos: new THREE.Vector3(0, 0, -9.5), yaw: 0 },
      store:    { name: "store",    pos: new THREE.Vector3(-26, 0, 0),  yaw: Math.PI / 2 },
      scorpion: { name: "scorpion", pos: new THREE.Vector3(26, 0, 0),   yaw: -Math.PI / 2 },
      spectate: { name: "spectate", pos: new THREE.Vector3(0, 3.0, -14),yaw: 0 }
    };

    // ---------------- RIG CONTROL ----------------
    function setRig(a) {
      player.position.copy(a.pos);
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, a.yaw, 0);
      DebugHUD.setRoom(a.name || "room");
      ctx.log(`[rm] room=${a.name || "?"}`);
    }

    // ---------------- UNSTUCK (GUARANTEED) ----------------
    let unstuckPad = null;
    function hardUnstuck(reason = "manual") {
      // Remove old pad to prevent clutter
      if (unstuckPad) {
        try { ctx.root.remove(unstuckPad); } catch {}
        unstuckPad = null;
      }

      const safePos = anchors.spawn.pos.clone();

      player.position.copy(safePos);
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchors.spawn.yaw, 0);

      // Bright pad so you KNOW you are safe
      unstuckPad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.55, 0.14, 36),
        new THREE.MeshStandardMaterial({
          color: 0x10192a,
          roughness: 0.45,
          metalness: 0.25,
          emissive: new THREE.Color(0xffd36b),
          emissiveIntensity: 0.70
        })
      );
      unstuckPad.position.set(safePos.x, 0.07, safePos.z);
      unstuckPad.name = "UNSTUCK_PAD";
      ctx.root.add(unstuckPad);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.0, 2.25, 54),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(safePos.x, 0.01, safePos.z);
      ctx.root.add(ring);

      ctx.log(`[spawn] hardUnstuck ✅ reason=${reason} pos=${safePos.x},${safePos.y},${safePos.z}`);
    }

    // Auto-unstuck on load so you never spawn inside geometry
    hardUnstuck("auto");

    // ---------------- INPUT ----------------
    XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, log: ctx.log });

    // UI sticks (if module exists)
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // ---------------- SYSTEMS ----------------
    const poker = PokerSystem.init({ THREE, root: ctx.root, Signals, manifest: Manifest, log: ctx.log });
    PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // ---------------- ROOM SET ----------------
    let room = saved.room || "spawn";

    Signals.on("ROOM_SET", (p) => {
      const r = String(p?.room || "spawn");
      room = anchors[r] ? r : "spawn";
      setRig(anchors[room]);
      Persistence.save({ ...saved, room, flags: Manifest.get("flags") });
    });

    // HUD buttons if they exist
    hook("btnUnstuck", () => hardUnstuck("button"));
    hook("btnSpawn", () => Signals.emit("ROOM_SET", { room: "spawn" }));
    hook("btnLobby", () => Signals.emit("ROOM_SET", { room: "lobby" }));
    hook("btnPoker", () => Signals.emit("ROOM_SET", { room: "poker" }));
    hook("btnStore", () => Signals.emit("ROOM_SET", { room: "store" }));
    hook("btnScorpion", () => Signals.emit("ROOM_SET", { room: "scorpion" }));
    hook("btnSpectate", () => Signals.emit("ROOM_SET", { room: "spectate" }));

    // Always start at spawn (your request)
    Signals.emit("ROOM_SET", { room: "spawn" });

    // Start game
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    ctx.log("[world] Prime 10.0 FULL ✅ (unstuck + movement fallbacks)");

    // ---------------- MOVEMENT ----------------
    const tmpF = new THREE.Vector3();
    const tmpR = new THREE.Vector3();
    const tmpM = new THREE.Vector3();

    function applySticks(dt) {
      // For now: move only in non-XR so you can diagnose.
      if (renderer.xr.isPresenting) return;

      const ax = sticks?.getAxes?.() || { lx: 0, ly: 0, rx: 0, ry: 0 };

      // Look
      player.rotation.y -= (ax.rx || 0) * 1.8 * dt;
      camera.rotation.x -= (ax.ry || 0) * 1.2 * dt;
      camera.rotation.x = Math.max(-1.15, Math.min(1.15, camera.rotation.x));

      // Move (camera plane)
      tmpF.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpF.y = 0; tmpF.normalize();
      tmpR.set(1, 0, 0).applyQuaternion(camera.quaternion);
      tmpR.y = 0; tmpR.normalize();

      tmpM.set(0, 0, 0);
      tmpM.addScaledVector(tmpR, ax.lx || 0);
      tmpM.addScaledVector(tmpF, -(ax.ly || 0));

      const len = tmpM.length();
      if (len > 0.001) {
        tmpM.multiplyScalar((2.6 * dt) / len);
        player.position.add(tmpM);
      }
    }

    // ---------------- DRAG FALLBACK (works even if sticks fail) ----------------
    let drag = { on: false, x: 0, y: 0 };
    window.addEventListener("pointerdown", (e) => {
      if (renderer.xr.isPresenting) return;
      drag.on = true; drag.x = e.clientX; drag.y = e.clientY;
    }, { passive: true });

    window.addEventListener("pointerup", () => { drag.on = false; }, { passive: true });
    window.addEventListener("pointercancel", () => { drag.on = false; }, { passive: true });

    window.addEventListener("pointermove", (e) => {
      if (renderer.xr.isPresenting) return;
      if (!drag.on) return;

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;

      // yaw with horizontal drag
      player.rotation.y -= dx * 0.003;

      // forward/back with vertical drag
      const fwd = tmpF.set(0, 0, -1).applyQuaternion(camera.quaternion);
      fwd.y = 0; fwd.normalize();
      player.position.addScaledVector(fwd, dy * 0.008);
    }, { passive: true });

    // ---------------- API (tick + update alias) ----------------
    const api = {
      tick(dt, t) {
        DebugHUD.perfTick();

        applySticks(dt);

        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

        poker?.update?.(dt, t);
        bots?.update?.(dt);

        if (((t | 0) % 10) === 0) {
          Persistence.save({ room, flags: Manifest.get("flags") });
        }
      },

      // ✅ Compatibility: some index.js uses update()
      update(dt, t) { api.tick(dt, t); }
    };

    window.__WORLD = api;
    return api;

    function hook(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
  }
};

// =================== WORLD BUILD HELPERS ===================

function addLights(ctx, safe) {
  const { THREE, scene, root } = ctx;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x121a2e, safe ? 1.1 : 1.45);
  hemi.position.set(0, 80, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, safe ? 1.05 : 1.25);
  sun.position.set(35, 80, 35);
  scene.add(sun);

  const lobbyGlow = new THREE.PointLight(0x66ccff, safe ? 0.9 : 1.3, 200, 2);
  lobbyGlow.position.set(0, 11, 0);
  root.add(lobbyGlow);

  const warm = new THREE.PointLight(0xffd36b, safe ? 0.35 : 0.70, 160, 2);
  warm.position.set(0, 6, 14);
  root.add(warm);

  const spawn = new THREE.PointLight(0xffd36b, 1.2, 80, 2);
  spawn.position.set(0, 6, 40);
  root.add(spawn);
}

function matFloor(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.08 });
}

function matWall(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.14 });
}

function buildLobbyShell(ctx, safe) {
  const { THREE, root } = ctx;
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.85,
      metalness: 0.15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: safe ? 0.35 : 0.60
    })
  );
  shell.position.set(0, 4.2, 0);
  root.add(shell);
}

function buildLobbyFloor(ctx) {
  const { THREE, root } = ctx;
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x1b2a46)
  );
  floor.position.set(0, -0.175, 0);
  root.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(16.4, 0.16, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      roughness: 0.35,
      metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.40
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.18, 0);
  root.add(ring);
}

function buildPit(ctx) {
  const { THREE, root } = ctx;
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
    matWall(THREE, 0x0a101e)
  );
  pitWall.material.side = THREE.DoubleSide;
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.25, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, pitFloorY + 1.05, 0);
  root.add(felt);
}

function buildBalcony(ctx) {
  const { THREE, root } = ctx;
  const y = 3.0;
  const balcony = new THREE.Mesh(
    new THREE.RingGeometry(14.2, 16.8, 96),
    matFloor(THREE, 0x111a28)
  );
  balcony.rotation.x = -Math.PI / 2;
  balcony.position.y = y;
  root.add(balcony);
}

function buildRooms(ctx) {
  const { THREE, root } = ctx;
  const roomDist = 28, roomSize = 10, wallH = 4.6;

  const rooms = [
    { x: 0, z: -roomDist },
    { x: 0, z: roomDist },
    { x: -roomDist, z: 0 },
    { x: roomDist, z: 0 },
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
        color: 0x0b1220,
        roughness: 0.92,
        metalness: 0.08,
        transparent: true,
        opacity: 0.45
      })
    );
    walls.position.set(r.x, wallH / 2 - 0.175, r.z);
    root.add(walls);
  }
}

function buildGlassAccents(ctx, safe) {
  if (safe) return;
  const { THREE, root } = ctx;

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x66ccff,
    roughness: 0.08,
    metalness: 0.0,
    transmission: 0.85,
    transparent: true,
    opacity: 0.18,
    thickness: 0.2
  });

  // Put glass accents near lobby, NOT at spawn.
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 0.18), glass);
  g1.position.set(0, 2.2, 6.5);
  root.add(g1);

  const g2 = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 0.18), glass);
  g2.position.set(0, 2.2, -6.5);
  root.add(g2);
  }
