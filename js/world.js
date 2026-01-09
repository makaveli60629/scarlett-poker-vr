// /js/world.js — Scarlett VR Poker (FINAL ORCHESTRATOR)
// What you get:
// - Always shows a safe fallback room (so never black screen)
// - Then loads your real modules from /js/ (textures, lights_pack, teleport machine, store, etc)
// - Cache-busted imports using window.__BUILD_V
//
// This restores your world beyond "just a room + circles + table".

async function tryImport(path) {
  const v = encodeURIComponent(window.__BUILD_V || Date.now().toString());
  const url = path.includes("?") ? `${path}&v=${v}` : `${path}?v=${v}`;
  try {
    return await import(url);
  } catch (e) {
    console.warn("[world] optional import failed:", path, e?.message || e);
    return null;
  }
}

async function callBest(mod, names, args) {
  if (!mod) return null;

  for (const n of names) {
    if (typeof mod[n] === "function") {
      try { return await mod[n](args); }
      catch (e) { console.warn(`[world] ${n}() failed`, e?.message || e); return null; }
    }
  }

  if (typeof mod.default === "function") {
    try { return await mod.default(args); } catch (e) { console.warn("[world] default() failed", e?.message || e); }
  }

  if (mod.default && typeof mod.default === "object") {
    for (const n of names) {
      if (typeof mod.default[n] === "function") {
        try { return await mod.default[n](args); }
        catch (e) { console.warn(`[world] default.${n}() failed`, e?.message || e); return null; }
      }
    }
  }

  return null;
}

export const World = {
  init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      seats: [],
      flags: { teleport: true, move: true, snap: true, hands: true },
      mode: "lobby",
      seatedIndex: -1,
      _playerYaw: Math.PI,
      zones: {
        tableCenter: new THREE.Vector3(0, 0, 0),
        tableRadius: 4.2,
      },
      modules: {},
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function addColliderBox(pos, size, name = "collider") {
      const geo = new THREE.BoxGeometry(size.sx, size.sy, size.sz);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);
      W.colliders.push(mesh);
      return mesh;
    }

    function addRingMarker(pos, r0, r1, color) {
      const g = new THREE.RingGeometry(r0, r1, 64);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.02;
      scene.add(ring);
      return ring;
    }

    // -----------------------
    // 1) SAFE FALLBACK WORLD
    // -----------------------
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 12, 90);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 6);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x111421, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1f33, roughness: 0.9, metalness: 0.05 });
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(60, 4.4, 1), wallMat); wallN.position.set(0, 2.2, -15); scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(60, 4.4, 1), wallMat); wallS.position.set(0, 2.2, 15); scene.add(wallS);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1, 4.4, 60), wallMat); wallW.position.set(-15, 2.2, 0); scene.add(wallW);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(1, 4.4, 60), wallMat); wallE.position.set(15, 2.2, 0); scene.add(wallE);

    addColliderBox({ x: 0, y: 2.2, z: -15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_n");
    addColliderBox({ x: 0, y: 2.2, z: 15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_s");
    addColliderBox({ x: -15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_w");
    addColliderBox({ x: 15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_e");

    // placeholder table (real table will add on top)
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.8, metalness: 0.05 })
    );
    tableTop.position.set(0, 1.02, 0);
    scene.add(tableTop);

    // seats markers
    const seatRadius = 3.35;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI;
      const px = Math.cos(a) * seatRadius;
      const pz = Math.sin(a) * seatRadius;
      const mark = addRingMarker(new THREE.Vector3(px, 0, pz), 0.12, 0.19, 0xffcc00);
      mark.material.opacity = 0.55;
      W.seats.push({ index: i, position: new THREE.Vector3(px, 0, pz), yaw: a + Math.PI });
    }

    // -----------------------
    // 2) LOAD YOUR REAL WORLD MODULES (non-blocking)
    // -----------------------
    (async () => {
      const ctx = { THREE, scene, renderer, camera, player, controllers, world: W, log };

      const mods = {
        textures:         await tryImport("./textures.js"),
        lights_pack:      await tryImport("./lights_pack.js"),
        solid_walls:      await tryImport("./solid_walls.js"),

        table_factory:    await tryImport("./table_factory.js"),
        table:            await tryImport("./table.js"),
        chair:            await tryImport("./chair.js"),
        spectator_rail:   await tryImport("./spectator_rail.js"),

        teleport_machine: await tryImport("./teleport_machine.js"),
        teleport_fx:      await tryImport("./teleport_fx.js"),
        teleport_burst:   await tryImport("./teleport_burst_fx.js"),

        store:            await tryImport("./store.js"),
        store_kiosk:      await tryImport("./store_kiosk.js"),
        shop_ui:          await tryImport("./shop_ui.js"),

        water_fountain:   await tryImport("./water_fountain.js"),

        ui:               await tryImport("./ui.js"),
        vr_ui:            await tryImport("./vr_ui.js"),
        vr_ui_panel:      await tryImport("./vr_ui_panel.js"),
      };

      W.modules = mods;

      // Order matters: materials → lights → geometry → interactables → UI
      await callBest(mods.textures, ["init","boot","load","apply","mount","setup"], ctx);
      await callBest(mods.lights_pack, ["init","build","create","mount","add","setup"], ctx);
      await callBest(mods.solid_walls, ["init","build","create","mount","addToScene","spawn","setup"], ctx);

      await callBest(mods.table_factory, ["init","build","create","spawn","mount","setup"], ctx)
        || await callBest(mods.table, ["init","build","create","spawn","mount","setup"], ctx);

      await callBest(mods.chair, ["init","build","create","spawn","mount","setup"], ctx);
      await callBest(mods.spectator_rail, ["init","build","create","mount","addToScene","spawn","setup"], ctx);

      await callBest(mods.teleport_machine, ["init","build","create","mount","spawn","setup"], ctx);
      await callBest(mods.teleport_fx, ["init","build","create","mount","spawn","setup"], ctx);
      await callBest(mods.teleport_burst, ["init","build","create","mount","spawn","setup"], ctx);

      await callBest(mods.store, ["init","build","create","mount","spawn","setup"], ctx);
      await callBest(mods.store_kiosk, ["init","build","create","mount","spawn","setup"], ctx);
      await callBest(mods.shop_ui, ["init","build","create","mount","spawn","setup"], ctx);

      await callBest(mods.water_fountain, ["init","build","create","mount","spawn","setup"], ctx);

      await callBest(mods.ui, ["init","build","create","mount","setup"], ctx);
      await callBest(mods.vr_ui, ["init","build","create","mount","setup"], ctx);
      await callBest(mods.vr_ui_panel, ["init","build","create","mount","setup"], ctx);

      // Collect colliders if modules registered them to scene.userData.colliders
      const extra = scene.userData?.colliders;
      if (Array.isArray(extra)) {
        for (const c of extra) if (c && !W.colliders.includes(c)) W.colliders.push(c);
        log?.("[world] pulled colliders from scene.userData ✅");
      }

      log?.("[world] real modules loaded ✅");
    })().catch((e) => console.warn("[world] module chain failed:", e));

    // -----------------------
    // 3) API USED BY main.js
    // -----------------------
    W.setMode = (m) => { W.mode = m; };
    W.setFlag = (k, v) => { if (k in W.flags) W.flags[k] = !!v; };
    W.getPlayerYaw = () => W._playerYaw;
    W.addPlayerYaw = (d) => { W._playerYaw += d; player.rotation.y = W._playerYaw; };

    W.resolvePlayerCollision = (fromPos, toPos) => {
      const radius = 0.28;
      const p = toPos.clone();

      for (const c of W.colliders) {
        const box = new THREE.Box3().setFromObject(c);
        box.min.x -= radius; box.max.x += radius;
        box.min.z -= radius; box.max.z += radius;

        const yProbe = 1.0;
        if (yProbe < box.min.y || yProbe > box.max.y) continue;

        if (p.x > box.min.x && p.x < box.max.x && p.z > box.min.z && p.z < box.max.z) {
          const dxMin = Math.abs(p.x - box.min.x);
          const dxMax = Math.abs(box.max.x - p.x);
          const dzMin = Math.abs(p.z - box.min.z);
          const dzMax = Math.abs(box.max.z - p.z);
          const m = Math.min(dxMin, dxMax, dzMin, dzMax);

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

    W.getNearestSeat = (pos) => {
      let best = null, bestD = Infinity;
      for (const s of W.seats) {
        const d = (pos.x - s.position.x) ** 2 + (pos.z - s.position.z) ** 2;
        if (d < bestD) { bestD = d; best = s; }
      }
      return best;
    };

    W.sitPlayerAtSeat = (seatIndex) => {
      const s = W.seats.find(x => x.index === seatIndex) || W.seats[0];
      W.seatedIndex = s.index;
      player.position.x = s.position.x;
      player.position.z = s.position.z;
      W._playerYaw = s.yaw;
      player.rotation.y = W._playerYaw;
      player.position.y = renderer.xr.isPresenting ? 0 : 1.35;
      log?.(`sitPlayerAtSeat(${W.seatedIndex}) ✅`);
    };

    W.standPlayerInLobby = () => {
      W.seatedIndex = -1;
      player.position.set(0, renderer.xr.isPresenting ? 0 : 1.7, 6);
      W._playerYaw = Math.PI;
      player.rotation.y = W._playerYaw;
      log?.("standPlayerInLobby ✅");
    };

    W.recenter = () => W.standPlayerInLobby();

    W.update = () => {
      // Your module packs can animate themselves; fallback does nothing.
    };

    player.rotation.y = W._playerYaw;
    log?.("world init ✅ (orchestrator)");
    return W;
  }
};
