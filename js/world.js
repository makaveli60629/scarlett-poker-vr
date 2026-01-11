// /js/world.js — Scarlett Hybrid World v3.5 (FULL, GRID-ALIGNED, OPEN DOORS, SEALED HALLWAYS, NATURAL LIGHT)
// Fixes:
// ✅ Removes blocking wall at spawn entrance (doorways forced clear)
// ✅ Hub door gaps widened + buffered (no ring segments blocking)
// ✅ Corridors are "sealed" with portal sleeves so you can't see outside
// ✅ Hub moved closer to spawn room (shorter corridors)
// ✅ No ceiling; strong natural light

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    const log  = (m) => LOG?.push?.("log", m)  || console.log(m);
    const warn = (m) => LOG?.push?.("warn", m) || console.warn(m);

    ctx.systems = ctx.systems || {};
    ctx.colliders = ctx.colliders || [];
    ctx.demo = ctx.demo || {};

    // =========================
    // GRID SETTINGS
    // =========================
    const GRID = 1.0;
    const GRID_Y = 0.005;
    const snap = (v) => Math.round(v / GRID) * GRID;

    // =========================
    // MATERIALS
    // =========================
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.78, metalness: 0.12 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x051018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.0,
      roughness: 0.35,
      metalness: 0.12
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.12
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.12
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // =========================
    // NATURAL LIGHT (NO CEILINGS)
    // =========================
    // Bright ambient sky + sun
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a22, 2.2));

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(40, 60, 30);
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    // =========================
    // HELPERS
    // =========================
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      ctx.colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const addGrid = (size, x, z, color = 0x00ffff) => {
      const g = new THREE.GridHelper(size, Math.floor(size / GRID), color, 0x123040);
      g.position.set(snap(x), GRID_Y, snap(z));
      g.material.opacity = 0.35;
      g.material.transparent = true;
      g.name = "GridHelper";
      scene.add(g);
      return g;
    };

    function wallBox(w, h, d, x, y, z, ry = 0) {
      const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
      m.position.set(snap(x), y, snap(z));
      m.rotation.y = ry;
      return m;
    }

    const addNeonBaseTrimSquare = (w, d, x, z, y, mat) => {
      const t = 0.08, h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    const addNeonTopTrimSquare = (w, d, x, z, y, mat) => {
      const t = 0.08, h = 0.06;
      const gx1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      const gx2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      gx1.position.set(x, y, z + d/2);
      gx2.position.set(x, y, z - d/2);
      scene.add(gx1, gx2);

      const gz1 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      const gz2 = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
      gz1.position.set(x + w/2, y, z);
      gz2.position.set(x - w/2, y, z);
      scene.add(gz1, gz2);
    };

    // =========================
    // ROOM BUILDER (ONE DOOR)
    // =========================
    const makeSquareRoom = ({ name, x, z, size, wallH, wallT, door }) => {
      x = snap(x); z = snap(z); size = snap(size);

      addGrid(size + 2, x, z, 0x00ffff);

      // trims + top trims
      addNeonBaseTrimSquare(size, size, x, z, 0.03, neonCyan);
      addNeonTopTrimSquare(size, size, x, z, wallH - 0.03, neonPink);

      const half = size / 2;
      const doorW = snap(door?.width ?? 6.0);
      const seg = (size - doorW) / 2;

      // N (z+)
      if (door?.side === "N") {
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z + half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z + half);
      } else {
        wallBox(size + wallT, wallH, wallT, x, wallH/2, z + half);
      }

      // S (z-)
      if (door?.side === "S") {
        wallBox(seg, wallH, wallT, x - (doorW/2 + seg/2), wallH/2, z - half);
        wallBox(seg, wallH, wallT, x + (doorW/2 + seg/2), wallH/2, z - half);
      } else {
        wallBox(size + wallT, wallH, wallT, x, wallH/2, z - half);
      }

      // E (x+)
      if (door?.side === "E") {
        wallBox(wallT, wallH, seg, x + half, wallH/2, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x + half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallBox(wallT, wallH, size + wallT, x + half, wallH/2, z);
      }

      // W (x-)
      if (door?.side === "W") {
        wallBox(wallT, wallH, seg, x - half, wallH/2, z - (doorW/2 + seg/2));
        wallBox(wallT, wallH, seg, x - half, wallH/2, z + (doorW/2 + seg/2));
      } else {
        wallBox(wallT, wallH, size + wallT, x - half, wallH/2, z);
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    // =========================
    // CORRIDOR BUILDER + "PORTAL SLEEVES"
    // (prevents seeing outside at joins)
    // =========================
    const makeCorridor = ({ name, x, z, len, w, yaw, wallH, wallT }) => {
      x = snap(x); z = snap(z); len = snap(len); w = snap(w);

      addGrid(Math.max(w + 2, len + 2), x, z, 0x7fe7ff);

      // Two long walls
      const wallGeo = new THREE.BoxGeometry(wallT, wallH, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      left.position.set(snap(leftPos.x), wallH/2, snap(leftPos.z));
      right.position.set(snap(rightPos.x), wallH/2, snap(rightPos.z));
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // trims base + top
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(left.position.x, 0.03, left.position.z);
      tr.position.set(right.position.x, 0.03, right.position.z);
      tl.rotation.y = yaw;
      tr.rotation.y = yaw;
      scene.add(tl, tr);

      const tl2 = new THREE.Mesh(trimGeo, neonPink);
      const tr2 = new THREE.Mesh(trimGeo, neonPink);
      tl2.position.set(left.position.x, wallH - 0.03, left.position.z);
      tr2.position.set(right.position.x, wallH - 0.03, right.position.z);
      tl2.rotation.y = yaw;
      tr2.rotation.y = yaw;
      scene.add(tl2, tr2);

      // Portal sleeves at both ends (close the gaps so you can't see outside)
      // Build two short perpendicular walls at each corridor end connecting to the "outside"
      const endDepth = wallT; // thickness
      const endSpan = w + wallT * 2;

      // corridor local forward vector
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // yaw=0 -> +Z
      const endA = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(len/2));
      const endB = new THREE.Vector3(x, 0, z).add(fwd.clone().multiplyScalar(-len/2));

      // End caps are NOT across the doorway; they are "returns" just outside side walls:
      // we place two small wall pieces that extend outward to cover the diagonal view lines.
      const returnLen = wallT * 3.5;

      function addSleevesAt(endP) {
        // left sleeve
        wallBox(returnLen, wallH, wallT,
          endP.x + side.x * (w/2),
          wallH/2,
          endP.z + side.z * (w/2),
          yaw + Math.PI/2
        );
        // right sleeve
        wallBox(returnLen, wallH, wallT,
          endP.x - side.x * (w/2),
          wallH/2,
          endP.z - side.z * (w/2),
          yaw + Math.PI/2
        );

        // small neon sleeves base
        const sleeveTrim = new THREE.Mesh(new THREE.BoxGeometry(returnLen, 0.06, 0.08), neonCyan);
        sleeveTrim.position.set(endP.x, 0.03, endP.z);
        sleeveTrim.rotation.y = yaw + Math.PI/2;
        scene.add(sleeveTrim);
      }

      addSleevesAt(endA);
      addSleevesAt(endB);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
      return anchor;
    };

    // =========================
    // HUB BUILDER (DOORS FORCED OPEN)
    // =========================
    const makeHub = ({ radius, wallH, wallT, segments = 80, doorWidth = 6.0 }) => {
      radius = snap(radius);
      doorWidth = snap(doorWidth);

      addGrid(radius * 2 + 6, 0, 0, 0x9b5cff);

      // Base ring + top ring
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 16, 180), neonPurple);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(0, 0.28, 0);
      scene.add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.10, 16, 180), neonCyan);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, wallH - 0.10, 0);
      scene.add(topRing);

      // Door gaps: widen with buffer so NOTHING blocks
      const buffer = 0.55; // meters extra gap safety
      const halfAng = Math.asin(Math.min(0.999, ((doorWidth/2 + buffer) / radius)));

      const doorCenters = [
        0, Math.PI/2, Math.PI, (3*Math.PI)/2
      ];

      const angDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };

      const isInDoorGap = (am) => doorCenters.some(c => angDiff(am, c) < halfAng);

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        if (isInDoorGap(am)) continue;

        const cx = Math.cos(am) * radius;
        const cz = Math.sin(am) * radius;
        const segLen = (2 * Math.PI * radius) / segments;

        const wall = addCollider(new THREE.Mesh(
          new THREE.BoxGeometry(wallT, wallH, segLen),
          wallMat
        ));
        wall.position.set(snap(cx), wallH/2, snap(cz));
        wall.rotation.y = -am;
      }

      // Anchor
      const hubPlate = new THREE.Object3D();
      hubPlate.name = "HubPlate";
      hubPlate.position.set(0, 0, 0);
      scene.add(hubPlate);

      // Centerpiece table + stand
      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      tableTop.position.set(0, 0.92, 0);
      tableTop.name = "BossTable";
      scene.add(tableTop);

      const tableStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.85, 0.85, 24),
        darkMetal
      );
      tableStand.position.set(0, 0.42, 0);
      scene.add(tableStand);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.12, 12, 160),
        new THREE.MeshStandardMaterial({
          color: 0x11131c,
          emissive: 0x132a3a,
          emissiveIntensity: 0.75
        })
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, 0.68, 0);
      scene.add(rail);

      // Dealer anchor
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, 1.05, 1.05);
      scene.add(dealer);
    };

    // =========================
    // DIMENSIONS (HUB CLOSER)
    // =========================
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = snap(14.0);
    const ROOM_S = snap(14.0);

    // 🔥 Bring hub closer so spawn has straight entrance -> hub
    const CORRIDOR_L = snap(6.0);   // was 10
    const CORRIDOR_W = snap(6.0);   // widen entrances

    // Build hub first
    makeHub({ radius: HUB_R, wallH: WALL_H, wallT: WALL_T, segments: 96, doorWidth: CORRIDOR_W });

    // Room centers
    const frontZ = snap(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const backZ  = snap(-(HUB_R + CORRIDOR_L + ROOM_S / 2));
    const leftX  = snap(-(HUB_R + CORRIDOR_L + ROOM_S / 2));
    const rightX = snap((HUB_R + CORRIDOR_L + ROOM_S / 2));

    // Rooms (ONE door facing hub)
    makeSquareRoom({ name: "Room_Front", x: 0,      z: frontZ, size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "S", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Back",  x: 0,      z: backZ,  size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "N", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Left",  x: leftX,  z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "E", width: CORRIDOR_W } });
    makeSquareRoom({ name: "Room_Right", x: rightX, z: 0,      size: ROOM_S, wallH: WALL_H, wallT: WALL_T, door: { side: "W", width: CORRIDOR_W } });

    // Corridors aligned to doors
    makeCorridor({ name: "Corridor_Front", x: 0, z: snap(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,          wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Back",  x: 0, z: snap(-(HUB_R + CORRIDOR_L/2)), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0,         wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Left",  x: snap(-(HUB_R + CORRIDOR_L/2)), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });
    makeCorridor({ name: "Corridor_Right", x: snap((HUB_R + CORRIDOR_L/2)),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2, wallH: WALL_H, wallT: WALL_T });

    // =========================
    // SPAWN: Straight shot to hub
    // =========================
    const spawnZ = snap(frontZ - 5.0); // more space, facing corridor/hub

    const spawnPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.1,
      roughness: 0.35,
      metalness: 0.15
    });

    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36), spawnPadMat);
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, spawnZ);
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);

    // Face toward hub (hub is at z=0, front room is +z, so face -Z)
    sp.rotation.y = Math.PI;
    sp.userData.faceTargetName = "HubPlate";
    scene.add(sp);

    log("[world] v3.5 built ✅ spawn entrance cleared + hub closer + sealed corridors + natural light ✅");
  },

  update(ctx, dt) {
    // Nothing required here for the structural fixes.
    // Keep your demo systems in main.js or add them back once layout is locked.
  }
};
