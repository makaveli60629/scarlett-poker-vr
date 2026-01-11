// /js/world.js — Scarlett Hybrid World v3.7
// ✅ Guaranteed hallways: floor + walls + trims, aligned to hub door cuts
// ✅ Hub door cuts: N/S/E/W clear openings sized to corridor width
// ✅ Lots of lights inside hub + corridors + rooms
// ✅ HUD wall panels (unlit) remain for readability

export const World = {
  async init(ctx) {
    const { THREE, scene } = ctx;

    // -----------------------------
    // Materials
    // -----------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.75, metalness: 0.10 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x070913, roughness: 0.95, metalness: 0.05 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x061018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 3.2,
      roughness: 0.25,
      metalness: 0.15
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 2.6,
      roughness: 0.25,
      metalness: 0.15
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 3.4,
      roughness: 0.25,
      metalness: 0.15
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // -----------------------------
    // Lighting (world pack)
    // -----------------------------
    const worldLights = new THREE.Group();
    worldLights.name = "WorldLightPack";
    scene.add(worldLights);

    worldLights.add(new THREE.AmbientLight(0xffffff, 0.65));
    worldLights.add(new THREE.HemisphereLight(0xffffff, 0x202038, 1.65));

    const sun = new THREE.DirectionalLight(0xffffff, 2.7);
    sun.position.set(30, 80, 40);
    worldLights.add(sun);

    // big hub floods
    const flood = new THREE.PointLight(0xffffff, 2.6, 90);
    flood.position.set(0, 10, 0);
    worldLights.add(flood);

    const flood2 = new THREE.PointLight(0x9bdcff, 2.0, 70);
    flood2.position.set(0, 7, 10);
    worldLights.add(flood2);

    const flood3 = new THREE.PointLight(0xff7bd1, 1.7, 70);
    flood3.position.set(0, 7, -10);
    worldLights.add(flood3);

    // -----------------------------
    // Geometry constants (grid-aligned)
    // -----------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;

    const ROOM_S = 14.0;

    // ✅ corridor is real now
    const CORRIDOR_L = 8.0;   // long enough to feel like hallway
    const CORRIDOR_W = 6.0;   // wide doorway

    // centers of rooms
    const southZ = (HUB_R + CORRIDOR_L + ROOM_S / 2);
    const northZ = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const westX  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const eastX  = (HUB_R + CORRIDOR_L + ROOM_S / 2);

    // collider list
    const colliders = [];
    const addCollider = (mesh) => { mesh.userData.solid = true; colliders.push(mesh); scene.add(mesh); return mesh; };

    // -----------------------------
    // Base ground plane (teleport must hit something)
    // -----------------------------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0;
    scene.add(base);

    // -----------------------------
    // Helpers
    // -----------------------------
    function addDoorSafeTrimSquare({ x, z, size, y, mat, doorSide, doorW }) {
      const t = 0.08, h = 0.06;
      const half = size / 2;
      const gap = doorW / 2;

      const addSeg = (w, d, px, pz) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(px, y, pz);
        scene.add(m);
      };

      // N
      if (doorSide !== "N") addSeg(size, t, x, z + half);
      else {
        const seg = (size - doorW) / 2;
        addSeg(seg, t, x - (gap + seg/2), z + half);
        addSeg(seg, t, x + (gap + seg/2), z + half);
      }
      // S
      if (doorSide !== "S") addSeg(size, t, x, z - half);
      else {
        const seg = (size - doorW) / 2;
        addSeg(seg, t, x - (gap + seg/2), z - half);
        addSeg(seg, t, x + (gap + seg/2), z - half);
      }
      // E
      if (doorSide !== "E") addSeg(t, size, x + half, z);
      else {
        const seg = (size - doorW) / 2;
        addSeg(t, seg, x + half, z - (gap + seg/2));
        addSeg(t, seg, x + half, z + (gap + seg/2));
      }
      // W
      if (doorSide !== "W") addSeg(t, size, x - half, z);
      else {
        const seg = (size - doorW) / 2;
        addSeg(t, seg, x - half, z - (gap + seg/2));
        addSeg(t, seg, x - half, z + (gap + seg/2));
      }
    }

    function makeSquareRoom({ name, x, z, doorSide, trimMat }) {
      const size = ROOM_S;
      const half = size / 2;
      const doorW = CORRIDOR_W;
      const seg = (size - doorW) / 2;

      // room floor slab (slightly raised)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.18, size), floorMat);
      floor.position.set(x, 0.09, z);
      scene.add(floor);

      // trims base + top (door safe)
      addDoorSafeTrimSquare({ x, z, size, y: 0.03, mat: trimMat, doorSide, doorW });
      addDoorSafeTrimSquare({ x, z, size, y: WALL_H - 0.03, mat: neonPink, doorSide, doorW });

      const wallBox = (w, d, px, pz) => {
        const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat));
        m.position.set(px, WALL_H/2, pz);
      };

      // N
      if (doorSide === "N") {
        wallBox(seg, WALL_T, x - (doorW/2 + seg/2), z + half);
        wallBox(seg, WALL_T, x + (doorW/2 + seg/2), z + half);
      } else wallBox(size + WALL_T, WALL_T, x, z + half);

      // S
      if (doorSide === "S") {
        wallBox(seg, WALL_T, x - (doorW/2 + seg/2), z - half);
        wallBox(seg, WALL_T, x + (doorW/2 + seg/2), z - half);
      } else wallBox(size + WALL_T, WALL_T, x, z - half);

      // E
      if (doorSide === "E") {
        wallBox(WALL_T, seg, x + half, z - (doorW/2 + seg/2));
        wallBox(WALL_T, seg, x + half, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, size + WALL_T, x + half, z);

      // W
      if (doorSide === "W") {
        wallBox(WALL_T, seg, x - half, z - (doorW/2 + seg/2));
        wallBox(WALL_T, seg, x - half, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, size + WALL_T, x - half, z);

      // room light
      const pl = new THREE.PointLight(0xffffff, 1.5, 28);
      pl.position.set(x, 4.2, z);
      scene.add(pl);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
    }

    // ✅ REAL corridor: floor + 2 walls + trims + runway lights
    function makeCorridor({ name, x, z, yaw }) {
      // corridor box floor (raised)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_W, 0.18, CORRIDOR_L), floorMat);
      floor.position.set(x, 0.09, z);
      floor.rotation.y = yaw;
      scene.add(floor);

      // side walls
      const wallLen = CORRIDOR_L;
      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H, wallLen);

      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const lp = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(CORRIDOR_W/2));
      const rp = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-CORRIDOR_W/2));

      left.position.set(lp.x, WALL_H/2, lp.z);
      right.position.set(rp.x, WALL_H/2, rp.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // trims base + top
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, wallLen);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(lp.x, 0.03, lp.z);
      tr.position.set(rp.x, 0.03, rp.z);
      tl.rotation.y = yaw; tr.rotation.y = yaw;
      scene.add(tl, tr);

      const tl2 = new THREE.Mesh(trimGeo, neonPink);
      const tr2 = new THREE.Mesh(trimGeo, neonPink);
      tl2.position.set(lp.x, WALL_H - 0.03, lp.z);
      tr2.position.set(rp.x, WALL_H - 0.03, rp.z);
      tl2.rotation.y = yaw; tr2.rotation.y = yaw;
      scene.add(tl2, tr2);

      // runway lights
      for (let i = -3; i <= 3; i++) {
        const t = (i / 3) * (CORRIDOR_L * 0.45);
        const fx = x + Math.sin(yaw) * t;
        const fz = z + Math.cos(yaw) * t;
        const p = new THREE.PointLight(0x9bdcff, 1.1, 16);
        p.position.set(fx, 2.4, fz);
        scene.add(p);
      }

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
    }

    // ✅ HUB: hard door cuts that match corridor width
    function makeHub() {
      const hubAnchor = new THREE.Object3D();
      hubAnchor.name = "HubPlate";
      hubAnchor.position.set(0, 0, 0);
      scene.add(hubAnchor);

      // purple rings
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.14, 16, 220), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.26, 0);
      scene.add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 220), neonPurple);
      topRing.rotation.x = Math.PI/2;
      topRing.position.set(0, WALL_H - 0.10, 0);
      scene.add(topRing);

      // door cut math
      const doorW = CORRIDOR_W;
      const buffer = 0.85; // more clearance
      const halfAng = Math.asin(Math.min(0.999, ((doorW/2 + buffer) / HUB_R)));
      const doorCenters = [0, Math.PI/2, Math.PI, (3*Math.PI)/2];

      const angDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };
      const isDoor = (am) => doorCenters.some(c => angDiff(am, c) < halfAng);

      // HUD wall panels (unlit)
      const hudMat = new THREE.MeshBasicMaterial({ color: 0x0a2030, transparent: true, opacity: 0.92 });

      const segments = 120;
      const segLen = (2 * Math.PI * HUB_R) / segments;

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        if (isDoor(am)) continue;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMat));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;

        // interior HUD panel
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(segLen * 0.95, 2.2), hudMat);
        const inward = new THREE.Vector3(-Math.cos(am), 0, -Math.sin(am)).multiplyScalar(0.22);
        panel.position.set(cx + inward.x, 1.55, cz + inward.z);
        panel.rotation.y = -am + Math.PI/2;
        scene.add(panel);

        // strip
        const strip = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.92, 0.05, 0.06), neonCyan);
        strip.position.set(panel.position.x, 2.65, panel.position.z);
        strip.rotation.y = panel.rotation.y;
        scene.add(strip);
      }

      // table + stand
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      tableTop.position.set(0, 0.92, 0);
      tableTop.name = "BossTable";
      scene.add(tableTop);

      const tableStand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.85, 24), darkMetal);
      tableStand.position.set(0, 0.42, 0);
      scene.add(tableStand);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.12, 12, 160),
        new THREE.MeshStandardMaterial({ color: 0x101622, emissive: 0x132a3a, emissiveIntensity: 1.25 })
      );
      rail.rotation.x = Math.PI/2;
      rail.position.set(0, 0.68, 0);
      scene.add(rail);

      // ceiling-ish rings (crayon colors)
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.10, 14, 240), neonCyan);
      ringA.rotation.x = Math.PI/2;
      ringA.position.set(0, 2.85, 0);
      scene.add(ringA);

      const ringB = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.07, 14, 240), neonPink);
      ringB.rotation.x = Math.PI/2;
      ringB.position.set(0, 3.10, 0);
      scene.add(ringB);

      // hub extra lights
      const hubP = new THREE.PointLight(0x9b5cff, 2.2, 60);
      hubP.position.set(0, 5.8, 0);
      scene.add(hubP);
    }

    // Build hub
    makeHub();

    // Rooms N/S/E/W (South is spawn lobby)
    makeSquareRoom({ name: "Room_South_Spawn", x: 0, z: southZ, doorSide: "S", trimMat: neonCyan });
    makeSquareRoom({ name: "Room_North",      x: 0, z: northZ, doorSide: "N", trimMat: neonPink });
    makeSquareRoom({ name: "Room_West",       x: westX, z: 0,  doorSide: "E", trimMat: neonCyan });
    makeSquareRoom({ name: "Room_East",       x: eastX, z: 0,  doorSide: "W", trimMat: neonPink });

    // ✅ Corridors: positioned halfway between hub edge and room edge
    // South corridor center
    makeCorridor({ name: "Corridor_South", x: 0, z: (HUB_R + CORRIDOR_L/2), yaw: 0 });
    // North corridor center
    makeCorridor({ name: "Corridor_North", x: 0, z: -(HUB_R + CORRIDOR_L/2), yaw: 0 });
    // West corridor center (yaw 90deg)
    makeCorridor({ name: "Corridor_West", x: -(HUB_R + CORRIDOR_L/2), z: 0, yaw: Math.PI/2 });
    // East corridor center
    makeCorridor({ name: "Corridor_East", x: (HUB_R + CORRIDOR_L/2), z: 0, yaw: Math.PI/2 });

    // Spawn point: face toward hub (-Z) from south room
    const spawnZ = southZ - 5.0;

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36),
      new THREE.MeshStandardMaterial({ color: 0x081018, emissive: 0x00ffff, emissiveIntensity: 2.4 })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, spawnZ);
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);
    sp.rotation.y = Math.PI; // face -Z (toward hub)
    scene.add(sp);

    ctx.colliders = colliders;

    console.log("[world] v3.7 ✅ hallways built (floor+walls), hub door cuts clear, lights boosted");
  },

  update(ctx, dt) {}
};
