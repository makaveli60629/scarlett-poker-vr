// /js/world.js — Scarlett VR Poker (World Loader V3.2 FULL)
// Adds: lobby spawn standing, join table sit, spectate stand.
// Keeps: fallback build + module loader + collision + flags.

window.dispatchEvent(new CustomEvent("scarlett-log",{detail:"[world] ✅ LOADER SIGNATURE: WORLD.JS V3.2 ACTIVE"}));

function ui(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
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

async function callWithAdapters(fn, label, ctx){
  const { THREE, scene, renderer, camera, player, controllers, world } = ctx;
  const attempts = [
    { args: [ctx], note:"(ctx)" },
    { args: [scene], note:"(scene)" },
    { args: [THREE, scene], note:"(THREE, scene)" },
    { args: [scene, ctx], note:"(scene, ctx)" },
    { args: [ctx, scene], note:"(ctx, scene)" },
    { args: [THREE, scene, renderer], note:"(THREE, scene, renderer)" },
    { args: [scene, renderer, camera], note:"(scene, renderer, camera)" },
    { args: [THREE, scene, renderer, camera], note:"(THREE, scene, renderer, camera)" },
    { args: [world], note:"(world)" },
  ];
  let lastErr = null;
  for (const a of attempts){
    ui(`[world] calling ${label} ${a.note}`);
    try { const r = await fn(...a.args); ui(`[world] ✅ ok ${label} ${a.note}`); return { ok:true, result:r }; }
    catch (e){ lastErr = e; ui(`[world] ⚠️ retry ${label} after error: ${e?.message || e}`); }
  }
  ui(`[world] ❌ all call adapters failed for ${label}: ${lastErr?.message || lastErr}`);
  return { ok:false, error:lastErr };
}

async function mountObject(obj, label, ctx){
  if (!obj || typeof obj !== "object") return false;
  for (const m of ["init","mount","build","create","spawn","setup","addToScene","attach","start"]){
    if (typeof obj[m] === "function"){
      const { ok } = await callWithAdapters(obj[m].bind(obj), `${label}.${m}`, ctx);
      return ok;
    }
  }
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
  for (const n of ["init","mount","build","create","setup","boot","start","initVRUI"]){
    if (typeof mod[n] === "function"){
      const { ok } = await callWithAdapters(mod[n], `${label}.${n}`, ctx);
      return ok;
    }
  }
  if (typeof mod.default === "function"){
    const { ok } = await callWithAdapters(mod.default, `${label}.default`, ctx);
    return ok;
  }
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
      seatMarkers: [],
      spectatorSpots: [],
      flags: { teleport:true, move:true, snap:true, hands:true },
      mode: "lobby",
      seatedIndex: -1,
      _playerYaw: Math.PI,
      _realLoaded: false,
      textureKit: null,
      Inventory: null,
      update: () => {},
    };

    // Required API
    W.setFlag = (key, value) => { W.flags[key] = !!value; };
    W.getFlag = (key) => !!W.flags?.[key];
    W.setMode = (m) => { W.mode = String(m || "lobby"); };
    W.getMode = () => W.mode || "lobby";

    // LOBBY STAND / TABLE SIT / SPECTATE STAND
    W.standPlayerInLobby = () => {
      W.setMode("lobby");
      W.seatedIndex = -1;
      if (player){
        player.position.set(0, (renderer?.xr?.isPresenting ? 0 : 1.7), 9);
        W._playerYaw = Math.PI;
        player.rotation.y = W._playerYaw;
      }
      ui("[world] stand lobby ✅");
    };

    W.joinTable = (seatIndex=0) => {
      W.setMode("table");
      const s = W.seats.find(x => x.index === seatIndex) || W.seats[0];
      W.seatedIndex = s?.index ?? 0;
      if (player && s){
        player.position.set(s.position.x, (renderer?.xr?.isPresenting ? 0 : 1.35), s.position.z);
        W._playerYaw = s.yaw;
        player.rotation.y = W._playerYaw;
      }
      ui(`[world] join table -> sit seat=${W.seatedIndex} ✅`);
    };

    W.spectate = (spotIndex=0) => {
      W.setMode("spectate");
      W.seatedIndex = -1;
      const s = W.spectatorSpots[spotIndex % W.spectatorSpots.length] || { pos:new THREE.Vector3(0,0,6), yaw:Math.PI };
      if (player){
        player.position.set(s.pos.x, (renderer?.xr?.isPresenting ? 0 : 1.7), s.pos.z);
        W._playerYaw = s.yaw;
        player.rotation.y = W._playerYaw;
      }
      ui(`[world] spectate spot=${spotIndex} ✅`);
    };

    // Collision
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
      p.x = Math.max(-13.7, Math.min(13.7, p.x));
      p.z = Math.max(-13.7, Math.min(13.7, p.z));
      return p;
    };

    // Tap/click seat marker to sit (only from lobby/spectate)
    const pickRay = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function tryPickSeat(clientX, clientY){
      if (!W.seatMarkers.length) return null;
      ndc.x = (clientX / innerWidth) * 2 - 1;
      ndc.y = -(clientY / innerHeight) * 2 + 1;
      pickRay.setFromCamera(ndc, camera);
      const hits = pickRay.intersectObjects(W.seatMarkers, true);
      if (!hits?.length) return null;
      const seat = hits[0].object?.userData?.seatIndex;
      return (typeof seat === "number") ? seat : null;
    }

    addEventListener("pointerdown", (e)=>{
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
      if (tag === "button") return;
      const mode = W.getMode();
      if (mode !== "lobby" && mode !== "spectate") return;
      const seat = tryPickSeat(e.clientX, e.clientY);
      if (seat !== null) W.joinTable(seat);
    }, { passive:true });

    addEventListener("scarlett-join-table", (e)=> W.joinTable(Number(e?.detail?.seat ?? 0)));
    addEventListener("scarlett-stand-lobby", ()=> W.standPlayerInLobby());
    addEventListener("scarlett-spectate", (e)=> W.spectate(Number(e?.detail?.spot ?? 0)));

    // Fallback world
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
    floor.name = "floor_fallback";
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color:0x1a1f33, roughness:0.9, metalness:0.05 });
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(60,4.4,1), wallMat); wallN.position.set(0,2.2,-15); scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(60,4.4,1), wallMat); wallS.position.set(0,2.2, 15); scene.add(wallS);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1,4.4,60), wallMat); wallW.position.set(-15,2.2,0); scene.add(wallW);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(1,4.4,60), wallMat); wallE.position.set( 15,2.2,0); scene.add(wallE);

    scene.userData.colliders = scene.userData.colliders || [];

    function addColliderBox(pos, size){
      const geo = new THREE.BoxGeometry(size.sx, size.sy, size.sz);
      const mat = new THREE.MeshBasicMaterial({ visible:false });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pos.x,pos.y,pos.z);
      scene.add(m);
      W.colliders.push(m);
      scene.userData.colliders.push(m);
    }

    addColliderBox({x:0,y:2.2,z:-15},{sx:60,sy:4.4,sz:1});
    addColliderBox({x:0,y:2.2,z: 15},{sx:60,sy:4.4,sz:1});
    addColliderBox({x:-15,y:2.2,z:0},{sx:1,sy:4.4,sz:60});
    addColliderBox({x:15,y:2.2,z:0},{sx:1,sy:4.4,sz:60});

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3,2.3,0.22,64),
      new THREE.MeshStandardMaterial({ color:0x0b3a2a, roughness:0.8, metalness:0.05 })
    );
    tableTop.position.set(0,1.02,0);
    scene.add(tableTop);

    // Seats + markers
    const seatRadius = 3.35;
    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2 + Math.PI;
      const px = Math.cos(a)*seatRadius;
      const pz = Math.sin(a)*seatRadius;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.19, 64),
        new THREE.MeshBasicMaterial({ color:0xffcc00, transparent:true, opacity:0.55, side:THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI/2;
      ring.position.set(px, 0.02, pz);
      ring.userData.seatIndex = i;
      scene.add(ring);

      W.seatMarkers.push(ring);
      W.seats.push({ index:i, position:new THREE.Vector3(px,0,pz), yaw:a+Math.PI });
    }

    // Spectator spots
    const specR = 6.2;
    for (let i=0;i<6;i++){
      const a = (i/6)*Math.PI*2 + Math.PI;
      W.spectatorSpots.push({ pos:new THREE.Vector3(Math.cos(a)*specR,0,Math.sin(a)*specR), yaw:(a+Math.PI) });
    }

    ui("[world] fallback built ✅");

    // Async “real world” module mounts (same as your working loader)
    (async ()=>{
      const ctx = { THREE, scene, renderer, camera, player, controllers, world: W, log };

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

      await imp("./teleport_fx.js");
      await imp("./TeleportVFX.js");
      await imp("./teleport_burst_fx.js");

      ui("[world] ⚠️ store_kiosk.js skipped for now (will re-enable after cache reset)");

      let mounted = 0;

      if (textures?.createTextureKit){
        try {
          W.textureKit = textures.createTextureKit({ THREE, renderer, base:"./assets/" });
          scene.userData.textureKit = W.textureKit;
          ui("[world] ✅ mounted textures via createTextureKit()");
          mounted++;
        } catch (e){ ui("[world] ❌ createTextureKit failed :: " + (e?.message || e)); }
      }

      mounted += (await mountModule(lights, "lights_pack.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(walls,  "solid_walls.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(tableF, "table_factory.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(rail,   "spectator_rail.js", ctx)) ? 1 : 0;

      if (tpMach?.TeleportMachine){
        const ok = await mountObject(tpMach.TeleportMachine, "teleport_machine.js.TeleportMachine", ctx);
        if (ok) mounted++;
      } else mounted += (await mountModule(tpMach,"teleport_machine.js",ctx)) ? 1 : 0;

      mounted += (await mountModule(store,  "store.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(shopUI, "shop_ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(water,  "water_fountain.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(uiMod,  "ui.js", ctx)) ? 1 : 0;
      mounted += (await mountModule(vrui,   "vr_ui.js", ctx)) ? 1 : 0;

      if (vrPanel?.init){
        try { await vrPanel.init(ctx); ui("[world] ✅ mounted vr_ui_panel.js via init()"); mounted++; }
        catch (e){ ui("[world] ❌ vr_ui_panel init failed :: " + (e?.message || e)); }
      }

      if (Array.isArray(scene.userData?.colliders)){
        for (const c of scene.userData.colliders) if (c && !W.colliders.includes(c)) W.colliders.push(c);
        ui("[world] colliders merged ✅");
      }

      W._realLoaded = mounted > 0;
      ui(W._realLoaded ? `[world] ✅ REAL WORLD LOADED (mounted=${mounted})` : "[world] ❌ REAL WORLD DID NOT LOAD (mounted=0)");
      dispatchEvent(new CustomEvent("scarlett-world-loaded",{detail:{mounted}}));
    })();

    ui("[world] init complete ✅");
    return W;
  }
};
