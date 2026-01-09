// /js/world.js — Real Mount Loader for Scarlett VR Poker
// Uses your log panel via scarlett-log messages.
// Mounts object exports (LightsPack, SolidWalls, etc.) + function exports (initVRUI, init)

function ui(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
}

async function tryImport(path){
  const v = encodeURIComponent(window.__BUILD_V || Date.now().toString());
  const url = path.includes("?") ? `${path}&v=${v}` : `${path}?v=${v}`;
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

async function callAny(obj, names, ctx, label){
  for (const n of names){
    if (typeof obj?.[n] === "function"){
      ui(`[world] calling ${label}.${n}()`);
      try { await obj[n](ctx); ui(`[world] ✅ ok ${label}.${n}()`); return true; }
      catch (e){ ui(`[world] ❌ threw ${label}.${n}() :: ${e?.message || e}`); return false; }
    }
  }
  return false;
}

export const World = {
  init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      seats: [],
      flags: { teleport:true, move:true, snap:true, hands:true },
      mode: "lobby",
      seatedIndex: -1,
      _playerYaw: Math.PI,
      _realLoaded: false,
      textureKit: null,
    };

    W.isRealWorldLoaded = () => !!W._realLoaded;

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

    // -----------------------
    // FALLBACK WORLD
    // -----------------------
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

    // -----------------------
    // REAL WORLD LOAD
    // -----------------------
    (async () => {
      const ctx = { THREE, scene, renderer, camera, player, controllers, world: W, log };

      // Import what exists (based on your log)
      const textures = await tryImport("./textures.js");
      const lights_pack = await tryImport("./lights_pack.js");
      const solid_walls = await tryImport("./solid_walls.js");
      const table_factory = await tryImport("./table_factory.js");
      const spectator_rail = await tryImport("./spectator_rail.js");
      const teleport_machine = await tryImport("./teleport_machine.js");
      const teleport_fx = await tryImport("./teleport_fx.js");
      const teleport_vfx = await tryImport("./TeleportVFX.js");
      const teleport_burst = await tryImport("./teleport_burst_fx.js");
      const store = await tryImport("./store.js");
      const shop_ui = await tryImport("./shop_ui.js");
      const water = await tryImport("./water_fountain.js");
      const uiMod = await tryImport("./ui.js");
      const vr_ui = await tryImport("./vr_ui.js");
      const vr_ui_panel = await tryImport("./vr_ui_panel.js");

      let mounted = 0;

      // textures.js -> createTextureKit()
      if (textures?.createTextureKit) {
        try {
          W.textureKit = textures.createTextureKit({ THREE, renderer, base: "./assets/" });
          scene.userData.textureKit = W.textureKit;
          mounted++;
          W._realLoaded = true;
          ui("[world] ✅ mounted textures via createTextureKit()");
        } catch (e) {
          ui("[world] ❌ textures.createTextureKit failed :: " + (e?.message || e));
        }
      }

      // lights_pack.js -> LightsPack object
      if (lights_pack?.LightsPack) {
        const ok = await callAny(lights_pack.LightsPack, ["init","mount","build","create","spawn","setup"], ctx, "LightsPack");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // solid_walls.js -> SolidWalls object
      if (solid_walls?.SolidWalls) {
        const ok = await callAny(solid_walls.SolidWalls, ["init","mount","build","create","spawn","setup"], ctx, "SolidWalls");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // table_factory.js -> TableFactory object
      if (table_factory?.TableFactory) {
        const ok = await callAny(table_factory.TableFactory, ["init","mount","build","create","spawn","setup"], ctx, "TableFactory");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // spectator_rail.js -> SpectatorRail object
      if (spectator_rail?.SpectatorRail) {
        const ok = await callAny(spectator_rail.SpectatorRail, ["init","mount","build","create","spawn","setup"], ctx, "SpectatorRail");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // teleport_machine.js -> TeleportMachine object
      if (teleport_machine?.TeleportMachine) {
        const ok = await callAny(teleport_machine.TeleportMachine, ["init","mount","build","create","spawn","setup"], ctx, "TeleportMachine");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // TeleportVFX.js -> TeleportVFX object
      if (teleport_vfx?.TeleportVFX) {
        const ok = await callAny(teleport_vfx.TeleportVFX, ["init","mount","build","create","spawn","setup"], ctx, "TeleportVFX");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // teleport_fx.js -> createTeleportFX()
      if (teleport_fx?.createTeleportFX) {
        try {
          const fx = teleport_fx.createTeleportFX(ctx);
          scene.userData.teleportFX = fx;
          mounted++;
          W._realLoaded = true;
          ui("[world] ✅ mounted teleport_fx via createTeleportFX()");
        } catch (e) {
          ui("[world] ❌ createTeleportFX failed :: " + (e?.message || e));
        }
      }

      // teleport_burst_fx.js -> createTeleportBurstFX()
      if (teleport_burst?.createTeleportBurstFX) {
        try {
          const fx = teleport_burst.createTeleportBurstFX(ctx);
          scene.userData.teleportBurstFX = fx;
          mounted++;
          W._realLoaded = true;
          ui("[world] ✅ mounted teleport_burst via createTeleportBurstFX()");
        } catch (e) {
          ui("[world] ❌ createTeleportBurstFX failed :: " + (e?.message || e));
        }
      }

      // store.js -> StoreSystem object
      if (store?.StoreSystem) {
        const ok = await callAny(store.StoreSystem, ["init","mount","build","create","spawn","setup"], ctx, "StoreSystem");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // shop_ui.js -> ShopUI object
      if (shop_ui?.ShopUI) {
        const ok = await callAny(shop_ui.ShopUI, ["init","mount","build","create","spawn","setup"], ctx, "ShopUI");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // water_fountain.js -> WaterFountain object
      if (water?.WaterFountain) {
        const ok = await callAny(water.WaterFountain, ["init","mount","build","create","spawn","setup"], ctx, "WaterFountain");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // ui.js -> UI object
      if (uiMod?.UI) {
        const ok = await callAny(uiMod.UI, ["init","mount","build","create","spawn","setup"], ctx, "UI");
        if (ok) { mounted++; W._realLoaded = true; }
      }

      // vr_ui.js -> initVRUI function
      if (typeof vr_ui?.initVRUI === "function") {
        ui("[world] calling initVRUI()");
        try { await vr_ui.initVRUI(ctx); mounted++; W._realLoaded = true; ui("[world] ✅ mounted vr_ui via initVRUI()"); }
        catch (e){ ui("[world] ❌ initVRUI failed :: " + (e?.message || e)); }
      }

      // vr_ui_panel.js -> init function
      if (typeof vr_ui_panel?.init === "function") {
        ui("[world] calling vr_ui_panel.init()");
        try { await vr_ui_panel.init(ctx); mounted++; W._realLoaded = true; ui("[world] ✅ mounted vr_ui_panel via init()"); }
        catch (e){ ui("[world] ❌ vr_ui_panel.init failed :: " + (e?.message || e)); }
      }

      // Merge colliders if your modules add them
      if (Array.isArray(scene.userData?.colliders)) {
        for (const c of scene.userData.colliders) if (c && !W.colliders.includes(c)) W.colliders.push(c);
        ui("[world] colliders merged from scene.userData ✅");
      }

      if (W._realLoaded) {
        ui(`[world] ✅ REAL WORLD LOADED (mounted=${mounted})`);
        window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
      } else {
        ui("[world] ❌ REAL WORLD DID NOT LOAD");
        window.dispatchEvent(new Event("scarlett-world-failed"));
      }
    })();

    // -----------------------
    // API used by main.js
    // -----------------------
    W.setMode = (m)=>{ W.mode = m; };
    W.setFlag = (k,v)=>{ if (k in W.flags) W.flags[k] = !!v; };
    W.getPlayerYaw = ()=>W._playerYaw;
    W.addPlayerYaw = (d)=>{ W._playerYaw += d; player.rotation.y = W._playerYaw; };

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

    W.sitPlayerAtSeat = (seatIndex) => {
      const s = W.seats.find(x => x.index === seatIndex) || W.seats[0];
      W.seatedIndex = s.index;
      player.position.x = s.position.x;
      player.position.z = s.position.z;
      W._playerYaw = s.yaw;
      player.rotation.y = W._playerYaw;
      player.position.y = renderer.xr.isPresenting ? 0 : 1.35;
      ui(`[world] sit seat=${W.seatedIndex}`);
    };

    W.standPlayerInLobby = () => {
      W.seatedIndex = -1;
      player.position.set(0, renderer.xr.isPresenting ? 0 : 1.7, 6);
      W._playerYaw = Math.PI;
      player.rotation.y = W._playerYaw;
      ui("[world] stand lobby");
    };

    W.update = () => {};
    player.rotation.y = W._playerYaw;

    ui("[world] init complete ✅");
    return W;
  }
};
