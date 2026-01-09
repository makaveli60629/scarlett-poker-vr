// /js/world.js — Scarlett VR Poker (ORCHESTRATOR + HARD LOGGING + WIDE MANIFEST)
// You will SEE exactly what is failing in your on-screen log.

function ui(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
}

async function tryImport(path) {
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

async function callBest(mod, path, ctx) {
  if (!mod) return false;

  // Most common function names across your project history
  const names = [
    "init","boot","setup","mount","build","create","spawn","addToScene","start",
    "initWorld","buildWorld","mountWorld","createWorld",
    "initScene","buildScene","mountScene",
  ];

  // 1) direct named exports
  for (const n of names) {
    if (typeof mod[n] === "function") {
      ui(`[world] calling ${path} :: ${n}()`);
      try { await mod[n](ctx); ui(`[world] ✅ mounted ${path} via ${n}()`); return true; }
      catch (e) { ui(`[world] ❌ ${path} ${n}() threw :: ${e?.message || e}`); return false; }
    }
  }

  // 2) default export function
  if (typeof mod.default === "function") {
    ui(`[world] calling ${path} :: default()`);
    try { await mod.default(ctx); ui(`[world] ✅ mounted ${path} via default()`); return true; }
    catch (e) { ui(`[world] ❌ ${path} default() threw :: ${e?.message || e}`); return false; }
  }

  // 3) default export object with functions
  if (mod.default && typeof mod.default === "object") {
    for (const n of names) {
      if (typeof mod.default[n] === "function") {
        ui(`[world] calling ${path} :: default.${n}()`);
        try { await mod.default[n](ctx); ui(`[world] ✅ mounted ${path} via default.${n}()`); return true; }
        catch (e) { ui(`[world] ❌ ${path} default.${n}() threw :: ${e?.message || e}`); return false; }
      }
    }
  }

  // 4) If we got here, we imported it but didn’t find mount funcs
  ui(`[world] ⚠️ imported ${path} but no mount function found. exports=${Object.keys(mod).join(",")}${mod.default ? " (has default)" : ""}`);
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
    // FALLBACK WORLD (always visible)
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

      // Wide manifest (covers your naming patterns from prior builds)
      const manifest = [
        // world builders / scene builders
        "./world_builder.js",
        "./world_build.js",
        "./worldgen.js",
        "./WorldGen.js",
        "./scene_builder.js",

        // your known modules
        "./textures.js",
        "./lights_pack.js",
        "./solid_walls.js",

        "./table_factory.js",
        "./table.js",
        "./chair.js",
        "./spectator_rail.js",

        "./teleport_machine.js",
        "./TeleportMachine.js",
        "./teleport_fx.js",
        "./TeleportVFX.js",
        "./teleport_burst_fx.js",

        "./store.js",
        "./store_kiosk.js",
        "./shop_ui.js",

        "./water_fountain.js",

        "./ui.js",
        "./vr_ui.js",
        "./vr_ui_panel.js",
      ];

      let mounted = 0;
      for (const p of manifest) {
        const mod = await tryImport(p);
        const ok = await callBest(mod, p, ctx);
        if (ok) {
          mounted++;
          W._realLoaded = true;
        }
      }

      // Pull colliders if your real world registers them
      const extra = scene.userData?.colliders;
      if (Array.isArray(extra)) {
        for (const c of extra) if (c && !W.colliders.includes(c)) W.colliders.push(c);
        ui("[world] colliders merged from scene.userData ✅");
      }

      if (W._realLoaded) {
        ui(`[world] ✅ REAL WORLD LOADED (mounted=${mounted})`);
        window.dispatchEvent(new CustomEvent("scarlett-world-loaded", { detail: { mounted } }));
      } else {
        ui("[world] ❌ REAL WORLD DID NOT LOAD (no module mounted)");
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
