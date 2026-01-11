// /js/world.js — Scarlett VR Poker HybridWorld RESTORE 1.6 (FULL)
// ✅ Restores YOUR world: circular lobby + spawn area + store + scorpion + decor + teleport + bots + poker + room manager
// ✅ Android movement: TouchControls + keyboard
// ✅ SAFE SPAWN: raycasts down, prevents spawning under/inside geometry
// ✅ 2D PANEL KILLER: removes any camera-attached panel/HUD/menu every frame (non-XR)
// ✅ Modular: if a module is missing, it logs and continues (won't black screen)

import { TouchControls } from "./touch_controls.js";

export const HybridWorld = (() => {
  const state = {
    THREE: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    scene: null,
    clock: null,

    OPTS: {
      nonvrControls: true,
      allowTeleport: true,
      allowBots: true,
      allowPoker: true,
      safeMode: false
    },

    root: null,
    floor: null,

    systems: {},
    mods: {},

    // spawn defaults (SpawnPoints can override)
    spawn: { x: 0, y: 0, z: 26 },
    facing: { x: 0, y: 1.5, z: 0 },

    __betTimer: 0
  };

  const safeLog = (...a) => { try { state.log?.(...a); } catch(e) {} };

  async function tryImport(path) {
    try {
      const mod = await import(path);
      safeLog("[world] import ok:", path);
      return mod;
    } catch (e) {
      safeLog("[world] import FAIL:", path, e?.message || e);
      return null;
    }
  }

  function disposeObject3D(obj) {
    if (!obj) return;
    try {
      obj.traverse?.((o) => {
        if (o.geometry?.dispose) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.());
          else o.material?.dispose?.();
        }
      });
    } catch(e) {}
  }

  // ✅ Kills any 3D face panel in 2D (Android/Desktop)
  function killFacePanels2D() {
    if (state.renderer?.xr?.isPresenting) return;
    const cam = state.camera;
    if (!cam) return;

    for (let i = cam.children.length - 1; i >= 0; i--) {
      const ch = cam.children[i];
      const n = (ch?.name || "").toLowerCase();
      if (n.includes("vrpanel") || n.includes("panel") || n.includes("hud") || n.includes("menu") || n.includes("uipanel")) {
        try { cam.remove(ch); } catch(e) {}
        try { disposeObject3D(ch); } catch(e) {}
      }
    }

    try {
      cam.traverse?.((o) => {
        if (typeof o?.userData?.label === "string") {
          try { o.parent?.remove(o); } catch(e) {}
          try { disposeObject3D(o); } catch(e) {}
        }
      });
    } catch(e) {}
  }

  function makeBaseScene() {
    const THREE = state.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    // landmark so never-black
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    scene.add(ring);

    return scene;
  }

  function ensureRoot() {
    const THREE = state.THREE;
    if (state.root && state.root.parent === state.scene) return state.root;
    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;
    return root;
  }

  // ✅ Best spawn fix: raycast down to floor; never under map
  function safeSpawn(reason = "post-build") {
    const { THREE, scene, player, camera } = state;
    if (!THREE || !scene || !player || !camera) return;

    const x = Number.isFinite(state.spawn?.x) ? state.spawn.x : 0;
    const z = Number.isFinite(state.spawn?.z) ? state.spawn.z : 26;
    const eye = 1.65;

    let floorY = 0;
    try {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, 50, z),
        new THREE.Vector3(0, -1, 0),
        0,
        200
      );

      const hits = ray.intersectObjects(scene.children, true);
      let best = null;
      for (const h of hits) {
        const name = (h.object?.name || "").toLowerCase();
        if (name.includes("floor")) { best = h; break; }
        // accept other geometry if no floor tag
        best = best || h;
      }
      if (best) floorY = best.point.y;
    } catch(e){}

    player.position.set(x, floorY + 0.02, z);
    camera.position.set(0, eye, 0);

    // face lobby center
    try {
      const target = new THREE.Vector3(0, eye, 0);
      const camWorld = new THREE.Vector3();
      camera.getWorldPosition(camWorld);
      const dir = target.sub(camWorld).normalize();
      player.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    } catch(e){}

    safeLog(`[spawn] SAFE ✅ (${reason}) x=${x.toFixed(2)} y=${player.position.y.toFixed(2)} z=${z.toFixed(2)}`);
  }

  function attachHandsToRig() {
    try {
      const L = state.controllers?.handLeft;
      const R = state.controllers?.handRight;
      if (L && L.parent !== state.player) state.player.add(L);
      if (R && R.parent !== state.player) state.player.add(R);
    } catch(e) {}
  }

  function installNonVRControls() {
    if (state.systems.nonvr?.__installed) return;

    const { camera, player } = state;
    const keys = new Set();

    let dragging = false;
    let lastX = 0, lastY = 0;
    let yaw = player.rotation.y || 0;
    let pitch = camera.rotation.x || 0;

    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    window.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; }, { passive:true });
    window.addEventListener("pointerup", () => { dragging = false; }, { passive:true });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      player.rotation.y = yaw;
      camera.rotation.x = pitch;
    }, { passive:true });

    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

    const touchAPI = {
      toggleDebug: () => document.getElementById("overlay")?.classList.toggle("min"),
      toggleHUD: () => {
        const hud = document.getElementById("hudTop") || document.getElementById("hud");
        if (hud) hud.style.display = (hud.style.display === "none" ? "" : "none");
        else document.getElementById("overlay")?.classList.toggle("hide");
      },
      gotoTable: () => { player.position.set(0, player.position.y, 4.2); player.rotation.set(0, Math.PI, 0); },
      respawn: () => safeSpawn("touch"),
      safeMode: () => {
        state.OPTS.safeMode = true;
        state.OPTS.allowBots = false;
        state.OPTS.allowPoker = false;
        state.OPTS.allowTeleport = false;
        safeLog("[touch] SAFE MODE ✅");
      }
    };

    if (isTouch) {
      try {
        TouchControls.init({ THREE: state.THREE, player, camera, log: state.log, api: touchAPI });
        state.systems.__touch = TouchControls;
        safeLog("[touch] init ✅");
      } catch (e) {
        safeLog("[touch] init FAIL", e?.message || e);
      }
    }

    state.systems.nonvr = {
      __installed: true,
      update(dt) {
        if (state.renderer?.xr?.isPresenting) return;

        // Touch movement
        let moveX = 0, moveY = 0;
        try {
          const out = state.systems.__touch?.update?.(dt);
          if (out) { moveX = out.moveX || 0; moveY = out.moveY || 0; }
        } catch(e){}

        // Keyboard movement
        const fwdKB = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
        const strKB = (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

        const fwd = moveY + fwdKB;
        const str = moveX + strKB;
        if (!fwd && !str) return;

        const speed = (keys.has("ShiftLeft") ? 6 : 3) * dt;

        const dir = new state.THREE.Vector3();
        player.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        const right = new state.THREE.Vector3(dir.z, 0, -dir.x);
        player.position.addScaledVector(dir, fwd * speed);
        player.position.addScaledVector(right, str * speed);
      }
    };
  }

  async function buildYourWorld() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // clear root
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // imports (your world modules)
    const lightsPackMod    = await tryImport("./lights_pack.js");
    const solidWallsMod    = await tryImport("./solid_walls.js");
    const spectatorRailMod = await tryImport("./spectator_rail.js");
    const storeMod         = await tryImport("./store.js");
    const scorpionMod      = await tryImport("./scorpion_room.js");
    const spawnPointsMod   = await tryImport("./spawn_points.js");

    const bossTableMod     = await tryImport("./boss_table.js");
    const tableFactoryMod  = await tryImport("./table_factory.js");

    const botsMod          = await tryImport("./bots.js");
    const pokerSimMod      = await tryImport("./poker_sim.js");
    const roomMgrMod       = await tryImport("./room_manager.js");

    const tpMachineMod     = await tryImport("./teleport_machine.js");
    const tpMod            = await tryImport("./teleport.js");

    const lobbyDecorMod    = await tryImport("./lobby_decor.js");

    state.mods = {
      lightsPackMod, solidWallsMod, spectatorRailMod, storeMod, scorpionMod, spawnPointsMod,
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod, roomMgrMod, tpMachineMod, tpMod,
      lobbyDecorMod
    };

    // SpawnPoints (if present)
    try {
      const SP = spawnPointsMod?.SpawnPoints || spawnPointsMod?.default;
      if (SP?.lobby) {
        state.spawn.x = SP.lobby.x ?? state.spawn.x;
        state.spawn.y = SP.lobby.y ?? state.spawn.y;
        state.spawn.z = SP.lobby.z ?? state.spawn.z;
      }
      if (SP?.facing) {
        state.facing.x = SP.facing.x ?? state.facing.x;
        state.facing.y = SP.facing.y ?? state.facing.y;
        state.facing.z = SP.facing.z ?? state.facing.z;
      }
      safeLog("[spawn] SpawnPoints applied ✅");
    } catch(e){}

    // LightsPack
    try {
      const LP = lightsPackMod?.LightsPack || lightsPackMod?.default;
      if (LP?.init) {
        state.systems.lights = LP.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[lights] LightsPack ✅");
      }
    } catch(e){ safeLog("[lights] FAIL", e?.message || e); }

    // SolidWalls (your lobby/hallways)
    try {
      const SW = solidWallsMod?.SolidWalls || solidWallsMod?.default;
      if (SW?.init) {
        state.systems.walls = SW.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[walls] SolidWalls ✅");
      }
    } catch(e){ safeLog("[walls] FAIL", e?.message || e); }

    // LobbyDecor (circular lobby visuals)
    try {
      const Decor = lobbyDecorMod?.LobbyDecor || lobbyDecorMod?.default;
      if (Decor?.init) {
        state.systems.decor = Decor.init({ THREE, root, log: state.log });
        safeLog("[decor] LobbyDecor ✅");
      }
    } catch(e){ safeLog("[decor] FAIL", e?.message || e); }

    // StoreSystem
    try {
      const StoreSystem = storeMod?.StoreSystem || storeMod?.default;
      if (StoreSystem?.init) {
        state.systems.store = StoreSystem.init({
          THREE, scene: state.scene, root,
          world: { root }, player: state.player, camera: state.camera,
          log: state.log
        });
        safeLog("[store] StoreSystem ✅");
      }
    } catch(e){ safeLog("[store] FAIL", e?.message || e); }

    // Scorpion room
    try {
      const ScorpionRoom = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (ScorpionRoom?.init) {
        state.systems.scorpion = ScorpionRoom.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[scorpion] ✅");
      }
    } catch(e){ safeLog("[scorpion] FAIL", e?.message || e); }

    // SpectatorRail
    try {
      const SR = spectatorRailMod?.SpectatorRail || spectatorRailMod?.default;
      if (SR?.init) {
        state.systems.spectator = SR.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[spectator] ✅");
      }
    } catch(e){ safeLog("[spectator] FAIL", e?.message || e); }

    // Table: prefer BossTable then TableFactory
    let tableObj = null;

    try {
      const BossTable = bossTableMod?.BossTable || bossTableMod?.default;
      if (BossTable?.init) {
        tableObj = await BossTable.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable ✅");
      }
    } catch(e){ safeLog("[table] BossTable FAIL", e?.message || e); }

    if (!tableObj) {
      try {
        const TF = tableFactoryMod?.TableFactory || tableFactoryMod?.default;
        if (TF?.create) {
          tableObj = await TF.create({ THREE, root, log: state.log });
          safeLog("[table] TableFactory ✅");
        }
      } catch(e){ safeLog("[table] TableFactory FAIL", e?.message || e); }
    }

    if (!tableObj) {
      // only if both missing
      tableObj = new THREE.Mesh(
        new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      tableObj.position.set(0, 1.05, 0);
      tableObj.name = "FallbackTable";
      root.add(tableObj);
      safeLog("[table] fallback placeholder (missing BossTable/TableFactory)");
    }

    // Teleport
    if (!state.OPTS.safeMode && state.OPTS.allowTeleport) {
      try {
        const TP = tpMachineMod?.TeleportMachine || tpMachineMod?.default || tpMod?.Teleport || tpMod?.default;
        if (TP?.init) {
          state.systems.teleport = await TP.init({
            THREE,
            scene: state.scene,
            renderer: state.renderer,
            camera: state.camera,
            player: state.player,
            controllers: state.controllers,
            log: state.log,
            world: { floor: state.floor, root }
          });
          safeLog("[teleport] ✅");
        }
      } catch(e){ safeLog("[teleport] FAIL", e?.message || e); }
    }

    // Bots
    if (!state.OPTS.safeMode && state.OPTS.allowBots && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({ THREE, scene: state.scene, root, player: state.player, log: state.log });
        safeLog("[bots] ✅");
      } catch(e){ safeLog("[bots] FAIL", e?.message || e); }
    }

    // Poker
    if (!state.OPTS.safeMode && state.OPTS.allowPoker && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera,
          log: state.log
        });
        safeLog("[poker] ✅");
      } catch(e){ safeLog("[poker] FAIL", e?.message || e); }
    }

    // Room manager
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
        safeLog("[rm] ✅");
      } catch(e){ safeLog("[rm] FAIL", e?.message || e); }
    }

    safeLog("[world] YOUR world restored ✅");
  }

  return {
    async build({ THREE, renderer, camera, player, controllers, log, OPTS }) {
      state.THREE = THREE;
      state.renderer = renderer;
      state.camera = camera;
      state.player = player;
      state.controllers = controllers;
      state.log = log || console.log;
      state.OPTS = { ...state.OPTS, ...(OPTS || {}) };

      state.clock = new THREE.Clock();

      state.scene = makeBaseScene();
      if (!state.scene.children.includes(player)) state.scene.add(player);

      attachHandsToRig();

      if (state.OPTS.nonvrControls !== false) installNonVRControls();

      // remove any stuck 3D panel in 2D immediately
      killFacePanels2D();

      await buildYourWorld();

      // ✅ safest: apply safe spawn AFTER build (prevents spawning inside new geometry)
      safeSpawn("post-build");

      safeLog("[world] build complete ✅");
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;

      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // always kill face panels in 2D
      killFacePanels2D();

      // auto-unstuck if we fall under map in 2D
      if (!state.renderer?.xr?.isPresenting) {
        const y = state.player?.position?.y;
        if (!Number.isFinite(y) || y < -5) safeSpawn("auto-unstuck");
      }

      try { state.systems.nonvr?.update?.(dt); } catch(e) {}
      try { state.systems.store?.update?.(dt); } catch(e) {}
      try { state.systems.decor?.update?.(dt); } catch(e) {}
      try { state.systems.scorpion?.update?.(dt); } catch(e) {}
      try { state.systems.spectator?.update?.(dt); } catch(e) {}

      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
