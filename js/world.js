// /js/world.js — Scarlett VR Poker (World Loader V3.3 CLEAN FULL)
// - Keeps fallback room (always loads)
// - Async-loads “real world” modules safely (adapters)
// - Provides REQUIRED API: world.setFlag / getFlag / toggleFlag
// - Adds: lobby standing, join table sit, spectate standing
// - Adds: world.update(dt) + world.onUpdate hooks (optional for main)

window.dispatchEvent(new CustomEvent("scarlett-log", {
  detail: "[world] ✅ LOADER SIGNATURE: WORLD.JS V3.3 ACTIVE"
}));

function ui(m) {
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

async function imp(path) {
  const v = encodeURIComponent(window.__BUILD_V || Date.now().toString());
  const url = `${path}?v=${v}`;
  ui(`[world] import ${url}`);
  try {
    const mod = await import(url);
    ui(`[world] ✅ imported ${path}`);
    return mod;
  } catch (e) {
    ui(`[world] ❌ import failed ${path} :: ${e?.message || e}`);
    return null;
  }
}

// Call a function with multiple arg styles (modules differ)
async function callWithAdapters(fn, label, ctx) {
  const { THREE, scene, renderer, camera, player, controllers, world } = ctx;

  const attempts = [
    { args: [ctx], note: "(ctx)" },
    { args: [scene], note: "(scene)" },
    { args: [THREE, scene], note: "(THREE, scene)" },
    { args: [scene, ctx], note: "(scene, ctx)" },
    { args: [ctx, scene], note: "(ctx, scene)" },
    { args: [THREE, scene, renderer], note: "(THREE, scene, renderer)" },
    { args: [scene, renderer, camera], note: "(scene, renderer, camera)" },
    { args: [THREE, scene, renderer, camera], note: "(THREE, scene, renderer, camera)" },
    { args: [world], note: "(world)" },
  ];

  let lastErr = null;
  for (const a of attempts) {
    ui(`[world] calling ${label} ${a.note}`);
    try {
      const r = await fn(...a.args);
      ui(`[world] ✅ ok ${label} ${a.note}`);
      return { ok: true, result: r };
    } catch (e) {
      lastErr = e;
      ui(`[world] ⚠️ retry ${label} after error: ${e?.message || e}`);
    }
  }
  ui(`[world] ❌ all call adapters failed for ${label}: ${lastErr?.message || lastErr}`);
  return { ok: false, error: lastErr };
}

async function mountObject(obj, label, ctx) {
  if (!obj || typeof obj !== "object") return false;

  const methods = ["init", "mount", "build", "create", "spawn", "setup", "addToScene", "attach", "start"];
  for (const m of methods) {
    if (typeof obj[m] === "function") {
      const ok = await callWithAdapters(obj[m].bind(obj), `${label}.${m}`, ctx);
      return !!ok.ok;
    }
  }

  // If only one function exists, call it
  const fnKeys = Object.keys(obj).filter(k => typeof obj[k] === "function");
  if (fnKeys.length === 1) {
    const k = fnKeys[0];
    const ok = await callWithAdapters(obj[k].bind(obj), `${label}.${k}`, ctx);
    return !!ok.ok;
  }

  ui(`[world] ⚠️ ${label} imported but no callable method found. keys=${Object.keys(obj).join(",")}`);
  return false;
}

async function mountModule(mod, label, ctx) {
  if (!mod) return false;

  // Prefer common entry function names
  const fnNames = ["init", "mount", "build", "create", "setup", "boot", "start", "initVRUI"];
  for (const n of fnNames) {
    if (typeof mod[n] === "function") {
      const ok = await callWithAdapters(mod[n], `${label}.${n}`, ctx);
      return !!ok.ok;
    }
  }

  // default export function
  if (typeof mod.default === "function") {
    const ok = await callWithAdapters(mod.default, `${label}.default`, ctx);
    return !!ok.ok;
  }

  // objects inside module (e.g., LightsPack, SolidWalls, TeleportMachine, etc.)
  for (const k of Object.keys(mod)) {
    const v = mod[k];
    if (v && typeof v === "object") {
      const ok = await mountObject(v, `${label}.${k}`, ctx);
      if (ok) return true;
    }
  }

  ui(`[world] ⚠️ imported ${label} but nothing mounted. exports=${Object.keys(mod).join(",")}`);
  return false;
}

function buildFallback(ctx) {
  const { THREE, scene } = ctx;

  // Room
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x101223, roughness: 0.95, metalness: 0.03 });
  const wallGeo = new THREE.BoxGeometry(36, 6, 0.4);
  const w1 = new THREE.Mesh(wallGeo, wallMat); w1.position.set(0, 3, -18);
  const w2 = new THREE.Mesh(wallGeo, wallMat); w2.position.set(0, 3, 18);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 36), wallMat); w3.position.set(-18, 3, 0);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 36), wallMat); w4.position.set(18, 3, 0);
  scene.add(w1, w2, w3, w4);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.45);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(6, 10, 4);
  scene.add(amb, dir);

  // Simple table placeholder
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.85, metalness: 0.04 })
  );
  tableTop.position.set(0, 1.02, 0);
  scene.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.65, 1.0, 32),
    new THREE.MeshStandardMaterial({ color: 0x1b1d2a, roughness: 0.9, metalness: 0.06 })
  );
  tableBase.position.set(0, 0.5, 0);
  scene.add(tableBase);

  // Seat markers
  const seatRadius = 3.35;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI;

    const px = Math.cos(a) * seatRadius;
    const pz = Math.sin(a) * seatRadius;

    const ringGeo = new THREE.RingGeometry(0.12, 0.19, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(px, 0.02, pz);
    ring.userData.seatIndex = i;
    ring.name = `seat_marker_${i}`;
    scene.add(ring);

    ctx.world.seatMarkers.push(ring);
    ctx.world.seats.push({
      index: i,
      position: new THREE.Vector3(px, 0.12, pz),
      yaw: a + Math.PI
    });
  }

  // Spectator spots around rail
  const specR = 6.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI;
    const x = Math.cos(a) * specR;
    const z = Math.sin(a) * specR;
    ctx.world.spectatorSpots.push({ pos: new THREE.Vector3(x, 0, z), yaw: a + Math.PI });
  }

  ui("[world] fallback built ✅");
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log }) {
    // ---- World object + REQUIRED API ----
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,

      colliders: [],
      seats: [],
      seatMarkers: [],
      spectatorSpots: [],

      flags: Object.assign(
        { teleport: true, move: true, snap: true, hands: true },
        (window.__SCARLETT_FLAGS || {})
      ),

      mode: "lobby",          // "lobby" | "table" | "spectate"
      seatedIndex: -1,
      playerYaw: 0,

      // REQUIRED (main.js expects these)
      setFlag(k, v) { this.flags[k] = !!v; return this.flags[k]; },
      getFlag(k) { return !!this.flags[k]; },
      toggleFlag(k) { this.flags[k] = !this.flags[k]; return this.flags[k]; },

      // Optional update loop (if main calls world.update(dt))
      onUpdate: [],
      update(dt = 0) {
        for (const fn of this.onUpdate) {
          try { fn(dt); } catch {}
        }
      },

      // Movement modes
      stand() {
        this.mode = "lobby";
        this.seatedIndex = -1;
        window.dispatchEvent(new CustomEvent("scarlett-mode", { detail: { mode: this.mode } }));
      },

      sit(seatIndex = 0) {
        seatIndex = Math.max(0, Math.min(7, seatIndex | 0));
        this.mode = "table";
        this.seatedIndex = seatIndex;

        const seat = this.seats[seatIndex];
        if (seat && player) {
          // player is usually your rig root
          player.position.set(seat.position.x, player.position.y, seat.position.z);
          // yaw hint (main may apply)
          this.playerYaw = seat.yaw || 0;
        }
        window.dispatchEvent(new CustomEvent("scarlett-mode", { detail: { mode: this.mode, seatIndex } }));
      },

      spectate(i = 0) {
        this.mode = "spectate";
        this.seatedIndex = -1;
        const spot = this.spectatorSpots[Math.max(0, Math.min(this.spectatorSpots.length - 1, i | 0))];
        if (spot && player) {
          player.position.set(spot.pos.x, player.position.y, spot.pos.z);
          this.playerYaw = spot.yaw || 0;
        }
        window.dispatchEvent(new CustomEvent("scarlett-mode", { detail: { mode: this.mode, spotIndex: i|0 } }));
      },

      recenter() {
        if (!player) return;
        player.position.set(0, player.position.y, 6);
        this.playerYaw = Math.PI;
        window.dispatchEvent(new CustomEvent("scarlett-mode", { detail: { mode: this.mode, recenter: true } }));
      }
    };

    // Build ctx
    const ctx = { THREE, scene, renderer, camera, player, controllers, world: W, log };

    // Fallback world always
    ui("[world] fallback world building…");
    buildFallback({ THREE, scene, world: W });
    ui("[world] init complete ✅");

    // Hook HUD events from index.html
    window.addEventListener("scarlett-toggle-teleport", (e) => W.setFlag("teleport", !!e.detail));
    window.addEventListener("scarlett-toggle-move", (e) => W.setFlag("move", !!e.detail));
    window.addEventListener("scarlett-toggle-snap", (e) => W.setFlag("snap", !!e.detail));
    window.addEventListener("scarlett-toggle-hands", (e) => W.setFlag("hands", !!e.detail));
    window.addEventListener("scarlett-recenter", () => W.recenter());

    // Click/tap seat markers to sit (mobile + desktop)
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pointerToSeat(ev) {
      const rect = renderer?.domElement?.getBoundingClientRect?.() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(W.seatMarkers, false);
      if (hits?.length) {
        const idx = hits[0].object?.userData?.seatIndex;
        if (Number.isFinite(idx)) {
          ui(`[world] sit seat=${idx}`);
          W.sit(idx);
        }
      }
    }
    renderer?.domElement?.addEventListener("pointerdown", pointerToSeat, { passive: true });

    // Minimal inventory shim (ShopUI expects Inventory.getChips sometimes)
    W.Inventory = W.Inventory || {
      getChips() {
        return [
          { denom: 1, color: "white" },
          { denom: 5, color: "red" },
          { denom: 25, color: "green" },
          { denom: 100, color: "black" },
          { denom: 500, color: "purple" },
          { denom: 1000, color: "gold" },
        ];
      }
    };

    // ---- REAL WORLD LOAD (async) ----
    (async () => {
      // Modules you confirmed exist (200 ✅)
      const textures = await imp("./textures.js");
      const lights   = await imp("./lights_pack.js");
      const walls    = await imp("./solid_walls.js");
      const tableF   = await imp("./table_factory.js");
      const rail     = await imp("./spectator_rail.js");
      const tpMach   = await imp("./teleport_machine.js");
      const store    = await imp("./store.js");
      const shopUI   = await imp("./shop_ui.js");
      const water    = await imp("./water_fountain.js");
      const uiMod    = await imp("./ui.js");
      const vrui     = await imp("./vr_ui.js");
      const vrPanel  = await imp("./vr_ui_panel.js");

      // FX (optional)
      await imp("./teleport_fx.js");
      await imp("./TeleportVFX.js");
      await imp("./teleport_burst_fx.js");

      ui("[world] ⚠️ store_kiosk.js skipped for now (will re-enable after cache reset)");

      let mounted = 0;

      // Texture kit (special)
      if (textures?.createTextureKit) {
        try {
          W.textureKit = textures.createTextureKit({ THREE, renderer, base: "./assets/" });
          scene.userData.textureKit = W.textureKit;
          ui("[world] ✅ mounted textures via createTextureKit()");
          mounted++;
        } catch (e) {
          ui("[world] ❌ createTextureKit failed :: " + (e?.message || e));
        }
      }

      mounted += (await mountModule(lights, "lights_pack.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(walls,  "solid_walls.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(tableF, "table_factory.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(rail,   "spectator_rail.js", ctx)) ? 1 : 0;

      // Teleport machine prefers object init
      if (tpMach?.TeleportMachine) {
        const ok = await mountObject(tpMach.TeleportMachine, "teleport_machine.js.TeleportMachine", ctx);
        if (ok) mounted++;
        else ui("[world] ⚠️ TeleportMachine present but did not mount (no callable method found)");
      } else {
        mounted += (await mountModule(tpMach, "teleport_machine.js", ctx)) ? 1 : 0;
      }

      mounted += (await mountModule(store,  "store.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(shopUI, "shop_ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(water,  "water_fountain.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(uiMod,  "ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(vrui,   "vr_ui.js", ctx)) ? 1 : 0;

      // VR panel prefers init(ctx)
      if (vrPanel?.init) {
        const ok = await callWithAdapters(vrPanel.init, "vr_ui_panel.js.init", ctx);
        if (ok.ok) { mounted++; ui("[world] ✅ mounted vr_ui_panel.js via init()"); }
      } else {
        mounted += (await mountModule(vrPanel, "vr_ui_panel.js", ctx)) ? 1 : 0;
      }

      // Merge colliders if modules put them on scene.userData
      if (Array.isArray(scene.userData?.colliders)) {
        for (const c of scene.userData.colliders) {
          if (c && !W.colliders.includes(c)) W.colliders.push(c);
        }
        ui("[world] colliders merged ✅");
      }

      W._realLoaded = mounted > 0;
      ui(W._realLoaded
        ? `[world] ✅ REAL WORLD LOADED (mounted=${mounted})`
        : "[world] ❌ REAL WORLD DID NOT LOAD"
      );

      window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
    })();

    return W;
  }
};
