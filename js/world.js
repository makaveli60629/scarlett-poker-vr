// /js/world.js — ScarlettVR Prime 10.0 ORCHESTRATOR (FULL, repo-matched)
// ✅ Repo matched: PokerRules lives in /js/core/poker_rules.js
// ✅ Systems: /js/systems/poker_system.js, bot_system.js, bot_ai.js
// ✅ Builds: lobby ring + pit divot + balcony + store + scorpion + spectate pad + portals
// ✅ Hands-only XR initialization + Android sticks + HUD wiring
// ✅ Safe defaults (won't break XR). Optional VR-stick loco toggle.

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { PokerRules } from "./core/poker_rules.js"; // ✅ IMPORTANT (your repo)
import { BotSystem } from "./systems/bot_system.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    // ---------- CORE INIT ----------
    Manifest.init();

    const saved = Persistence.load() || {};
    if (saved.flags?.safeMode === true) Manifest.set("flags.safeMode", true);

    const flags = Manifest.get("flags") || { safeMode: false };

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

    // ---------- ENV ----------
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 12, 110);

    // ---------- LIGHTS ----------
    {
      const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, flags.safeMode ? 1.0 : 1.15);
      hemi.position.set(0, 70, 0);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffffff, flags.safeMode ? 0.85 : 1.15);
      sun.position.set(35, 70, 35);
      scene.add(sun);

      if (!flags.safeMode) {
        const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.05, 95, 2);
        lobbyGlow.position.set(0, 9.0, 0);
        ctx.root.add(lobbyGlow);

        const magenta = new THREE.PointLight(0xff6bd6, 0.55, 85, 2);
        magenta.position.set(0, 2.6, 0);
        ctx.root.add(magenta);
      }
    }

    // ---------- ANCHORS / ROOMS ----------
    const anchors = {
      lobby:    { pos: new THREE.Vector3(0, 0, 13.5),  yaw: Math.PI },
      poker:    { pos: new THREE.Vector3(0, 0, -9.5),  yaw: 0 },
      store:    { pos: new THREE.Vector3(-26, 0, 0),   yaw: Math.PI / 2 },
      scorpion: { pos: new THREE.Vector3(26, 0, 0),    yaw: -Math.PI / 2 },
      spectate: { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 }
    };

    function setRig(anchor) {
      player.position.copy(anchor.pos);
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchor.yaw, 0);
    }

    // ---------- BUILD WORLD (FULL) ----------
    buildLobbyRing(ctx);
    buildPitCenterpiece(ctx);       // divot pit is back
    buildBalconySpectator(ctx);     // upstairs ring
    buildRoomsAndHallways(ctx);     // 4 rooms
    buildStore(ctx);                // store with mannequins
    buildScorpionRoom(ctx);         // scorpion room lighting + tables
    buildSpectatePlatform(ctx);     // spectator pad
    buildPokerStage(ctx);           // slight stage pad at poker anchor
    const portals = buildPortalPads(ctx, anchors); // walk-on teleports

    // spawn start
    setRig(anchors.lobby);

    // ---------- XR HANDS (HANDS ONLY) ----------
    const hands = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });

    // ---------- INTERACTION ----------
    // (Targets optional; currently UI-driven. You can register later.)
    Interaction.init({ THREE, Signals, hands, log: ctx.log });

    // ---------- ANDROID STICKS ----------
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // Optional: allow sticks locomotion in XR (default OFF for comfort)
    let allowXRSticks = !!saved.allowXRSticks;

    // ---------- SYSTEMS ----------
    const poker = PokerSystem.init({
      THREE,
      root: ctx.root,
      Signals,
      manifest: Manifest,
      log: ctx.log
    });

    const rules = PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    // ---------- HUD / UI WIRING ----------
    let room = saved.room || "lobby";

    Signals.on("ROOM_SET", (p) => {
      const r = String(p?.room || "lobby");
      room = anchors[r] ? r : "lobby";
      setRig(anchors[room]);
      DebugHUD.setRoom(room);
      Persistence.save({ ...saved, room, allowXRSticks, flags: Manifest.get("flags") });
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
      if (id === "TOGGLE_XR_STICKS") {
        allowXRSticks = !allowXRSticks;
        ctx.log(`[sticks] allowXRSticks=${allowXRSticks}`);
        Persistence.save({ ...saved, room, allowXRSticks, flags: Manifest.get("flags") });
        Signals.emit("UI_MESSAGE", { text: `XR sticks: ${allowXRSticks ? "ON" : "OFF"}`, level:"info" });
      }
    });

    // Hook HUD buttons if present
    hookButton("btnNewHand", () => Signals.emit("UI_CLICK", { id: "NEW_HAND" }));
    hookButton("btnLobby", () => Signals.emit("UI_CLICK", { id: "LOBBY" }));
    hookButton("btnPoker", () => Signals.emit("UI_CLICK", { id: "POKER" }));
    hookButton("btnStore", () => Signals.emit("UI_CLICK", { id: "STORE" }));
    hookButton("btnScorpion", () => Signals.emit("UI_CLICK", { id: "SCORPION" }));
    hookButton("btnSpectate", () => Signals.emit("UI_CLICK", { id: "SPECTATE" }));

    // Add optional XR sticks toggle button if you want (safe if missing)
    hookButton("btnXrSticks", () => Signals.emit("UI_CLICK", { id: "TOGGLE_XR_STICKS" }));

    // Healthcheck
    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // auto-start hand
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    // apply saved room
    Signals.emit("ROOM_SET", { room });

    ctx.log("[world] Prime 10.0 FULL init ✅");

    // ---------- TICK LOOP ----------
    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    function applySticks(dt) {
      const inXR = renderer.xr.isPresenting;
      if (inXR && !allowXRSticks) return;

      const ax = sticks.getAxes();
      const moveX = ax.lx || 0;
      const moveY = ax.ly || 0;
      const lookX = ax.rx || 0;
      const lookY = ax.ry || 0;

      // look (yaw on rig, pitch on camera)
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
        const speed = inXR ? 1.55 : 2.25; // slower in XR for comfort
        tmpMove.multiplyScalar((speed * dt) / len);
        player.position.add(tmpMove);
      }
    }

    // walk-on portal detection (very cheap)
    function portalCheck() {
      const p = player.position;
      for (const prt of portals) {
        const d = prt.pos.distanceTo(p);
        if (d < prt.radius) {
          Signals.emit("ROOM_SET", { room: prt.room });
          break;
        }
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        applySticks(dt);
        portalCheck();

        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}`);

        poker?.update?.(dt, t);
        bots?.update?.(dt);

        // autosave every ~10 seconds (no spam)
        if (((t | 0) % 10) === 0) {
          Persistence.save({ room, allowXRSticks, flags: Manifest.get("flags") });
        }
      }
    };

    function hookButton(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
  }
};

// =================== BUILDERS (FULL, SAFE) ===================
function matFloor(THREE, color = 0x121c2c) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
}

function buildLobbyRing(ctx) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

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

  if (!safe) {
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff, roughness: 0.3, metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.45
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.5, 0.12, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 8.8, 0);
    root.add(ring);
  }
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function buildPitCenterpiece(ctx) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

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

  // ramp down entrance (+Z)
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, pitDepth, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
  );
  ramp.position.set(0, pitFloorY / 2, pitRadius + 8.4 * 0.32);
  ramp.rotation.x = -Math.atan2(pitDepth, 8.4);
  root.add(ramp);

  // rail ring around pit (skip entrance)
  const railR = pitRadius + 1.35;
  const railY = 0.95;
  const segs = 40;

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x1c2433, roughness: 0.5, metalness: 0.22,
    emissive: safe ? new THREE.Color(0x000000) : new THREE.Color(0x223cff),
    emissiveIntensity: safe ? 0 : 0.12
  });

  const entranceAngle = Math.PI / 2; // +Z
  const entranceHalfWidth = 0.32;

  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const amid = (a0 + a1) * 0.5;

    const d = angleDelta(amid, entranceAngle);
    if (Math.abs(d) < entranceHalfWidth) continue;

    const x = Math.cos(amid) * railR;
    const z = Math.sin(amid) * railR;

    const railSeg = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.32), railMat);
    railSeg.position.set(x, railY, z);
    railSeg.rotation.y = -amid;
    root.add(railSeg);
  }

  // table pad (PokerSystem places visuals)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.25, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
  );
  felt.position.set(0, pitFloorY + 1.05, 0);
  root.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.14, 14, 72),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.5, metalness: 0.22 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, pitFloorY + 1.18, 0);
  root.add(rim);
}

function buildBalconySpectator(ctx) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

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

    // jumbotron placeholders (cheap planes)
    const jumboMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.18,
      roughness: 0.6,
      metalness: 0.25
    });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), jumboMat);
      const ang = i * (Math.PI / 2);
      p.position.set(Math.cos(ang) * 14.0, 3.6, Math.sin(ang) * 14.0);
      p.lookAt(0, 3.6, 0);
      root.add(p);
    }
  }
}

function buildRoomsAndHallways(ctx) {
  const { THREE, root } = ctx;
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

    const hallLen = 12;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, hallLen), matFloor(THREE, 0x121c2c));
    hall.position.y = -0.175;

    if (r.name === "north") hall.position.set(0, -0.175, -18);
    if (r.name === "south") hall.position.set(0, -0.175, 18);
    if (r.name === "west")  { hall.position.set(-18, -0.175, 0); hall.rotation.y = Math.PI/2; }
    if (r.name === "east")  { hall.position.set(18, -0.175, 0); hall.rotation.y = Math.PI/2; }

    root.add(hall);
  }
}

function buildStore(ctx) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

  const store = new THREE.Group();
  store.position.set(-26, 0, 0);
  root.add(store);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x111a28));
  floor.position.y = -0.175;
  store.add(floor);

  const glow = new THREE.PointLight(0x66ccff, safe ? 0.7 : 1.0, 45, 2);
  glow.position.set(0, 3.5, 0);
  store.add(glow);

  // mannequin pads
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.1 });
  const manMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.65, metalness: 0.08 });

  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 22), padMat);
    pad.position.set(-6 + i * 3.0, 0.06, -4.4);
    store.add(pad);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 6, 10), manMat);
    body.position.set(pad.position.x, 1.1, pad.position.z);
    store.add(body);
  }
}

function buildScorpionRoom(ctx) {
  const { THREE, root } = ctx;
  const sc = new THREE.Group();
  sc.position.set(26, 0, 0);
  root.add(sc);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), matFloor(THREE, 0x0f1724));
  floor.position.y = -0.175;
  sc.add(floor);

  const light = new THREE.PointLight(0xff6bd6, 1.0, 55, 2);
  light.position.set(0, 3.5, 0);
  sc.add(light);

  const tblMat = new THREE.MeshStandardMaterial({ color: 0x1b2a46, roughness: 0.7, metalness: 0.12 });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.22, 32), tblMat);
    t.position.set(-5 + i * 5, 0.9, 0);
    sc.add(t);
  }
}

function buildSpectatePlatform(ctx) {
  const { THREE, root } = ctx;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), matFloor(THREE, 0x121c2c));
  plat.position.set(0, 3.0, -14);
  root.add(plat);
}

function buildPokerStage(ctx) {
  const { THREE, root } = ctx;
  const stage = new THREE.Mesh(new THREE.CircleGeometry(10, 64), matFloor(THREE, 0x0f1724));
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(0, 0.001, -9.5);
  root.add(stage);
}

function buildPortalPads(ctx, anchors) {
  const { THREE, root, manifest } = ctx;
  const safe = !!manifest.get("flags.safeMode");

  const pads = [];

  function addPad(room, pos) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x121c2c,
      emissive: new THREE.Color(safe ? 0x000000 : 0x66ccff),
      emissiveIntensity: safe ? 0 : 0.25,
      roughness: 0.6,
      metalness: 0.25
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 28), mat);
    pad.position.copy(pos);
    pad.position.y = 0.06;
    root.add(pad);

    // label
    const label = makeBillboardText(THREE, room.toUpperCase());
    label.position.set(pos.x, 1.15, pos.z);
    root.add(label);

    pads.push({ room, pos: new THREE.Vector3(pos.x, 0, pos.z), radius: 0.85 });
  }

  // place pads in lobby ring (front arc)
  addPad("poker",    new THREE.Vector3(-4.0, 0, 10.5));
  addPad("store",    new THREE.Vector3(-1.3, 0, 10.5));
  addPad("scorpion", new THREE.Vector3( 1.3, 0, 10.5));
  addPad("spectate", new THREE.Vector3( 4.0, 0, 10.5));

  // also add “return lobby” pads near other anchors
  addPad("lobby", new THREE.Vector3(0, 0, -8.0));     // near poker
  addPad("lobby", new THREE.Vector3(-26, 0, 2.0));    // near store
  addPad("lobby", new THREE.Vector3(26, 0, 2.0));     // near scorpion
  addPad("lobby", new THREE.Vector3(0, 3.0, -12.0));  // near spectate

  return pads;
}

function makeBillboardText(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext("2d");

  g.clearRect(0,0,canvas.width,canvas.height);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0,0,canvas.width,canvas.height);

  g.strokeStyle = "rgba(102,204,255,0.45)";
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), mat);
  mesh.userData.billboard = true;
  mesh.rotation.y = Math.PI; // face inward by default
  return mesh;
                                          }
