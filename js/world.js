// /js/world.js — Scarlett VR Poker (World Loader V3.4 FULL)
// - Fixes: double fallback build, missing setFlag, safe module mounting.
// - Layout: TABLE center (0), STORE left (-7), SCORPION right (+7)
// - Exports: World.init(ctx)

window.dispatchEvent(new CustomEvent("scarlett-log", { detail: "[world] ✅ LOADER SIGNATURE: WORLD.JS V3.4 ACTIVE" }));

function ui(log, m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { (log||console.log)(m); } catch {}
}

async function imp(path){
  const v = encodeURIComponent(window.__BUILD_V || Date.now().toString());
  const url = `${path}?v=${v}`;
  ui(null, `[world] import ${url}`);
  try {
    const mod = await import(url);
    ui(null, `[world] ✅ imported ${path}`);
    return mod;
  } catch (e) {
    ui(null, `[world] ❌ import failed ${path} :: ${e?.message || e}`);
    return null;
  }
}

async function callWithAdapters(fn, label, ctx, log){
  const { THREE, scene, renderer, camera, player, controllers, world } = ctx;
  const attempts = [
    { args:[ctx], note:"(ctx)" },
    { args:[scene], note:"(scene)" },
    { args:[THREE, scene], note:"(THREE,scene)" },
    { args:[scene, ctx], note:"(scene,ctx)" },
    { args:[ctx, scene], note:"(ctx,scene)" },
    { args:[THREE, scene, renderer], note:"(THREE,scene,renderer)" },
    { args:[scene, renderer, camera], note:"(scene,renderer,camera)" },
    { args:[THREE, scene, renderer, camera], note:"(THREE,scene,renderer,camera)" },
    { args:[world], note:"(world)" },
  ];

  let lastErr=null;
  for (const a of attempts){
    try{
      ui(log, `[world] calling ${label} ${a.note}`);
      const r = await fn(...a.args);
      ui(log, `[world] ✅ ok ${label} ${a.note}`);
      return { ok:true, result:r };
    }catch(e){
      lastErr=e;
      ui(log, `[world] ⚠️ retry ${label} after error: ${e?.message || e}`);
    }
  }
  ui(log, `[world] ❌ all call adapters failed for ${label}: ${lastErr?.message || lastErr}`);
  return { ok:false, error:lastErr };
}

async function mountModule(mod, label, ctx, log){
  if (!mod) return 0;

  const fnNames = ["init","mount","build","create","spawn","setup","start","boot","initVRUI"];
  for (const n of fnNames){
    if (typeof mod[n] === "function"){
      const ok = await callWithAdapters(mod[n], `${label}.${n}`, ctx, log);
      return ok.ok ? 1 : 0;
    }
  }

  if (typeof mod.default === "function"){
    const ok = await callWithAdapters(mod.default, `${label}.default`, ctx, log);
    return ok.ok ? 1 : 0;
  }

  // If module exports an object (StoreSystem, TeleportMachine etc.)
  for (const k of Object.keys(mod)){
    const v = mod[k];
    if (v && typeof v === "object"){
      for (const n of fnNames){
        if (typeof v[n] === "function"){
          const ok = await callWithAdapters(v[n].bind(v), `${label}.${k}.${n}`, ctx, log);
          return ok.ok ? 1 : 0;
        }
      }
    }
  }

  ui(log, `[world] ⚠️ imported ${label} but nothing mounted. exports=${Object.keys(mod).join(",")}`);
  return 0;
}

function buildFallback(ctx){
  const { THREE, scene, world, log } = ctx;
  ui(log, "[world] fallback world building…");

  // prevent double fallback
  if (world.__fallbackBuilt) return;
  world.__fallbackBuilt = true;

  // floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);
  world.colliders.push(floor);

  // table placeholder (center)
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.8, metalness: 0.05 })
  );
  tableTop.position.set(0, 1.02, 0);
  scene.add(tableTop);

  // seat markers around center
  world.seats = [];
  world.seatMarkers = [];
  const seatRadius = 3.35;
  for (let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2 + Math.PI;
    const px = Math.cos(a)*seatRadius;
    const pz = Math.sin(a)*seatRadius;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.19, 64),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent:true, opacity:0.55, side:THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(px, 0.02, pz);
    ring.userData.seatIndex = i;
    scene.add(ring);

    world.seatMarkers.push(ring);
    world.seats.push({ index:i, position:new THREE.Vector3(px, 1.6, pz), yaw:a+Math.PI });
  }

  // spectator spots (standing) near rail circle
  world.spectatorSpots = [];
  const specR = 6.2;
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI;
    const x = Math.cos(a)*specR;
    const z = Math.sin(a)*specR;
    world.spectatorSpots.push({ pos:new THREE.Vector3(x,1.6,z), yaw:a+Math.PI });
  }

  ui(log, "[world] fallback built ✅");
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const ctx = { THREE, scene, renderer, camera, player, controllers, log };

    // world state object
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      seats: [],
      seatMarkers: [],
      spectatorSpots: [],
      flags: { teleport:true, move:true, snap:true, hands:true },
      mode: "lobby",
      seatedIndex: -1,
      points: {},
      __fallbackBuilt: false
    };

    // flags API (guaranteed)
    W.setFlag = (k, v)=>{ W.flags[k] = !!v; };
    W.getFlag = (k)=>!!W.flags[k];
    W.toggleFlag = (k)=>{ W.flags[k] = !W.flags[k]; return W.flags[k]; };

    // attach
    ctx.world = W;

    // fallback always (so you never load into nothing)
    buildFallback(ctx);

    // inventory shim for shop_ui
    W.Inventory = W.Inventory || {
      getChips() {
        return [
          { denom:1, color:"white" },
          { denom:5, color:"red" },
          { denom:25, color:"green" },
          { denom:100, color:"black" },
          { denom:500, color:"purple" },
          { denom:1000, color:"gold" },
        ];
      }
    };
    ctx.Inventory = W.Inventory;

    // REAL WORLD LOAD
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
    const scorp    = await imp("./scorpion_room.js");
    const rm       = await imp("./room_manager.js");

    // FX optional
    await imp("./teleport_fx.js");
    await imp("./TeleportVFX.js");
    await imp("./teleport_burst_fx.js");

    // Mount textures first so other modules can use it
    if (textures?.createTextureKit) {
      try{
        const kit = textures.createTextureKit({ THREE, renderer, base:"./assets/textures/", log });
        scene.userData.textureKit = kit;
        ui(log, "[world] ✅ mounted textures via createTextureKit()");
      }catch(e){
        ui(log, "[world] ❌ createTextureKit failed :: " + (e?.message||e));
      }
    }

    // Mount core world modules
    let mounted = 0;
    mounted += await mountModule(lights,  "lights_pack.js", ctx, log);
    mounted += await mountModule(walls,   "solid_walls.js", ctx, log);
    mounted += await mountModule(tableF,  "table_factory.js", ctx, log);
    mounted += await mountModule(rail,    "spectator_rail.js", ctx, log);

    // Teleport machine (center-back typically)
    mounted += await mountModule(tpMach,  "teleport_machine.js", ctx, log);

    // Store (LEFT)
    mounted += await mountModule(store,   "store.js", ctx, log);

    // ShopUI (optional)
    mounted += await mountModule(shopUI,  "shop_ui.js", ctx, log);

    // Water fountain (optional)
    mounted += await mountModule(water,   "water_fountain.js", ctx, log);

    // HUD UI modules
    mounted += await mountModule(uiMod,   "ui.js", ctx, log);
    mounted += await mountModule(vrui,    "vr_ui.js", ctx, log);
    mounted += await mountModule(vrPanel, "vr_ui_panel.js", ctx, log);

    // Scorpion Room (RIGHT)
    mounted += await mountModule(scorp,   "scorpion_room.js", ctx, log);

    // Room manager last (hooks)
    mounted += await mountModule(rm,      "room_manager.js", ctx, log);

    // ---- LAYOUT ENFORCEMENT ----
    // If modules created groups, position them here.
    // Table stays center (0,0,0). Store left (-7,0,0). Scorpion right (+7,0,0).
    const findByName = (name) => scene.getObjectByName(name);

    const storeRoot = findByName("store_root") || findByName("store") || findByName("StoreSystem");
    if (storeRoot) storeRoot.position.set(-7, 0, 0);

    const scorpRoot = findByName("scorpion_room") || findByName("scorpion") || findByName("ScorpionRoom");
    if (scorpRoot) scorpRoot.position.set(7, 0, 0);

    const tableRoot = findByName("poker_table") || findByName("table") || findByName("table_root");
    if (tableRoot) tableRoot.position.set(0, 0, 0);

    // ---- UPDATE LOOP ----
    W.update = (dt)=>{
      // let vr_ui update run if present
      if (W.__ui?.update) {
        try { W.__ui.update(dt); } catch {}
      }
    };

    // Mark loaded
    W.__realLoaded = mounted > 0;
    ui(log, W.__realLoaded
      ? `[world] ✅ REAL WORLD LOADED (mounted=${mounted})`
      : `[world] ❌ REAL WORLD DID NOT LOAD (mounted=${mounted})`
    );

    window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
    ui(log, "[world] init complete ✅");

    return W;
  }
};

export default World;
