// /js/world.js — Prime 10.0 FULL (Spawn Room + Movement + More Walls/Glass/Lights)

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

    // ---------- VISIBILITY ----------
    camera.near = 0.06;
    camera.far = 600;
    camera.updateProjectionMatrix();

    scene.background = new THREE.Color(0x03050b);
    scene.fog = new THREE.Fog(0x03050b, 40, 320);

    addLights(ctx, safe);

    // ---------- WORLD BUILD ----------
    const anchors = buildWorld(ctx, safe);

    // ---------- INPUT ----------
    XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, log: ctx.log });
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // ---------- SYSTEMS ----------
    const poker = PokerSystem.init({ THREE, root: ctx.root, Signals, manifest: Manifest, log: ctx.log });
    PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // ---------- ROOM SET + SPAWN ----------
    let room = saved.room || "spawn";
    const setRig = (a) => {
      player.position.copy(a.pos);
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, a.yaw, 0);
      DebugHUD.setRoom(a.name || "room");
      ctx.log(`[rm] room=${a.name || "?"}`);
    };

    Signals.on("ROOM_SET", (p) => {
      const r = String(p?.room || "spawn");
      const a = anchors[r] || anchors.spawn;
      setRig(a);
      Persistence.save({ ...saved, room: r, flags: Manifest.get("flags") });
    });

    // HUD buttons if they exist
    hook("btnLobby",   () => Signals.emit("ROOM_SET", { room:"lobby" }));
    hook("btnPoker",   () => Signals.emit("ROOM_SET", { room:"poker" }));
    hook("btnStore",   () => Signals.emit("ROOM_SET", { room:"store" }));
    hook("btnScorpion",() => Signals.emit("ROOM_SET", { room:"scorpion" }));
    hook("btnSpectate",() => Signals.emit("ROOM_SET", { room:"spectate" }));
    hook("btnSpawn",   () => Signals.emit("ROOM_SET", { room:"spawn" }));

    // Start a hand
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    // Force spawn room always (your request)
    Signals.emit("ROOM_SET", { room: "spawn" });

    ctx.log("[world] Prime 10.0 FULL init ✅ (spawn room + movement + glass)");

    // ---------- MOVEMENT ----------
    const tmpF = new THREE.Vector3();
    const tmpR = new THREE.Vector3();
    const tmpM = new THREE.Vector3();

    function applySticks(dt) {
      // Allow sticks in non-XR always; in XR keep off unless you want it later.
      if (renderer.xr.isPresenting) return;

      const ax = sticks.getAxes?.() || { lx:0, ly:0, rx:0, ry:0 };

      // LOOK (right stick)
      player.rotation.y -= (ax.rx || 0) * 1.8 * dt;
      camera.rotation.x -= (ax.ry || 0) * 1.2 * dt;
      camera.rotation.x = Math.max(-1.15, Math.min(1.15, camera.rotation.x));

      // MOVE (left stick) — camera forward/right on flat plane
      tmpF.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpF.y = 0; tmpF.normalize();
      tmpR.set(1, 0, 0).applyQuaternion(camera.quaternion);
      tmpR.y = 0; tmpR.normalize();

      tmpM.set(0, 0, 0);
      tmpM.addScaledVector(tmpR, ax.lx || 0);
      tmpM.addScaledVector(tmpF, -(ax.ly || 0));

      const len = tmpM.length();
      if (len > 0.001) {
        tmpM.multiplyScalar((2.5 * dt) / len);
        player.position.add(tmpM);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        applySticks(dt);

        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}`);

        poker?.update?.(dt, t);
        bots?.update?.(dt);

        if (((t | 0) % 10) === 0) {
          Persistence.save({ room, flags: Manifest.get("flags") });
        }
      }
    };

    function hook(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
  }
};

// ==================== BUILDERS ====================

function addLights(ctx, safe) {
  const { THREE, scene, root } = ctx;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x16203a, safe ? 1.1 : 1.35);
  hemi.position.set(0, 60, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, safe ? 1.0 : 1.25);
  sun.position.set(25, 60, 25);
  scene.add(sun);

  const lobbyGlow = new THREE.PointLight(0x66ccff, safe ? 0.8 : 1.2, 160, 2);
  lobbyGlow.position.set(0, 10, 0);
  root.add(lobbyGlow);

  const warm = new THREE.PointLight(0xffd36b, safe ? 0.35 : 0.65, 110, 2);
  warm.position.set(0, 4.5, 10);
  root.add(warm);

  const spawnLight = new THREE.SpotLight(0xffffff, 1.2, 40, Math.PI/5, 0.35, 1);
  spawnLight.position.set(0, 6.5, 22);
  spawnLight.target.position.set(0, 0.8, 22);
  root.add(spawnLight);
  root.add(spawnLight.target);
}

function matFloor(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.08 });
}

function matWall(THREE, c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.12 });
}

function matGlass(THREE) {
  // MeshPhysicalMaterial looks great on Quest/Android too (keep it simple)
  return new THREE.MeshPhysicalMaterial({
    color: 0x66ccff,
    roughness: 0.08,
    metalness: 0.0,
    transmission: 0.85,
    transparent: true,
    opacity: 0.25,
    thickness: 0.2
  });
}

function buildWorld(ctx, safe) {
  const { THREE, root } = ctx;

  // --- LOBBY (more walls + clarity) ---
  const lobbyShell = new THREE.Mesh(
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
  lobbyShell.position.set(0, 4.2, 0);
  root.add(lobbyShell);

  const lobbyFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x1b2a46)
  );
  lobbyFloor.position.set(0, -0.175, 0);
  root.add(lobbyFloor);

  // --- PIT (centerpiece) ---
  buildPit(ctx);

  // --- BALCONY ---
  buildBalcony(ctx);

  // --- SPAWN ROOM (YOUR REQUEST) ---
  buildSpawnRoom(ctx);

  // Anchors (spawn inside spawn room)
  const anchors = {
    spawn:    { name:"spawn",    pos: new THREE.Vector3(0, 0, 22.2),  yaw: Math.PI },
    lobby:    { name:"lobby",    pos: new THREE.Vector3(0, 0, 13.5),  yaw: Math.PI },
    poker:    { name:"poker",    pos: new THREE.Vector3(0, 0, -9.5),  yaw: 0 },
    store:    { name:"store",    pos: new THREE.Vector3(-26, 0, 0),   yaw: Math.PI / 2 },
    scorpion: { name:"scorpion", pos: new THREE.Vector3(26, 0, 0),    yaw: -Math.PI / 2 },
    spectate: { name:"spectate", pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 }
  };

  // Optional: visible “portal pads” in lobby
  buildPortalPads(ctx);

  return anchors;
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

function buildSpawnRoom(ctx) {
  const { THREE, root } = ctx;

  // Room centered at z=22
  const cx = 0, cz = 22.0;
  const w = 16, d = 16, h = 5.2;

  const room = new THREE.Group();
  room.position.set(cx, 0, cz);
  root.add(room);

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  room.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), matWall(THREE, 0x08101f));
  ceil.position.y = h;
  room.add(ceil);

  // Solid back wall
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), matWall(THREE, 0x0b1220));
  back.position.set(0, h/2, -d/2);
  room.add(back);

  // Side walls (glass)
  const glass = matGlass(THREE);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, d), glass);
  left.position.set(-w/2, h/2, 0);
  room.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, d), glass);
  right.position.set(w/2, h/2, 0);
  room.add(right);

  // Front wall with a doorway opening (two pillars + top beam)
  const pillarMat = matWall(THREE, 0x0b1220);

  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(5.6, h, 0.25), pillarMat);
  pillarL.position.set(-w/2 + 2.8, h/2, d/2);
  room.add(pillarL);

  const pillarR = new THREE.Mesh(new THREE.BoxGeometry(5.6, h, 0.25), pillarMat);
  pillarR.position.set(w/2 - 2.8, h/2, d/2);
  room.add(pillarR);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 0.25), pillarMat);
  beam.position.set(0, h - 0.6, d/2);
  room.add(beam);

  // Spawn pad (bright + obvious)
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.12, 32),
    new THREE.MeshStandardMaterial({
      color: 0x10192a,
      roughness: 0.5,
      metalness: 0.25,
      emissive: new THREE.Color(0xffd36b),
      emissiveIntensity: 0.45
    })
  );
  pad.position.set(0, 0.06, 0.2);
  room.add(pad);

  const beacon = new THREE.PointLight(0xffd36b, 1.1, 22, 2);
  beacon.position.set(0, 3.2, 0.2);
  room.add(beacon);

  // Simple sign
  const sign = makeBillboardText(THREE, "SPAWN ROOM");
  sign.position.set(0, 2.1, -6.5);
  room.add(sign);
}

function buildPortalPads(ctx) {
  const { THREE, root } = ctx;

  const pads = [
    { id:"btnSpawn",   label:"SPAWN",   x:-5.5 },
    { id:"btnLobby",   label:"LOBBY",   x:-2.7 },
    { id:"btnPoker",   label:"POKER",   x: 0.0 },
    { id:"btnStore",   label:"STORE",   x: 2.7 },
    { id:"btnScorpion",label:"SCORP",   x: 5.5 }
  ];

  for (const p of pads) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.12, 28),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.55,
        metalness: 0.25,
        emissive: new THREE.Color(0x66ccff),
        emissiveIntensity: 0.22
      })
    );
    base.position.set(p.x, 0.06, 10.8);
    root.add(base);

    const txt = makeBillboardText(THREE, p.label);
    txt.position.set(p.x, 1.15, 10.8);
    root.add(txt);
  }
}

function makeBillboardText(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext("2d");

  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0,0,canvas.width,canvas.height);

  g.strokeStyle = "rgba(102,204,255,0.55)";
  g.lineWidth = 10;
  g.strokeRect(14,14,canvas.width-28,canvas.height-28);

  g.fillStyle = "#ffffff";
  g.font = "900 78px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text||""), canvas.width/2, canvas.height/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), mat);
  mesh.rotation.y = Math.PI;
  return mesh;
         }
