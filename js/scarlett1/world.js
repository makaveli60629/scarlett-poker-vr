// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) v2.0
// Permanent spine: scene/rig/camera/anchors + module loader + module test runner.

export async function bootWorld(ctx) {
  const {
    THREE,
    scene,
    rig,
    camera,
    renderer,
    HUD,        // function(string)
    DIAG,       // function(...args)
  } = ctx;

  const log = (s) => (typeof HUD === "function" ? HUD(s) : console.log("[world]", s));
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  log("step: world start");

  // ---------- WORLD SPINE ----------
  // Lighting (never black)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.95);
  hemi.name = "LIGHT_HEMI";
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(8, 14, 6);
  key.name = "LIGHT_KEY";
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-6, 8, -10);
  fill.name = "LIGHT_FILL";
  scene.add(fill);

  // Floor (guaranteed)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "SCARLETT_FLOOR";
  scene.add(floor);

  // Anchors registry (modules can attach to these)
  const anchors = {
    root: new THREE.Group(),
    room: new THREE.Group(),
    stage: new THREE.Group(),
    centerpiece: new THREE.Group(),
    table: new THREE.Group(),
    ui: new THREE.Group(),
    store: new THREE.Group(),
    mannequins: new THREE.Group(),
    debug: new THREE.Group(),
  };
  anchors.root.name = "ANCHORS_ROOT";
  Object.entries(anchors).forEach(([k, g]) => (g.name = `ANCHOR_${k.toUpperCase()}`));

  scene.add(anchors.root);
  anchors.root.add(anchors.room, anchors.stage, anchors.ui, anchors.store, anchors.debug);
  anchors.stage.add(anchors.centerpiece);
  anchors.centerpiece.add(anchors.table);
  anchors.store.add(anchors.mannequins);

  // Big circular room (twice as big / “souped up” but light)
  // Cylinder as walls + subtle ceiling ring
  const ROOM_R = 28; // make this bigger whenever you want
  const WALL_H = 10;

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(ROOM_R, ROOM_R, WALL_H, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide })
  );
  wall.position.y = WALL_H / 2;
  wall.name = "ROOM_WALL";
  anchors.room.add(wall);

  const ceilingRing = new THREE.Mesh(
    new THREE.TorusGeometry(ROOM_R - 1.6, 0.12, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x1a202a, roughness: 0.85 })
  );
  ceilingRing.rotation.x = Math.PI / 2;
  ceilingRing.position.y = WALL_H - 0.45;
  ceilingRing.name = "ROOM_CEILING_RING";
  anchors.room.add(ceilingRing);

  // Center “stage divot” (placeholder bowl so you can expand later with stairs/rails)
  // This is just visual now; gameplay collision can come later.
  const divot = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.5, 0.9, 64),
    new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 1 })
  );
  divot.position.set(0, -0.45, 0);
  divot.name = "STAGE_DIVOT";
  anchors.stage.add(divot);

  // Centerpiece base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.4, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x202734, roughness: 0.9 })
  );
  base.position.set(0, 0.175, -1.3);
  base.name = "CENTER_BASE";
  anchors.centerpiece.add(base);

  // Table top (centerpiece)
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.10, 72),
    new THREE.MeshStandardMaterial({ color: 0x16382a, roughness: 0.92 })
  );
  tableTop.position.set(0, 0.78, -1.3);
  tableTop.name = "POKER_TABLE_TOP";
  anchors.table.add(tableTop);

  // Rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.19, 0.075, 16, 90),
    new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.85 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, 0.84, -1.3);
  rail.name = "POKER_RAIL";
  anchors.table.add(rail);

  // Pass line circle placeholder (you requested)
  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.68, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.set(0, 0.835, -1.3);
  passLine.name = "PASS_LINE_RING";
  anchors.table.add(passLine);

  // Store zone placeholder (modules can populate later)
  const storePad = new THREE.Mesh(
    new THREE.CircleGeometry(4.0, 64),
    new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 1 })
  );
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.set(10, 0.01, -4);
  storePad.name = "STORE_PAD";
  anchors.store.add(storePad);

  // ---------- MODULE ORCHESTRATOR ----------
  const registry = [];
  const status = new Map(); // id -> { ok, stage, error, info }

  function register(mod) {
    if (!mod || !mod.id) throw new Error("Module missing id");
    registry.push(mod);
    status.set(mod.id, { ok: false, stage: "registered", error: null, info: "" });
  }

  async function initModule(mod) {
    const st = status.get(mod.id);
    st.stage = "init";
    log(`module:init ${mod.id}`);
    try {
      if (typeof mod.init === "function") {
        const info = await mod.init(ctx);
        st.ok = true;
        st.stage = "ready";
        st.info = info || "";
        log(`module:ok ${mod.id}`);
      } else {
        st.ok = true;
        st.stage = "ready";
        st.info = "no init()";
        log(`module:ok ${mod.id} (no init)`);
      }
    } catch (e) {
      st.ok = false;
      st.stage = "failed";
      st.error = e?.message || String(e);
      err(`module:fail ${mod.id}`, e);
      log(`module:FAIL ${mod.id} :: ${st.error}`);
    }
  }

  async function runAllModuleTests() {
    const report = {
      build: "WORLD_ORCH_v2_0",
      time: new Date().toISOString(),
      modules: [],
    };

    for (const mod of registry) {
      const st = status.get(mod.id) || { ok: false, stage: "?", error: null, info: "" };
      let testRes = null;
      try {
        if (typeof mod.test === "function") testRes = await mod.test(ctx);
      } catch (e) {
        testRes = { ok: false, error: e?.message || String(e) };
      }
      report.modules.push({
        id: mod.id,
        stage: st.stage,
        ok: !!st.ok,
        info: st.info || "",
        error: st.error || "",
        test: testRes,
      });
    }

    // Also print a compact view to HUD
    log("MODULE TEST REPORT:");
    for (const m of report.modules) {
      log(`${m.ok ? "✅" : "❌"} ${m.id} stage=${m.stage}${m.error ? " err=" + m.error : ""}`);
    }
    return report;
  }

  // Expose test runner to the Android MODULE TEST button
  window.__scarlettRunModuleTest = runAllModuleTests;

  // Expose world pointers for debugging/hotfixing
  window.__scarlettWorld = {
    ctx,
    anchors,
    registry,
    status,
    runAllModuleTests,
  };

  // ---------- DEFAULT MODULES (starter pack) ----------
  // These are “always safe” modules. Add more later without touching world.js much.

  register({
    id: "env:labels",
    init() {
      // Minimal axis marker at origin to confirm orientation quickly
      const g = new THREE.AxesHelper(1.2);
      g.position.set(0, 0.02, 0);
      g.name = "DEBUG_AXES";
      anchors.debug.add(g);
      return "axes helper ok";
    },
    test() {
      const ok = !!scene.getObjectByName("DEBUG_AXES");
      return { ok, found: ok };
    },
  });

  register({
    id: "centerpiece:chips_placeholder",
    init() {
      // Cheap chip stacks placeholders
      const mat = new THREE.MeshStandardMaterial({ color: 0x8b1c1c, roughness: 0.65 });
      for (let i = 0; i < 6; i++) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 18), mat);
        stack.position.set(-0.25 + i * 0.10, 0.86, -1.3 + (i % 2 ? 0.10 : -0.10));
        stack.name = `CHIP_STACK_${i}`;
        anchors.table.add(stack);
      }
      return "chip placeholders ok";
    },
    test() {
      const ok = !!anchors.table.getObjectByName("CHIP_STACK_0");
      return { ok };
    },
  });

  register({
    id: "ui:module_status_beacon",
    init() {
      // A simple floating beacon above the table to confirm UI anchor works
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      beacon.position.set(0, 1.18, -1.3);
      beacon.name = "UI_BEACON";
      anchors.ui.add(beacon);
      return "ui beacon ok";
    },
    test() {
      return { ok: !!anchors.ui.getObjectByName("UI_BEACON") };
    },
  });

  // Init modules in order (each logs step)
  log(`modules: ${registry.length} registering…`);
  for (const mod of registry) await initModule(mod);
  log("step: world ready ✅");

  // Return update hooks for index.js render loop
  const updaters = registry.filter((m) => typeof m.update === "function").map((m) => m.update);

  return {
    anchors,
    update(dt) {
      for (const fn of updaters) {
        try { fn(ctx, dt); } catch (e) { warn("module update err", e); }
      }
    },
  };
    }
