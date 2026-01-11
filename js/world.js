// /js/world.js — Scarlett Hybrid World v4.0 (GRID MODE + HALLWAYS + ENCLOSED + BRIGHT + TABLE PEDESTAL + LEFT STORE)

// Layout:
//   [BACK ROOM]
//        |
// [LEFT]-O-[RIGHT]
//        |
//   [FRONT ROOM]  (spawn here, corridor straight to hub)
// O = enclosed hub with 4 open doors, connected hallways from each room.
// Grid-only: no giant planes; we use grid + modular floor tiles so alignment is obvious.

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];

    // -------------------------
    // Helpers
    // -------------------------
    const add = (o) => (scene.add(o), o);

    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      add(mesh);
      return mesh;
    };

    const makeBox = (w,h,d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);

    // -------------------------
    // Materials
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.82, metalness: 0.10 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.05 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x031018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 1.9,
      roughness: 0.35,
      metalness: 0.15
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0b0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.15
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.4,
      transparent: true,
      opacity: 0.35
    });

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat  = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    // -------------------------
    // ✅ WORLD LIGHTING (in-world)
    // -------------------------
    add(new THREE.AmbientLight(0xffffff, 1.05));
    add(new THREE.HemisphereLight(0xffffff, 0x1a1a2a, 2.2));

    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(40, 90, 60);
    add(sun);

    // Hub glow core
    const hubGlow = new THREE.PointLight(0x9b5cff, 2.0, 80);
    hubGlow.position.set(0, 8.0, 0);
    add(hubGlow);

    // -------------------------
    // ✅ GRID-ONLY alignment mode
    // -------------------------
    const grid = new THREE.GridHelper(220, 220, 0x224455, 0x112233);
    grid.position.y = 0.001;
    add(grid);

    // Build floors as modular "tiles" (so you see alignment)
    function floorTile(w, d, x, z, y = 0.06) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
      tile.position.set(x, y, z);
      add(tile);
      return tile;
    }

    // Trim strips
    function baseTrimLine(len, x, y, z, yaw, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, len), mat);
      m.position.set(x, y, z);
      m.rotation.y = yaw;
      add(m);
      return m;
    }

    function topTrimLine(len, x, y, z, yaw, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), mat);
      m.position.set(x, y, z);
      m.rotation.y = yaw;
      add(m);
      return m;
    }

    // -------------------------
    // Dimensions
    // -------------------------
    const WALL_H = 3.2;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;

    // Hallway should connect room door to hub door
    const HALL_W = 5.0;
    const HALL_L = 10.0;

    // Door opening width (must match hallway width)
    const DOOR_W = HALL_W;

    // Room centers
    const frontZ = HUB_R + HALL_L + ROOM_S/2;
    const backZ  = -(HUB_R + HALL_L + ROOM_S/2);
    const leftX  = -(HUB_R + HALL_L + ROOM_S/2);
    const rightX = (HUB_R + HALL_L + ROOM_S/2);

    // -------------------------
    // Walls with a door gap
    // -------------------------
    function wallSeg(w,h,d, x,y,z, yaw=0) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    function squareRoom({ name, x, z, size, doorSide, trimMat }) {
      // floor tile
      floorTile(size, size, x, z);

      // base trims aligned exactly on edges
      const half = size/2;
      baseTrimLine(size, x, 0.03, z + half, 0, trimMat);
      baseTrimLine(size, x, 0.03, z - half, 0, trimMat);
      baseTrimLine(size, x + half, 0.03, z, Math.PI/2, trimMat);
      baseTrimLine(size, x - half, 0.03, z, Math.PI/2, trimMat);

      // top trims
      topTrimLine(size, x, WALL_H - 0.06, z + half, 0, trimMat);
      topTrimLine(size, x, WALL_H - 0.06, z - half, 0, trimMat);
      topTrimLine(size, x + half, WALL_H - 0.06, z, Math.PI/2, trimMat);
      topTrimLine(size, x - half, WALL_H - 0.06, z, Math.PI/2, trimMat);

      // Build walls with a single door opening toward hub
      const doorW = DOOR_W;
      const seg = (size - doorW) / 2;

      // north wall (z + half)
      if (doorSide === "N") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z + half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z + half);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z + half);

      // south wall (z - half)
      if (doorSide === "S") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z - half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z - half);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z - half);

      // east wall (x + half)
      if (doorSide === "E") {
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2));
      } else wallSeg(WALL_T, WALL_H, size + WALL_T, x + half, WALL_H/2, z);

      // west wall (x - half)
      if (doorSide === "W") {
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z + (doorW/2 + seg/2));
      } else wallSeg(WALL_T, WALL_H, size + WALL_T, x - half, WALL_H/2, z);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // -------------------------
    // Hallway (fully enclosed, no outside leaks)
    // -------------------------
    function hallway({ name, x, z, yaw, trimMat }) {
      // yaw: 0 => along Z, PI/2 => along X
      floorTile(HALL_W, HALL_L, x, z);

      // side walls
      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const l = side.clone().multiplyScalar(HALL_W/2);
      const r = side.clone().multiplyScalar(-HALL_W/2);

      const leftPos  = new THREE.Vector3(x, 0, z).add(l);
      const rightPos = new THREE.Vector3(x, 0, z).add(r);

      // walls are long boxes, rotated to hallway yaw
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, leftPos.x,  WALL_H/2, leftPos.z,  yaw);
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, rightPos.x, WALL_H/2, rightPos.z, yaw);

      // trims
      baseTrimLine(HALL_L, leftPos.x, 0.03, leftPos.z, yaw, trimMat);
      baseTrimLine(HALL_L, rightPos.x, 0.03, rightPos.z, yaw, trimMat);
      topTrimLine(HALL_L, leftPos.x, WALL_H - 0.06, leftPos.z, yaw, trimMat);
      topTrimLine(HALL_L, rightPos.x, WALL_H - 0.06, rightPos.z, yaw, trimMat);

      // cap end pieces so you don't see outside *except* where it meets hub/room
      // (tiny corner fillers)
      const capGeo = new THREE.BoxGeometry(HALL_W + WALL_T*2, WALL_H, WALL_T);
      const capA = addCollider(new THREE.Mesh(capGeo, wallMat));
      const capB = addCollider(new THREE.Mesh(capGeo, wallMat));

      // caps placed at +/- HALL_L/2 in hallway forward axis
      const fwd = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const aPos = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(HALL_L/2));
      const bPos = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(-HALL_L/2));
      capA.position.set(aPos.x, WALL_H/2, aPos.z);
      capB.position.set(bPos.x, WALL_H/2, bPos.z);
      capA.rotation.y = yaw;
      capB.rotation.y = yaw;

      // We REMOVE the caps later at the exact connection points (hub side + room side),
      // by simply not building the cap where openings should be.
      // So: caller will delete the correct cap(s).
      capA.name = `${name}_capA`;
      capB.name = `${name}_capB`;
      add(capA); add(capB);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // -------------------------
    // Hub: solid circular wall with 4 door gaps (exactly hallway width)
    // -------------------------
    function hub() {
      // Hub floor tile (circular)
      const hubFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(HUB_R, HUB_R, 0.18, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.12 })
      );
      hubFloor.position.set(0, 0.09, 0);
      hubFloor.name = "HubPlate";
      add(hubFloor);

      // Hub base trim ring
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 160), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.26, 0);
      add(baseRing);

      // Door gaps at +Z (front), -Z (back), +X (right), -X (left)
      const gapHalf = DOOR_W / 2;

      // Build wall segments around circle
      const segments = 64;
      const segLen = (2 * Math.PI * HUB_R) / segments;

      for (let i=0;i<segments;i++){
        const a0 = (i/segments) * Math.PI*2;
        const a1 = ((i+1)/segments) * Math.PI*2;
        const am = (a0+a1)/2;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        // Determine if this point lies in any doorway gap:
        const nearX = (Math.abs(cz) < gapHalf) && (Math.abs(cx) > HUB_R*0.6); // doors at +/-X
        const nearZ = (Math.abs(cx) < gapHalf) && (Math.abs(cz) > HUB_R*0.6); // doors at +/-Z
        if (nearX || nearZ) continue;

        const w = WALL_T;
        const h = WALL_H;
        const d = segLen;

        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat));
        wall.position.set(cx, h/2, cz);
        wall.rotation.y = -am;
      }

      // ✅ Table pedestal + “sunken pit” look
      // Pit ring floor lower (visual divot)
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(6.2, 6.2, 0.16, 72),
        new THREE.MeshStandardMaterial({ color: 0x06070c, roughness: 0.9, metalness: 0.05 })
      );
      pit.position.set(0, 0.02, 0);
      add(pit);

      // Raised pedestal ring around pit (walkway edge)
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(6.6, 7.2, 0.65, 72),
        metalMat
      );
      pedestal.position.set(0, 0.34, 0);
      add(pedestal);

      // Poker table stand (so it doesn't float)
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 0.95, 24),
        metalMat
      );
      stand.position.set(0, 0.74, 0);
      add(stand);

      // Table
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      table.position.set(0, 1.18, 0);
      table.name = "BossTable";
      add(table);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.09, 16, 120), metalMat);
      rim.rotation.x = Math.PI/2;
      rim.position.set(0, 1.26, 0);
      add(rim);

      // Seats (8) around table
      const seats = new THREE.Group();
      seats.name = "BossSeats";
      add(seats);

      const chairGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.12, 18);
      const chairBackGeo = new THREE.BoxGeometry(0.06, 0.35, 0.28);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.8 });

      const seatR = 2.65;
      for (let i=0;i<8;i++){
        const a = (i/8)*Math.PI*2;
        const cx = Math.cos(a)*seatR;
        const cz = Math.sin(a)*seatR;

        const chair = new THREE.Group();
        chair.position.set(cx, 0.95, cz);
        chair.rotation.y = Math.atan2(-cx, -cz);

        const seat = new THREE.Mesh(chairGeo, chairMat);
        seat.position.y = 0;
        chair.add(seat);

        const back = new THREE.Mesh(chairBackGeo, chairMat);
        back.position.set(0, 0.22, -0.14);
        chair.add(back);

        seats.add(chair);
      }

      // Ceiling ring light (no ceiling mesh, but a ring light above)
      const ringLight = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.12, 16, 160), neonCyan);
      ringLight.rotation.x = Math.PI/2;
      ringLight.position.set(0, 3.15, 0);
      add(ringLight);

      const ringLight2 = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.09, 16, 160), neonPink);
      ringLight2.rotation.x = Math.PI/2;
      ringLight2.position.set(0, 3.05, 0);
      add(ringLight2);

      // Extra hub lamps around walls (bright)
      for (let i=0;i<10;i++){
        const a = (i/10)*Math.PI*2;
        const px = Math.cos(a)*(HUB_R-1.0);
        const pz = Math.sin(a)*(HUB_R-1.0);
        const pl = new THREE.PointLight(i%2?0x00ffff:0xff2d7a, 1.2, 18);
        pl.position.set(px, 2.4, pz);
        add(pl);
      }
    }

    // Build hub
    hub();

    // Rooms with different trims
    squareRoom({ name:"Room_Front", x:0, z:frontZ, size:ROOM_S, doorSide:"S", trimMat: neonCyan });
    squareRoom({ name:"Room_Back",  x:0, z:backZ,  size:ROOM_S, doorSide:"N", trimMat: neonPink });
    squareRoom({ name:"Room_Left",  x:leftX, z:0,  size:ROOM_S, doorSide:"E", trimMat: neonCyan });
    squareRoom({ name:"Room_Right", x:rightX,z:0,  size:ROOM_S, doorSide:"W", trimMat: neonPink });

    // Hallways (centered between hub and room)
    const hallFront = hallway({ name:"Hall_Front", x:0, z:(HUB_R + HALL_L/2), yaw:0, trimMat: neonCyan });
    const hallBack  = hallway({ name:"Hall_Back",  x:0, z:-(HUB_R + HALL_L/2), yaw:0, trimMat: neonPink });
    const hallLeft  = hallway({ name:"Hall_Left",  x:-(HUB_R + HALL_L/2), z:0, yaw:Math.PI/2, trimMat: neonCyan });
    const hallRight = hallway({ name:"Hall_Right", x:(HUB_R + HALL_L/2),  z:0, yaw:Math.PI/2, trimMat: neonPink });

    // ✅ Remove hallway caps at connection ends so openings are clear
    // For each hallway, capA is toward +forward, capB is toward -forward in its local axis.
    // We want BOTH ends open (room end + hub end), so remove both caps.
    for (const h of [hallFront, hallBack, hallLeft, hallRight]) {
      const capA = scene.getObjectByName(`${h.name}_capA`);
      const capB = scene.getObjectByName(`${h.name}_capB`);
      if (capA) scene.remove(capA);
      if (capB) scene.remove(capB);
    }

    // -------------------------
    // Spawn (Front room) — corridor straight to hub, no wall blocking
    // -------------------------
    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36),
      new THREE.MeshStandardMaterial({
        color: 0x0a0b12,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 1.1,
        roughness: 0.35,
        metalness: 0.15
      })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.12, frontZ - 3.0);
    add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);
    add(sp);

    // Teleport machine pulled back (VIP spawn room landmark)
    const tm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.4,
        roughness: 0.35
      })
    );
    tm.name = "TeleportMachineFallback";
    tm.position.set(0, 1.1, frontZ - 3.0 + 4.2);
    add(tm);

    // VIP statues in spawn room (pedestal)
    function statue(name, x, z, color) {
      const g = new THREE.Group();
      g.name = name;

      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 24), metalMat);
      ped.position.set(x, 0.32, z);
      g.add(ped);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 4, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, flatShading:true })
      );
      body.position.set(x, 1.25, z);
      g.add(body);

      const glow = new THREE.PointLight(color, 1.0, 10);
      glow.position.set(x, 2.2, z);
      g.add(glow);

      add(g);
    }
    statue("VIP_Statue_A", -2.2, frontZ - 6.2, 0x7fe7ff);
    statue("VIP_Statue_B",  2.2, frontZ - 6.2, 0xff2d7a);

    // -------------------------
    // Glass HUD “hoods” on hub walls + labels
    // -------------------------
    function makeLabel(text, x,y,z, ry=0) {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 128;
      const c = canvas.getContext("2d");
      c.fillStyle = "rgba(0,0,0,0.35)";
      c.fillRect(0,0,512,128);
      c.fillStyle = "#bffcff";
      c.font = "bold 46px monospace";
      c.fillText(text, 18, 78);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), mat);
      plane.position.set(x,y,z);
      plane.rotation.y = ry;
      add(plane);
      return plane;
    }

    // Put 6 hoods around hub interior
    for (let i=0;i<6;i++){
      const a = (i/6)*Math.PI*2 + 0.25;
      const px = Math.cos(a)*(HUB_R-1.6);
      const pz = Math.sin(a)*(HUB_R-1.6);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 0.12), glassMat);
      hood.position.set(px, 1.7, pz);
      hood.rotation.y = Math.atan2(px, pz); // face center
      add(hood);

      const hoodLight = new THREE.PointLight(0x00ffff, 0.9, 10);
      hoodLight.position.set(px, 2.1, pz);
      add(hoodLight);

      makeLabel(`HUD ${i+1}`, px, 2.65, pz, hood.rotation.y);
    }

    // -------------------------
    // Store placement: LEFT entrance (west)
    // If /js/store.js exists, init it; else build a fallback display case.
    // -------------------------
    async function safeImport(url) {
      try { const m = await import(url); log(`import ok: ${url}`); return m; }
      catch (e) { warn(`import fail: ${url} — ${e?.message || e}`); return null; }
    }

    // Store anchor near left hallway inside hub side
    const storeAnchor = new THREE.Object3D();
    storeAnchor.name = "StoreAnchor";
    storeAnchor.position.set(-6.5, 0, 0); // inside hub, left side
    add(storeAnchor);

    const storeMod = await safeImport("./store.js");
    if (storeMod?.StoreSystem?.init) {
      try {
        ctx.systems.store = storeMod.StoreSystem;
        storeMod.StoreSystem.init({
          THREE,
          scene,
          world: ctx.world,
          player: ctx.player,
          camera: ctx.camera,
          log: (m)=>log(`[store] ${m}`)
        });
        // If the store builds at origin, you can optionally offset its root:
        // if (storeMod.StoreSystem.state?.root) storeMod.StoreSystem.state.root.position.copy(storeAnchor.position);
        log("[world] StoreSystem init ✅ (left hub)");
      } catch (e) {
        warn(`[world] StoreSystem init failed: ${e?.message || e}`);
      }
    } else {
      // Fallback display case
      const caseBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.5, 1.6), metalMat);
      caseBase.position.set(storeAnchor.position.x, 0.25, storeAnchor.position.z - 6.0);
      add(caseBase);

      const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 1.4), glassMat);
      caseGlass.position.set(storeAnchor.position.x, 1.15, storeAnchor.position.z - 6.0);
      add(caseGlass);

      const caseLight = new THREE.PointLight(0x7fe7ff, 1.2, 12);
      caseLight.position.set(storeAnchor.position.x, 2.3, storeAnchor.position.z - 6.0);
      add(caseLight);

      makeLabel("STORE DISPLAY", storeAnchor.position.x, 2.55, storeAnchor.position.z - 6.0, 0);
      log("[world] Store fallback display case ✅");
    }

    log("[world] v4.0 built ✅ GRID + hallways connected + enclosed + bright + pedestal table + hub HUD hoods");
  },

  update(ctx, dt) {
    // reserved for bots, dealing, etc.
  }
};
