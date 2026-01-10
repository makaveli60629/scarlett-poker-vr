// /js/world.js — Scarlett VR Poker Hybrid 1.0 (FULL)
// ✅ Old + New combined loader style (optional modules + solid fallback)
// ✅ Lobby + Store + Rail + Scorpion placeholders + Table + Bots + PokerSim wiring if present
// ✅ Chair/seat facing best-effort fix after build
//
// This file is designed so your VR button still appears even if some modules are missing.

const SIG = "WORLD.JS HYBRID 1.0 ACTIVE";

async function safeImport(path, log = console.log) {
  try {
    return await import(path);
  } catch (e) {
    log?.(`[world] (optional) missing ${path}`);
    return null;
  }
}

function makeTextSprite(THREE, text, opts = {}) {
  const {
    font = "700 44px system-ui, -apple-system, Segoe UI, Roboto, Arial",
    pad = 18,
    bg = "rgba(10,12,20,0.65)",
    fg = "#e8ecff",
    radius = 18,
    border = "rgba(127,231,255,0.35)",
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = 88 + pad;
  canvas.width = w;
  canvas.height = h;

  const r = radius;
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.lineTo(w - r, 2);
  ctx.quadraticCurveTo(w - 2, 2, w - 2, r);
  ctx.lineTo(w - 2, h - r);
  ctx.quadraticCurveTo(w - 2, h - 2, w - r, h - 2);
  ctx.lineTo(r, h - 2);
  ctx.quadraticCurveTo(2, h - 2, 2, h - r);
  ctx.lineTo(2, r);
  ctx.quadraticCurveTo(2, 2, r, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = font;
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(Math.max(1.2, w / 260), 0.46, 1);
  spr.renderOrder = 999;

  spr.userData._dispose = () => {
    mat.map?.dispose?.();
    mat.dispose?.();
  };

  return spr;
}

function buildFallback({ THREE, root, log }) {
  const floorGeo = new THREE.PlaneGeometry(90, 90, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.02 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.name = "fallback_floor";
  floor.receiveShadow = true;
  root.add(floor);

  const grid = new THREE.GridHelper(90, 90, 0x223344, 0x111827);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.001;
  root.add(grid);

  const sign = makeTextSprite(THREE, "Scarlett VR Poker — World Loading…", {});
  sign.position.set(0, 2.2, -3.2);
  root.add(sign);

  log?.("[world] fallback built ✅");
  return { floor, grid, sign };
}

function fixChairFacing({ THREE, root, log }) {
  try {
    const chairs = [];
    root.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      if (n.includes("chair") || n.includes("seat") || o.userData?.isSeat) chairs.push(o);
    });
    if (!chairs.length) return log?.("[world] chair fix: none detected");

    // find a table center if present
    let table = null;
    root.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      if (!table && (n.includes("table") || o.userData?.isTable)) table = o;
    });

    const tablePos = new THREE.Vector3();
    if (table) table.getWorldPosition(tablePos);

    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    let adjusted = 0;

    for (const c of chairs) {
      c.getWorldPosition(tmpPos);
      if (table) {
        tmpDir.copy(tablePos).sub(tmpPos);
        tmpDir.y = 0;
        if (tmpDir.lengthSq() > 0.0001) {
          tmpDir.normalize();
          const yaw = Math.atan2(tmpDir.x, tmpDir.z);
          c.rotation.y = yaw;
          adjusted++;
        }
      }
    }

    log?.(`[world] chair fix: processed=${chairs.length} adjusted=${adjusted}`);
  } catch (e) {
    log?.("[world] chair fix failed", e);
  }
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log = console.log, BUILD }) {
    log?.(`[world] init v=${BUILD || "dev"}`);
    log?.(`[world] ✅ LOADER SIGNATURE: ${SIG}`);

    const group = new THREE.Group();
    group.name = "scarlett_world_root";
    scene.add(group);

    const ctx = {
      THREE, scene, renderer, camera, player, controllers, log, BUILD,
      room: "lobby",
      mode: "lobby",
      systems: {},
      PokerSim: null
    };

    // Always build fallback first
    const fallback = buildFallback({ THREE, root: group, log });

    // Rooms
    const rooms = {
      lobby: new THREE.Group(),
      store: new THREE.Group(),
      spectate: new THREE.Group(),
      scorpion: new THREE.Group()
    };
    rooms.lobby.name = "room_lobby";
    rooms.store.name = "room_store";
    rooms.spectate.name = "room_spectate";
    rooms.scorpion.name = "room_scorpion";
    group.add(rooms.lobby, rooms.store, rooms.spectate, rooms.scorpion);

    rooms.lobby.visible = true;
    rooms.store.visible = true;
    rooms.spectate.visible = true;
    rooms.scorpion.visible = false;

    // Optional imports (won’t break boot if missing)
    const q = `?v=${BUILD}`;
    const [
      texturesMod,
      lightsPackMod,
      solidWallsMod,
      tableFactoryMod,
      railMod,
      teleportMachineMod,
      storeMod,
      uiMod,
      scorpionMod,
      roomManagerMod,
      botsMod,
      pokerSimMod
    ] = await Promise.all([
      safeImport(`./textures.js${q}`, log),
      safeImport(`./lights_pack.js${q}`, log),
      safeImport(`./solid_walls.js${q}`, log),
      safeImport(`./table_factory.js${q}`, log),
      safeImport(`./spectator_rail.js${q}`, log),
      safeImport(`./teleport_machine.js${q}`, log),
      safeImport(`./store.js${q}`, log),
      safeImport(`./ui.js${q}`, log),
      safeImport(`./scorpion_room.js${q}`, log),
      safeImport(`./room_manager.js${q}`, log),
      safeImport(`./bots.js${q}`, log),
      safeImport(`./poker_sim.js${q}`, log),
    ]);

    // Lights pack (optional)
    try {
      if (lightsPackMod?.LightsPack?.init) {
        lightsPackMod.LightsPack.init({ THREE, scene: group, renderer, log, mode: "casino" });
        log?.("[world] ✅ LightsPack loaded");
      }
    } catch (e) { log?.("[world] LightsPack init failed", e); }

    // Texture kit (optional)
    let textureKit = null;
    try {
      if (texturesMod?.createTextureKit) {
        textureKit = await texturesMod.createTextureKit({ THREE, log, BUILD });
        log?.("[world] ✅ TextureKit ready");
      }
    } catch (e) { log?.("[world] TextureKit failed", e); }

    // Solid walls/colliders (optional)
    try {
      if (solidWallsMod?.SolidWalls?.init) {
        solidWallsMod.SolidWalls.init({ THREE, scene: group, log, textureKit });
        log?.("[world] ✅ SolidWalls loaded");
      }
    } catch (e) { log?.("[world] SolidWalls init failed", e); }

    // Teleport machine (optional)
    try {
      if (teleportMachineMod?.TeleportMachine?.init) {
        ctx.systems.teleportMachine = teleportMachineMod.TeleportMachine.init({
          THREE,
          scene: rooms.lobby,
          renderer,
          camera,
          player,
          controllers,
          log,
          textureKit
        });
        log?.("[world] ✅ TeleportMachine loaded");
      }
    } catch (e) { log?.("[world] TeleportMachine init failed", e); }

    // Rail (optional)
    try {
      if (railMod?.SpectatorRail?.init) {
        ctx.systems.rail = railMod.SpectatorRail.init({
          THREE,
          scene: rooms.spectate,
          log,
          textureKit
        });
        log?.("[world] ✅ SpectatorRail loaded");
      }
    } catch (e) { log?.("[world] SpectatorRail init failed", e); }

    // Store (optional)
    try {
      if (storeMod?.StoreSystem?.init) {
        ctx.systems.store = storeMod.StoreSystem;
        storeMod.StoreSystem.init({
          THREE,
          scene: rooms.store,
          world: { group },
          player,
          camera,
          log
        });
        log?.("[world] ✅ StoreSystem loaded");
      }
    } catch (e) { log?.("[world] StoreSystem init failed", e); }

    // Scorpion room (optional)
    try {
      if (scorpionMod?.ScorpionRoom?.init) {
        ctx.systems.scorpion = scorpionMod.ScorpionRoom;
        scorpionMod.ScorpionRoom.init({
          THREE,
          scene: rooms.scorpion,
          renderer,
          camera,
          player,
          controllers,
          log,
          textureKit
        });
        log?.("[world] ✅ ScorpionRoom loaded");
      }
    } catch (e) { log?.("[world] ScorpionRoom init failed", e); }

    // Table (factory if present, otherwise fallback)
    const tableRoot = new THREE.Group();
    tableRoot.name = "poker_table_root";
    rooms.lobby.add(tableRoot);

    let table = null;
    try {
      if (tableFactoryMod?.TableFactory?.create) {
        table = await tableFactoryMod.TableFactory.create({
          THREE,
          scene: tableRoot,
          log,
          textureKit,
          variant: "round_8"
        });
        log?.("[world] ✅ TableFactory created table");
      }
    } catch (e) { log?.("[world] TableFactory failed", e); }

    if (!table) {
      const base = new THREE.Group();
      base.name = "simple_table";
      base.userData.isTable = true;
      tableRoot.add(base);

      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.35, 0.12, 64),
        new THREE.MeshStandardMaterial({ color: 0x102a1c, roughness: 0.95, metalness: 0.02 })
      );
      top.position.y = 0.82;

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.08, 16, 64),
        new THREE.MeshStandardMaterial({ color: 0x20202a, roughness: 0.55, metalness: 0.15 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.86;

      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.32, 0.8, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: 0.85, metalness: 0.08 })
      );
      leg.position.y = 0.4;

      base.add(top, rim, leg);

      // seats as markers
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const seat = new THREE.Object3D();
        seat.name = `seat_${i}`;
        seat.userData.isSeat = true;
        seat.position.set(Math.sin(a) * 1.9, 0, Math.cos(a) * 1.9);
        seat.lookAt(0, 0, 0);
        base.add(seat);
      }

      table = { root: base, seats: base.children.filter(o => o.userData?.isSeat), isFallback: true };
      log?.("[world] table fallback built ✅");
    }

    // PokerSim (optional)
    try {
      if (pokerSimMod?.PokerSim?.init) {
        ctx.PokerSim = pokerSimMod.PokerSim;
        pokerSimMod.PokerSim.init({
          THREE,
          scene: tableRoot,
          table,
          player,
          camera,
          controllers,
          log,
          textureKit
        });
        log?.("[world] ✅ PokerSim loaded");
      }
    } catch (e) { log?.("[world] PokerSim init failed", e); }

    // Bots (optional)
    try {
      if (botsMod?.Bots?.init) {
        ctx.systems.bots = botsMod.Bots;
        botsMod.Bots.init({
          THREE,
          scene: rooms.lobby,
          player,
          camera,
          log,
          textureKit,
          rail: ctx.systems.rail,
          table
        });
        log?.("[world] ✅ Bots loaded");
      }
    } catch (e) { log?.("[world] Bots init failed", e); }

    // UI (optional)
    try {
      if (uiMod?.UI?.init) {
        ctx.systems.ui = uiMod.UI;
        uiMod.UI.init({
          THREE,
          scene: group,
          renderer,
          camera,
          player,
          controllers,
          log,
          textureKit
        });
        log?.("[world] ✅ UI loaded");
      }
    } catch (e) { log?.("[world] UI init failed", e); }

    // RoomManager (optional)
    try {
      if (roomManagerMod?.RoomManager?.init) {
        ctx.systems.roomManager = roomManagerMod.RoomManager;
        roomManagerMod.RoomManager.init(ctx);
        log?.("[world] ✅ RoomManager loaded");
      }
    } catch (e) { log?.("[world] RoomManager init failed", e); }

    // Chair facing fix after everything placed
    fixChairFacing({ THREE, root: group, log });

    // Replace fallback sign with READY sign
    try {
      if (fallback.sign) {
        fallback.sign.userData._dispose?.();
        group.remove(fallback.sign);
      }
      const ready = makeTextSprite(THREE, "World Ready ✅ (Hybrid 1.0)", {
        bg: "rgba(10,12,20,0.55)",
        border: "rgba(255,45,122,0.35)"
      });
      ready.position.set(0, 2.2, -3.2);
      rooms.lobby.add(ready);
      ctx.systems._readySign = ready;
    } catch {}

    const world = {
      group,
      ctx,
      rooms,
      table,
      textureKit,

      setRoom(room) {
        ctx.room = room;
        ctx.mode = room;
        const isScorpion = room === "scorpion";

        rooms.scorpion.visible = isScorpion;
        rooms.lobby.visible = !isScorpion;
        rooms.store.visible = !isScorpion;
        rooms.spectate.visible = !isScorpion;

        try { ctx.systems.scorpion?.setActive?.(isScorpion); } catch {}
        try { ctx.systems.store?.setActive?.(!isScorpion); } catch {}

        try {
          if (ctx.PokerSim?.setMode) ctx.PokerSim.setMode(isScorpion ? "scorpion_play" : "lobby_demo");
        } catch {}

        try { ctx.systems.roomManager?.setRoom?.(ctx, room); } catch {}

        log?.(`[world] setRoom -> ${room}`);
      },

      update(dt) {
        try { ctx.systems.teleportMachine?.update?.(dt); } catch {}
        try { ctx.systems.store?.update?.(dt); } catch {}
        try { ctx.systems.scorpion?.update?.(dt); } catch {}
        try { ctx.systems.bots?.update?.(dt); } catch {}
        try { ctx.PokerSim?.update?.(dt); } catch {}
        try { ctx.systems.ui?.update?.(dt); } catch {}

        const s = ctx.systems._readySign;
        if (s) s.position.y = 2.18 + Math.sin(performance.now() * 0.0013) * 0.03;
      },

      dispose() {
        try { ctx.systems.store?.dispose?.(); } catch {}
        try { ctx.systems.scorpion?.dispose?.(); } catch {}
        try { ctx.systems.teleportMachine?.dispose?.(); } catch {}
        try { ctx.systems.bots?.dispose?.(); } catch {}
        try { ctx.PokerSim?.dispose?.(); } catch {}
        try { ctx.systems.ui?.dispose?.(); } catch {}

        try {
          group.traverse((o) => {
            if (o.userData?._dispose) o.userData._dispose();
            if (o.geometry) o.geometry.dispose?.();
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
              else o.material.dispose?.();
            }
          });
        } catch {}
        scene.remove(group);
      }
    };

    // default room
    world.setRoom("lobby");
    log?.("[world] ready ✅");
    return world;
  }
};
