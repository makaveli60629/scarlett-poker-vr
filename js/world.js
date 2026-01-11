console.log("WORLD_SIG=v4.2 GRIDONLY+HALLFIX+SUNK_TABLE+RAILS+TELEPORTER");

export const World = {
  VERSION: "v4.2",

  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log = (m) => LOG?.push?.("log", m) || console.log(m);

    ctx.colliders = ctx.colliders || [];

    // ---------- Procedural “color texture” ----------
    function makePanelTexture(seed = 1, accent = "#00ffff") {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 512;
      const g = c.getContext("2d");

      // base
      g.fillStyle = "#05060a";
      g.fillRect(0,0,512,512);

      // panels
      g.globalAlpha = 0.85;
      g.fillStyle = "#0b1020";
      for (let i=0;i<14;i++){
        const x = ((i*seed*37) % 420) + 16;
        const y = ((i*seed*83) % 420) + 16;
        const w = 50 + ((i*seed*29) % 160);
        const h = 24 + ((i*seed*17) % 110);
        g.fillRect(x,y,w,h);
      }

      // lines
      g.globalAlpha = 1;
      g.strokeStyle = accent;
      g.lineWidth = 3;
      for (let i=0;i<18;i++){
        const x = ((i*seed*61) % 480) + 16;
        const y = ((i*seed*19) % 480) + 16;
        g.strokeRect(x,y, 90 + (i%4)*36, 30 + (i%3)*26);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    }

    const texCyan = makePanelTexture(2, "#00ffff");
    const texPink = makePanelTexture(3, "#ff2d7a");
    const texPurple = makePanelTexture(5, "#9b5cff");

    const wallMatHub = new THREE.MeshStandardMaterial({ map: texPurple, roughness: 0.85, metalness: 0.08 });
    const wallMatCyan = new THREE.MeshStandardMaterial({ map: texCyan, roughness: 0.85, metalness: 0.08 });
    const wallMatPink = new THREE.MeshStandardMaterial({ map: texPink, roughness: 0.85, metalness: 0.08 });

    const neonCyan = new THREE.MeshStandardMaterial({ color: 0x031018, emissive: 0x00ffff, emissiveIntensity: 2.2, roughness: 0.35, metalness: 0.15 });
    const neonPink = new THREE.MeshStandardMaterial({ color: 0x12050c, emissive: 0xff2d7a, emissiveIntensity: 1.9, roughness: 0.35, metalness: 0.15 });
    const neonPurple = new THREE.MeshStandardMaterial({ color: 0x0b0614, emissive: 0x9b5cff, emissiveIntensity: 2.2, roughness: 0.35, metalness: 0.15 });

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat  = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    // glass hood
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.08, metalness: 0.0,
      transmission: 1.0, thickness: 0.4, transparent: true, opacity: 0.35
    });

    // ---------- helpers ----------
    const add = (o) => (scene.add(o), o);
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      add(mesh);
      return mesh;
    };

    function trimBar(w,h,d,x,y,z,yaw,mat){
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    function makeLabel(text) {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const g = c.getContext("2d");
      g.clearRect(0,0,512,256);
      g.fillStyle = "rgba(0,0,0,0.0)";
      g.fillRect(0,0,512,256);
      g.fillStyle = "rgba(0,255,255,0.12)";
      g.fillRect(18,18,512-36,256-36);
      g.strokeStyle = "rgba(0,255,255,0.55)";
      g.lineWidth = 6;
      g.strokeRect(18,18,512-36,256-36);
      g.fillStyle = "#bffcff";
      g.font = "bold 54px monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 256, 128);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      return new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), mat);
    }

    // ---------- GLOBAL GRID (NO FLOORS) ----------
    const grid = new THREE.GridHelper(240, 240, 0x334c66, 0x1c2a3a);
    grid.position.y = 0.001;
    add(grid);

    // ---------- Geometry constants ----------
    const WALL_H = 3.2;
    const WALL_T = 0.28;

    const HUB_R  = 14.0;
    const ROOM_S = 14.0;

    const HALL_W = 5.0;
    const HALL_L = 10.0;

    const DOOR_W = HALL_W;

    const frontZ = HUB_R + HALL_L + ROOM_S/2;
    const backZ  = -(HUB_R + HALL_L + ROOM_S/2);
    const leftX  = -(HUB_R + HALL_L + ROOM_S/2);
    const rightX = (HUB_R + HALL_L + ROOM_S/2);

    // --- vector convention FIX ---
    // yaw=0 means forward is +Z
    const fwdFromYaw = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const rightFromYaw = (yaw) => new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

    function wallSeg(w,h,d, x,y,z, yaw=0, mat=wallMatHub) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat));
      m.position.set(x,y,z);
      m.rotation.y = yaw;
      return m;
    }

    // ---------- HUB (enclosed, with clean door gaps) ----------
    function buildHub() {
      // Hub center anchor
      const hubCenter = new THREE.Object3D();
      hubCenter.name = "HubCenter";
      hubCenter.position.set(0,0,0);
      add(hubCenter);

      // clean door gaps by ANGLE
      const segments = 80;
      const segLen = (2 * Math.PI * HUB_R) / segments;
      const doorAngle = Math.asin((DOOR_W * 0.5) / HUB_R);

      function inDoorGap(am, center) {
        let d = am - center;
        while (d > Math.PI) d -= Math.PI*2;
        while (d < -Math.PI) d += Math.PI*2;
        return Math.abs(d) <= doorAngle;
      }

      for (let i=0;i<segments;i++){
        const a0 = (i/segments) * Math.PI*2;
        const a1 = ((i+1)/segments) * Math.PI*2;
        const am = (a0+a1)/2;

        // doors at +Z (pi/2), -Z (3pi/2), +X (0), -X (pi)
        if (
          inDoorGap(am, 0) ||
          inDoorGap(am, Math.PI/2) ||
          inDoorGap(am, Math.PI) ||
          inDoorGap(am, Math.PI*1.5)
        ) continue;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        const w = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMatHub));
        w.position.set(cx, WALL_H/2, cz);
        w.rotation.y = -am;
      }

      // Base + top trims (aligned)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 180), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.08, 0);
      add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.10, 16, 180), neonPurple);
      topRing.rotation.x = Math.PI/2;
      topRing.position.set(0, WALL_H - 0.06, 0);
      add(topRing);

      // ---- SUNK TABLE SYSTEM ----
      // Raised walkway ring (spectators stand here and look DOWN)
      const walkway = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.55, 20, 160), metalMat);
      walkway.rotation.x = Math.PI/2;
      walkway.position.set(0, 0.55, 0);
      add(walkway);

      // Pit rim trim
      const pitTrim = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.12, 16, 160), neonCyan);
      pitTrim.rotation.x = Math.PI/2;
      pitTrim.position.set(0, 0.52, 0);
      add(pitTrim);

      // Pit “floor marker” (NOT a floor tile, just a thin disk so you see the pit)
      const pitDisk = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.0, 0.03, 80), new THREE.MeshStandardMaterial({ color: 0x07080f, roughness: 0.95 }));
      pitDisk.position.set(0, 0.02, 0);
      add(pitDisk);

      // Stand + table LOWERED (sunk)
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.65, 24), metalMat);
      stand.position.set(0, 0.25, 0);
      add(stand);

      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      table.position.set(0, 0.62, 0);
      table.name = "BossTable";
      add(table);

      // RAILS (visible)
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(6.8, 0.10, 12, 180),
        new THREE.MeshStandardMaterial({ color: 0x11131c, emissive: 0x17384c, emissiveIntensity: 0.85, roughness: 0.45 })
      );
      rail.rotation.x = Math.PI/2;
      rail.position.set(0, 0.60, 0);
      rail.name = "MainRail";
      add(rail);

      // Dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 0.75, 1.05);
      add(dealer);

      // Overhead rings (no ceiling)
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.12, 16, 160), neonCyan);
      ring1.rotation.x = Math.PI/2; ring1.position.set(0, 3.25, 0); add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.7, 0.09, 16, 160), neonPink);
      ring2.rotation.x = Math.PI/2; ring2.position.set(0, 3.12, 0); add(ring2);

      // Glass “hoods”
      const hoodPositions = [
        { x: 0, z:  HUB_R - 0.7, yaw: Math.PI },
        { x: 0, z: -HUB_R + 0.7, yaw: 0 },
        { x:  HUB_R - 0.7, z: 0, yaw: -Math.PI/2 },
        { x: -HUB_R + 0.7, z: 0, yaw: Math.PI/2 },
      ];

      hoodPositions.forEach((p, i) => {
        const hood = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.2, 0.18), glassMat);
        hood.position.set(p.x, 1.6, p.z);
        hood.rotation.y = p.yaw;
        add(hood);

        const label = makeLabel(`HUD HOOD ${i+1}`);
        label.position.set(p.x, 2.45, p.z);
        label.rotation.y = p.yaw;
        add(label);

        const glow = new THREE.PointLight(0x7fe7ff, 1.2, 14);
        glow.position.set(p.x, 2.2, p.z);
        add(glow);
      });
    }

    // ---------- SQUARE ROOM ----------
    function squareRoom({ name, x, z, size, doorSide, trimMat, wallMat }) {
      const half = size/2;
      const doorW = DOOR_W;
      const seg = (size - doorW) / 2;

      // trims: base + top
      trimBar(size, 0.06, 0.08, x, 0.03, z + half, 0, trimMat);
      trimBar(size, 0.06, 0.08, x, 0.03, z - half, 0, trimMat);
      trimBar(size, 0.06, 0.08, x + half, 0.03, z, Math.PI/2, trimMat);
      trimBar(size, 0.06, 0.08, x - half, 0.03, z, Math.PI/2, trimMat);

      trimBar(size, 0.06, 0.06, x, WALL_H - 0.06, z + half, 0, trimMat);
      trimBar(size, 0.06, 0.06, x, WALL_H - 0.06, z - half, 0, trimMat);
      trimBar(size, 0.06, 0.06, x + half, WALL_H - 0.06, z, Math.PI/2, trimMat);
      trimBar(size, 0.06, 0.06, x - half, WALL_H - 0.06, z, Math.PI/2, trimMat);

      // walls with doorway
      if (doorSide === "N") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z + half, 0, wallMat);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z + half, 0, wallMat);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z + half, 0, wallMat);

      if (doorSide === "S") {
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z - half, 0, wallMat);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z - half, 0, wallMat);
      } else wallSeg(size + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z - half, 0, wallMat);

      if (doorSide === "E") {
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2), 0, wallMat);
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2), 0, wallMat);
      } else wallSeg(WALL_T, WALL_H, size + WALL_T, x + half, WALL_H/2, z, 0, wallMat);

      if (doorSide === "W") {
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z - (doorW/2 + seg/2), 0, wallMat);
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z + (doorW/2 + seg/2), 0, wallMat);
      } else wallSeg(WALL_T, WALL_H, size + WALL_T, x - half, WALL_H/2, z, 0, wallMat);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // ---------- HALLWAY (FIXED, aligned to doors, enclosed) ----------
    function hallway({ name, x, z, yaw, trimMat, wallMat }) {
      // yaw=0 along +Z ; yaw=+pi/2 along +X ; yaw=-pi/2 along -X ; yaw=pi along -Z
      const fwd = fwdFromYaw(yaw);
      const right = rightFromYaw(yaw);

      // left/right wall positions
      const leftPos  = new THREE.Vector3(x,0,z).add(right.clone().multiplyScalar(-HALL_W/2));
      const rightPos = new THREE.Vector3(x,0,z).add(right.clone().multiplyScalar(HALL_W/2));

      // walls along hallway length
      // rotate walls to face hallway direction (yaw)
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, leftPos.x,  WALL_H/2, leftPos.z,  yaw, wallMat);
      wallSeg(WALL_T, WALL_H, HALL_L + WALL_T, rightPos.x, WALL_H/2, rightPos.z, yaw, wallMat);

      // trims (base+top)
      trimBar(0.08, 0.06, HALL_L, leftPos.x, 0.03, leftPos.z, yaw, trimMat);
      trimBar(0.08, 0.06, HALL_L, rightPos.x, 0.03, rightPos.z, yaw, trimMat);
      trimBar(0.06, 0.06, HALL_L, leftPos.x, WALL_H - 0.06, leftPos.z, yaw, trimMat);
      trimBar(0.06, 0.06, HALL_L, rightPos.x, WALL_H - 0.06, rightPos.z, yaw, trimMat);

      // skirt caps at outer perimeter to prevent “seeing outside” from side angles
      // (does not block the doorway opening)
      const skirtA = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + WALL_T*2, 0.8, WALL_T), wallMat);
      const skirtB = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + WALL_T*2, 0.8, WALL_T), wallMat);

      // ends of hallway (center points)
      const endFront = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(HALL_L/2));
      const endBack  = new THREE.Vector3(x,0,z).add(fwd.clone().multiplyScalar(-HALL_L/2));

      // place skirt slightly outside the hall end, low to ground
      skirtA.position.set(endFront.x, 0.4, endFront.z);
      skirtB.position.set(endBack.x,  0.4, endBack.z);
      skirtA.rotation.y = yaw;
      skirtB.rotation.y = yaw;
      add(skirtA); add(skirtB);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x,0,z);
      add(anchor);
      return anchor;
    }

    // ---------- BUILD ----------
    buildHub();

    // Rooms
    squareRoom({ name:"Room_Front", x:0, z:frontZ, size:ROOM_S, doorSide:"S", trimMat: neonCyan, wallMat: wallMatCyan });
    squareRoom({ name:"Room_Back",  x:0, z:backZ,  size:ROOM_S, doorSide:"N", trimMat: neonPink, wallMat: wallMatPink });
    squareRoom({ name:"Room_Left",  x:leftX, z:0,  size:ROOM_S, doorSide:"E", trimMat: neonCyan, wallMat: wallMatCyan });
    squareRoom({ name:"Room_Right", x:rightX,z:0,  size:ROOM_S, doorSide:"W", trimMat: neonPink, wallMat: wallMatPink });

    // Hallways (FIXED yaw)
    hallway({ name:"Hall_Front", x:0, z:(HUB_R + HALL_L/2), yaw:0,          trimMat: neonCyan, wallMat: wallMatCyan });
    hallway({ name:"Hall_Back",  x:0, z:-(HUB_R + HALL_L/2), yaw:Math.PI,    trimMat: neonPink, wallMat: wallMatPink });
    hallway({ name:"Hall_Left",  x:-(HUB_R + HALL_L/2), z:0, yaw:-Math.PI/2, trimMat: neonCyan, wallMat: wallMatCyan });
    hallway({ name:"Hall_Right", x:(HUB_R + HALL_L/2),  z:0, yaw:Math.PI/2,  trimMat: neonPink, wallMat: wallMatPink });

    // Spawn + teleporter machine
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, frontZ - 3.0);
    add(sp);

    const tele = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({ color: 0x090b14, emissive: 0x9b5cff, emissiveIntensity: 1.55, roughness: 0.35 })
    );
    tele.name = "TeleportMachine";
    tele.position.set(0, 1.1, (frontZ - 3.0) + 3.2);
    add(tele);

    // Store display case (left entrance inside hub)
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

    log("[world] v4.2 built ✅ NO FLOORS (grid only) + hallways fixed + sunk table + rail + teleporter restored");
  },

  update(ctx, dt) {}
};
