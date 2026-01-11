// /js/world.js — Scarlett Hybrid World v4.2 (FULL)
// FIXES:
// ✅ ONE entrance per side (no “two doors + wall between”)
// ✅ Corridors fully enclosed with “cheek walls” so you cannot see outside
// ✅ No solid floors except grid (alignment debugging)
// ✅ Trims: bottom trim sits at floor, top trim near wall top
// ✅ Hub trim is PURPLE, rooms get their own trim colors
// ✅ Sunk “pit” pedestal so the table is DOWN (spectator look-down)
// ✅ Teleporter is BEHIND spawn
// ✅ Neon labels: STORE / POKER / EVENT / VIP

export const World = {
  async init(ctx) {
    const { THREE, scene } = ctx;
    ctx.worldVersion = "v4.2";

    // -------------------------
    // Materials
    // -------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.75, metalness: 0.12 });

    const neon = (hex, intensity = 2.0) =>
      new THREE.MeshStandardMaterial({
        color: 0x05060a,
        emissive: new THREE.Color(hex),
        emissiveIntensity: intensity,
        roughness: 0.35,
        metalness: 0.15
      });

    const trimHub = neon(0x9b5cff, 2.2);  // purple
    const trimCyan = neon(0x00ffff, 2.0);
    const trimPink = neon(0xff2d7a, 1.9);
    const trimGold = neon(0xffd36b, 1.8);

    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat   = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    // -------------------------
    // GRID ONLY (no floor)
    // -------------------------
    const grid = new THREE.GridHelper(180, 180, 0x2b8cff, 0x14213a);
    grid.position.y = 0.001;
    scene.add(grid);

    // A thin “axis cross” at hub center
    const axes = new THREE.AxesHelper(3);
    axes.position.set(0, 0.02, 0);
    scene.add(axes);

    // -------------------------
    // Helpers
    // -------------------------
    const colliders = (ctx.colliders = ctx.colliders || []);
    const addCollider = (m) => { m.userData.solid = true; colliders.push(m); scene.add(m); return m; };

    // bottom + top trims for a wall span
    function addWallTrims({ length, thickness, x, z, yBottom, yTop, yaw, matBottom, matTop }) {
      const geo = new THREE.BoxGeometry(thickness, 0.06, length);
      const bot = new THREE.Mesh(geo, matBottom);
      const top = new THREE.Mesh(geo, matTop);
      bot.position.set(x, yBottom, z);
      top.position.set(x, yTop, z);
      bot.rotation.y = yaw;
      top.rotation.y = yaw;
      scene.add(bot, top);
    }

    function makeNeonLabel(text, pos, colorHex = "#00ffff") {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const g = canvas.getContext("2d");

      g.clearRect(0,0,512,128);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0,0,512,128);

      g.font = "900 72px system-ui,Segoe UI,Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = colorHex;
      g.shadowColor = colorHex;
      g.shadowBlur = 18;
      g.fillText(text, 256, 68);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), mat);
      mesh.position.copy(pos);
      mesh.lookAt(new THREE.Vector3(0, pos.y, 0));
      scene.add(mesh);
      return mesh;
    }

    // -------------------------
    // Layout constants (grid-aligned)
    // -------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    // Room centers
    const frontZ = HUB_R + CORRIDOR_L + ROOM_S / 2;   // 31
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S / 2);

    // Corridor center points
    const czFront = HUB_R + CORRIDOR_L / 2;   // 19
    const czBack  = -(HUB_R + CORRIDOR_L / 2);
    const cxLeft  = -(HUB_R + CORRIDOR_L / 2);
    const cxRight = (HUB_R + CORRIDOR_L / 2);

    // -------------------------
    // Hub: circular wall with SINGLE openings (angular gap method)
    // -------------------------
    function makeHub() {
      // Hub trim ring at base (just a glowing boundary)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 160), trimHub);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.08, 0);
      scene.add(baseRing);

      // Hub wall segments (boxes around circle)
      const segments = 64;
      const segLen = (2 * Math.PI * HUB_R) / segments;

      // Compute angular half-width for each doorway based on doorWidth
      const halfDoorAngle = (CORRIDOR_W / HUB_R) * 0.60; // tuned “feels right”

      // door angles: +Z, -Z, -X, +X
      const doorAngles = [
        Math.PI / 2,         // +Z (front)
        3 * Math.PI / 2,     // -Z (back)
        Math.PI,             // -X (left)
        0                    // +X (right)
      ];

      const angleDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        // If within ANY doorway angular gap → skip this segment (ONE opening per side)
        let inDoor = false;
        for (const da of doorAngles) {
          if (angleDiff(am, da) < halfDoorAngle) { inDoor = true; break; }
        }
        if (inDoor) continue;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(WALL_T, WALL_H, segLen),
          wallMat
        ));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;

        // Hub trims on wall segment
        addWallTrims({
          length: segLen,
          thickness: 0.10,
          x: cx,
          z: cz,
          yBottom: 0.03,
          yTop: WALL_H - 0.05,
          yaw: -am,
          matBottom: trimHub,
          matTop: trimHub
        });
      }

      // Hub center anchor
      const hubCenter = new THREE.Object3D();
      hubCenter.name = "HubCenter";
      hubCenter.position.set(0, 0, 0);
      scene.add(hubCenter);

      // -------------------------
      // SUNK PIT PEDESTAL (table down)
      // -------------------------
      const pitR = 6.4;
      const pitH = 1.45;

      // Pit wall
      const pitWall = new THREE.Mesh(
        new THREE.CylinderGeometry(pitR, pitR, pitH, 64, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.75, metalness: 0.10, side: THREE.DoubleSide })
      );
      pitWall.position.set(0, -pitH/2, 0);
      scene.add(pitWall);

      // Pit floor disc (down)
      const pitFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(pitR - 0.25, pitR - 0.25, 0.08, 64),
        new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.95 })
      );
      pitFloor.position.set(0, -pitH + 0.02, 0);
      scene.add(pitFloor);

      // Table (down in pit)
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      table.position.set(0, -0.55, 0);
      table.name = "BossTable";
      scene.add(table);

      // Table base (so it’s not floating)
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 0.55, 24),
        darkMetal
      );
      base.position.set(0, -0.92, 0);
      scene.add(base);

      // Rail (visible again, down)
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.10, 12, 140),
        new THREE.MeshStandardMaterial({ color: 0x0e1018, emissive: 0x18344a, emissiveIntensity: 0.9 })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, -0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Dealer anchor (down with table)
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, -0.45, 1.05);
      scene.add(dealer);

      // Labels on hub walls near openings
      makeNeonLabel("VIP",   new THREE.Vector3(0, 2.35, HUB_R - 0.8), "#ff2d7a");     // front (+Z)
      makeNeonLabel("EVENT", new THREE.Vector3(0, 2.35, -(HUB_R - 0.8)), "#ffcc66");  // back (-Z)
      makeNeonLabel("STORE", new THREE.Vector3(-(HUB_R - 0.8), 2.35, 0), "#00ffff");  // left (-X)
      makeNeonLabel("POKER", new THREE.Vector3((HUB_R - 0.8), 2.35, 0), "#9b5cff");   // right (+X)
    }

    // -------------------------
    // Rooms (walls only) + trims
    // -------------------------
    function makeSquareRoom({ name, x, z, doorSide, trimMat }) {
      const half = ROOM_S / 2;
      const doorW = CORRIDOR_W;

      const wallSeg = (w, h, d, px, py, pz) => {
        const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
        m.position.set(px, py, pz);
        return m;
      };

      // North (+Z)
      if (doorSide === "N") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z + half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z + half);
      } else {
        wallSeg(ROOM_S + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z + half);
      }

      // South (-Z)
      if (doorSide === "S") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), WALL_H/2, z - half);
        wallSeg(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), WALL_H/2, z - half);
      } else {
        wallSeg(ROOM_S + WALL_T, WALL_H, WALL_T, x, WALL_H/2, z - half);
      }

      // East (+X)
      if (doorSide === "E") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H, seg, x + half, WALL_H/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(WALL_T, WALL_H, ROOM_S + WALL_T, x + half, WALL_H/2, z);
      }

      // West (-X)
      if (doorSide === "W") {
        const seg = (ROOM_S - doorW) / 2;
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z - (doorW/2 + seg/2));
        wallSeg(WALL_T, WALL_H, seg, x - half, WALL_H/2, z + (doorW/2 + seg/2));
      } else {
        wallSeg(WALL_T, WALL_H, ROOM_S + WALL_T, x - half, WALL_H/2, z);
      }

      // Bottom + top trims around room perimeter (simple)
      // We do 4 big trim spans centered on each wall
      addWallTrims({ length: ROOM_S, thickness: 0.10, x, z: z + half, yBottom: 0.03, yTop: WALL_H - 0.05, yaw: 0, matBottom: trimMat, matTop: trimMat });
      addWallTrims({ length: ROOM_S, thickness: 0.10, x, z: z - half, yBottom: 0.03, yTop: WALL_H - 0.05, yaw: 0, matBottom: trimMat, matTop: trimMat });
      addWallTrims({ length: ROOM_S, thickness: 0.10, x: x + half, z, yBottom: 0.03, yTop: WALL_H - 0.05, yaw: Math.PI/2, matBottom: trimMat, matTop: trimMat });
      addWallTrims({ length: ROOM_S, thickness: 0.10, x: x - half, z, yBottom: 0.03, yTop: WALL_H - 0.05, yaw: Math.PI/2, matBottom: trimMat, matTop: trimMat });

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
    }

    // -------------------------
    // Corridors: FULLY ENCLOSED + “cheek walls” (no outside visibility)
    // -------------------------
    function makeCorridor({ x, z, yaw, trimMat }) {
      // Corridor “side walls”
      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H, CORRIDOR_L);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos  = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(CORRIDOR_W/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-CORRIDOR_W/2));

      left.position.set(leftPos.x, WALL_H/2, leftPos.z);
      right.position.set(rightPos.x, WALL_H/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // Corridor trims (bottom/top) on both sides
      const trimGeo = new THREE.BoxGeometry(0.10, 0.06, CORRIDOR_L);
      const tlB = new THREE.Mesh(trimGeo, trimMat);
      const trB = new THREE.Mesh(trimGeo, trimMat);
      const tlT = new THREE.Mesh(trimGeo, trimMat);
      const trT = new THREE.Mesh(trimGeo, trimMat);

      tlB.position.set(leftPos.x, 0.03, leftPos.z);
      trB.position.set(rightPos.x, 0.03, rightPos.z);
      tlT.position.set(leftPos.x, WALL_H - 0.05, leftPos.z);
      trT.position.set(rightPos.x, WALL_H - 0.05, rightPos.z);

      tlB.rotation.y = yaw; trB.rotation.y = yaw;
      tlT.rotation.y = yaw; trT.rotation.y = yaw;
      scene.add(tlB, trB, tlT, trT);

      // ✅ Cheek walls to prevent seeing outside where circle meets corridor
      // These are small “wings” that bridge the curved hub wall edge to corridor sides
      const cheekLen = 3.2;
      const cheekGeo = new THREE.BoxGeometry(WALL_T, WALL_H, cheekLen);

      const forward = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

      // hub mouth center point at radius line
      const hubMouth = new THREE.Vector3(0, 0, 0).add(forward.clone().multiplyScalar(HUB_R + 0.2));
      const corridorNearEnd = new THREE.Vector3(x, 0, z).add(forward.clone().multiplyScalar(-CORRIDOR_L/2 + 0.1));

      // place cheeks near the hub-side end of corridor
      const cheekCenter = hubMouth.clone().lerp(corridorNearEnd, 0.45);

      const cheekL = addCollider(new THREE.Mesh(cheekGeo, wallMat));
      const cheekR = addCollider(new THREE.Mesh(cheekGeo, wallMat));

      cheekL.position.copy(cheekCenter.clone().add(side.clone().multiplyScalar(CORRIDOR_W/2 + 0.55)));
      cheekR.position.copy(cheekCenter.clone().add(side.clone().multiplyScalar(-CORRIDOR_W/2 - 0.55)));

      cheekL.position.y = WALL_H/2;
      cheekR.position.y = WALL_H/2;

      cheekL.rotation.y = yaw;
      cheekR.rotation.y = yaw;
    }

    // -------------------------
    // Build the world
    // -------------------------
    makeHub();

    // Rooms: front is VIP spawn room (south entrance into hub)
    makeSquareRoom({ name: "Room_Front", x: 0, z: frontZ, doorSide: "S", trimMat: trimCyan });
    makeSquareRoom({ name: "Room_Back",  x: 0, z: backZ,  doorSide: "N", trimMat: trimGold });
    makeSquareRoom({ name: "Room_Left",  x: leftX, z: 0,  doorSide: "E", trimMat: trimCyan });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0, doorSide: "W", trimMat: trimPink });

    // Corridors (front/back: along Z, left/right: along X)
    makeCorridor({ x: 0, z: czFront, yaw: Math.PI/2, trimMat: trimHub }); // +Z direction corridor (yaw points +Z -> use PI/2 for our forward vector helper)
    makeCorridor({ x: 0, z: czBack,  yaw: -Math.PI/2, trimMat: trimHub });
    makeCorridor({ x: cxLeft,  z: 0, yaw: Math.PI,    trimMat: trimHub });
    makeCorridor({ x: cxRight, z: 0, yaw: 0,          trimMat: trimHub });

    // -------------------------
    // Spawn: in front room, facing hub center/table
    // -------------------------
    const spawnZ = frontZ - 3.0; // 28
    const spawnPoint = new THREE.Object3D();
    spawnPoint.name = "SpawnPoint";
    spawnPoint.position.set(0, 0, spawnZ);
    spawnPoint.rotation.y = 0; // ✅ face toward -Z (hub is “in front”)
    spawnPoint.userData.faceTargetName = "BossTable"; // main.js uses this
    scene.add(spawnPoint);

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.06, 36),
      neon(0x00ffff, 1.2)
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.03, spawnZ);
    scene.add(spawnPad);

    // -------------------------
    // Teleporter BEHIND YOU (so you do NOT spawn looking at it)
    // -------------------------
    const teleporter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.6,
        roughness: 0.35
      })
    );
    teleporter.name = "TeleportMachine";
    teleporter.position.set(0, 1.1, spawnZ + 4.2); // ✅ behind spawn
    scene.add(teleporter);

    // Two VIP statues on pedestals in spawn room (simple)
    const statuePedMat = new THREE.MeshStandardMaterial({ color: 0x0d0f18, roughness: 0.6, metalness: 0.15 });
    function makeVIPStatue(x, z, tint) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.6, 20), statuePedMat);
      ped.position.set(x, 0.30, z);
      scene.add(ped);

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: tint, flatShading: true, roughness: 0.7 })
      );
      body.position.set(x, 1.15, z);
      scene.add(body);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 10, 40), neon(0xffd36b, 1.8));
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, 2.0, z);
      scene.add(halo);
    }
    makeVIPStatue(-3.2, spawnZ + 2.2, 0x7fe7ff);
    makeVIPStatue( 3.2, spawnZ + 2.2, 0xff2d7a);

    // Done
    console.log("[world] v4.2 built ✅ single entrances + enclosed corridors + trims fixed + labels + sunk table + teleporter behind spawn");
  },

  update(ctx, dt) {
    // Keep empty or add demo motion later
  }
};
