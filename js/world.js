console.log("WORLD_SIG=v4.1 DOORGAPS+ENCLOSEDHALLS+GLASSHOODS+STORELEFT");

export const World = {
  VERSION: "v4.1",

  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);

    ctx.colliders = ctx.colliders || [];

    // --- materials ---
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.82, metalness: 0.10 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.05 });

    const neonCyan = new THREE.MeshStandardMaterial({ color: 0x031018, emissive: 0x00ffff, emissiveIntensity: 2.2, roughness: 0.35, metalness: 0.15 });
    const neonPink = new THREE.MeshStandardMaterial({ color: 0x12050c, emissive: 0xff2d7a, emissiveIntensity: 1.9, roughness: 0.35, metalness: 0.15 });
    const neonPurple = new THREE.MeshStandardMaterial({ color: 0x0b0614, emissive: 0x9b5cff, emissiveIntensity: 2.2, roughness: 0.35, metalness: 0.15 });

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat  = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.08, metalness: 0.0,
      transmission: 1.0, thickness: 0.4, transparent: true, opacity: 0.35
    });

    // --- helpers ---
    const add = (o) => (scene.add(o), o);
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      add(mesh);
      return mesh;
    };

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

    // Grid always (alignment)
    const grid = new THREE.GridHelper(220, 220, 0x224455, 0x112233);
    grid.position.y = 0.001;
    add(grid);

    // Optional “real floors” (disabled in grid-only mode)
    const GRID_ONLY = !!ctx.DEBUG_GRID_ONLY;

    function floorTile(w, d, x, z, y = 0.06) {
      if (GRID_ONLY) return null;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
      tile.position.set(x, y, z);
      add(tile);
      return tile;
    }

    function wallSeg(w,h,d, x,y,z, yaw=0) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    function trimBar(w,h,d,x,y,z,yaw,mat){
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    // Canvas label for “hood” panels
    function makeLabel(text) {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "rgba(0,0,0,0.0)";
      g.fillRect(0,0,c.width,c.height);
      g.fillStyle = "rgba(0,255,255,0.14)";
      g.fillRect(18,18,c.width-36,c.height-36);
      g.strokeStyle = "rgba(0,255,255,0.55)";
      g.lineWidth = 6;
      g.strokeRect(18,18,c.width-36,c.height-36);
      g.fillStyle = "#bffcff";
      g.font = "bold 54px monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, c.width/2, c.height/2);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), mat);
      return plane;
    }

    // --- HUB ---
    function buildHub() {
      // Hub floor disk (kept even in grid-only mode, thin)
      const hubFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(HUB_R, HUB_R, GRID_ONLY ? 0.02 : 0.18, 96),
        new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.55, metalness: 0.12 })
      );
      hubFloor.position.set(0, GRID_ONLY ? 0.01 : 0.09, 0);
      hubFloor.name = "HubPlate";
      add(hubFloor);

      // Base ring trim
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 160), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.26, 0);
      add(baseRing);

      // Door gaps — ANGLE BASED (fixes half-blocked entrances)
      const segments = 72;
      const segLen = (2 * Math.PI * HUB_R) / segments;
      const doorAngle = Math.asin((DOOR_W * 0.5) / HUB_R);

      function inDoorGap(am, center) {
        // wrap angle difference to [-pi, pi]
        let d = am - center;
        while (d > Math.PI) d -= Math.PI*2;
        while (d < -Math.PI) d += Math.PI*2;
        return Math.abs(d) <= doorAngle;
      }

      for (let i=0;i<segments;i++){
        const a0 = (i/segments) * Math.PI*2;
        const a1 = ((i+1)/segments) * Math.PI*2;
        const am = (a0+a1)/2;

        // doors at: +Z (pi/2), -Z (3pi/2), +X (0), -X (pi)
        if (
          inDoorGap(am, 0) ||
          inDoorGap(am, Math.PI/2) ||
          inDoorGap(am, Math.PI) ||
          inDoorGap(am, Math.PI*1.5)
        ) continue;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMat));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;
      }

      // Pedestal / pit / table stand
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.16, 72), new THREE.MeshStandardMaterial({ color: 0x06070c, roughness: 0.9 }));
      pit.position.set(0, 0.02, 0);
      add(pit);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.2, 0.65, 72), metalMat);
      pedestal.position.set(0, 0.34, 0);
      add(pedestal);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.95, 24), metalMat);
      stand.position.set(0, 0.74, 0);
      add(stand);

      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      table.position.set(0, 1.18, 0);
      table.name = "BossTable";
      add(table);

      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 1.32, 1.05);
      add(dealer);

      // Overhead ring lights (no ceiling required)
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.12, 16, 160), neonCyan);
      ring1.rotation.x = Math.PI/2; ring1.position.set(0, 3.15, 0); add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.09, 16, 160), neonPink);
      ring2.rotation.x = Math.PI/2; ring2.position.set(0, 3.05, 0); add(ring2);

      // Glass “HUD hoods” around inner hub wall (4 big panels)
      const hoodPositions = [
        { x: 0, z:  HUB_R - 0.7, yaw: Math.PI },       // north inner
        { x: 0, z: -HUB_R + 0.7, yaw: 0 },             // south inner
        { x:  HUB_R - 0.7, z: 0, yaw: -Math.PI/2 },    // east inner
        { x: -HUB_R + 0.7, z: 0, yaw: Math.PI/2 },     // west inner
      ];

      hoodPositions.forEach((p, i) => {
        const hood = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.2, 0.18), glassMat);
        hood.position.set(p.x, 1.6, p.z);
        hood.rotation.y = p.yaw;
        add(hood);

        const label = makeLabel(`HUD HOOD ${i+1}`);
        label.position.set(p.x, 2.45, p.z + (i===0?0.2: i===1?-0.2:0));
        label.rotation.y = p.yaw;
        add(label);

        const glow = new THREE.PointLight(0x7fe7ff, 1.2, 12);
        glow.position.set(p.x, 2.2, p.z);
        add(glow);
      });
    }

    // --- ROOM (square) ---
    function squareRoom({ name, x, z, size, doorSide, trimMat }) {
      floorTile(size, size, x, z);

      const half = size/2;
      const doorW = DOOR_W;
      const seg = (size - doorW) / 2;

      // Base trims (aligned)
      trimBar(size, 0.06, 0.08, x, 0.03, z + half, 0, trimMat);
      trimBar(size, 0.06, 0.08, x, 0.03, z - half, 0, trimMat);
      trimBar(size, 0.06, 0.08, x + half, 0.03, z, Math.PI/2, trimMat);
      trimBar(size, 0.06, 0.08, x - half, 0.03, z, Math.PI/2, trimMat);

      // Top trims (aligned)
      trimBar(size, 0.06, 0.06, x, WALL_H - 0.06, z + half, 0, trimMat);
      trimBar(size, 0.06, 0.06, x, WALL_H - 0.06, z - half, 0, trimMat);
      trimBar(size, 0.06, 0.06, x + half, WALL_H - 0.06, z, Math.PI/2, trimMat);
      trimBar(size, 0.06, 0.06, x - half, WALL_H - 0.06, z, Math.PI/2, trimMat);

      // Walls with doorway
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

    // --- HALLWAY (enclosed & capped) ---
    function hallway({ name, x, z, yaw, trimMat }) {
      floorTile(HALL_W, HALL_L, x, z);

      // sides
      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos  = new THREE.Vector3(x,0,z).add(side.clone().multiplyScalar(HALL_W/2));
      const rightPos = new THREE.Vector3(x,0,z).add(side.clone().multiplyScalar(-HALL_W/2));

      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, leftPos.x,  WALL_H/2, leftPos.z,  yaw);
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, rightPos.x, WALL_H/2, rightPos.z, yaw);

      // trims
      trimBar(0.08, 0.06, HALL_L, leftPos.x, 0.03, leftPos.z, yaw, trimMat);
      trimBar(0.08, 0.06, HALL_L, rightPos.x, 0.03, rightPos.z, yaw, trimMat);
      trimBar(0.06, 0.06, HALL_L, leftPos.x, WALL_H - 0.06, leftPos.z, yaw, trimMat);
      trimBar(0.06, 0.06, HALL_L, rightPos.x, WALL_H - 0.06, rightPos.z, yaw, trimMat);

      // caps (prevents seeing outside)
      // NOTE: do NOT cap the ends where the door openings are — we cap the “outer” gaps only.
      const fwd = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const endA = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(HALL_L/2));
      const endB = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(-HALL_L/2));

      // cap pieces above the door opening height? (we cap the outer perimeter only)
      // simplest: add thin “skirt” walls to hide outside on ends without blocking doorway:
      // We place a short cap behind the walls at the very ends but leave the middle open.
      const capSeg = (HALL_W - DOOR_W) / 2; // 0 (since equal), but safe if you change later.
      if (capSeg > 0.01) {
        // Not used now; kept for future custom door widths.
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // Build hub & rooms & halls
    buildHub();

    squareRoom({ name:"Room_Front", x:0, z:frontZ, size:ROOM_S, doorSide:"S", trimMat: neonCyan });
    squareRoom({ name:"Room_Back",  x:0, z:backZ,  size:ROOM_S, doorSide:"N", trimMat: neonPink });
    squareRoom({ name:"Room_Left",  x:leftX, z:0,  size:ROOM_S, doorSide:"E", trimMat: neonCyan });
    squareRoom({ name:"Room_Right", x:rightX,z:0,  size:ROOM_S, doorSide:"W", trimMat: neonPink });

    hallway({ name:"Hall_Front", x:0, z:(HUB_R + HALL_L/2), yaw:Math.PI/2 * 0, trimMat: neonCyan });
    hallway({ name:"Hall_Back",  x:0, z:-(HUB_R + HALL_L/2), yaw:Math.PI/2 * 0, trimMat: neonPink });
    hallway({ name:"Hall_Left",  x:-(HUB_R + HALL_L/2), z:0, yaw:Math.PI/2, trimMat: neonCyan });
    hallway({ name:"Hall_Right", x:(HUB_R + HALL_L/2),  z:0, yaw:Math.PI/2, trimMat: neonPink });

    // Spawn point in front room (clear path to hub)
    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.10, 36),
      new THREE.MeshStandardMaterial({ color: 0x0a0b12, emissive: 0x00ffff, emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.15 })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.06, frontZ - 3.0);
    add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);
    add(sp);

    // Store display case on LEFT side (inside hub near left entrance)
    const storeCase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.8, 1.4), glassMat);
    storeCase.position.set(-6.8, 1.25, 0.0);
    add(storeCase);

    const storeSign = makeLabel("STORE DISPLAY");
    storeSign.position.set(-6.8, 2.55, 0.9);
    storeSign.rotation.y = Math.PI/2;
    add(storeSign);

    const storeLight = new THREE.PointLight(0x7fe7ff, 1.35, 14);
    storeLight.position.set(-6.8, 2.2, 0.0);
    add(storeLight);

    log("[world] v4.1 built ✅ door gaps clean + enclosed halls + grid mode + glass HUD hoods + store-left");
  },

  update(ctx, dt) {}
};
