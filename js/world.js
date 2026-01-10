// /js/world.js — Scarlett MASTER WORLD v11 (FULL)
// Loads full lobby + store + rail + scorpion room + bots + poker sim.
// Safe: all modules optional; falls back if missing.

import { createTextureKit } from "./textures.js";
import { LightsPack } from "./lights_pack.js";
import { SolidWalls } from "./solid_walls.js";
import { TableFactory } from "./table_factory.js";
import { SpectatorRail } from "./spectator_rail.js";
import { TeleportMachine } from "./teleport_machine.js";
import { StoreSystem } from "./store.js";
import { UI } from "./ui.js";
import { initVRUI } from "./vr_ui.js";
import { VRUIPanel } from "./vr_ui_panel.js";
import { ScorpionRoom } from "./scorpion_room.js";
import { RoomManager } from "./room_manager.js";
import { Bots } from "./bots.js";
import { PokerSim } from "./poker_sim.js";
import { SpawnPoints } from "./spawn_points.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const ctx = {
      THREE, scene, renderer, camera, player, controllers, log,
      BUILD,
      colliders: [],
      anchors: {},        // named points in world
      beacons: {},        // named visual markers
      spawns: {},         // spawn registry
      mode: "lobby",
      tables: {},         // table refs
      systems: {},        // store/ui/etc
    };

    log?.(`[world] ✅ LOADER SIGNATURE: WORLD.JS V11 MASTER ACTIVE`);

    // ---- fallback floor ----
    this._buildBaseFloor(ctx);

    // ---- textures kit ----
    try {
      ctx.textures = createTextureKit({ THREE, renderer, base: "./assets/textures/", log });
      log?.("[world] ✅ mounted textures via createTextureKit()");
    } catch (e) {
      log?.("[world] ⚠️ textures kit failed: " + (e?.message || e));
    }

    // ---- lights ----
    await safeCall("lights_pack.js.LightsPack.build", () => LightsPack.build(ctx), log);

    // ---- walls/colliders ----
    await safeCall("solid_walls.js.SolidWalls.build", () => SolidWalls.build(ctx), log);

    // ---- table factory (creates lobby demo table) ----
    await safeCall("table_factory.js.TableFactory.build", async () => {
      const out = await TableFactory.build(ctx);
      // Convention: TableFactory should set ctx.tables.lobby
      if (!ctx.tables.lobby && out?.lobby) ctx.tables.lobby = out.lobby;
    }, log);

    // ---- spectator rail ----
    await safeCall("spectator_rail.js.SpectatorRail.build", async () => {
      const rail = await SpectatorRail.build(ctx);
      if (rail) {
        rail.name = rail.name || "SPECTATOR_RAIL";
        ctx.rail = rail;
      }
    }, log);

    // ---- teleport machine ----
    await safeCall("teleport_machine.js.TeleportMachine.init", () => TeleportMachine.init(ctx), log);

    // ---- store ----
    await safeCall("store.js.StoreSystem.init", async () => {
      const store = await StoreSystem.init(ctx);
      ctx.systems.store = store || ctx.systems.store;
      // Add a beacon you can see from spawn
      addBeacon(ctx, "STORE", new THREE.Vector3(4.5, 1.9, -3.5));
    }, log);

    // ---- spawn pads ----
    await safeCall("spawn_points.js.SpawnPoints.build", () => {
      SpawnPoints.build({ THREE, scene, world: ctx, log });
      // Hard anchors (for teleport + room swaps)
      ctx.anchors.lobby_spawn   = new THREE.Vector3(0, 0, 3.2);
      ctx.anchors.store_spawn   = new THREE.Vector3(4.5, 0, -3.5);
      ctx.anchors.spectator     = new THREE.Vector3(0, 0, -3.0);
      ctx.anchors.table_seat_1  = new THREE.Vector3(0, 0, 0.95);
      ctx.anchors.scorpion_gate = new THREE.Vector3(8.0, 0, 0.0); // where the scorpion room entry sits
    }, log);

    // ---- scorpion room ----
    await safeCall("scorpion_room.js.ScorpionRoom.build", async () => {
      const sc = await ScorpionRoom.build(ctx);
      ctx.systems.scorpion = sc || ctx.systems.scorpion;
    }, log);

    // ---- UI + VR UI ----
    await safeCall("ui.js.UI.init", () => UI.init(ctx), log);
    await safeCall("vr_ui.js.initVRUI", () => initVRUI(ctx), log);
    await safeCall("vr_ui_panel.js.VRUIPanel.init", () => VRUIPanel.init(ctx), log);

    // ---- rooms ----
    await safeCall("room_manager.js.RoomManager.init", () => RoomManager.init(ctx), log);

    // ---- bots ----
    await safeCall("bots.js.Bots.init", () => Bots.init(ctx), log);

    // ---- poker sim ----
    await safeCall("poker_sim.js.PokerSim.init", () => PokerSim.init(ctx), log);

    // ---- final master layout lock (store + signage + rail visibility) ----
    this._forceMasterLayout(ctx);

    log?.(`[world] ✅ REAL WORLD LOADED (mounted=MASTER)`);
    log?.(`[world] init complete ✅`);
    return ctx;
  },

  _buildBaseFloor(ctx) {
    const { THREE, scene } = ctx;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1.0, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "FLOOR";
    scene.add(floor);
  },

  _forceMasterLayout(ctx) {
    const { THREE, scene, log } = ctx;

    // Store placement lock
    const store = scene.getObjectByName("SCARLETT_STORE") || ctx.systems.store?.group || ctx.systems.store;
    if (store?.position) {
      store.position.set(4.5, 0, -3.5);
      store.visible = true;
    }

    // Rail visibility boost
    const rail = scene.getObjectByName("SPECTATOR_RAIL") || ctx.rail;
    if (rail?.position) {
      rail.position.set(0, 0, 0);
      rail.visible = true;
    }

    // Big neon sign
    if (!scene.getObjectByName("STORE_SIGN")) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.9),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
      );
      sign.name = "STORE_SIGN";
      sign.position.set(4.5, 2.1, -3.5);
      sign.rotation.y = Math.PI;
      scene.add(sign);

      const glow = new THREE.PointLight(0x7fe7ff, 2.3, 12);
      glow.position.set(4.5, 2.2, -3.5);
      scene.add(glow);
    }

    // Table neon pop
    if (!scene.getObjectByName("TABLE_NEON")) {
      const neon = new THREE.PointLight(0xff2d7a, 1.8, 10);
      neon.name = "TABLE_NEON";
      neon.position.set(0, 2.2, 0);
      scene.add(neon);
    }

    log?.("[world] ✅ master layout locked (store/rail/table polish)");
  }
};

async function safeCall(label, fn, log) {
  try {
    log?.(`[world] calling ${label}`);
    const out = await fn();
    log?.(`[world] ✅ ok ${label}`);
    return out;
  } catch (e) {
    log?.(`[world] ⚠️ ${label} error: ${e?.message || e}`);
    return null;
  }
}

function addBeacon(ctx, name, pos) {
  const { THREE, scene, log } = ctx;
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.8 })
  );
  m.position.copy(pos);
  m.name = `BEACON_${name}`;
  scene.add(m);
  ctx.beacons[name] = m;
  log?.(`[world] ✅ beacon: ${name}`);
                     }
