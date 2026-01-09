window.dispatchEvent(new CustomEvent("scarlett-log",{detail:"[world] ✅ LOADER SIGNATURE: WORLD.JS V3 ACTIVE"}));
// /js/world.js — Scarlett VR Poker (World Loader V3)
// Fixes:
//  - scene.add is not a function (modules expecting scene arg, not ctx)
//  - ShopUI expects Inventory.getChips()
//  - keeps debug logging via scarlett-log

function ui(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
}

async function imp(path){
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

// Try multiple calling conventions for a given function.
// This is THE fix for LightsPack/SolidWalls/WaterFountain style modules.
async function callWithAdapters(fn, label, ctx){
  const { THREE, scene, renderer, camera, player, controllers, world } = ctx;

  // Most common patterns seen in modular Three.js projects:
  const attempts = [
    { args: [ctx],                           note: "(ctx)" },
    { args: [scene],                         note: "(scene)" },
    { args: [THREE, scene],                  note: "(THREE, scene)" },
    { args: [scene, ctx],                    note: "(scene, ctx)" },
    { args: [ctx, scene],                    note: "(ctx, scene)" },
    { args: [THREE, scene, renderer],        note: "(THREE, scene, renderer)" },
    { args: [scene, renderer, camera],       note: "(scene, renderer, camera)" },
    { args: [THREE, scene, renderer, camera],note: "(THREE, scene, renderer, camera)" },
    { args: [world],                         note: "(world)" },
  ];

  let lastErr = null;

  for (const a of attempts){
    ui(`[world] calling ${label} ${a.note}`);
    try {
      const r = await fn(...a.args);
      ui(`[world] ✅ ok ${label} ${a.note}`);
      return { ok:true, result:r };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);

      // If we see the classic mismatch, keep trying next adapter
      if (msg.includes("scene.add is not a function") || msg.includes("Cannot read") || msg.includes("undefined")) {
        ui(`[world] ⚠️ retry ${label} after error: ${msg}`);
        continue;
      }

      // For other errors, still continue trying adapters (some modules are picky),
      // but we log it clearly.
      ui(`[world] ⚠️ ${label} failed ${a.note}: ${msg}`);
      continue;
    }
  }

  ui(`[world] ❌ all call adapters failed for ${label}: ${lastErr?.message || lastErr}`);
  return { ok:false, error:lastErr };
}

async function mountObject(obj, label, ctx){
  if (!obj || typeof obj !== "object") return false;

  const preferred = ["init","mount","build","create","spawn","setup","addToScene","attach"];

  for (const name of preferred){
    if (typeof obj[name] === "function"){
      const { ok } = await callWithAdapters(obj[name].bind(obj), `${label}.${name}`, ctx);
      if (ok) return true;
      return false;
    }
  }

  // If it has only one function key, call it.
  const fnKeys = Object.keys(obj).filter(k => typeof obj[k] === "function");
  if (fnKeys.length === 1){
    const k = fnKeys[0];
    const { ok } = await callWithAdapters(obj[k].bind(obj), `${label}.${k}`, ctx);
    return ok;
  }

  ui(`[world] ⚠️ ${label} imported but no callable method found. keys=${Object.keys(obj).join(",")}`);
  return false;
}

async function mountModule(mod, label, ctx){
  if (!mod) return false;

  // function exports
  const fnNames = ["init","mount","build","create","setup","boot","start","initVRUI"];
  for (const n of fnNames){
    if (typeof mod[n] === "function"){
      const { ok } = await callWithAdapters(mod[n], `${label}.${n}`, ctx);
      return ok;
    }
  }

  // default export function
  if (typeof mod.default === "function"){
    const { ok } = await callWithAdapters(mod.default, `${label}.default`, ctx);
    return ok;
  }

  // object exports (your common pattern)
  for (const k of Object.keys(mod)){
    if (mod[k] && typeof mod[k] === "object"){
      const ok = await mountObject(mod[k], `${label}.${k}`, ctx);
      if (ok) return true;
    }
  }

  ui(`[world] ⚠️ imported ${label} but nothing mounted. exports=${Object.keys(mod).join(",")}`);
  return false;
}

export const World = {
  init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      seats: [],
      flags: { teleport:true, move:true, snap:true, hands:true },
      seatedIndex: -1,
      _playerYaw: Math.PI,
      _realLoaded: false,
      textureKit: null,
      Inventory: null, // we'll add shim
    };

    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

    function addColliderBox(pos, size, name="collider"){
      const geo = new THREE.BoxGeometry(size.sx, size.sy, size.sz);
      const mat = new THREE.MeshBasicMaterial({ visible:false });
      const m = new THREE.Mesh(geo, mat);
      m.name = name;
      m.position.set(pos.x,pos.y,pos.z);
      scene.add(m);
      W.colliders.push(m);
      return m;
    }
    function addRingMarker(pos, r0, r1, color){
      const g = new THREE.RingGeometry(r0,r1,64);
      const m = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85, side:THREE.DoubleSide });
      const ring = new THREE.Mesh(g,m);
      ring.rotation.x = -Math.PI/2;
      ring.position.copy(pos);
      ring.position.y = 0.02;
      scene.add(ring);
      return ring;
    }

    // ---- FALLBACK ----
    ui("[world] fallback world building…");

    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 12, 90);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6,10,6);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60,60),
      new THREE.MeshStandardMaterial({ color:0x111421, roughness:0.95, metalness:0.05 })
    );
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color:0x1a1f33, roughness:0.9, metalness:0.05 });
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(60,4.4,1), wallMat); wallN.position.set(0,2.2,-15); scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(60,4.4,1), wallMat); wallS.position.set(0,2.2, 15); scene.add(wallS);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1,4.4,60), wallMat); wallW.position.set(-15,2.2,0); scene.add(wallW);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(1,4.4,60), wallMat); wallE.position.set( 15,2.2,0); scene.add(wallE);

    addColliderBox({x:0,y:2.2,z:-15},{sx:60,sy:4.4,sz:1},"col_wall_n");
    addColliderBox({x:0,y:2.2,z: 15},{sx:60,sy:4.4,sz:1},"col_wall_s");
    addColliderBox({x:-15,y:2.2,z:0},{sx:1,sy:4.4,sz:60},"col_wall_w");
    addColliderBox({x:15,y:2.2,z:0},{sx:1,sy:4.4,sz:60},"col_wall_e");

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3,2.3,0.22,64),
      new THREE.MeshStandardMaterial({ color:0x0b3a2a, roughness:0.8, metalness:0.05 })
    );
    tableTop.position.set(0,1.02,0);
    scene.add(tableTop);

    const seatRadius = 3.35;
    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2 + Math.PI;
      const px = Math.cos(a)*seatRadius;
      const pz = Math.sin(a)*seatRadius;
      const mark = addRingMarker(new THREE.Vector3(px,0,pz),0.12,0.19,0xffcc00);
      mark.material.opacity = 0.55;
      W.seats.push({ index:i, position:new THREE.Vector3(px,0,pz), yaw:a+Math.PI });
    }

    ui("[world] fallback built ✅");

    // ---- Inventory shim (fix ShopUI.init crash) ----
    // If your real Inventory exists later, this can be replaced.
    W.Inventory = W.Inventory || {
      getChips(){
        // simple starter set
        return [
          { denom: 1,   color: "white" },
          { denom: 5,   color: "red" },
          { denom: 25,  color: "green" },
          { denom: 100, color: "black" },
          { denom: 500, color: "purple" },
          { denom: 1000,color: "gold" },
        ];
      },
      getChipDenoms(){
        return [1,5,25,100,500,1000];
      }
    };

    // ---- REAL WORLD LOAD ----
    (async () => {
      const ctx = { THREE, scene, renderer, camera, player, controllers, world: W, log, Inventory: W.Inventory };

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

      // Optional FX (these already worked for you)
      await imp("./teleport_fx.js");
      await imp("./TeleportVFX.js");
      await imp("./teleport_burst_fx.js");

      // NOTE: store_kiosk.js can be re-enabled later; keep it off until cache is clean.
      ui("[world] ⚠️ store_kiosk.js skipped for now (will re-enable after cache reset)");

      let mounted = 0;

      // textures kit
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

      // Mount everything using adapters
      mounted += (await mountModule(lights,  "lights_pack.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(walls,   "solid_walls.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(tableF,  "table_factory.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(rail,    "spectator_rail.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(tpMach,  "teleport_machine.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(store,   "store.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(shopUI,  "shop_ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(water,   "water_fountain.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(uiMod,   "ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(vrui,    "vr_ui.js", ctx)) ? 1 : 0;

      // vr panel
      if (vrPanel?.init) {
        try { await vrPanel.init(ctx); ui("[world] ✅ mounted vr_ui_panel.js via init()"); mounted++; }
        catch (e){ ui("[world] ❌ vr_ui_panel init failed :: " + (e?.message || e)); }
      }

      // Merge colliders if modules register them
      if (Array.isArray(scene.userData?.colliders)) {
        for (const c of scene.userData.colliders) if (c && !W.colliders.includes(c)) W.colliders.push(c);
        ui("[world] colliders merged ✅");
      }

      W._realLoaded = mounted > 0;
      ui(W._realLoaded
        ? `[world] ✅ REAL WORLD LOADED (mounted=${mounted})`
        : "[world] ❌ REAL WORLD DID NOT LOAD (mounted=0)"
      );

      window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
    })();

    // Collision helper kept
    W.resolvePlayerCollision = (fromPos, toPos) => {
      const radius = 0.28;
      const p = toPos.clone();

      for (const c of W.colliders){
        const box = new THREE.Box3().setFromObject(c);
        box.min.x -= radius; box.max.x += radius;
        box.min.z -= radius; box.max.z += radius;

        const yProbe = 1.0;
        if (yProbe < box.min.y || yProbe > box.max.y) continue;

        if (p.x > box.min.x && p.x < box.max.x && p.z > box.min.z && p.z < box.max.z){
          const dxMin = Math.abs(p.x - box.min.x);
          const dxMax = Math.abs(box.max.x - p.x);
          const dzMin = Math.abs(p.z - box.min.z);
          const dzMax = Math.abs(box.max.z - p.z);
          const m = Math.min(dxMin,dxMax,dzMin,dzMax);

          if (m === dxMin) p.x = box.min.x;
          else if (m === dxMax) p.x = box.max.x;
          else if (m === dzMin) p.z = box.min.z;
          else p.z = box.max.z;
        }
      }

      p.x = clamp(p.x, -13.7, 13.7);
      p.z = clamp(p.z, -13.7, 13.7);
      return p;
    };

    ui("[world] init complete ✅");
    return W;
  }
};
