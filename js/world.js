// /js/world.js — Scarlett VR Poker — NEW WORLD HYBRID v12.0 (FULL)
// ✅ Combines “old + new” world data: lobby + store + rail + scorpion room + poker table(s) + bots + teleport + UI
// ✅ GitHub Pages safe (ESM). Uses optional/dynamic imports and hard fallbacks.
// ✅ Auto-fixes chair/seat facing after load (best-effort).
// ✅ Exposes a clean ctx for main.js: world.group, world.ctx, world.update(), world.dispose()
// ✅ RoomManager supported (lobby/store/spectate/scorpion) if present.
//
// Usage from main.js (example):
//   const world = await World.init({ THREE, scene, renderer, camera, player, controllers, log, BUILD });
//   // in your render loop: world.update(dt)
//
// Notes:
// - If a module is missing, this world still boots via fallback.
// - This file assumes your project has a local three wrapper imported in main.js.
// - Keep your other systems as-is; this tries to wire them up if they exist.

const SIG = "WORLD.JS HYBRID v12.0 ACTIVE";

async function safeImport(path, log = console.log) {
  try {
    const mod = await import(`${path}`);
    return mod;
  } catch (e) {
    log?.(`[world] (optional) missing ${path}`);
    return null;
  }
}

function now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

function setMat(mesh, mat) {
  if (!mesh) return;
  if (mesh.material && Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m && (m.dispose?.(), 0));
  } else if (mesh.material) {
    mesh.material.dispose?.();
  }
  mesh.material = mat;
}

function makeTextSprite(THREE, text, opts = {}) {
  const {
    font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Arial",
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
  const h = 80 + pad;
  canvas.width = w;
  canvas.height = h;

  // rounded rect
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
  spr.scale.set(Math.max(1.2, w / 260), 0.42, 1);
  spr.renderOrder = 999;

  spr.userData._dispose = () => {
    mat.map?.dispose?.();
    mat.dispose?.();
  };

  return spr;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function fixChairFacing({ THREE, root, log }) {
  // Best-effort:
  // - Find objects likely to be chairs / seats and rotate them to face table center if they have a "seat" tag,
  //   OR rotate 180° if they look backward (heuristic).
  // - This is intentionally conservative.
  try {
    const chairs = [];
    root.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      if (n.includes("chair") || n.includes("seat") || o.userData?.isSeat) chairs.push(o);
    });

    if (!chairs.length) {
      log?.("[world] chair fix: none detected");
      return;
    }

    // Determine "table center" if any mesh named table exists
    let table = null;
    root.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      if (!table && (n.includes("table") || o.userData?.isTable)) table = o;
    });

    const tablePos = new THREE.Vector3();
    if (table) table.getWorldPosition(tablePos);

    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const fwd = new THREE.Vector3(0, 0, -1);

    let fixed = 0;

    for (const c of chairs) {
      c.getWorldPosition(tmpPos);

      // If we have a table, face it
      if (table) {
        tmpDir.copy(tablePos).sub(tmpPos);
        tmpDir.y = 0;
        if (tmpDir.lengthSq() > 0.0001) {
          tmpDir.normalize();
          // compute desired yaw so chair -Z faces tmpDir
          const yaw = Math.atan2(tmpDir.x, tmpDir.z); // yaw in radians
          c.rotation.y = yaw;
          fixed++;
          continue;
        }
      }

      // Otherwise, heuristic: flip 180 if its forward is mostly pointing +Z (common “backwards” symptom)
      const wq = c.getWorldQuaternion(new THREE.Quaternion());
      const wf = fwd.clone().applyQuaternion(wq);
      if (wf.z > 0.35) {
        c.rotation.y += Math.PI;
        fixed++;
      }
    }

    log?.(`[world] chair fix: processed=${chairs.length} adjusted=${fixed}`);
  } catch (e) {
    log?.("[world] chair fix failed", e);
  }
}

function buildFallbackWorld({ THREE, group, log }) {
  // Simple “old world” fallback: floor + walls + light + sign
  const floorGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.92, metalness: 0.02 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  floor.name = "fallback_floor";
  group.add(floor);

  const grid = new THREE.GridHelper(80, 80, 0x223344, 0x111827);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.001;
  group.add(grid);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x080812, 0.9);
  hemi.position.set(0, 12, 0);
  group.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(10, 18, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  group.add(dir);

  const sign = makeTextSprite(THREE, "Scarlett VR Poker — Loading World…", {});
  sign.position.set(0, 2.2, -3.2);
  group.add(sign);

  log?.("[world] fallback built ✅");
  return { floor, sign, hemi, dir, grid };
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log = console.log, BUILD }) {
    const t0 = now();
    log?.(`[world] init v=${BUILD || "dev"}`);
    log?.(`[world] ✅ LOADER SIGNATURE: ${SIG}`);

    // Root group for everything in-world
    const group = new THREE.Group();
    group.name = "scarlett_world_root";
    scene.add(group);

    // Context shared with systems
    const ctx = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log,
      BUILD,
      mode: "lobby",
      room: "lobby",
      world: null,
      systems: {},
      PokerSim: null,
      clock: { t: 0, dt: 0, last: now() },
      // convenience
      setMode: (m) => (ctx.mode = m),
      setRoom: (r) => (ctx.room = r),
    };

    // Always build a fallback base immediately (old behavior)
    const fallback = buildFallbackWorld({ THREE, group, log });

    // Optional modules (new behavior)
    const [
      texturesMod,
      lightsMod,
      wallsMod,
      tableFactoryMod,
      railMod,
      teleportMachineMod,
      storeMod,
      uiMod,
      vrUiMod,
      vrUiPanelMod,
      scorpionMod,
      roomManagerMod,
      botsMod,
      pokerSimMod,
      spawnPointsMod,
      teleportMod,
      solidWallsMod
    ] = await Promise.all([
      safeImport(`./textures.js?v=${BUILD}`, log),
      safeImport(`./lights_pack.js?v=${BUILD}`, log),
      safeImport(`./walls.js?v=${BUILD}`, log), // legacy/optional
      safeImport(`./table_factory.js?v=${BUILD}`, log),
      safeImport(`./spectator_rail.js?v=${BUILD}`, log),
      safeImport(`./teleport_machine.js?v=${BUILD}`, log),
      safeImport(`./store.js?v=${BUILD}`, log),
      safeImport(`./ui.js?v=${BUILD}`, log),
      safeImport(`./vr_ui.js?v=${BUILD}`, log),
      safeImport(`./vr_ui_panel.js?v=${BUILD}`, log),
      safeImport(`./scorpion_room.js?v=${BUILD}`, log),
      safeImport(`./room_manager.js?v=${BUILD}`, log),
      safeImport(`./bots.js?v=${BUILD}`, log),
      safeImport(`./poker_sim.js?v=${BUILD}`, log),
      safeImport(`./spawn_points.js?v=${BUILD}`, log),
      safeImport(`./teleport.js?v=${BUILD}`, log), // simple teleport fallback/alt
      safeImport(`./solid_walls.js?v=${BUILD}`, log),
    ]);

    // Apply nicer lighting if available (new)
    try {
      if (lightsMod?.LightsPack?.init) {
        lightsMod.LightsPack.init({ THREE, scene: group, renderer, log, mode: "casino" });
        log?.("[world] ✅ LightsPack loaded");
        // If we have a lights pack, dim fallback lights a bit
        if (fallback.hemi) fallback.hemi.intensity = 0.35;
        if (fallback.dir) fallback.dir.intensity = 0.45;
      }
    } catch (e) {
      log?.("[world] LightsPack init failed", e);
    }

    // Texture kit (for felt/chips/walls etc.) if available
    let textureKit = null;
    try {
      if (texturesMod?.createTextureKit) {
        textureKit = await texturesMod.createTextureKit({ THREE, log, BUILD });
        log?.("[world] ✅ TextureKit ready");
      }
    } catch (e) {
      log?.("[world] TextureKit failed", e);
    }

    // Solid walls/colliders (if you have them)
    try {
      const SolidWalls = solidWallsMod?.SolidWalls || wallsMod?.SolidWalls;
      if (SolidWalls?.init) {
        SolidWalls.init({ THREE, scene: group, log, textureKit });
        log?.("[world] ✅ SolidWalls loaded");
      }
    } catch (e) {
      log?.("[world] SolidWalls init failed", e);
    }

    // Build “new” world layout elements (lobby/store/rail/scorpion)
    // We’ll add them to `group` and label them for room switching.
    const rooms = {
      lobby: new THREE.Group(),
      store: new THREE.Group(),
      scorpion: new THREE.Group(),
      spectate: new THREE.Group(),
    };
    rooms.lobby.name = "room_lobby";
    rooms.store.name = "room_store";
    rooms.scorpion.name = "room_scorpion";
    rooms.spectate.name = "room_spectate";
    group.add(rooms.lobby, rooms.store, rooms.scorpion, rooms.spectate);

    // Default room visibility (start lobby)
    rooms.lobby.visible = true;
    rooms.store.visible = true;     // store kiosk lives in lobby space often
    rooms.spectate.visible = true;  // rail visible in lobby
    rooms.scorpion.visible = false; // off until entered

    // Spawn points (optional)
    try {
      if (spawnPointsMod?.SpawnPoints?.init) {
        ctx.systems.spawn = spawnPointsMod.SpawnPoints.init({ THREE, scene: group, log });
        log?.("[world] ✅ SpawnPoints loaded");
      }
    } catch (e) {
      log?.("[world] SpawnPoints init failed", e);
    }

    // Teleport machine (preferred “new”)
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
          textureKit,
        });
        log?.("[world] ✅ TeleportMachine loaded");
      }
    } catch (e) {
      log?.("[world] TeleportMachine init failed", e);
    }

    // Simple teleport fallback (older)
    try {
      if (!ctx.systems.teleportMachine && teleportMod?.Teleport?.init) {
        ctx.systems.teleport = teleportMod.Teleport.init({
          THREE,
          scene: group,
          renderer,
          camera,
          player,
          controllers,
          log,
          world: { group },
        });
        log?.("[world] ✅ Teleport (fallback) loaded");
      }
    } catch (e) {
      log?.("[world] Teleport fallback init failed", e);
    }

    // Spectator rail (optional)
    try {
      if (railMod?.SpectatorRail?.init) {
        ctx.systems.rail = railMod.SpectatorRail.init({
          THREE,
          scene: rooms.spectate,
          log,
          textureKit,
        });
        log?.("[world] ✅ SpectatorRail loaded");
      }
    } catch (e) {
      log?.("[world] SpectatorRail init failed", e);
    }

    // Store system (optional)
    try {
      if (storeMod?.StoreSystem?.init) {
        ctx.systems.store = storeMod.StoreSystem;
        storeMod.StoreSystem.init({
          THREE,
          scene: rooms.store,
          world: { group },
          player,
          camera,
          log,
        });
        log?.("[world] ✅ StoreSystem loaded");
      }
    } catch (e) {
      log?.("[world] StoreSystem init failed", e);
    }

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
          textureKit,
        });
        log?.("[world] ✅ ScorpionRoom loaded");
      }
    } catch (e) {
      log?.("[world] ScorpionRoom init failed", e);
    }

    // Tables + poker sim
    // - If TableFactory exists, create a nice casino table.
    // - Otherwise create a simple placeholder table.
    let table = null;
    let tableRoot = new THREE.Group();
    tableRoot.name = "poker_table_root";
    rooms.lobby.add(tableRoot);

    try {
      if (tableFactoryMod?.TableFactory?.create) {
        table = await tableFactoryMod.TableFactory.create({
          THREE,
          scene: tableRoot,
          log,
          textureKit,
          variant: "round_8", // you can change to "oval_8", "round_6", etc. if your factory supports it
        });
        log?.("[world] ✅ TableFactory created table");
      }
    } catch (e) {
      log?.("[world] TableFactory failed", e);
    }

    if (!table) {
      // old/simple table
      const base = new THREE.Group();
      base.name = "simple_table";
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

      // seat markers (to help chair fixer + poker sim fallback)
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

    // Poker simulation (optional, but we try hard)
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
          textureKit,
        });
        log?.("[world] ✅ PokerSim loaded");
      }
    } catch (e) {
      log?.("[world] PokerSim init failed", e);
    }

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
          // if your bots module uses these:
          rail: ctx.systems.rail,
          table,
        });
        log?.("[world] ✅ Bots loaded");
      }
    } catch (e) {
      log?.("[world] Bots init failed", e);
    }

    // UI systems (optional)
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
          textureKit,
        });
        log?.("[world] ✅ UI loaded");
      }
    } catch (e) {
      log?.("[world] UI init failed", e);
    }

    try {
      if (vrUiMod?.initVRUI) {
        ctx.systems.vrui = vrUiMod.initVRUI({
          THREE,
          scene: group,
          renderer,
          camera,
          player,
          controllers,
          log,
        });
        log?.("[world] ✅ VR UI loaded");
      }
    } catch (e) {
      log?.("[world] VR UI init failed", e);
    }

    try {
      if (vrUiPanelMod?.VRUIPanel?.init) {
        ctx.systems.vrPanel = vrUiPanelMod.VRUIPanel.init({
          THREE,
          scene: group,
          renderer,
          camera,
          player,
          controllers,
          log,
        });
        log?.("[world] ✅ VRUIPanel loaded");
      }
    } catch (e) {
      log?.("[world] VRUIPanel init failed", e);
    }

    // Room manager (optional) — wires teleports / room switching behaviors
    try {
      if (roomManagerMod?.RoomManager?.init) {
        ctx.systems.roomManager = roomManagerMod.RoomManager;
        roomManagerMod.RoomManager.init(ctx);
        log?.("[world] ✅ RoomManager loaded");
      }
    } catch (e) {
      log?.("[world] RoomManager init failed", e);
    }

    // Seat/chair facing fix (best effort) AFTER everything is attached
    fixChairFacing({ THREE, root: group, log });

    // Replace fallback “Loading…” sign once ready
    try {
      if (fallback.sign) {
        fallback.sign.userData._dispose?.();
        group.remove(fallback.sign);
      }
      const ready = makeTextSprite(THREE, "Scarlett VR Poker — World Ready ✅", {
        bg: "rgba(10,12,20,0.55)",
        border: "rgba(255,45,122,0.35)",
      });
      ready.position.set(0, 2.2, -3.2);
      rooms.lobby.add(ready);
      ctx.systems._readySign = ready;
    } catch {}

    // World interface
    const world = {
      group,
      ctx,
      rooms,
      table,
      textureKit,

      setRoom(room) {
        ctx.room = room;
        ctx.mode = room;

        // Visibility / behavior policy:
        // - lobby: show lobby+store+rail; hide scorpion
        // - store: show store area (kept in lobby group here), keep rail on
        // - spectate: show rail, hide scorpion
        // - scorpion: hide lobby/store/rail, show scorpion
        const isScorpion = room === "scorpion";

        rooms.scorpion.visible = isScorpion;
        rooms.lobby.visible = !isScorpion;
        rooms.store.visible = !isScorpion;     // store lives with lobby in this hybrid
        rooms.spectate.visible = !isScorpion;

        // Let your systems react if they support it
        try { ctx.systems.scorpion?.setActive?.(isScorpion); } catch {}
        try { ctx.systems.store?.setActive?.(!isScorpion); } catch {}

        // If you have PokerSim modes, keep lobby demo running unless scorpion wants instant seat play
        try {
          if (ctx.PokerSim?.setMode) {
            ctx.PokerSim.setMode(isScorpion ? "scorpion_play" : "lobby_demo");
          }
        } catch {}

        // RoomManager hook if present
        try { ctx.systems.roomManager?.setRoom?.(ctx, room); } catch {}

        log?.(`[world] setRoom -> ${room}`);
      },

      update(dt = 0) {
        const t = now();
        const c = ctx.clock;
        c.dt = dt || ((t - c.last) / 1000);
        c.last = t;
        c.t += c.dt;

        // Update systems if they have tick/update
        try { ctx.systems.teleportMachine?.update?.(c.dt); } catch {}
        try { ctx.systems.teleport?.update?.(c.dt); } catch {}
        try { ctx.systems.store?.update?.(c.dt); } catch {}
        try { ctx.systems.scorpion?.update?.(c.dt); } catch {}
        try { ctx.systems.bots?.update?.(c.dt); } catch {}
        try { ctx.PokerSim?.update?.(c.dt); } catch {}
        try { ctx.systems.ui?.update?.(c.dt); } catch {}
        try { ctx.systems.vrui?.update?.(c.dt); } catch {}
        try { ctx.systems.vrPanel?.update?.(c.dt); } catch {}

        // Keep “ready” sign gently bobbing
        const s = ctx.systems._readySign;
        if (s) {
          s.position.y = 2.18 + Math.sin(c.t * 1.3) * 0.03;
        }
      },

      dispose() {
        // Best-effort cleanup
        try { ctx.systems.store?.dispose?.(); } catch {}
        try { ctx.systems.scorpion?.dispose?.(); } catch {}
        try { ctx.systems.teleportMachine?.dispose?.(); } catch {}
        try { ctx.systems.teleport?.dispose?.(); } catch {}
        try { ctx.systems.bots?.dispose?.(); } catch {}
        try { ctx.PokerSim?.dispose?.(); } catch {}
        try { ctx.systems.ui?.dispose?.(); } catch {}
        try { ctx.systems.vrui?.dispose?.(); } catch {}
        try { ctx.systems.vrPanel?.dispose?.(); } catch {}

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

    // tie-back
    ctx.world = world;

    // Pick initial room (lobby), but allow RoomManager to override
    world.setRoom(ctx.room || "lobby");

    const t1 = now();
    log?.(`[world] ready ✅ (${Math.round(t1 - t0)}ms)`);

    return world;
  }
};
