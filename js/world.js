// /js/world.js — Scarlett MASTER WORLD ORCHESTRATOR v7
// Uses your existing modules when available. Safe imports. No hanging awaits.

import { safeImport } from "./safe_import.js";

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,
    t: 0,
    options: {
      hudVisible: true,
      A_worldPolish: true,
      B_pokerSim: true,
      C_storeMeta: true
    },

    // geometry settings (your requests)
    lobbyR: 24.0,      // expanded
    wallH: 12.0,
    pitInner: 10.8,    // bigger pit radius (expanded)
    pitDepth: 1.55,

    targets: {},
    tags: [],

    // loaded systems
    sys: {
      lights: null,
      solidWalls: null,
      tableFactory: null,
      teleportMachine: null,
      storeRoom: null,
      jumbotron: null,
      bots: null,
      pokerEngine: null,
      pokerSim: null,
      uiHud: null,
      nametags: null
    }
  };

  const THEME = {
    bg: 0x05060a,
    wall: 0x222b3a,
    wall2: 0x141a24,
    pit: 0x0b1420,
    neon: 0x3cf2ff
  };

  const add = (o) => (state.root.add(o), o);

  function matStd(color, rough=0.9, metal=0.08) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  // ---------- SAFE MODULE LOADER ----------
  async function loadModules() {
    // Each is optional. If missing, we keep going.
    const LightsPack     = await safeImport("./lights_pack.js", "LightsPack");
    const SolidWalls     = await safeImport("./solid_walls.js", "SolidWalls");
    const TableFactory   = await safeImport("./table_factory.js", "TableFactory");
    const TeleportMachine= await safeImport("./teleport_machine.js", "TeleportMachine");
    const StoreRoom      = await safeImport("./store_room.js", "StoreRoom");
    const Jumbotron      = await safeImport("./JumbotronModule.js", "JumbotronModule"); // note capital J in your list
    const Bots           = await safeImport("./bots.js", "Bots");
    const PokerEngine    = await safeImport("./poker_engine.js", "PokerEngine");
    const PokerSim       = await safeImport("./poker_sim.js", "PokerSim");
    const UIHUD          = await safeImport("./ui_hud.js", "UIHUD");
    const NameTags       = await safeImport("./nametags.js", "NameTags");

    state.sys.lights = LightsPack;
    state.sys.solidWalls = SolidWalls;
    state.sys.tableFactory = TableFactory;
    state.sys.teleportMachine = TeleportMachine;
    state.sys.storeRoom = StoreRoom;
    state.sys.jumbotron = Jumbotron;
    state.sys.bots = Bots;
    state.sys.pokerEngine = PokerEngine;
    state.sys.pokerSim = PokerSim;
    state.sys.uiHud = UIHUD;
    state.sys.nametags = NameTags;
  }

  // ---------- A: BASE WORLD (stable, no shimmer) ----------
  function buildBaseWorld() {
    // lights (fallback if module missing)
    if (state.sys.lights?.init) {
      state.sys.lights.init({ THREE, scene: state.root, log });
      log?.("[world] lights_pack ✅");
    } else {
      add(new THREE.AmbientLight(0xffffff, 1.15));
      add(new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.10));
      const sun = new THREE.DirectionalLight(0xffffff, 2.0);
      sun.position.set(18, 20, 12);
      add(sun);
      log?.("[world] lights fallback ✅");
    }

    // lobby ring floor
    const floorMat = matStd(0x2e3747, 0.95, 0.03);
    floorMat.polygonOffset = true;
    floorMat.polygonOffsetFactor = 2;
    floorMat.polygonOffsetUnits = 2;

    const lobbyFloor = new THREE.Mesh(
      new THREE.RingGeometry(state.pitInner, state.lobbyR, 260),
      floorMat
    );
    lobbyFloor.rotation.x = -Math.PI/2;
    lobbyFloor.position.y = 0.01;
    add(lobbyFloor);

    // pit floor
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(state.pitInner - 0.2, 240),
      matStd(THEME.pit, 0.98, 0.02)
    );
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = -state.pitDepth;
    add(pitFloor);

    // pit wall
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(state.pitInner, state.pitInner, state.pitDepth, 240, 1, true),
      matStd(THEME.wall2, 0.92, 0.08)
    );
    pitWall.position.y = -state.pitDepth/2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    // outer wall
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(state.lobbyR, state.lobbyR, state.wallH, 260, 1, true),
      matStd(THEME.wall, 0.92, 0.06)
    );
    wall.position.y = state.wallH/2;
    wall.material.side = THREE.DoubleSide;
    add(wall);

    // simple neon trim (helps orientation)
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(state.lobbyR - 0.35, 0.11, 18, 260),
      new THREE.MeshStandardMaterial({
        color: THEME.neon,
        emissive: THEME.neon,
        emissiveIntensity: 1.05,
        roughness: 0.25,
        metalness: 0.95
      })
    );
    trim.rotation.x = Math.PI/2;
    trim.position.y = state.wallH - 0.55;
    add(trim);

    // stairs down to pit
    buildStairs();

    // targets
    state.targets.lobby = new THREE.Vector3(0, 0, 0);
    state.targets.pit = new THREE.Vector3(0, 0, state.pitInner - 1.2);
  }

  function buildStairs() {
    const openingW = 5.8;
    const stepCount = 10;
    const stepH = state.pitDepth / stepCount;
    const stepD = 0.72;
    const stepMat = matStd(0x2e3747, 0.92, 0.05);

    for (let i=0;i<stepCount;i++){
      const step = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH*0.95, stepD), stepMat);
      step.position.set(0, -stepH*(i+0.5), state.pitInner + 0.55 + i*stepD);
      add(step);
    }
  }

  // ---------- ROOMS (no doorway blocking walls) ----------
  function buildRooms() {
    const roomDist = state.lobbyR + 11.2;
    state.targets.vipInside   = new THREE.Vector3(0, 0,  roomDist);
    state.targets.storeInside = new THREE.Vector3(roomDist, 0, 0);
    state.targets.eventInside = new THREE.Vector3(0, 0, -roomDist);
    state.targets.pokerInside = new THREE.Vector3(-roomDist, 0, 0);

    // Let your solid_walls module handle clean cutouts if it exists:
    if (state.sys.solidWalls?.build) {
      state.sys.solidWalls.build({
        THREE,
        scene: state.root,
        lobbyRadius: state.lobbyR,
        wallHeight: state.wallH,
        pitRadius: state.pitInner,
        log
      });
      log?.("[world] solid_walls ✅");
    }

    // If you don’t have solid_walls.build(), we still give you reachable rooms using pads/teleport.
  }

  // ---------- TABLE / POKER ----------
  function buildTableAndPoker() {
    // Prefer your real table factory:
    if (state.sys.tableFactory?.create) {
      const table = state.sys.tableFactory.create({ THREE, log });
      table.position.set(0, -state.pitDepth, 0);
      state.root.add(table);
      log?.("[world] table_factory ✅");
    } else {
      // fallback simple table so you always see *something*
      const top = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.45, 0.2, 90), matStd(0x0f5a3f, 0.92, 0.02));
      top.position.set(0, -state.pitDepth + 1.0, 0);
      add(top);
      log?.("[world] table fallback ✅");
    }

    // Poker sim/engine (use what exists)
    if (state.options.B_pokerSim) {
      if (state.sys.pokerSim?.init) {
        state.sys.pokerSim.init({ THREE, scene: state.root, player, camera, log });
        log?.("[world] poker_sim ✅");
      } else if (state.sys.pokerEngine?.init) {
        state.sys.pokerEngine.init({ THREE, scene: state.root, player, camera, log });
        log?.("[world] poker_engine ✅");
      }
    }
  }

  // ---------- STORE ----------
  function buildStore() {
    if (!state.options.C_storeMeta) return;

    if (state.sys.storeRoom?.init) {
      state.sys.storeRoom.init({ THREE, scene: state.root, log });
      log?.("[world] store_room ✅");
    } else {
      log?.("[world] store_room missing (ok)");
    }
  }

  // ---------- BOTS + SMALL GAZE TAGS ----------
  function initBotsAndTags() {
    if (state.sys.bots?.init) {
      state.sys.bots.init({ THREE, scene: state.root, log });
      log?.("[world] bots ✅");
    }

    // If your nametags module exists, force “small + gaze only” behavior
    if (state.sys.nametags?.setMode) {
      state.sys.nametags.setMode("gaze_only");
      state.sys.nametags.setScale?.(0.35);   // small but legible
      state.sys.nametags.setMaxDistance?.(12);
      state.sys.nametags.setUpright?.(true); // no tilt with your head
      log?.("[world] nametags tuned ✅");
    }
  }

  // ---------- TELEPORT ----------
  function initTeleport() {
    // Prefer teleport_machine if you have it:
    if (state.sys.teleportMachine?.init) {
      state.sys.teleportMachine.init({
        THREE,
        scene: state.root,
        renderer,
        camera,
        player,
        controllers,
        log,
        targets: state.targets
      });
      log?.("[world] teleport_machine ✅");
    }
  }

  // ---------- UI HUD ----------
  function initHUD() {
    if (state.sys.uiHud?.init) {
      state.sys.uiHud.init({ THREE, scene: state.root, camera, player, log });
      log?.("[world] ui_hud ✅");
    }
  }

  // ---------- API ----------
  function setOption(k, v) { state.options[k] = v; }
  function teleport(key) {
    const t = state.targets[key];
    if (!t) return false;
    player.position.set(t.x, 0, t.z);
    return true;
  }

  async function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;
    controllers = ctx.controllers || [];
    log = ctx.log || console.log;

    state.options = { ...state.options, ...(ctx.options || {}) };

    state.root = new THREE.Group();
    state.root.name = "WorldRoot";
    scene.add(state.root);

    await loadModules();

    buildBaseWorld();
    buildRooms();
    buildTableAndPoker();
    buildStore();
    initBotsAndTags();
    initTeleport();
    initHUD();

    // Spawn into VIP by default
    teleport("vipInside");

    log?.("[world] init ✅ MASTER ORCHESTRATOR v7");
  }

  function update({ dt, t }) {
    state.t = t;
    // Let modules tick if they have update()
    state.sys.pokerSim?.update?.({ dt, t });
    state.sys.pokerEngine?.update?.({ dt, t });
    state.sys.bots?.update?.({ dt, t });
    state.sys.storeRoom?.update?.({ dt, t });
    state.sys.teleportMachine?.update?.({ dt, t });
    state.sys.uiHud?.update?.({ dt, t });
  }

  return { init, update, setOption, teleport };
})();
