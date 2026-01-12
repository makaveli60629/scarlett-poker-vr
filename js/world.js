// /js/world.js — Scarlett MASTER WORLD v12 (FULL UPGRADE)
// ✅ Deep divot + tight rim + guardrail + stairs + guard
// ✅ Seats + seated bots facing table
// ✅ Nametags + HUD yaw-only (never tilt)
// ✅ Cards high + face camera + community reveal 3->4->5 only (no "?")
// ✅ Dealer button + chip stacks + pass line
// ✅ Better bot bodies + walk animation
// ✅ Store stub + VIP hallway + spawn arch
// ✅ Bright lights + marble-ish floor + embedded jumbotrons
// ✅ Teleport colliders exported

import { buildPitAndTable } from "./pit_table.js";
import { createBot } from "./bot_rig.js";
import { createPokerPresenter } from "./poker_presenter.js";
import { buildStoreStub, buildVIPEntrance, buildSpawnArch } from "./store_vip.js";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeMarbleTexture(THREE) {
  // Cheap procedural marble-ish canvas texture (no external assets)
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#1b1f27";
  ctx.fillRect(0, 0, 512, 512);

  // soft veining
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = Math.random() * Math.PI * 2;
    const len = 10 + Math.random() * 40;
    const w = 0.6 + Math.random() * 1.4;

    ctx.strokeStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.03})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // subtle speckle
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(127,231,255,${Math.random() * 0.02})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function buildLobbyShell({ THREE, root, log, radius = 22, height = 8.5 }) {
  const g = new THREE.Group();
  g.name = "LobbyShell";
  root.add(g);

  // Tall gray walls (clean + simple, consistent with your structure)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d45,
    roughness: 0.95,
    metalness: 0.06
  });

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 128, 1, true),
    wallMat
  );
  wall.position.y = height / 2;
  wall.name = "LobbyWall";
  g.add(wall);

  // Ceiling ring glow
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    emissive: 0x224466,
    emissiveIntensity: 1.25,
    roughness: 0.2,
    metalness: 0.1
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.35, 0.08, 16, 180), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height - 0.9;
  ring.name = "CeilingGlowRing";
  g.add(ring);

  log && log("[world] lobby shell ✅ (gray + tall)");
  return g;
}

function buildJumbotrons({ THREE, root, log, radius = 21.2, y = 5.6 }) {
  const g = new THREE.Group();
  g.name = "Jumbotrons";
  root.add(g);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x232634,
    roughness: 0.7,
    metalness: 0.3
  });

  function makeScreen(color, emissive = 1.65) {
    const screenMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: emissive,
      roughness: 0.25,
      metalness: 0.15
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.8, 0.25), frameMat);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.4), screenMat);
    screen.position.z = 0.13;
    const h = new THREE.Group();
    h.add(frame, screen);
    return h;
  }

  // 4 embedded screens
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const colors = [0x7fe7ff, 0xff2d7a, 0x7fe7ff, 0x5b7cff];

  for (let i = 0; i < 4; i++) {
    const s = makeScreen(colors[i], i === 3 ? 1.1 : 1.7); // one slightly "blue" but not dead
    const a = angles[i];
    s.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    s.lookAt(0, y, 0);
    g.add(s);
  }

  log && log("[world] jumbotrons ✅ (embedded)");
  return g;
}

function buildPassLine({ THREE, parent, y = 0.06, radius = 2.35 }) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    emissive: 0x223355,
    emissiveIntensity: 1.0,
    roughness: 0.25,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55
  });

  const line = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.03, 12, 160), mat);
  line.rotation.x = Math.PI / 2;
  line.position.y = y;
  line.name = "PassLine";
  parent.add(line);
  return line;
}

function buildChair({ THREE, color = 0x2b2f3a }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.1 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.62), mat);
  seat.position.y = 0.45;

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.10), mat);
  back.position.set(0, 0.78, -0.26);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10);
  const legs = [];
  const xs = [-0.24, 0.24];
  const zs = [-0.24, 0.24];
  for (const x of xs) for (const z of zs) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, 0.225, z);
    legs.push(leg);
  }

  g.add(seat, back, ...legs);
  g.name = "Chair";
  return g;
}

function buildOvalTable({ THREE, parent }) {
  // simple "boss" oval table placeholder (you can swap TableFactory later)
  const g = new THREE.Group();
  g.name = "MainPokerTable";
  parent.add(g);

  const feltMat = new THREE.MeshStandardMaterial({ color: 0x0d5b3f, roughness: 0.9, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.6, metalness: 0.18 });

  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.18, 72), feltMat);
  top.scale.z = 1.35;
  top.position.y = 0.95;
  g.add(top);

  const trim = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.18, 72), trimMat);
  trim.scale.z = 1.35;
  trim.position.y = 0.87;
  g.add(trim);

  // legs
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.85, 16), trimMat);
  leg.position.y = 0.42;
  g.add(leg);

  // local anchor for presentational overlays
  g.userData.tableTopY = 0.95;

  return g;
}

function buildGuard({ THREE, parent, pos }) {
  const guard = createBot({ THREE, color: 0xffcc00, scale: 1.05 });
  guard.position.set(pos.x, pos.y, pos.z);
  guard.userData.setSeated(false);
  guard.userData.mode = "walk"; // but we'll not move it
  parent.add(guard);
  guard.name = "GuardBot";
  return guard;
}

function makeRoomMarker({ THREE, root, name, pos }) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.06, 12, 60),
    new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0x440022, emissiveIntensity: 1.2 })
  );
  m.rotation.x = Math.PI / 2;
  m.position.set(pos.x, pos.y + 0.03, pos.z);
  m.name = name;
  root.add(m);
  return m;
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    this.THREE = THREE;
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.controllers = controllers;
    this.log = log || console.log;
    this.BUILD = BUILD;

    // Root
    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);
    this.root = root;

    // Lights (bright)
    {
      const amb = new THREE.AmbientLight(0xffffff, 0.35);
      root.add(amb);

      const key = new THREE.DirectionalLight(0xffffff, 1.25);
      key.position.set(10, 18, 8);
      root.add(key);

      const fill = new THREE.PointLight(0x7fe7ff, 2.2, 55);
      fill.position.set(0, 7.5, 0);
      root.add(fill);

      const pink = new THREE.PointLight(0xff2d7a, 1.7, 55);
      pink.position.set(-8, 6.2, -6);
      root.add(pink);

      this.log("[world] lights ✅ (bright)");
    }

    // Lobby shell (keep structure simple)
    buildLobbyShell({ THREE, root, log: this.log, radius: 22, height: 8.5 });

    // Deep pit + stairs + rail + seat anchors
    const pit = buildPitAndTable({
      THREE,
      root,
      log: this.log,
      pitDepth: 2.45,        // ✅ deeper
      pitRadius: 6.9,
      rimWidth: 2.35,
      roomRadius: 22
    });
    this.pit = pit;

    // Beautify: marble-ish floor texture (applied to main floor if available)
    try {
      const tex = makeMarbleTexture(THREE);
      // pit builder names its main floor "FloorMain"
      const floor = root.getObjectByName("FloorMain");
      if (floor && floor.material) {
        floor.material.map = tex;
        floor.material.needsUpdate = true;
        this.log("[world] floor texture ✅ (marble-ish)");
      }
    } catch (e) {
      this.log("[world] floor texture skipped ⚠️ " + (e?.message || e));
    }

    // Jumbotrons
    buildJumbotrons({ THREE, root, log: this.log, radius: 21.1, y: 5.75 });

    // Spawn arch (lobby)
    buildSpawnArch({ THREE, root, pos: [0, 0, 10] });
    this.log("[world] teleport arch ✅");

    // VIP + store
    buildStoreStub({ THREE, root, pos: [12, 0, -6] });
    const vip = buildVIPEntrance({ THREE, root, start: [-16, 0, -2] });
    this.vip = vip;

    // Room markers (so you can test teleport landing areas)
    this.markers = {
      store: makeRoomMarker({ THREE, root, name: "Marker_Store", pos: new THREE.Vector3(12, 0, -6) }),
      vip: makeRoomMarker({ THREE, root, name: "Marker_VIP", pos: new THREE.Vector3(-1.5, 0, -2) }),
      pit: makeRoomMarker({ THREE, root, name: "Marker_Pit", pos: new THREE.Vector3(0, 0, 0) }),
    };

    // Table in the pit
    const table = buildOvalTable({ THREE, parent: pit.tableAnchor });
    table.position.set(0, 0, 0);
    this.table = table;

    // Pass line ring on table (visual)
    buildPassLine({ THREE, parent: pit.tableAnchor, y: 1.06, radius: 2.2 });

    // Chairs + seated bots
    this.seatedBots = [];
    this.walkBots = [];

    const botNames = ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"];

    for (let i = 0; i < pit.seatAnchors.length; i++) {
      const seat = pit.seatAnchors[i];

      // Chair aligned to seat anchor
      const chair = buildChair({ THREE, color: 0x2b2f3a });
      chair.position.set(0, 0, 0.6); // behind bot
      chair.rotation.y = Math.PI;    // face inward with anchor
      seat.add(chair);

      // Bot seated
      const b = createBot({ THREE, color: (i % 2 ? 0x7fe7ff : 0xff2d7a), scale: 1.0 });
      b.position.set(0, 0, 0.25);
      b.userData.setSeated(true, 0.10);
      seat.add(b);

      this.seatedBots.push(b);
    }

    // A few walking bots (lively)
    for (let i = 0; i < 4; i++) {
      const b = createBot({ THREE, color: 0x7fe7ff, scale: 1.0 });
      b.position.set(-7 + i * 4.0, 0, -8 + (i % 2) * 3.2);
      b.userData.setSeated(false);
      root.add(b);
      this.walkBots.push(b);
    }
    this.log("[world] lobby bots ✅ (walkers + seated players)");

    // Guard at stairs entrance (no collisions)
    const stairAngle = THREE.MathUtils.degToRad(220);
    const guardPos = new THREE.Vector3(Math.cos(stairAngle) * (pit.pitRadius + 2.0), 0, Math.sin(stairAngle) * (pit.pitRadius + 2.0));
    this.guard = buildGuard({ THREE, parent: root, pos: guardPos });

    // Poker presenter (cards/HUD)
    this.presenter = createPokerPresenter();
    this.presenter.init({ THREE, scene, log: this.log });
    this.presenter.attachToTable({
      tableAnchor: pit.tableAnchor,
      seatAnchors: pit.seatAnchors,
      botNames
    });

    // IMPORTANT: Do NOT deal to player unless they actually join/sit
    // Lobby standing default:
    if (typeof window.__PLAYER_AT_TABLE === "undefined") window.__PLAYER_AT_TABLE = false;
    if (typeof window.__SEATED_MODE === "undefined") window.__SEATED_MODE = false;

    // Visual-only poker driver (stable, no ? cards)
    this._pokerClock = 0;
    this._handPhase = 0; // 0 start, 1 flop, 2 turn, 3 river, 4 showdown
    this._dealer = 0;
    this._turn = 0;
    this._pot = 0;

    this.presenter.onHandStart({ dealerIndex: this._dealer });
    this.presenter.onPot(this._pot);

    // Export colliders for teleport
    this._colliders = pit.colliders;
    this.log("[world] build complete ✅ (MASTER v12 FULL UPGRADE)");
  },

  colliders() {
    return this._colliders || [];
  },

  update(dt) {
    // Walk bots animate
    if (this.walkBots) {
      for (let i = 0; i < this.walkBots.length; i++) {
        const b = this.walkBots[i];
        b.userData.update(dt, 1.0);

        // simple orbit walk
        const t = (performance.now() * 0.00015) + i;
        const r = 10.5 + (i % 2) * 1.2;
        b.position.x = Math.cos(t) * r;
        b.position.z = Math.sin(t) * r;
        b.rotation.y = Math.atan2(-Math.cos(t), -Math.sin(t));
      }
    }

    // Seated idle micro motion
    if (this.seatedBots) {
      for (const b of this.seatedBots) b.userData.update(dt, 0.55);
    }

    // Presenter faces camera (yaw-only, no tilt)
    if (this.presenter) this.presenter.update(dt);

    // Visual-only poker pacing (3->4->5 only)
    this._pokerClock += dt;
    if (this._pokerClock > 3.25) {
      this._pokerClock = 0;

      // advance turn
      this._turn = (this._turn + 1) % 6;

      // simple “action”
      const actions = ["CHECK", "CALL", "RAISE", "FOLD"];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const amt = action === "RAISE" ? String(100 + Math.floor(Math.random() * 400)) : "";
      if (this.presenter) this.presenter.onTurn({ idx: this._turn, action, amount: amt });

      // pot moves a little
      this._pot += (action === "RAISE" ? 200 : (action === "CALL" ? 80 : 0));
      this._pot = clamp(this._pot, 0, 5000);
      if (this.presenter) this.presenter.onPot(this._pot);

      // phase logic (NO "?"; strictly 3/4/5)
      if (this._handPhase === 0) {
        this._handPhase = 1;
        this.presenter.onCommunity(3);
      } else if (this._handPhase === 1) {
        this._handPhase = 2;
        this.presenter.onCommunity(4);
      } else if (this._handPhase === 2) {
        this._handPhase = 3;
        this.presenter.onCommunity(5);
      } else if (this._handPhase === 3) {
        // showdown -> new hand
        this._handPhase = 0;
        this._pot = 0;
        this._dealer = (this._dealer + 1) % 6;
        this._turn = this._dealer;

        this.presenter.onHandStart({ dealerIndex: this._dealer });
        this.presenter.onPot(this._pot);
      }
    }
  }
};
