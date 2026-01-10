// /js/world.js — Scarlett VR Poker (World) V5.1 LAYOUT: Table Center, Store Left, Scorpion Right
// - Always builds a full lobby baseline (never empty)
// - Adds Store pad LEFT and Scorpion pad RIGHT + neon signs
// - Safe-imports & mounts your existing modules
// - Provides flags + recenter + sit/stand/spectate + teleportTo()

export const World = {
  async init(ctx) {
    const { THREE, scene, renderer, camera, player } = ctx;
    const log = ctx.log || ((m) => { try { console.log(m); } catch {} });

    log("[world] ✅ LOADER SIGNATURE: WORLD.JS V5.1 ACTIVE (layout restore)");

    // --- World state ---
    const world = {
      mode: "lobby",          // lobby | table | spectate
      seat: 0,
      flags: { teleport: true, move: true, snap: true, hands: true },

      // named spawns (Y is ground; rig/camera handles head height)
      spawns: {
        lobby:   { pos: new THREE.Vector3(0, 0, 7.5), yaw: Math.PI },
        table:   { pos: new THREE.Vector3(0, 0, 3.2), yaw: Math.PI },
        store:   { pos: new THREE.Vector3(-9.0, 0, 4.8), yaw: Math.PI / 2 },
        scorpion:{ pos: new THREE.Vector3( 9.0, 0, 4.8), yaw:-Math.PI / 2 },
      },

      setFlag(k, v) { this.flags[k] = !!v; },
      getFlag(k) { return !!this.flags[k]; },
      toggleFlag(k) { this.flags[k] = !this.flags[k]; return this.flags[k]; },

      recenter() {
        // default to lobby recenter
        const s = this.spawns.lobby;
        player.position.copy(s.pos);
        player.rotation.y = s.yaw || 0;
        log("[world] recenter ✅ (lobby)");
      },

      teleportTo(where = "lobby") {
        const s = this.spawns[where] || this.spawns.lobby;
        player.position.copy(s.pos);
        player.rotation.y = s.yaw || 0;
        this.mode = (where === "table") ? "table" : (where === "scorpion" ? "lobby" : "lobby");
        log("[world] teleportTo ✅ " + where);
      },

      stand() {
        this.mode = "lobby";
        log("[world] stand ✅");
      },

      sit(seat = 0) {
        this.mode = "table";
        this.seat = seat | 0;

        // 8-seat ring around center table (center = 0,0,0)
        const r = 2.25;
        const a = (this.seat / 8) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;

        player.position.set(x, 0, z);
        player.rotation.y = -a + Math.PI;
        log("[world] sit ✅ seat=" + this.seat);
      },

      spectate() {
        this.mode = "spectate";
        player.position.set(0, 0, 11);
        player.rotation.y = Math.PI;
        log("[world] spectate ✅");
      },

      update(dt) {
        // keep safe (module UIs can hook into ctx themselves)
      }
    };

    // ---- Build baseline lobby (ALWAYS) ----
    log("[world] building full lobby baseline…");
    const baseline = buildFullLobbyBaseline({ THREE, scene, log, world });
    log("[world] full lobby baseline ✅");

    // ---- Hook pad taps / triggers (works on desktop clicks too) ----
    // You can later replace this with hand-ray / teleport logic.
    if (!window.__SCARLETT_PAD_CLICK_WIRED) {
      window.__SCARLETT_PAD_CLICK_WIRED = true;

      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      window.addEventListener("pointerdown", (ev) => {
        // ignore if in VR session
        if (renderer?.xr?.isPresenting) return;

        ndc.x = (ev.clientX / window.innerWidth) * 2 - 1;
        ndc.y = -(ev.clientY / window.innerHeight) * 2 + 1;

        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(baseline.clickables, true);
        if (!hits?.length) return;

        const obj = hits[0].object;
        const tag = obj?.userData?.scarlettTeleport;
        if (tag) world.teleportTo(tag);
      }, { passive: true });
    }

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

    // ---- Mount helper ----
    async function mountModule(label, mod) {
      if (!mod) return false;

      // collect candidates
      const candidates = [];

      // direct functions
      for (const k of Object.keys(mod)) {
        const v = mod[k];
        if (typeof v === "function") candidates.push({ name: k, fn: v });
      }

      // objects with init/build/mount
      for (const k of Object.keys(mod)) {
        const obj = mod[k];
        if (obj && typeof obj === "object") {
          for (const m of ["init", "build", "mount"]) {
            if (typeof obj[m] === "function") {
              candidates.push({ name: `${k}.${m}`, fn: obj[m].bind(obj) });
            }
          }
        }
      }

      // prioritize
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
        const ai = prefer.indexOf(a.name); const bi = prefer.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

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

      log(`[world] ⚠️ ${label} imported but nothing mounted. exports=${Object.keys(mod).join(",")}`);
      return false;
    }

    // ---- Import/mount your existing modules (200 ✅ ones) ----
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

    // Mount in stable order
    await mountModule("textures.js", textures);
    await mountModule("lights_pack.js", lights);
    await mountModule("solid_walls.js", walls);

    await mountModule("table_factory.js", tableF);
    await mountModule("spectator_rail.js", rail);

    await mountModule("teleport_machine.js", tMachine);
    await mountModule("teleport_fx.js", tfx);
    await mountModule("TeleportVFX.js", tvfx);
    await mountModule("teleport_burst_fx.js", tburst);

    await mountModule("store.js", store);
    await mountModule("shop_ui.js", shopUI);

    await mountModule("water_fountain.js", fountain);
    await mountModule("ui.js", uiMod);

    await mountModule("vr_ui.js", vrui);
    await mountModule("vr_ui_panel.js", vrpanel);

    // Spawn in lobby (standing)
    world.teleportTo("lobby");

    log("[world] ✅ REAL WORLD LOADED (layout: table center / store left / scorpion right)");
    return world;
  }
};


// ------------------------------------------------------------
// FULL LOBBY BASELINE (always shown even if modules fail)
// Includes: Center table, Store LEFT pad, Scorpion RIGHT pad, neon signs
// ------------------------------------------------------------
function buildFullLobbyBaseline({ THREE, scene, log, world }) {
  if (scene.__scarlettBaselineBuilt) {
    // keep prior baseline but return clickables list if needed
    return scene.__scarlettBaselineRef;
  }
  scene.__scarlettBaselineBuilt = true;

  const root = new THREE.Group();
  root.name = "ScarlettLobbyBaseline";
  scene.add(root);

  const clickables = [];

  // Floor (carpet)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(24, 96),
    new THREE.MeshStandardMaterial({ color: 0x2a0b12, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Walls cylinder
  const wallH = 6.0;
  const wallR = 24;
  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(wallR, wallR, wallH, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1b1a22, roughness: 0.85, metalness: 0.15, side: THREE.DoubleSide })
  );
  walls.position.y = wallH / 2;
  root.add(walls);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.CircleGeometry(24, 96),
    new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.7, metalness: 0.2 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  root.add(ceiling);

  // Lights
  root.add(new THREE.AmbientLight(0xffffff, 0.22));

  const spot = new THREE.SpotLight(0xffffff, 1.35, 90, Math.PI / 6, 0.55, 1);
  spot.position.set(0, 11, 6);
  spot.target.position.set(0, 0, 0);
  root.add(spot, spot.target);

  // Neon columns ring
  const colCount = 12;
  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2;
    const x = Math.cos(a) * 17.5;
    const z = Math.sin(a) * 17.5;

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 4.4, 18),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.4 })
    );
    col.position.set(x, 2.2, z);

    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 4.0, 18),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        metalness: 0.6
      })
    );
    glow.position.set(x, 2.2, z);

    root.add(col, glow);
  }

  // CENTER TABLE (exactly center)
  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.25, 0.28, 48),
    new THREE.MeshStandardMaterial({ color: 0x11121a, roughness: 0.45, metalness: 0.55 })
  );
  tableBase.position.set(0, 1.0, 0);
  root.add(tableBase);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.05, 0.07, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4b2d, roughness: 0.95, metalness: 0.02 })
  );
  felt.position.set(0, 1.16, 0);
  root.add(felt);

  // Seat rings (8)
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const x = Math.cos(a) * 2.9;
    const z = Math.sin(a) * 2.9;
    const seat = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffcc00,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.24
      })
    );
    seat.rotation.x = -Math.PI / 2;
    seat.position.set(x, 0.02, z);
    root.add(seat);
  }

  // Helper: neon sign (no textures needed)
  function neonSign(text, pos, rotY, color = 0x7fe7ff) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = rotY;

    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
      })
    );
    backing.position.set(0, 2.2, 0);
    g.add(backing);

    // "fake text" using segmented bars so no canvas/font dependencies
    const bars = new THREE.Group();
    bars.position.set(-1.8, 2.2, 0.02);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.9,
      roughness: 0.15,
      metalness: 0.4
    });

    // quick bar glyphs (each char = 5 bars)
    const charW = 0.38;
    const gap = 0.08;

    for (let i = 0; i < Math.min(10, text.length); i++) {
      const x0 = i * (charW + gap);
      // vertical bar
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.02), mat);
      b1.position.set(x0, 0, 0);
      bars.add(b1);
      // top bar
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.02), mat);
      b2.position.set(x0 + 0.14, 0.3, 0);
      bars.add(b2);
      // mid bar
      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.02), mat);
      b3.position.set(x0 + 0.14, 0.0, 0);
      bars.add(b3);
      // bottom bar
      const b4 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.02), mat);
      b4.position.set(x0 + 0.14, -0.3, 0);
      bars.add(b4);
    }
    g.add(bars);

    // a little point light for glow
    const pl = new THREE.PointLight(color, 1.1, 10);
    pl.position.set(0, 2.2, 0.6);
    g.add(pl);

    root.add(g);
    return g;
  }

  // Helper: teleport pad
  function teleportPad(tag, pos, color, labelText) {
    const pad = new THREE.Group();
    pad.position.copy(pos);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.9, 64),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.55,
        roughness: 0.18,
        metalness: 0.55
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.userData.scarlettTeleport = tag;

    const core = new THREE.Mesh(
      new THREE.CircleGeometry(0.58, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14,
        emissive: color,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.65,
        roughness: 0.5,
        metalness: 0.3
      })
    );
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.015;
    core.userData.scarlettTeleport = tag;

    pad.add(ring, core);
    clickables.push(ring, core);

    // small pillar marker
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.2, 14),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.55
      })
    );
    pillar.position.y = 0.6;
    pad.add(pillar);

    // sign near pad
    neonSign(labelText, new THREE.Vector3(pos.x, 0, pos.z - 1.6), 0, color);

    root.add(pad);
    return pad;
  }

  // LEFT = STORE
  teleportPad("store", new THREE.Vector3(-9.0, 0, 4.8), 0xff2d7a, "STORE");

  // RIGHT = SCORPION ROOM
  teleportPad("scorpion", new THREE.Vector3(9.0, 0, 4.8), 0x7fe7ff, "SCORPION");

  // TABLE teleport pad (near table front)
  teleportPad("table", new THREE.Vector3(0, 0, 3.2), 0xffcc00, "TABLE");

  // LOBBY pad (spawn)
  teleportPad("lobby", new THREE.Vector3(0, 0, 7.5), 0x4cd964, "LOBBY");

  // Save ref
  const ref = { root, clickables };
  scene.__scarlettBaselineRef = ref;

  log("[world] baseline ✅ (table center / store left / scorpion right)");
  return ref;
    }
