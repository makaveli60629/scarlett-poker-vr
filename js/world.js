console.log("WORLD_SIG=v4.0 GRID+HALLWAYS+PEDESTAL+STORELEFT");

export const World = {
  VERSION: "v4.0",

  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];

    // --- materials ---
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

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat  = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.4,
      transparent: true,
      opacity: 0.35
    });

    // --- helpers ---
    const add = (o) => (scene.add(o), o);
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      add(mesh);
      return mesh;
    };

    function floorTile(w, d, x, z, y = 0.06) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
      tile.position.set(x, y, z);
      add(tile);
      return tile;
    }

    const baseTrimLine = (len, x, y, z, yaw, mat) => add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, len), mat)).setRotationFromEuler(new THREE.Euler(0,yaw,0)) || null;
    const topTrimLine  = (len, x, y, z, yaw, mat) => add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), mat)).setRotationFromEuler(new THREE.Euler(0,yaw,0)) || null;

    // safer placement wrappers
    function placeTrim(mesh, x,y,z,yaw){
      mesh.position.set(x,y,z);
      mesh.rotation.y = yaw;
      return mesh;
    }

    function wallSeg(w,h,d, x,y,z, yaw=0) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    // --- dimensions ---
    const WALL_H = 3.2;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;

    const HALL_W = 5.0;
    const HALL_L = 10.0;
    const DOOR_W = HALL_W;

    const frontZ = HUB_R + HALL_L + ROOM_S/2;
    const backZ  = -(HUB_R + HALL_L + ROOM_S/2);
    const leftX  = -(HUB_R + HALL_L + ROOM_S/2);
    const rightX = (HUB_R + HALL_L + ROOM_S/2);

    // --- grid (alignment mode) ---
    const grid = new THREE.GridHelper(220, 220, 0x224455, 0x112233);
    grid.position.y = 0.001;
    add(grid);

    // --- hub ---
    function buildHub() {
      const hubFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(HUB_R, HUB_R, 0.18, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.12 })
      );
      hubFloor.position.set(0, 0.09, 0);
      hubFloor.name = "HubPlate";
      add(hubFloor);

      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 160), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.26, 0);
      add(baseRing);

      // circular walls with 4 door gaps
      const segments = 64;
      const segLen = (2 * Math.PI * HUB_R) / segments;
      const gapHalf = DOOR_W / 2;

      for (let i=0;i<segments;i++){
        const a0 = (i/segments) * Math.PI*2;
        const a1 = ((i+1)/segments) * Math.PI*2;
        const am = (a0+a1)/2;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        const nearX = (Math.abs(cz) < gapHalf) && (Math.abs(cx) > HUB_R*0.6);
        const nearZ = (Math.abs(cx) < gapHalf) && (Math.abs(cz) > HUB_R*0.6);
        if (nearX || nearZ) continue;

        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMat));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;
      }

      // pit + pedestal + table stand
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(6.2, 6.2, 0.16, 72),
        new THREE.MeshStandardMaterial({ color: 0x06070c, roughness: 0.9, metalness: 0.05 })
      );
      pit.position.set(0, 0.02, 0);
      add(pit);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(6.6, 7.2, 0.65, 72),
        metalMat
      );
      pedestal.position.set(0, 0.34, 0);
      add(pedestal);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.95, 24), metalMat);
      stand.position.set(0, 0.74, 0);
      add(stand);

      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      table.position.set(0, 1.18, 0);
      table.name = "BossTable";
      add(table);

      // dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 1.32, 1.05);
      add(dealer);

      // ring lights overhead (no ceiling)
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.12, 16, 160), neonCyan);
      ring1.rotation.x = Math.PI/2; ring1.position.set(0, 3.15, 0); add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.09, 16, 160), neonPink);
      ring2.rotation.x = Math.PI/2; ring2.position.set(0, 3.05, 0); add(ring2);

      // hub lamps
      for (let i=0;i<10;i++){
        const a = (i/10)*Math.PI*2;
        const px = Math.cos(a)*(HUB_R-1.0);
        const pz = Math.sin(a)*(HUB_R-1.0);
        const pl = new THREE.PointLight(i%2?0x00ffff:0xff2d7a, 1.2, 18);
        pl.position.set(px, 2.4, pz);
        add(pl);
      }
    }

    // --- rooms ---
    function squareRoom({ name, x, z, size, doorSide, trimMat }) {
      floorTile(size, size, x, z);

      const half = size/2;
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.08), trimMat)), x, 0.03, z + half, 0);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.08), trimMat)), x, 0.03, z - half, 0);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.08), trimMat)), x + half, 0.03, z, Math.PI/2);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.08), trimMat)), x - half, 0.03, z, Math.PI/2);

      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.06), trimMat)), x, WALL_H - 0.06, z + half, 0);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.06), trimMat)), x, WALL_H - 0.06, z - half, 0);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.06), trimMat)), x + half, WALL_H - 0.06, z, Math.PI/2);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 0.06), trimMat)), x - half, WALL_H - 0.06, z, Math.PI/2);

      const doorW = DOOR_W;
      const seg = (size - doorW) / 2;

      if (doorSide === "N") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z + half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z + half);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z + half);

      if (doorSide === "S") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z - half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z - half);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z - half);

      if (doorSide === "E") {
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2));
      } else wallSeg(WALL_T, WALL_H, size + WALL_T, x + half, WALL_H/2, z);

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

    // --- hallway ---
    function hallway({ name, x, z, yaw, trimMat }) {
      floorTile(HALL_W, HALL_L, x, z);

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos  = new THREE.Vector3(x,0,z).add(side.clone().multiplyScalar(HALL_W/2));
      const rightPos = new THREE.Vector3(x,0,z).add(side.clone().multiplyScalar(-HALL_W/2));

      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, leftPos.x,  WALL_H/2, leftPos.z,  yaw);
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, rightPos.x, WALL_H/2, rightPos.z, yaw);

      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, HALL_L), trimMat)), leftPos.x, 0.03, leftPos.z, yaw);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, HALL_L), trimMat)), rightPos.x, 0.03, rightPos.z, yaw);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, HALL_L), trimMat)), leftPos.x, WALL_H - 0.06, leftPos.z, yaw);
      placeTrim(add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, HALL_L), trimMat)), rightPos.x, WALL_H - 0.06, rightPos.z, yaw);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // build
    buildHub();

    squareRoom({ name:"Room_Front", x:0, z:frontZ, size:ROOM_S, doorSide:"S", trimMat: neonCyan });
    squareRoom({ name:"Room_Back",  x:0, z:backZ,  size:ROOM_S, doorSide:"N", trimMat: neonPink });
    squareRoom({ name:"Room_Left",  x:leftX, z:0,  size:ROOM_S, doorSide:"E", trimMat: neonCyan });
    squareRoom({ name:"Room_Right", x:rightX,z:0,  size:ROOM_S, doorSide:"W", trimMat: neonPink });

    hallway({ name:"Hall_Front", x:0, z:(HUB_R + HALL_L/2), yaw:0, trimMat: neonCyan });
    hallway({ name:"Hall_Back",  x:0, z:-(HUB_R + HALL_L/2), yaw:0, trimMat: neonPink });
    hallway({ name:"Hall_Left",  x:-(HUB_R + HALL_L/2), z:0, yaw:Math.PI/2, trimMat: neonCyan });
    hallway({ name:"Hall_Right", x:(HUB_R + HALL_L/2),  z:0, yaw:Math.PI/2, trimMat: neonPink });

    // Spawn point in front room, clear path to hub
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

    // left-side store marker (fallback)
    const storeCase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 1.2), glassMat);
    storeCase.position.set(-6.5, 1.15, -6.0);
    add(storeCase);

    const storeLight = new THREE.PointLight(0x7fe7ff, 1.2, 12);
    storeLight.position.set(-6.5, 2.3, -6.0);
    add(storeLight);

    log("[world] v4.0 built ✅ GRID + hallways + enclosed hub + pedestal table");
  },

  update(ctx, dt) {}
};
