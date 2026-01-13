// /js/world.js — ScarlettVR Prime 10.0 (FULL, playable visibility + clean spawn)

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { PokerRules } from "./core/poker_rules.js";        // ✅ your repo location
import { BotSystem } from "./systems/bot_system.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    Manifest.init();

    const saved = Persistence.load() || {};
    if (saved.flags?.safeMode === true) Manifest.set("flags.safeMode", true);

    const flags = Manifest.get("flags") || { safeMode: false };

    const ctx = {
      THREE, scene, renderer, camera, player,
      root: new THREE.Group(),
      Signals,
      manifest: Manifest,
      log: (m) => { DebugHUD.log(m); log?.(m); }
    };

    ctx.root.name = "WORLD_ROOT";
    scene.add(ctx.root);

    // ---------- VISIBILITY FIXES ----------
    // Make sure camera isn't super tiny near-plane (helps "inside object" feel)
    camera.near = 0.05;
    camera.far = 500;
    camera.updateProjectionMatrix();

    // Stronger contrast background + lighter fog
    scene.background = new THREE.Color(0x04060c);
    scene.fog = new THREE.Fog(0x04060c, 25, 220);

    // Lights: brighter baseline so you don’t see gray mush
    addLights(ctx, flags.safeMode);

    // ---------- WORLD BUILD (safe + visible) ----------
    buildVisibleLobby(ctx);
    buildPit(ctx);
    buildBalcony(ctx);
    buildRoomPads(ctx);
    buildReferenceRing(ctx); // helps you orient immediately

    // ---------- CLEAN SPAWN PAD ----------
    // Put it out in the open, not inside any geometry.
    const spawn = {
      name: "spawn",
      pos: new THREE.Vector3(0, 0, 16.5), // clean open spot
      yaw: Math.PI // look toward center (-Z)
    };

    const spawnPad = makeSpawnPad(THREE);
    spawnPad.position.set(spawn.pos.x, 0.06, spawn.pos.z);
    ctx.root.add(spawnPad);

    const spawnLabel = makeBillboardText(THREE, "SPAWN");
    spawnLabel.position.set(spawn.pos.x, 1.25, spawn.pos.z);
    ctx.root.add(spawnLabel);

    // Helper to move rig safely
    function setRig(anchor) {
      player.position.copy(anchor.pos);
      player.position.y = 0;               // keep floor aligned
      player.rotation.set(0, 0, 0);
      // set facing only when not in XR (XR head pose handles view)
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchor.yaw, 0);
    }

    // Spawn there immediately
    setRig(spawn);

    // ---------- CORE INPUT ----------
    XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, log: ctx.log });

    // Android sticks enabled (already in your logs)
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // Optional: allow sticks in XR if you ever want (defaults OFF)
    let allowXRSticks = !!saved.allowXRSticks;

    // ---------- SYSTEMS ----------
    const poker = PokerSystem.init({ THREE, root: ctx.root, Signals, manifest: Manifest, log: ctx.log });
    PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    // ---------- HEALTHCHECK ----------
    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // ---------- HUD TOGGLE (if you add a button id="btnHud") ----------
    hookButton("btnHud", () => toggleHud());

    function toggleHud() {
      const hud = document.getElementById("hud");
      if (!hud) return;
      const next = hud.style.display === "none" ? "block" : "none";
      hud.style.display = next;
      ctx.log(`[hud] display=${next}`);
    }

    // ---------- QUICK PLAY: auto-start hand ----------
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    ctx.log("[world] Prime 10.0 FULL (spawn+visibility) init ✅");

    // ---------- MOVEMENT (sticks) ----------
    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    function applySticks(dt) {
      const inXR = renderer.xr.isPresenting;
      if (inXR && !allowXRSticks) return;

      const ax = sticks.getAxes?.() || { lx:0, ly:0, rx:0, ry:0 };
      const moveX = ax.lx || 0;
      const moveY = ax.ly || 0;
      const lookX = ax.rx || 0;
      const lookY = ax.ry || 0;

      // If HUD is “in front of you” on Android, you can hide it with btnHud.
      // Look
      player.rotation.y -= lookX * 1.6 * dt;
      camera.rotation.x -= lookY * 1.2 * dt;
      camera.rotation.x = Math.max(-1.15, Math.min(1.15, camera.rotation.x));

      // Move
      tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpForward.y = 0; tmpForward.normalize();
      tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      tmpRight.y = 0; tmpRight.normalize();

      tmpMove.set(0, 0, 0);
      tmpMove.addScaledVector(tmpRight, moveX);
      tmpMove.addScaledVector(tmpForward, -moveY);

      const len = tmpMove.length();
      if (len > 0.001) {
        const speed = inXR ? 1.4 : 2.3;
        tmpMove.multiplyScalar((speed * dt) / len);
        player.position.add(tmpMove);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        applySticks(dt);

        // on-screen status
        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}`);

        poker?.update?.(dt, t);
        bots?.update?.(dt);

        // periodic save (light)
        if (((t | 0) % 10) === 0) {
          Persistence.save({ ...saved, allowXRSticks, flags: Manifest.get("flags") });
        }
      }
    };

    function hookButton(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
  }
};

// ===================== VISUAL BUILDERS =====================

function addLights(ctx, safe) {
  const { THREE, scene, root } = ctx;

  // Bright baseline ambient-ish
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a2440, safe ? 1.05 : 1.25);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, safe ? 0.95 : 1.25);
  sun.position.set(25, 50, 25);
  scene.add(sun);

  // Lobby glow
  const lobbyGlow = new THREE.PointLight(0x66ccff, safe ? 0.8 : 1.1, 120, 2);
  lobbyGlow.position.set(0, 10, 0);
  root.add(lobbyGlow);

  const warm = new THREE.PointLight(0xffd36b, safe ? 0.35 : 0.55, 80, 2);
  warm.position.set(0, 4.5, 8);
  root.add(warm);
}

function matFloor(THREE, color = 0x18243a) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.08 });
}

function buildVisibleLobby(ctx) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

  // Lobby shell
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

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.35, 64),
    matFloor(THREE, 0x1b2a46)
  );
  floor.position.set(0, -0.175, 0);
  root.add(floor);

  // Bright ring for visibility
  if (!safe) {
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      roughness: 0.35,
      metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.55
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.4, 0.16, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.18, 0);
    root.add(ring);
  }
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
    new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.92, metalness: 0.08, side: THREE.DoubleSide })
  );
  pitWall.position.set(0, pitFloorY / 2, 0);
  root.add(pitWall);

  // Center felt pad (poker system visuals sit here)
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

function buildRoomPads(ctx) {
  const { THREE, root } = ctx;
  const pads = [
    { name:"POKER",    pos: new THREE.Vector3(-4.0, 0, 10.8) },
    { name:"STORE",    pos: new THREE.Vector3(-1.3, 0, 10.8) },
    { name:"SCORPION", pos: new THREE.Vector3( 1.3, 0, 10.8) },
    { name:"SPECTATE", pos: new THREE.Vector3( 4.0, 0, 10.8) }
  ];

  for (const p of pads) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.12, 28),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.5,
        metalness: 0.25,
        emissive: new THREE.Color(0x66ccff),
        emissiveIntensity: 0.25
      })
    );
    pad.position.set(p.pos.x, 0.06, p.pos.z);
    root.add(pad);

    const label = makeBillboardText(THREE, p.name);
    label.position.set(p.pos.x, 1.2, p.pos.z);
    root.add(label);
  }
}

function buildReferenceRing(ctx) {
  const { THREE, root } = ctx;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 2.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.01, 16.5);
  root.add(ring);
}

function makeSpawnPad(THREE) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x10192a,
    roughness: 0.5,
    metalness: 0.25,
    emissive: new THREE.Color(0xffd36b),
    emissiveIntensity: 0.35
  });
  return new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 32), mat);
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
  g.font = "900 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text||""), canvas.width/2, canvas.height/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), mat);
  mesh.rotation.y = Math.PI;
  return mesh;
  }
