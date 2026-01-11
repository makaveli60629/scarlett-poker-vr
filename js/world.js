// /js/world.js — Scarlett Hybrid World v3.9 (FULL)
// ✅ Center hub: spectator ring + sunken pit table on pedestal (people look DOWN into game)
// ✅ Hub wall trims aligned + top trims
// ✅ Glass “hood” panels on hub interior walls with illumination + labels
// ✅ NO pillars (per your latest instruction)
// ✅ Store placed in LEFT/WEST room with lit display cases + labels
// ✅ Enclosed world (no outside gaps); corridor floors + corridor side walls
// ✅ Door openings: clean N/S/E/W in hub that match corridor width

export const World = {
  async init(ctx) {
    const { THREE, scene } = ctx;

    // -----------------------------
    // Constants (grid-ish)
    // -----------------------------
    const WALL_H = 3.0;
    const WALL_T = 0.28;

    const HUB_R = 14.0;

    const ROOM_S = 14.0;

    const CORRIDOR_L = 8.0;
    const CORRIDOR_W = 6.0;

    // Room centers relative to hub center
    const southZ = (HUB_R + CORRIDOR_L + ROOM_S / 2);
    const northZ = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const westX  = -(HUB_R + CORRIDOR_L + ROOM_S / 2);
    const eastX  = (HUB_R + CORRIDOR_L + ROOM_S / 2);

    // -----------------------------
    // Materials
    // -----------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.75, metalness: 0.10 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x070913, roughness: 0.95, metalness: 0.05 });

    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.6, metalness: 0.2 });
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x061018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 3.0,
      roughness: 0.25,
      metalness: 0.12
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0x12050c,
      emissive: new THREE.Color(0xff2d7a),
      emissiveIntensity: 2.6,
      roughness: 0.25,
      metalness: 0.12
    });

    const neonPurple = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      emissive: new THREE.Color(0x9b5cff),
      emissiveIntensity: 3.2,
      roughness: 0.25,
      metalness: 0.12
    });

    // Glass hood material (needs WebGL2-ish but works on Quest)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x08202a),
      transparent: true,
      opacity: 0.28,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.85,   // “glass”
      thickness: 0.25,
      ior: 1.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    // Simple “HUD panel” base (unlit)
    const hudPanelMat = new THREE.MeshBasicMaterial({
      color: 0x0a2030,
      transparent: true,
      opacity: 0.90
    });

    // -----------------------------
    // Lights (world pack; main.js also adds extra)
    // -----------------------------
    const worldLights = new THREE.Group();
    worldLights.name = "WorldLightPack";
    scene.add(worldLights);

    worldLights.add(new THREE.AmbientLight(0xffffff, 0.55));
    worldLights.add(new THREE.HemisphereLight(0xffffff, 0x202038, 1.45));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(30, 80, 40);
    worldLights.add(sun);

    // -----------------------------
    // Colliders (optional)
    // -----------------------------
    const colliders = [];
    const addCollider = (mesh) => {
      mesh.userData.solid = true;
      colliders.push(mesh);
      scene.add(mesh);
      return mesh;
    };
    ctx.colliders = colliders;

    // -----------------------------
    // Base infinite-ish ground (teleport always has something)
    // -----------------------------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0;
    scene.add(base);

    // -----------------------------
    // Text sprite helper (labels for hoods, store, etc.)
    // -----------------------------
    function makeTextSprite(text, { size = 256, pad = 18, fg = "#bffcff", bg = "rgba(0,0,0,0.45)" } = {}) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const g = canvas.getContext("2d");

      g.clearRect(0, 0, size, size);
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);

      g.strokeStyle = "rgba(0,255,255,0.25)";
      g.lineWidth = 6;
      g.strokeRect(8, 8, size - 16, size - 16);

      g.fillStyle = fg;
      g.font = `bold ${Math.floor(size * 0.12)}px ui-monospace, Menlo, monospace`;
      g.textAlign = "center";
      g.textBaseline = "middle";

      const lines = String(text).split("\n").slice(0, 5);
      const lineH = size * 0.14;
      const startY = size / 2 - (lines.length - 1) * (lineH / 2);

      for (let i = 0; i < lines.length; i++) {
        g.fillText(lines[i], size / 2, startY + i * lineH);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const spr = new THREE.Sprite(mat);
      spr.scale.set(2.2, 2.2, 1);
      spr.renderOrder = 999;
      return spr;
    }

    // -----------------------------
    // Trim helper for square rooms (base + top, door-safe)
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

    // -----------------------------
    // Square room builder
    // -----------------------------
    function makeSquareRoom({ name, x, z, doorSide, trimMat }) {
      const size = ROOM_S;
      const half = size / 2;
      const doorW = CORRIDOR_W;
      const seg = (size - doorW) / 2;

      // floor slab
      const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.18, size), floorMat);
      floor.position.set(x, 0.09, z);
      scene.add(floor);

      // trims: base + top
      addDoorSafeTrimSquare({ x, z, size, y: 0.03, mat: trimMat, doorSide, doorW });
      addDoorSafeTrimSquare({ x, z, size, y: WALL_H - 0.03, mat: neonPink, doorSide, doorW });

      // walls (door-safe)
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
      const pl = new THREE.PointLight(0xffffff, 1.25, 28);
      pl.position.set(x, 4.2, z);
      scene.add(pl);

      const anchor = new THREE.Object3D();
      anchor.name = name;
      anchor.position.set(x, 0, z);
      scene.add(anchor);

      return anchor;
    }

    // -----------------------------
    // Corridor builder (floor + 2 side walls + trims + runway lights)
    // -----------------------------
    function makeCorridor({ name, x, z, yaw }) {
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
      return anchor;
    }

    // -----------------------------
    // Hub: spectator ring + sunken pit + wall with 4 door cuts
    // -----------------------------
    function makeHub() {
      const walkwayY = 0.11;
      const pitDepth = 1.35;
      const pitY = walkwayY - pitDepth;

      const innerR = 6.2;     // pit mouth radius (spectator can look down)
      const outerR = HUB_R;

      // Walkable ring (HubPlate)
      const hubWalkway = new THREE.Mesh(
        new THREE.RingGeometry(innerR, outerR, 200),
        new THREE.MeshStandardMaterial({
          color: 0x0a0b12,
          roughness: 0.55,
          metalness: 0.10,
          side: THREE.DoubleSide
        })
      );
      hubWalkway.rotation.x = -Math.PI / 2;
      hubWalkway.position.y = walkwayY;
      hubWalkway.name = "HubPlate";
      scene.add(hubWalkway);

      // Pit wall (cylinder side)
      const pitWall = new THREE.Mesh(
        new THREE.CylinderGeometry(innerR, innerR, pitDepth, 180, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0x070812,
          roughness: 0.85,
          metalness: 0.10,
          side: THREE.DoubleSide
        })
      );
      pitWall.position.y = walkwayY - pitDepth/2;
      scene.add(pitWall);

      // Pit floor
      const pitFloor = new THREE.Mesh(
        new THREE.CircleGeometry(innerR - 0.15, 160),
        floorMat
      );
      pitFloor.rotation.x = -Math.PI / 2;
      pitFloor.position.y = pitY;
      pitFloor.name = "PitFloor";
      scene.add(pitFloor);

      // Lip rail (safety ring)
      const lipRail = new THREE.Mesh(
        new THREE.TorusGeometry(innerR + 0.10, 0.09, 12, 220),
        neonPurple
      );
      lipRail.rotation.x = Math.PI/2;
      lipRail.position.y = walkwayY + 0.06;
      scene.add(lipRail);

      // Outer base ring + top ring trims
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(outerR, 0.14, 16, 240), neonPurple);
      baseRing.rotation.x = Math.PI/2;
      baseRing.position.y = walkwayY + 0.14;
      scene.add(baseRing);

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(outerR, 0.10, 16, 240), neonPink);
      topRing.rotation.x = Math.PI/2;
      topRing.position.y = WALL_H - 0.08;
      scene.add(topRing);

      // Door cuts on hub wall
      const doorW = CORRIDOR_W;
      const buffer = 0.80;
      const halfAng = Math.asin(Math.min(0.999, ((doorW/2 + buffer) / outerR)));
      const doorCenters = [0, Math.PI/2, Math.PI, (3*Math.PI)/2]; // E, S(+Z), W, N(-Z)
      const angDiff = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      };
      const isDoor = (am) => doorCenters.some(c => angDiff(am, c) < halfAng);

      // Build curved wall segments (colliders) + trims + glass hoods
      const segments = 140;
      const segLen = (2 * Math.PI * outerR) / segments;

      // Inner wall neon trims (base/top) along segments
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const am = (a0 + a1) / 2;
        if (isDoor(am)) continue;

        const cx = Math.cos(am) * outerR;
        const cz = Math.sin(am) * outerR;

        const wall = addCollider(new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, segLen), wallMat));
        wall.position.set(cx, WALL_H/2, cz);
        wall.rotation.y = -am;

        // Base strip (inside edge)
        const stripBase = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.92, 0.05, 0.06), neonCyan);
        const inward = new THREE.Vector3(-Math.cos(am), 0, -Math.sin(am)).multiplyScalar(0.20);
        stripBase.position.set(cx + inward.x, 0.06, cz + inward.z);
        stripBase.rotation.y = -am + Math.PI/2;
        scene.add(stripBase);

        // Top strip
        const stripTop = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.92, 0.05, 0.06), neonPink);
        stripTop.position.set(cx + inward.x, WALL_H - 0.06, cz + inward.z);
        stripTop.rotation.y = stripBase.rotation.y;
        scene.add(stripTop);

        // HUD panel (unlit)
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(segLen * 0.92, 2.35), hudPanelMat);
        panel.position.set(cx + inward.x * 0.95, 1.55, cz + inward.z * 0.95);
        panel.rotation.y = -am + Math.PI/2;
        scene.add(panel);

        // Some panels become “glass hoods”
        if (i % 7 === 0) {
          // glass hood box slightly protruding inward
          const hood = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.78, 1.35, 0.55), glassMat);
          hood.position.set(cx + inward.x * 1.85, 1.55, cz + inward.z * 1.85);
          hood.rotation.y = panel.rotation.y;
          scene.add(hood);

          // hood frame glow
          const hoodFrame = new THREE.Mesh(new THREE.BoxGeometry(segLen * 0.82, 1.42, 0.07), neonPurple);
          hoodFrame.position.set(cx + inward.x * 1.72, 1.55, cz + inward.z * 1.72);
          hoodFrame.rotation.y = panel.rotation.y;
          scene.add(hoodFrame);

          // hood light
          const hoodLight = new THREE.PointLight(0x9b5cff, 1.6, 12);
          hoodLight.position.set(hood.position.x, 2.15, hood.position.z);
          scene.add(hoodLight);

          // hood label (sprite)
          const label = makeTextSprite("GLASS HOOD\nHUD PANEL", { fg: "#e8dcff", bg: "rgba(10,0,20,0.45)" });
          label.position.set(hood.position.x, 2.75, hood.position.z);
          scene.add(label);
        }
      }

      // Pit table pedestal + table + rail (in pit)
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.2, 0.9, 32),
        darkMetal
      );
      pedestal.position.set(0, pitY + 0.45, 0);
      pedestal.name = "TablePedestal";
      scene.add(pedestal);

      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.14, 48),
        feltMat
      );
      tableTop.position.set(0, pitY + 0.92, 0);
      tableTop.name = "BossTable";
      scene.add(tableTop);

      const tableRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.09, 16, 120),
        darkMetal
      );
      tableRim.rotation.x = Math.PI / 2;
      tableRim.position.set(0, pitY + 1.00, 0);
      scene.add(tableRim);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.12, 12, 160),
        new THREE.MeshStandardMaterial({ color: 0x101622, emissive: 0x132a3a, emissiveIntensity: 1.35 })
      );
      rail.rotation.x = Math.PI/2;
      rail.position.set(0, pitY + 0.68, 0);
      rail.name = "MainRail";
      scene.add(rail);

      // Dealer anchor for later dealing
      const dealer = new THREE.Object3D();
      dealer.name = "DealerAnchor";
      dealer.position.set(0, pitY + 1.10, 1.05);
      scene.add(dealer);

      // Pit lighting
      const pitLightA = new THREE.PointLight(0xffffff, 2.1, 35);
      pitLightA.position.set(0, 6.0, 0);
      scene.add(pitLightA);

      const pitLightB = new THREE.PointLight(0x7fe7ff, 1.6, 25);
      pitLightB.position.set(0, 2.5, 6.0);
      scene.add(pitLightB);

      // Ceiling-ish rings above the pit (crayon colors)
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.10, 14, 240), neonCyan);
      ringA.rotation.x = Math.PI/2;
      ringA.position.set(0, 2.85, 0);
      scene.add(ringA);

      const ringB = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.07, 14, 240), neonPink);
      ringB.rotation.x = Math.PI/2;
      ringB.position.set(0, 3.10, 0);
      scene.add(ringB);
    }

    // Build hub
    makeHub();

    // Rooms (South is spawn lobby; West is Store)
    const roomSouth = makeSquareRoom({ name: "Room_South_Spawn", x: 0,    z: southZ, doorSide: "S", trimMat: neonCyan });
    const roomNorth = makeSquareRoom({ name: "Room_North",      x: 0,    z: northZ, doorSide: "N", trimMat: neonPink });
    const roomWest  = makeSquareRoom({ name: "Room_West_Store", x: westX, z: 0,     doorSide: "E", trimMat: neonCyan });
    const roomEast  = makeSquareRoom({ name: "Room_East",       x: eastX, z: 0,     doorSide: "W", trimMat: neonPink });

    // Corridors between hub and rooms
    makeCorridor({ name: "Corridor_South", x: 0, z: (HUB_R + CORRIDOR_L/2), yaw: 0 });
    makeCorridor({ name: "Corridor_North", x: 0, z: -(HUB_R + CORRIDOR_L/2), yaw: 0 });
    makeCorridor({ name: "Corridor_West",  x: -(HUB_R + CORRIDOR_L/2), z: 0, yaw: Math.PI/2 });
    makeCorridor({ name: "Corridor_East",  x: (HUB_R + CORRIDOR_L/2),  z: 0, yaw: Math.PI/2 });

    // -----------------------------
    // Spawn point in SOUTH room facing toward hub
    // -----------------------------
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
    sp.rotation.y = Math.PI; // face -Z toward hub
    scene.add(sp);

    // Teleport machine behind spawn (visual landmark, moved back a bit)
    const tm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.35,
        roughness: 0.35
      })
    );
    tm.name = "TeleportMachineFallback";
    tm.position.set(0, 1.1, spawnZ + 3.6);
    scene.add(tm);

    // VIP statues in spawn room (simple pedestals + bots)
    function makeStatue(name, tint) {
      const g = new THREE.Group();
      g.name = name;

      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.55, 20), darkMetal);
      ped.position.y = 0.28;
      g.add(ped);

      const mat = new THREE.MeshStandardMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.2,
        flatShading: true
      });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), mat);
      torso.position.y = 1.05;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat);
      head.position.set(0, 0.45, 0);
      torso.add(head);

      return g;
    }

    const s1 = makeStatue("VIP_Statue_A", 0x7fe7ff);
    const s2 = makeStatue("VIP_Statue_B", 0xff2d7a);

    s1.position.set(-4.0, 0, spawnZ + 0.8);
    s2.position.set( 4.0, 0, spawnZ + 0.8);

    scene.add(s1, s2);

    // -----------------------------
    // LEFT/WEST STORE build (procedural)
    // -----------------------------
    function createDisplayCase({ x, y, z, label, accent = 0x00ffff }) {
      const caseG = new THREE.Group();
      caseG.position.set(x, y, z);

      // base
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.45, 0.85),
        darkMetal
      );
      base.position.y = 0.225;
      caseG.add(base);

      // glass box
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.75, 0.75),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x08202a),
          transparent: true,
          opacity: 0.22,
          roughness: 0.08,
          metalness: 0.0,
          transmission: 0.9,
          thickness: 0.25,
          ior: 1.35
        })
      );
      glass.position.y = 0.78;
      caseG.add(glass);

      // glow trim
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x05060a,
        emissive: new THREE.Color(accent),
        emissiveIntensity: 2.1,
        roughness: 0.3
      });

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.03, 0.82), trimMat);
      trim.position.y = 0.46;
      caseG.add(trim);

      // interior light
      const l = new THREE.PointLight(accent, 1.7, 6);
      l.position.set(0, 1.25, 0);
      caseG.add(l);

      // label sprite
      const spr = makeTextSprite(label, { fg: "#bffcff", bg: "rgba(0,0,0,0.38)" });
      spr.position.set(0, 1.9, 0);
      spr.scale.set(1.85, 1.0, 1);
      caseG.add(spr);

      return caseG;
    }

    function createStoreRoom(roomAnchor) {
      // Put store near the room center, but leave door path clear
      const ax = roomAnchor.position.x;
      const az = roomAnchor.position.z;

      // Big sign inside store
      const sign = makeTextSprite("STORE\nDISPLAY CASES", { fg: "#00ffff", bg: "rgba(0,10,20,0.55)" });
      sign.position.set(ax, 2.35, az - 3.2);
      sign.scale.set(4.2, 2.1, 1);
      scene.add(sign);

      // Display cases along back wall
      const c1 = createDisplayCase({ x: ax - 2.2, y: 0, z: az - 2.0, label: "CHIPS\nPACK", accent: 0x00ffff });
      const c2 = createDisplayCase({ x: ax + 0.0, y: 0, z: az - 2.0, label: "TABLE\nSKINS", accent: 0xff2d7a });
      const c3 = createDisplayCase({ x: ax + 2.2, y: 0, z: az - 2.0, label: "VIP\nITEMS", accent: 0x9b5cff });
      scene.add(c1, c2, c3);

      // “Kiosk” pad near center
      const kiosk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.14, 24),
        new THREE.MeshStandardMaterial({ color: 0x070812, emissive: 0x00ffff, emissiveIntensity: 0.65 })
      );
      kiosk.position.set(ax, 0.10, az + 1.4);
      kiosk.name = "StoreKiosk";
      scene.add(kiosk);

      const kioskLabel = makeTextSprite("STORE\nKIOSK", { fg: "#e8ecff", bg: "rgba(0,0,0,0.35)" });
      kioskLabel.position.set(ax, 1.6, az + 1.4);
      kioskLabel.scale.set(2.0, 1.1, 1);
      scene.add(kioskLabel);

      // extra room lights
      const pl = new THREE.PointLight(0xffffff, 2.2, 32);
      pl.position.set(ax, 5.0, az);
      scene.add(pl);
    }

    // Attach store to WEST room
    createStoreRoom(roomWest);

    console.log("[world] v3.9 ✅ pit hub + trims + glass hoods + store(left) built");
  },

  update(ctx, dt) {}
};
