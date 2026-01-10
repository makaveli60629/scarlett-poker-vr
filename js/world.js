// /js/world.js — SCARLETT HYBRID WORLD v15.0 (FULL)
// Tries OLD modular lobby first (textures/lights/walls/table/rail/teleport/store/scorpion/room_manager)
// Falls back to SAFE procedural world (v12.3) if anything fails.
// Exposes initWorld(...) so your existing main.js still works.

function ui(log, m){
  try { (log || console.log)(m); } catch {}
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
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
  ui(log, `[world] ❌ adapters failed for ${label}: ${lastErr?.message || lastErr}`);
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
  ui(log, `[world] ⚠️ imported ${label} but nothing mounted`);
  return 0;
}

// -------------------------
// SAFE procedural fallback (your v12.3 world, kept intact)
// -------------------------
async function buildProceduralWorld({ THREE, scene, log="console" } = {}){
  const world = {
    spawn: { x: 0, z: 3.6 },
    spawnYaw: 0,
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    tableY: 0.92,
    chairs: [],
    seats: [],
    colliders: [],
    floorMeshes: [],
    cameraRef: null,
    connect() {},
    fixSeating() {},
    tick() {},
    clickFromCamera() {},
    teleportFromCamera() {},
  };

  const matFloor = new THREE.MeshStandardMaterial({ color: 0x080912, roughness: 1.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1.0 });
  const matTrim  = new THREE.MeshStandardMaterial({ color: 0x161a28, roughness: 0.65, metalness: 0.1 });
  const matNeonA = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x113344, emissiveIntensity: 1.0, roughness: 0.25 });
  const matNeonP = new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0x330814, emissiveIntensity: 1.1, roughness: 0.25 });

  const room = new THREE.Group();
  room.name = "RoomRoot";
  scene.add(room);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  room.add(floor);
  world.floorMeshes.push(floor);

  function addWall(x,y,z,w,h,d,name){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matWall);
    m.position.set(x,y,z);
    m.name = name;
    room.add(m);
    world.colliders.push(m);
  }
  addWall(0, 2.5, -18, 36, 5, 0.35, "WallBack");
  addWall(0, 2.5,  18, 36, 5, 0.35, "WallFront");
  addWall(-18, 2.5, 0, 0.35, 5, 36, "WallLeft");
  addWall( 18, 2.5, 0, 0.35, 5, 36, "WallRight");

  const trim = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.12, 10, 96), matTrim);
  trim.rotation.x = Math.PI / 2;
  trim.position.set(0, 3.85, -6.5);
  room.add(trim);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 0.08), matNeonA);
  sign.position.set(0, 2.65, -12.8);
  room.add(sign);

  // Table FIXED: felt lies flat via rotation.x = Math.PI/2 not required when using Cylinder as top surface
  const table = new THREE.Group();
  table.name = "PokerTable";

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.95, 0.78, 36),
    new THREE.MeshStandardMaterial({ color: 0x141621, roughness: 0.9, metalness: 0.08 })
  );
  base.position.y = 0.39;
  table.add(base);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.08, 56),
    new THREE.MeshStandardMaterial({ color: 0x0e5a3b, roughness: 0.95 })
  );
  felt.position.y = world.tableY;
  table.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.60, 0.10, 16, 90),
    new THREE.MeshStandardMaterial({ color: 0x1a1c2a, roughness: 0.55, metalness: 0.12 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = world.tableY + 0.03;
  table.add(rail);

  table.position.set(world.tableFocus.x, 0, world.tableFocus.z);
  room.add(table);

  // Chairs
  const chairRadius = 2.35;
  const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
  function makeChair(){
    const c = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.52), matTrim);
    seat.position.y = 0.45; c.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.09), matTrim);
    back.position.set(0, 0.74, -0.215); c.add(back);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    for (const dx of [-0.20, 0.20]) for (const dz of [-0.20, 0.20]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(dx, 0.225, dz);
      c.add(leg);
    }
    return c;
  }
  for (let i=0;i<6;i++){
    const a = angles[i];
    const chair = makeChair();
    chair.position.set(world.tableFocus.x + Math.cos(a)*chairRadius, 0, world.tableFocus.z + Math.sin(a)*chairRadius);
    chair.lookAt(world.tableFocus.x, chair.position.y, world.tableFocus.z);
    room.add(chair);
    world.chairs.push(chair);
    world.seats.push(chair);
  }

  // Floating orb (FIX: not a “fat green ball”)
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.10, 18, 18), matNeonP);
  orb.position.set(0, 2.4, world.tableFocus.z);
  room.add(orb);

  world.connect = ({ camera, playerRig } = {}) => {
    world.cameraRef = camera || world.cameraRef;
    world.playerRig = playerRig || world.playerRig;
  };
  world.tick = (dt) => {
    orb.rotation.y += dt * 1.2;
    orb.position.y = 2.4 + Math.sin(performance.now()*0.002)*0.06;
  };

  // Android helpers
  const raycaster = new THREE.Raycaster();
  world.clickFromCamera = () => {
    if (!world.cameraRef) return;
    const origin = new THREE.Vector3(); world.cameraRef.getWorldPosition(origin);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(world.cameraRef.quaternion).normalize();
    raycaster.set(origin, dir); raycaster.far = 60;
    const hits = raycaster.intersectObjects(scene.children, true);
    if (!hits.length) return;
    let n = hits[0].object;
    while (n && !n.userData?.onClick && n.parent) n = n.parent;
    n?.userData?.onClick?.();
  };
  world.teleportFromCamera = () => {
    if (!world.cameraRef || !world.playerRig) return;
    const origin = new THREE.Vector3(); world.cameraRef.getWorldPosition(origin);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(world.cameraRef.quaternion).normalize();
    if (Math.abs(dir.y) < 1e-4) return;
    const t = -origin.y / dir.y;
    if (t < 0.2 || t > 150) return;
    const hit = origin.clone().addScaledVector(dir, t);
    world.playerRig.position.set(hit.x, 0, hit.z);
  };

  ui(log, "[world] ✅ procedural fallback built");
  return world;
}

// -------------------------
// MAIN ENTRY: initWorld()
// -------------------------
export async function initWorld({ THREE, scene, renderer, camera, player, controllers, log, v } = {}){
  const ctx = { THREE, scene, renderer, camera, player, controllers, log };

  // World object shared to modules
  const W = {
    spawn: { x: 0, z: 3.6 },
    spawnYaw: 0,
    tableFocus: new THREE.Vector3(0,0,-6.5),
    tableY: 0.92,
    colliders: [],
    interactables: [],
    uiPanels: [],
    uiButtons: [],
    rayTargets: [],
    mode: "lobby",
    connect(){},
    tick(){},
  };
  ctx.world = W;
  scene.userData.interactables = W.interactables;

  // Try OLD modular world
  ui(log, "[world] trying modular lobby…");
  const textures = await imp("./textures.js");
  const lights   = await imp("./lights_pack.js");
  const walls    = await imp("./solid_walls.js");
  const tableF   = await imp("./table_factory.js");
  const rail     = await imp("./spectator_rail.js");
  const tpMach   = await imp("./teleport_machine.js");
  const store    = await imp("./store.js");
  const uiMod    = await imp("./ui.js");
  const vrui     = await imp("./vr_ui.js");
  const vrPanel  = await imp("./vr_ui_panel.js");
  const scorp    = await imp("./scorpion_room.js");
  const rm       = await imp("./room_manager.js");

  // Mount texture kit first if present
  if (textures?.createTextureKit && renderer){
    try{
      const kit = textures.createTextureKit({ THREE, renderer, base:"./assets/textures/", log });
      scene.userData.textureKit = kit;
      ui(log, "[world] ✅ textures kit mounted");
    }catch(e){
      ui(log, "[world] ⚠️ texture kit failed: " + (e?.message||e));
    }
  }

  let mounted = 0;
  mounted += await mountModule(lights,  "lights_pack.js", ctx, log);
  mounted += await mountModule(walls,   "solid_walls.js", ctx, log);
  mounted += await mountModule(tableF,  "table_factory.js", ctx, log);
  mounted += await mountModule(rail,    "spectator_rail.js", ctx, log);
  mounted += await mountModule(tpMach,  "teleport_machine.js", ctx, log);
  mounted += await mountModule(store,   "store.js", ctx, log);
  mounted += await mountModule(uiMod,   "ui.js", ctx, log);
  mounted += await mountModule(vrui,    "vr_ui.js", ctx, log);
  mounted += await mountModule(vrPanel, "vr_ui_panel.js", ctx, log);
  mounted += await mountModule(scorp,   "scorpion_room.js", ctx, log);
  mounted += await mountModule(rm,      "room_manager.js", ctx, log);

  if (mounted > 0){
    ui(log, `[world] ✅ modular world mounted (${mounted})`);
    // Best-effort: expose clickables for Android
    W.clickFromCamera = W.clickFromCamera || (()=>{});
    W.teleportFromCamera = W.teleportFromCamera || (()=>{});
    W.connect = ({ playerRig, camera } = {}) => { W.playerRig = playerRig; W.cameraRef = camera; };

    // Try to set a sane spawn if RoomManager didn’t
    if (!W.spawn) W.spawn = { x: 0, z: 3.6 };
    if (!W.tableFocus) W.tableFocus = new THREE.Vector3(0,0,-6.5);

    return W;
  }

  // Fallback
  ui(log, "[world] modular failed → using procedural fallback");
  const fallback = await buildProceduralWorld({ THREE, scene, log });
  // Merge into W so main.js pipeline still sees expected fields
  Object.assign(W, fallback);
  return W;
}
