// /js/world.js — Scarlett Hybrid World v3.6 (FULL LIGHTS + HUB HUD WALLS + DOOR-SAFE TRIMS)

export const World = {
  async init(ctx) {
    const { THREE, scene } = ctx;

    // ---------------------------------------------------------
    // Materials
    // ---------------------------------------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.85, metalness: 0.06 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x061018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 3.0,
      roughness: 0.25,
      metalness: 0.15
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 2.4,
      roughness: 0.25,
      metalness: 0.15
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 3.2,
      roughness: 0.25,
      metalness: 0.15
    });

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });

    // ---------------------------------------------------------
    // SUPER LIGHTING INSIDE WORLD (in addition to main.js pack)
    // ---------------------------------------------------------
    const worldLights = new THREE.Group();
    worldLights.name = "WorldLightPack";
    scene.add(worldLights);

    // Hub ceiling-ish flood points (no ceiling needed)
    const floodA = new THREE.PointLight(0xffffff, 2.4, 70);
    floodA.position.set(0, 10, 0);
    worldLights.add(floodA);

    const floodB = new THREE.PointLight(0x9bdcff, 1.8, 60);
    floodB.position.set(0, 7, 8);
    worldLights.add(floodB);

    const floodC = new THREE.PointLight(0xff7bd1, 1.6, 60);
    floodC.position.set(0, 7, -8);
    worldLights.add(floodC);

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------
    const colliders = [];

    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    // ---------------------------------------------------------
    // Layout constants
    // ---------------------------------------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;

    const CORRIDOR_L = 6.0;  // closer
    const CORRIDOR_W = 6.0;  // wide entrances

    // Room centers
    const frontZ = (HUB_R + CORRIDOR_L + ROOM_S / 2);
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const rightX = (HUB_R + CORRIDOR_L + ROOM_S / 2);

    // ---------------------------------------------------------
    // Square room builder with DOOR-SAFE trims (no trim across door)
    // ---------------------------------------------------------
    function addTrimSquareDoorSafe({ x, z, size, y, mat, doorSide, doorW }) {
      const t = 0.08, h = 0.06;
      const half = size / 2;
      const gap = doorW / 2;

      // North edge
      if (doorSide !== "N") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat);
        m.position.set(x, y, z + half);
        scene.add(m);
      } else {
        const seg = (size - doorW) / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(seg, h, t), mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(seg, h, t), mat);
        a.position.set(x - (gap + seg/2), y, z + half);
        b.position.set(x + (gap + seg/2), y, z + half);
        scene.add(a, b);
      }

      // South edge
      if (doorSide !== "S") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(size, h, t), mat);
        m.position.set(x, y, z - half);
        scene.add(m);
      } else {
        const seg = (size - doorW) / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(seg, h, t), mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(seg, h, t), mat);
        a.position.set(x - (gap + seg/2), y, z - half);
        b.position.set(x + (gap + seg/2), y, z - half);
        scene.add(a, b);
      }

      // East edge
      if (doorSide !== "E") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
        m.position.set(x + half, y, z);
        scene.add(m);
      } else {
        const seg = (size - doorW) / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(t, h, seg), mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(t, h, seg), mat);
        a.position.set(x + half, y, z - (gap + seg/2));
        b.position.set(x + half, y, z + (gap + seg/2));
        scene.add(a, b);
      }

      // West edge
      if (doorSide !== "W") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, size), mat);
        m.position.set(x - half, y, z);
        scene.add(m);
      } else {
        const seg = (size - doorW) / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(t, h, seg), mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(t, h, seg), mat);
        a.position.set(x - half, y, z - (gap + seg/2));
        b.position.set(x - half, y, z + (gap + seg/2));
        scene.add(a, b);
      }
    }

    function makeSquareRoom({ name, x, z, doorSide, doorW, trimColor }) {
      // walls with single door
      const size = ROOM_S;
      const half = size / 2;
      const seg = (size - doorW) / 2;

      // base + top trims (DOOR SAFE)
      addTrimSquareDoorSafe({ x, z, size, y: 0.03, mat: trimColor, doorSide, doorW });
      addTrimSquareDoorSafe({ x, z, size, y: WALL_H - 0.03, mat: neonPink, doorSide, doorW });

      // walls
      const wallBox = (w, h, d, px, pz) => {
        const m = addCollider(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
        m.position.set(px, h/2, pz);
      };

      // N
      if (doorSide === "N") {
        wallBox(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), z + half);
        wallBox(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), z + half);
      } else wallBox(size + WALL_T, WALL_H, WALL_T, x, z + half);

      // S
      if (doorSide === "S") {
        wallBox(seg, WALL_H, WALL_T, x - (doorW/2 + seg/2), z - half);
        wallBox(seg, WALL_H, WALL_T, x + (doorW/2 + seg/2), z - half);
      } else wallBox(size + WALL_T, WALL_H, WALL_T, x, z - half);

      // E
      if (doorSide === "E") {
        wallBox(WALL_T, WALL_H, seg, x + half, z - (doorW/2 + seg/2));
        wallBox(WALL_T, WALL_H, seg, x + half, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, WALL_H, size + WALL_T, x + half, z);

      // W
      if (doorSide === "W") {
        wallBox(WALL_T, WALL_H, seg, x - half, z - (doorW/2 + seg/2));
        wallBox(WALL_T, WALL_H, seg, x - half, z + (doorW/2 + seg/2));
      } else wallBox(WALL_T, WALL_H, size + WALL_T, x - half, z);

      // room light
      const pl = new THREE.PointLight(0xffffff, 1.6, 30);
      pl.position.set(x, 4.0, z);
      scene.add(pl);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);
    }

    // ---------------------------------------------------------
    // Corridor builder (side walls + trims + corridor lights)
    // ---------------------------------------------------------
    function makeCorridor({ x, z, len, w, yaw }) {
      const wallGeo = new THREE.BoxGeometry(WALL_T, WALL_H, len);
      const left = addCollider(new THREE.Mesh(wallGeo, wallMat));
      const right = addCollider(new THREE.Mesh(wallGeo, wallMat));

      const side = new THREE.Vector3(Math.cos(yaw + Math.PI/2), 0, Math.sin(yaw + Math.PI/2));
      const leftPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(w/2));
      const rightPos = new THREE.Vector3(x, 0, z).add(side.clone().multiplyScalar(-w/2));

      left.position.set(leftPos.x, WALL_H/2, leftPos.z);
      right.position.set(rightPos.x, WALL_H/2, rightPos.z);
      left.rotation.y = yaw;
      right.rotation.y = yaw;

      // corridor lights (runway)
      for (let i = -2; i <= 2; i++) {
        const t = (i / 2) * (len * 0.42);
        const fx = x + Math.sin(yaw) * t;
        const fz = z + Math.cos(yaw) * t;
        const p = new THREE.PointLight(0x9bdcff, 1.25, 18);
        p.position.set(fx, 2.5, fz);
        scene.add(p);
      }

      // trims base + top
      const trimGeo = new THREE.BoxGeometry(0.08, 0.06, len);
      const tl = new THREE.Mesh(trimGeo, neonCyan);
      const tr = new THREE.Mesh(trimGeo, neonCyan);
      tl.position.set(left.position.x, 0.03, left.position.z);
      tr.position.set(right.position.x, 0.03, right.position.z);
      tl.rotation.y = yaw; tr.rotation.y = yaw;
      scene.add(tl, tr);

      const tl2 = new THREE.Mesh(trimGeo, neonPink);
      const tr2 = new THREE.Mesh(trimGeo, neonPink);
      tl2.position.set(left.position.x, WALL_H - 0.03, left.position.z);
      tr2.position.set(right.position.x, WALL_H - 0.03, right.position.z);
      tl2.rotation.y = yaw; tr2.rotation.y = yaw;
      scene.add(tl2, tr2);
    }

    // ---------------------------------------------------------
    // HUB walls + PURPLE trims + HUD PANELS (unlit)
    // ---------------------------------------------------------
    function makeHub() {
      // Hub anchor (used for spawn facing / laser bias)
      const hub = new THREE.Object3D();
      hub.name = "HubPlate";
      hub.position.set(0, 0, 0);
      scene.add(hub);

      // Door gaps: widen and guarantee clear
      const doorW = CORRIDOR_W;
      const buffer = 0.75;
      const halfAng = Math.asin(Math.min(0.999, ((doorW/2 + buffer) / HUB_R)));
      const doorCenters = [0, Math.PI/2, Math.PI, (3*Math.PI)/2];
      const angDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };
      const isInDoorGap = (am) => doorCenters.some(c => angDiff(am, c) < halfAng);

      // Base and top rings (purple)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.14, 16, 200), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.set(0, 0.26, 0);
      scene.add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.12, 16, 200), neonPurple);
      topRing.rotation.x = Math.PI/2;
      topRing.position.set(0, WALL_H - 0.10, 0);
      scene.add(topRing);

      // Hub walls (segments) + HUD panels on interior
      const segments = 96;
      const segLen = (2 * Math.PI * HUB_R) / segments;

      // HUD panel material (UNLIT so it always shows)
      const hudMat = new THREE.MeshBasicMaterial({ color: 0x0a2030, transparent: true, opacity: 0.92 });

      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;

        if (isInDoorGap(am)) continue;

        const cx = Math.cos(am) * HUB_R;
        const cz = Math.sin(am) * HUB_R;

        // wall segment
        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMat));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;

        // HUD panel covering interior wall (big)
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(segLen * 0.95, 2.2), hudMat);
        // place slightly inward from wall
        const inward = new THREE.Vector3(-Math.cos(am), 0, -Math.sin(am)).multiplyScalar(0.22);
        panel.position.set(cx + inward.x, 1.55, cz + inward.z);
        panel.rotation.y = -am + Math.PI/2;
        scene.add(panel);

        // small emissive strip above panel
        const strip = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.92, 0.05, 0.06), neonCyan);
        strip.position.set(panel.position.x, 2.65, panel.position.z);
        strip.rotation.y = panel.rotation.y;
        scene.add(strip);
      }

      // Center table + stand
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48), feltMat);
      tableTop.position.set(0, 0.92, 0);
      tableTop.name = "BossTable";
      scene.add(tableTop);

      const tableStand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.85, 24), darkMetal);
      tableStand.position.set(0, 0.42, 0);
      scene.add(tableStand);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.12, 12, 160),
        new THREE.MeshStandardMaterial({ color: 0x101622, emissive: 0x132a3a, emissiveIntensity: 1.1 })
      );
      rail.rotation.x = Math.PI/2;
      rail.position.set(0, 0.68, 0);
      scene.add(rail);

      // Pillar ring above rail (your “crayon colors” ring)
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.10, 14, 220), neonCyan);
      ringA.rotation.x = Math.PI/2;
      ringA.position.set(0, 2.85, 0);
      scene.add(ringA);

      const ringB = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.07, 14, 220), neonPink);
      ringB.rotation.x = Math.PI/2;
      ringB.position.set(0, 3.10, 0);
      scene.add(ringB);

      // more hub lights
      const hubLight1 = new THREE.PointLight(0x9b5cff, 2.0, 45);
      hubLight1.position.set(0, 5.5, 0);
      scene.add(hubLight1);

      const hubLight2 = new THREE.PointLight(0x00ffff, 1.6, 45);
      hubLight2.position.set(6, 3.5, 0);
      scene.add(hubLight2);

      const hubLight3 = new THREE.PointLight(0xff2d7a, 1.4, 45);
      hubLight3.position.set(-6, 3.5, 0);
      scene.add(hubLight3);
    }

    // Build hub
    makeHub();

    // Build rooms (N/S/E/W)
    // South (frontZ) is your spawn lobby room
    makeSquareRoom({ name: "Room_South_Spawn", x: 0, z: frontZ, doorSide: "S", doorW: CORRIDOR_W, trimColor: neonCyan });
    makeSquareRoom({ name: "Room_North",      x: 0, z: backZ,  doorSide: "N", doorW: CORRIDOR_W, trimColor: neonPink });
    makeSquareRoom({ name: "Room_West",       x: leftX, z: 0,  doorSide: "E", doorW: CORRIDOR_W, trimColor: neonCyan });
    makeSquareRoom({ name: "Room_East",       x: rightX,z: 0,  doorSide: "W", doorW: CORRIDOR_W, trimColor: neonPink });

    // Corridors connect square entrances to hub entrances (straight shot)
    makeCorridor({ x: 0, z: (HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0 });           // South hallway
    makeCorridor({ x: 0, z: -(HUB_R + CORRIDOR_L/2), len: CORRIDOR_L, w: CORRIDOR_W, yaw: 0 });          // North hallway
    makeCorridor({ x: -(HUB_R + CORRIDOR_L/2), z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2 });  // West hallway
    makeCorridor({ x: (HUB_R + CORRIDOR_L/2),  z: 0, len: CORRIDOR_L, w: CORRIDOR_W, yaw: Math.PI/2 });  // East hallway

    // Spawn point: NOTHING in front of you to reach hallway/hub/table
    const spawnZ = frontZ - 5.0;

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.16, 36),
      new THREE.MeshStandardMaterial({ color: 0x081018, emissive: 0x00ffff, emissiveIntensity: 2.0 })
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.14, spawnZ);
    scene.add(spawnPad);

    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, spawnZ);

    // Face toward hub (hub is at z=0, spawn room is +z => face -z)
    sp.rotation.y = Math.PI;
    scene.add(sp);

    // Optional: keep colliders accessible if you want later
    ctx.colliders = colliders;

    console.log("[world] v3.6 ✅ bright hub HUD walls + lots of lights + door-safe trims + straight hallways");
  },

  update(ctx, dt) {
    // no-op for now
  }
};
