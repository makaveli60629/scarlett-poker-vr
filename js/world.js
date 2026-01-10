// /js/world.js — Scarlett VR Poker (World) V5.0 FULL WORLD RESTORE
// - Always builds a full lobby baseline (never "empty room")
// - Safely imports & mounts your existing modules (textures/lights/walls/table/store/ui/etc.)
// - Provides flags + recenter + sit/stand/spectate

export const World = {
  async init(ctx) {
    const { THREE, scene, renderer, camera, player } = ctx;
    const log = ctx.log || ((m) => { try { console.log(m); } catch {} });

    log("[world] ✅ LOADER SIGNATURE: WORLD.JS V5.0 FULL WORLD RESTORE");

    // --- World state ---
    const world = {
      mode: "lobby",          // lobby | table | spectate
      spawn: { pos: new THREE.Vector3(0, 0, 6.0), yaw: 0 },
      seat: 0,
      flags: { teleport: true, move: true, snap: true, hands: true },
      colliders: [],
      setFlag(k, v) { this.flags[k] = !!v; },
      getFlag(k) { return !!this.flags[k]; },
      toggleFlag(k) { this.flags[k] = !this.flags[k]; return this.flags[k]; },
      recenter() {
        player.position.copy(this.spawn.pos);
        player.rotation.y = this.spawn.yaw || 0;
        log("[world] recenter ✅");
      },
      stand() {
        this.mode = "lobby";
        log("[world] stand ✅");
      },
      sit(seat = 0) {
        this.mode = "table";
        this.seat = seat | 0;
        // seat positions (simple ring around table)
        const r = 2.2;
        const a = (this.seat / 8) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        player.position.set(x, 0, z);
        player.rotation.y = -a + Math.PI;
        log("[world] sit ✅ seat=" + this.seat);
      },
      spectate() {
        this.mode = "spectate";
        player.position.set(0, 0, 10);
        player.rotation.y = Math.PI;
        log("[world] spectate ✅");
      },
      update(dt) {
        // subtle ambience animation hooks could go here later
        // keep safe
      }
    };

    // ---- Base "FULL LOBBY" build (always) ----
    log("[world] building full lobby baseline…");
    buildFullLobbyBaseline({ THREE, scene, log, world });
    log("[world] full lobby baseline ✅");

    // ---- Safe import helper ----
    async function safeImport(path) {
      const u = path + "?v=" + encodeURIComponent(window.__BUILD_V || Date.now().toString());
      try {
        log("[world] import " + path);
        const mod = await import(u);
        log("[world] ✅ imported " + path);
        return mod;
      } catch (e) {
        log("[world] ❌ import failed " + path + " :: " + (e?.message || e));
        return null;
      }
    }

    // ---- Mount helper: call best known function (init/build/create*) ----
    async function mountModule(label, mod, callOrder = ["init", "build", "mount"]) {
      if (!mod) return false;

      // If module exports a class/object (like LightsPack), choose common patterns:
      // - mod.LightsPack.build(ctx)
      // - mod.SolidWalls.build(ctx)
      // - mod.TableFactory.build(ctx)
      // - mod.StoreSystem.init(ctx)
      // - mod.ShopUI.init(ctx)
      // - function exports: createTextureKit(ctx), initVRUI(ctx), createTeleportFX(ctx), etc.
      const candidates = [];

      // direct functions
      for (const k of Object.keys(mod)) {
        const v = mod[k];
        if (typeof v === "function") candidates.push({ name: k, fn: v });
      }

      // objects with init/build
      for (const k of Object.keys(mod)) {
        const obj = mod[k];
        if (obj && typeof obj === "object") {
          for (const m of callOrder) {
            if (typeof obj[m] === "function") {
              candidates.push({ name: `${k}.${m}`, fn: obj[m].bind(obj) });
            }
          }
        }
      }

      // prioritize known names
      const prefer = [
        "createTextureKit",
        "LightsPack.build",
        "SolidWalls.build",
        "TableFactory.build",
        "SpectatorRail.build",
        "TeleportMachine.init",
        "StoreSystem.init",
        "ShopUI.init",
        "WaterFountain.build",
        "UI.init",
        "initVRUI",
        "vr_ui_panel.init",
        "init"
      ];

      candidates.sort((a, b) => {
        const ai = prefer.findIndex(p => a.name === p);
        const bi = prefer.findIndex(p => b.name === p);
        const as = ai === -1 ? 999 : ai;
        const bs = bi === -1 ? 999 : bi;
        return as - bs;
      });

      // attempt first viable
      for (const c of candidates) {
        try {
          log(`[world] calling ${label} :: ${c.name} (ctx)`);
          const r = c.fn(ctx);
          await (r?.then ? r : Promise.resolve(r));
          log(`[world] ✅ ok ${label} :: ${c.name}`);
          return true;
        } catch (e) {
          log(`[world] ❌ threw ${label} :: ${c.name} :: ${(e?.message || e)}`);
        }
      }

      // nothing mounted
      log(`[world] ⚠️ ${label} imported but nothing mounted. exports=${Object.keys(mod).join(",")}`);
      return false;
    }

    // ---- Import/mount your existing modules (the ones your diag shows as 200 ✅) ----
    const textures = await safeImport("./textures.js");
    const lights   = await safeImport("./lights_pack.js");
    const walls    = await safeImport("./solid_walls.js");
    const tableF   = await safeImport("./table_factory.js");
    const rail     = await safeImport("./spectator_rail.js");
    const tMachine = await safeImport("./teleport_machine.js");
    const tfx      = await safeImport("./teleport_fx.js");
    const tvfx     = await safeImport("./TeleportVFX.js");
    const tburst   = await safeImport("./teleport_burst_fx.js");
    const store    = await safeImport("./store.js");
    const shopUI   = await safeImport("./shop_ui.js");
    const fountain = await safeImport("./water_fountain.js");
    const uiMod    = await safeImport("./ui.js");
    const vrui     = await safeImport("./vr_ui.js");
    const vrpanel  = await safeImport("./vr_ui_panel.js");

    // textures first
    await mountModule("textures.js", textures);

    // build packs
    await mountModule("lights_pack.js", lights);
    await mountModule("solid_walls.js", walls);

    // table + rail
    await mountModule("table_factory.js", tableF);
    await mountModule("spectator_rail.js", rail);

    // teleport (machine + fx)
    await mountModule("teleport_machine.js", tMachine);
    await mountModule("teleport_fx.js", tfx);
    await mountModule("TeleportVFX.js", tvfx);
    await mountModule("teleport_burst_fx.js", tburst);

    // store + shop
    await mountModule("store.js", store);
    await mountModule("shop_ui.js", shopUI);

    // fountain + ui
    await mountModule("water_fountain.js", fountain);
    await mountModule("ui.js", uiMod);

    // vr ui + panel
    await mountModule("vr_ui.js", vrui);
    await mountModule("vr_ui_panel.js", vrpanel);

    // Hook VR panel buttons if your vr_ui_panel dispatches events (safe)
    // (Even if it doesn't, nothing breaks.)
    if (!window.__SCARLETT_WORLD_EVENTS_WIRED) {
      window.__SCARLETT_WORLD_EVENTS_WIRED = true;

      window.addEventListener("scarlett-world-stand", () => world.stand());
      window.addEventListener("scarlett-world-sit", (e) => world.sit(e?.detail ?? 0));
      window.addEventListener("scarlett-world-spectate", () => world.spectate());
    }

    // Set spawn (standing in lobby)
    world.spawn.pos.set(0, 0, 6.0);
    world.spawn.yaw = Math.PI;
    world.recenter();

    log("[world] ✅ REAL WORLD LOADED (FULL RESTORE)");
    return world;
  }
};


// ------------------------------------------------------------
// FULL LOBBY BASELINE (always shown even if modules fail)
// ------------------------------------------------------------
function buildFullLobbyBaseline({ THREE, scene, log, world }) {
  // Clear only once (avoid stacking if someone hot reloads)
  if (scene.__scarlettBaselineBuilt) return;
  scene.__scarlettBaselineBuilt = true;

  const root = new THREE.Group();
  root.name = "ScarlettLobbyBaseline";
  scene.add(root);

  // Floor (carpet-like dark red)
  const floorGeo = new THREE.CircleGeometry(22, 96);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a0b12,
    roughness: 0.95,
    metalness: 0.05
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Outer ring
  const ringGeo = new THREE.RingGeometry(18, 18.6, 128);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    emissive: 0x116677,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.7,
    transparent: true,
    opacity: 0.55
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  root.add(ring);

  // Walls (brick-ish dark)
  const wallH = 5.5;
  const wallR = 22;
  const wallGeo = new THREE.CylinderGeometry(wallR, wallR, wallH, 96, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1b1a22,
    roughness: 0.85,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = wallH / 2;
  root.add(walls);

  // Ceiling
  const ceilGeo = new THREE.CircleGeometry(22, 96);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x070812,
    roughness: 0.7,
    metalness: 0.2
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  root.add(ceiling);

  // Lobby lighting
  const amb = new THREE.AmbientLight(0xffffff, 0.22);
  root.add(amb);

  const spot = new THREE.SpotLight(0xffffff, 1.25, 80, Math.PI / 6, 0.55, 1);
  spot.position.set(0, 10, 6);
  spot.target.position.set(0, 0, 0);
  root.add(spot, spot.target);

  // Neon columns around the room
  const colCount = 10;
  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2;
    const x = Math.cos(a) * 16.5;
    const z = Math.sin(a) * 16.5;

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 4.2, 18),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14,
        roughness: 0.6,
        metalness: 0.4
      })
    );
    col.position.set(x, 2.1, z);

    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 3.8, 18),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        metalness: 0.6
      })
    );
    glow.position.set(x, 2.1, z);

    root.add(col, glow);
  }

  // Center table placeholder (so it never looks empty)
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.2, 0.25, 48),
    new THREE.MeshStandardMaterial({ color: 0x11121a, roughness: 0.5, metalness: 0.5 })
  );
  table.position.set(0, 1.0, 0);
  root.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 2.0, 0.07, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0b4b2d,
      roughness: 0.95,
      metalness: 0.02
    })
  );
  felt.position.set(0, 1.16, 0);
  root.add(felt);

  // Simple “seat markers” (until your chair system is back)
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const x = Math.cos(a) * 2.8;
    const z = Math.sin(a) * 2.8;
    const seat = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffcc00,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.25
      })
    );
    seat.rotation.x = -Math.PI / 2;
    seat.position.set(x, 0.02, z);
    root.add(seat);
  }

  log("[world] baseline: carpet + walls + ceiling + neon + table ✅");
    }
