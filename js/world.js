// /js/world.js — Scarlett VR Poker — HYBRID WORLD LOADER v3.6 (REVIVE + AUDIT UPGRADE)
// Keeps: your dynamic import/mount adapter system
// Adds: room separation, room switching API, teleport-to-table, android click/teleport, solid bounds clamp
// Goal: bring back your "real lobby" world modules AND stabilize alignment/overlap issues.

window.dispatchEvent(new CustomEvent("scarlett-log", { detail: "[world] ✅ LOADER SIGNATURE: WORLD.JS V3.6 HYBRID ACTIVE" }));

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

/** --------------------------------------------------------
 *  ROOM LAYOUT (NO OVERLAP) — this fixes the “ring in two rooms” problem
 *  -------------------------------------------------------- */
function getRoomLayout(THREE){
  return {
    lobby:    new THREE.Vector3(0,   0,   0),
    store:    new THREE.Vector3(-45, 0,   0),
    scorpion: new THREE.Vector3(45,  0,   0),
    spectate: new THREE.Vector3(0,   0,  -45),
  };
}

function getRoomBounds(){
  // Local bounds per room center (simple clamp). Tune as you like.
  return {
    lobby:    { w: 40, d: 40 },
    store:    { w: 24, d: 28 },
    scorpion: { w: 20, d: 20 },
    spectate: { w: 22, d: 22 },
  };
}

/** --------------------------------------------------------
 *  FALLBACK WORLD (safe baseline, used if modules fail)
 *  -------------------------------------------------------- */
function buildFallback(ctx){
  const { THREE, scene, world, log } = ctx;
  ui(log, "[world] fallback world building…");
  if (world.__fallbackBuilt) return;
  world.__fallbackBuilt = true;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);
  world.colliders.push(floor);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.8, metalness: 0.05 })
  );
  tableTop.position.set(0, 1.02, 0);
  scene.add(tableTop);

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

  world.spectatorSpots = [];
  const specR = 6.2;
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI;
    world.spectatorSpots.push({ pos:new THREE.Vector3(Math.cos(a)*specR, 1.6, Math.sin(a)*specR), yaw:a+Math.PI });
  }

  ui(log, "[world] fallback built ✅");
}

/** --------------------------------------------------------
 *  HELPERS: find likely roots by multiple names
 *  -------------------------------------------------------- */
function findAny(scene, names){
  for (const n of names){
    const obj = scene.getObjectByName(n);
    if (obj) return obj;
  }
  return null;
}

function ensureRoomRoot(scene, THREE, name){
  let g = scene.getObjectByName(name);
  if (!g){
    g = new THREE.Group();
    g.name = name;
    scene.add(g);
  }
  return g;
}

function rehome(obj, newParent){
  if (!obj || !newParent) return;
  if (obj.parent === newParent) return;
  try { newParent.add(obj); } catch {}
}

/** --------------------------------------------------------
 *  MAIN WORLD EXPORT
 *  -------------------------------------------------------- */
export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const ctx = { THREE, scene, renderer, camera, player, controllers, log };

    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      seats: [],
      seatMarkers: [],
      spectatorSpots: [],
      points: {},
      flags: { teleport:true, move:true, snap:true, hands:true },
      mode: "lobby",
      seatedIndex: -1,
      __fallbackBuilt: false,
      __realLoaded: false,

      // room state (added)
      rooms: { current: "lobby", layout: getRoomLayout(THREE), bounds: getRoomBounds(), roots: {} },
    };

    // ✅ Pre-create arrays that UI modules often push into
    W.interactables = [];
    W.uiPanels = [];
    W.uiButtons = [];
    W.rayTargets = [];
    scene.userData.interactables = W.interactables;

    // ✅ Flags API always present
    W.setFlag = (k, v)=>{ W.flags[k] = !!v; };
    W.getFlag = (k)=>!!W.flags[k];
    W.toggleFlag = (k)=>{ W.flags[k] = !W.flags[k]; return W.flags[k]; };

    ctx.world = W;

    // Build fallback baseline immediately so something always exists
    buildFallback(ctx);

    // Inventory shim for shop_ui
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

    // --- Imports (your original full world)
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

    await imp("./teleport_fx.js");
    await imp("./TeleportVFX.js");
    await imp("./teleport_burst_fx.js");

    // Mount textures first
    if (textures?.createTextureKit) {
      try{
        const kit = textures.createTextureKit({ THREE, renderer, base:"./assets/textures/", log });
        scene.userData.textureKit = kit;
        ui(log, "[world] ✅ mounted textures via createTextureKit()");
      }catch(e){
        ui(log, "[world] ❌ createTextureKit failed :: " + (e?.message||e));
      }
    }

    // Mount world modules
    let mounted = 0;
    mounted += await mountModule(lights,  "lights_pack.js", ctx, log);
    mounted += await mountModule(walls,   "solid_walls.js", ctx, log);
    mounted += await mountModule(tableF,  "table_factory.js", ctx, log);
    mounted += await mountModule(rail,    "spectator_rail.js", ctx, log);
    mounted += await mountModule(tpMach,  "teleport_machine.js", ctx, log);
    mounted += await mountModule(store,   "store.js", ctx, log);
    mounted += await mountModule(shopUI,  "shop_ui.js", ctx, log);
    mounted += await mountModule(water,   "water_fountain.js", ctx, log);
    mounted += await mountModule(uiMod,   "ui.js", ctx, log);
    mounted += await mountModule(vrui,    "vr_ui.js", ctx, log);
    mounted += await mountModule(vrPanel, "vr_ui_panel.js", ctx, log);
    mounted += await mountModule(scorp,   "scorpion_room.js", ctx, log);
    mounted += await mountModule(rm,      "room_manager.js", ctx, log);

    W.__realLoaded = mounted > 0;
    ui(log, W.__realLoaded
      ? `[world] ✅ REAL WORLD LOADED (mounted=${mounted})`
      : `[world] ❌ REAL WORLD DID NOT LOAD (mounted=${mounted})`
    );

    /** --------------------------------------------------------
     *  ROOM ROOTS + ALIGNMENT AUDIT FIX
     *  This is the part that brings sanity back:
     *  - each room gets its own root group
     *  - we rehome module roots into those room roots when possible
     *  - we move room roots FAR apart to prevent overlap bleed
     *  -------------------------------------------------------- */
    const lobbyRoot    = ensureRoomRoot(scene, THREE, "room_lobby_root");
    const storeRoot    = ensureRoomRoot(scene, THREE, "room_store_root");
    const scorpionRoot = ensureRoomRoot(scene, THREE, "room_scorpion_root");
    const spectateRoot = ensureRoomRoot(scene, THREE, "room_spectate_root");

    W.rooms.roots = { lobby: lobbyRoot, store: storeRoot, scorpion: scorpionRoot, spectate: spectateRoot };

    lobbyRoot.position.copy(W.rooms.layout.lobby);
    storeRoot.position.copy(W.rooms.layout.store);
    scorpionRoot.position.copy(W.rooms.layout.scorpion);
    spectateRoot.position.copy(W.rooms.layout.spectate);

    // Try to find likely module roots and move them into the correct room root
    const foundStore = findAny(scene, ["store_root","store","StoreSystem","STORE_ROOT"]);
    const foundScorp = findAny(scene, ["scorpion_room","scorpion","ScorpionRoom","SCORPION_ROOT"]);
    const foundTable = findAny(scene, ["poker_table","table","table_root","TABLE_ROOT"]);
    const foundRail  = findAny(scene, ["spectator_rail","rail","SpectatorRail"]);
    const foundTp    = findAny(scene, ["teleport_machine","TeleportMachine","tp_machine","teleporter"]);

    // IMPORTANT: Only rehome if they are not already one of our room roots
    if (foundStore && foundStore !== storeRoot) rehome(foundStore, storeRoot);
    if (foundScorp && foundScorp !== scorpionRoot) rehome(foundScorp, scorpionRoot);

    // Lobby should contain the main table/rail/teleporter if those are global
    // (If your modules already build separate table per room, this won't hurt.)
    if (foundTable && foundTable !== lobbyRoot) rehome(foundTable, lobbyRoot);
    if (foundRail  && foundRail  !== lobbyRoot) rehome(foundRail,  lobbyRoot);
    if (foundTp    && foundTp    !== lobbyRoot) rehome(foundTp,    lobbyRoot);

    // Visibility control
    function setRoomVisible(room){
      W.rooms.current = room;
      lobbyRoot.visible    = (room === "lobby");
      storeRoot.visible    = (room === "store");
      scorpionRoot.visible = (room === "scorpion");
      spectateRoot.visible = (room === "spectate");
      ui(log, `[world] room=${room}`);
    }

    // Spawn helpers
    function faceYawToward(target){
      const pos = new THREE.Vector3(player.position.x, 1.6, player.position.z);
      const dir = target.clone().sub(pos); dir.y = 0;
      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();
      player.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    }

    function spawnInRoom(room){
      const base = W.rooms.layout[room].clone();
      if (room === "lobby"){
        player.position.copy(base).add(new THREE.Vector3(0, 0, 10));
        faceYawToward(base.clone().add(new THREE.Vector3(0,1.6,0)));
      }
      if (room === "store"){
        player.position.copy(base).add(new THREE.Vector3(0, 0, 8));
        faceYawToward(base.clone().add(new THREE.Vector3(0,1.6,0)));
      }
      if (room === "scorpion"){
        // corner spawn, face center table area
        player.position.copy(base).add(new THREE.Vector3(6, 0, 6));
        faceYawToward(base.clone().add(new THREE.Vector3(0,1.6,0)));
      }
      if (room === "spectate"){
        player.position.copy(base).add(new THREE.Vector3(0, 0, 7));
        faceYawToward(base.clone().add(new THREE.Vector3(0,1.6,0)));
      }
    }

    // Public API requested
    W.goRoom = (room)=>{
      if (!W.rooms.layout[room]) room = "lobby";
      setRoomVisible(room);
      spawnInRoom(room);
    };

    // Teleport-to-table: tries to find a table in scorpion room, else falls back to scorpion center
    W.teleportToTable = ()=>{
      // ensure scorpion visible so you can see it
      W.goRoom("scorpion");

      // try to find something table-like inside scorpion root
      const t =
        scorpionRoot.getObjectByName?.("poker_table") ||
        scorpionRoot.getObjectByName?.("table") ||
        scorpionRoot.getObjectByName?.("table_root");

      const center = (t)
        ? new THREE.Vector3().setFromMatrixPosition(t.matrixWorld)
        : W.rooms.layout.scorpion.clone();

      // land at a rail-ish spot in front of center
      const spot = center.clone().add(new THREE.Vector3(0, 0, 5.2));
      player.position.set(spot.x, 0, spot.z);
      faceYawToward(center.clone().setY(1.6));
      ui(log, "[world] teleportToTable ✅");
    };

    // Android helpers: click/teleport ray from camera
    const raycaster = new THREE.Raycaster();
    W.clickFromCamera = ()=>{
      const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
      const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
      raycaster.set(origin, dir); raycaster.far = 40;
      const hits = raycaster.intersectObjects(W.interactables?.length ? W.interactables : (scene.userData.interactables || []), true);
      if (!hits.length) return;
      const o = hits[0].object;
      let n = o;
      while (n && !n.userData?.onClick && n.parent) n = n.parent;
      n?.userData?.onClick?.();
    };

    W.teleportFromCamera = ()=>{
      const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
      const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
      if (Math.abs(dir.y) < 0.0001) return;
      const t = -origin.y / dir.y;
      if (t < 0.2 || t > 120) return;
      const hit = origin.clone().addScaledVector(dir, t);
      player.position.set(hit.x, 0, hit.z);
    };

    // Solid clamp (prevents walking through walls even when module collisions fail)
    function clampToRoomBounds(){
      const room = W.rooms.current || "lobby";
      const b = W.rooms.bounds[room] || { w: 36, d: 36 };
      const base = W.rooms.layout[room] || new THREE.Vector3();

      const halfW = (b.w/2) - 0.8;
      const halfD = (b.d/2) - 0.8;

      const local = player.position.clone().sub(base);
      local.x = Math.max(-halfW, Math.min(halfW, local.x));
      local.z = Math.max(-halfD, Math.min(halfD, local.z));

      const clamped = local.add(base);
      player.position.set(clamped.x, 0, clamped.z);
    }

    // Update hook: keep UI update + clamp
    W.update = (dt)=>{
      if (W.__ui?.update) { try { W.__ui.update(dt); } catch {} }
      clampToRoomBounds();
    };

    // Start in lobby (revived world)
    setRoomVisible("lobby");
    spawnInRoom("lobby");

    // Let main.js / vr_ui use it
    window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
    ui(log, "[world] init complete ✅");
    return W;
  }
};

export default World;
