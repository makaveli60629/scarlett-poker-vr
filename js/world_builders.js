// /js/world_builders.js — ScarlettVR Prime 10.0 (FULL)
// ✅ Spawn Room + Hallway into Lobby (no wall collisions at spawn)
// ✅ Lobby ring + pit + balcony + far rooms
// ✅ Telepads placed in guaranteed open space

export const WorldBuilders = (() => {

  function mat(THREE, color, emissive = 0x000000, eInt = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.12,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: eInt
    });
  }

  function floorMat(THREE, color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.06 });
  }

  function addTelepad(THREE, root, pos, label = "", color = 0x66ccff) {
    const g = new THREE.Group();
    g.position.copy(pos);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.82, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    g.add(ring);

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 28),
      new THREE.MeshBasicMaterial({ color })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.012;
    g.add(dot);

    // small post so you can see it even if foggy
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.65, 12),
      mat(THREE, 0x0b1220, color, 0.35)
    );
    post.position.y = 0.33;
    g.add(post);

    root.add(g);
    return g;
  }

  function buildSpawnRoom(THREE, root) {
    // Spawn room placed NORTH of lobby so hallway goes inward to lobby safely
    // Coordinates chosen to avoid intersection with lobby shell.
    const roomCenter = new THREE.Vector3(0, 0, 30);
    const roomW = 12;
    const roomD = 10;
    const wallH = 4.2;

    // floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, 0.35, roomD),
      floorMat(THREE, 0x0d1422)
    );
    floor.position.set(roomCenter.x, -0.175, roomCenter.z);
    root.add(floor);

    // walls (with doorway opening on SOUTH side)
    // We'll build 4 walls as boxes, but skip the center of the south wall to create a door.
    const wallT = 0.35;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a101e,
      roughness: 0.92,
      metalness: 0.08,
      transparent: true,
      opacity: 0.55
    });

    // North wall
    const wN = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, wallT), wallMat);
    wN.position.set(roomCenter.x, wallH / 2 - 0.175, roomCenter.z - roomD / 2);
    root.add(wN);

    // West wall
    const wW = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), wallMat);
    wW.position.set(roomCenter.x - roomW / 2, wallH / 2 - 0.175, roomCenter.z);
    root.add(wW);

    // East wall
    const wE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), wallMat);
    wE.position.set(roomCenter.x + roomW / 2, wallH / 2 - 0.175, roomCenter.z);
    root.add(wE);

    // South wall split (door opening width)
    const doorW = 3.6;
    const leftW = (roomW - doorW) / 2;
    const wS1 = new THREE.Mesh(new THREE.BoxGeometry(leftW, wallH, wallT), wallMat);
    const wS2 = new THREE.Mesh(new THREE.BoxGeometry(leftW, wallH, wallT), wallMat);

    wS1.position.set(roomCenter.x - (doorW / 2 + leftW / 2), wallH / 2 - 0.175, roomCenter.z + roomD / 2);
    wS2.position.set(roomCenter.x + (doorW / 2 + leftW / 2), wallH / 2 - 0.175, roomCenter.z + roomD / 2);
    root.add(wS1);
    root.add(wS2);

    // Spawn pad (guaranteed empty middle)
    const spawnPadPos = new THREE.Vector3(roomCenter.x, 0, roomCenter.z);
    return { roomCenter, spawnPadPos, doorZ: roomCenter.z + roomD / 2 };
  }

  function buildHallwayToLobby(THREE, root, doorZ) {
    // hallway from spawn room south door -> lobby north edge
    // wide corridor so you never get trapped
    const hallW = 6.0;
    const hallL = 14.0;
    const hallCenterZ = doorZ - hallL / 2;

    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(hallW, 0.35, hallL),
      floorMat(THREE, 0x101b2b)
    );
    hall.position.set(0, -0.175, hallCenterZ);
    root.add(hall);

    // soft guide lights along hallway
    const p1 = new THREE.PointLight(0x66ccff, 0.85, 18, 2);
    p1.position.set(-2.2, 2.2, hallCenterZ);
    root.add(p1);

    const p2 = new THREE.PointLight(0xff6bd6, 0.65, 18, 2);
    p2.position.set( 2.2, 2.2, hallCenterZ);
    root.add(p2);

    return new THREE.Vector3(0, 0, hallCenterZ);
  }

  function buildLobby(THREE, root, safe) {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 10, 72, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.92,
        metalness: 0.10,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: safe ? 0.30 : 0.55
      })
    );
    shell.position.set(0, 4.3, 0);
    root.add(shell);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.35, 72),
      floorMat(THREE, 0x121c2c)
    );
    floor.position.set(0, -0.175, 0);
    root.add(floor);

    // bright “orientation” ring so it’s never gray/flat
    if (!safe) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(16.4, 0.12, 14, 96),
        new THREE.MeshStandardMaterial({
          color: 0x66ccff,
          roughness: 0.35,
          metalness: 0.55,
          emissive: new THREE.Color(0x66ccff),
          emissiveIntensity: 0.45
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 8.9, 0);
      root.add(ring);
    }
  }

  function buildPit(THREE, root) {
    const pitRadius = 7.1;
    const pitDepth = 3.0;
    const pitFloorY = -pitDepth;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
      floorMat(THREE, 0x0c1220)
    );
    pitFloor.position.set(0, pitFloorY - 0.175, 0);
    root.add(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.06, side: THREE.DoubleSide })
    );
    pitWall.position.set(0, pitFloorY / 2, 0);
    root.add(pitWall);

    // ramp entrance (south)
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, pitDepth, 9.2),
      new THREE.MeshStandardMaterial({ color: 0x141b28, roughness: 0.95, metalness: 0.08 })
    );
    ramp.position.set(0, pitFloorY / 2, pitRadius + 9.2 * 0.32);
    ramp.rotation.x = -Math.atan2(pitDepth, 9.2);
    root.add(ramp);

    // center table pad (PokerSystem places table visuals)
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.35, 0.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x1c2433,
        roughness: 0.55,
        metalness: 0.22,
        emissive: new THREE.Color(0x223cff),
        emissiveIntensity: 0.06
      })
    );
    pad.position.set(0, pitFloorY + 0.92, 0);
    root.add(pad);
  }

  function buildBalcony(THREE, root, safe) {
    const y = 3.0;
    const outerR = 16.8;
    const innerR = 14.2;

    const balcony = new THREE.Mesh(
      new THREE.RingGeometry(innerR, outerR, 96),
      floorMat(THREE, 0x10192a)
    );
    balcony.rotation.x = -Math.PI / 2;
    balcony.position.y = y;
    root.add(balcony);

    if (!safe) {
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x121c2c,
        roughness: 0.55,
        metalness: 0.25,
        emissive: new THREE.Color(0x66ccff),
        emissiveIntensity: 0.08
      });
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 12), railMat);
        post.position.set(Math.cos(a) * outerR, y + 0.45, Math.sin(a) * outerR);
        root.add(post);
      }
    }
  }

  function buildFarRooms(THREE, root) {
    // simple far platforms for store/scorpion vibe (your systems can add detail later)
    const mk = (x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const f = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 18), floorMat(THREE, color));
      f.position.y = -0.175;
      g.add(f);
      root.add(g);
      return g;
    };
    mk(-26, 0, 0x111a28);
    mk( 26, 0, 0x0f1724);
    mk(  0,-9.5,0x0f1724);
  }

  function lights(ctx) {
    const { THREE, scene, root } = ctx;
    const safe = !!ctx.manifest.get("flags.safeMode");

    const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, safe ? 1.0 : 1.25);
    hemi.position.set(0, 70, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, safe ? 0.85 : 1.20);
    sun.position.set(35, 70, 35);
    scene.add(sun);

    // extra color so it’s not “gray”
    const lobbyGlow = new THREE.PointLight(0x7fb2ff, safe ? 0.55 : 1.05, 95, 2);
    lobbyGlow.position.set(0, 9.0, 0);
    root.add(lobbyGlow);

    const magenta = new THREE.PointLight(0xff6bd6, safe ? 0.35 : 0.65, 70, 2);
    magenta.position.set(0, 2.6, 0);
    root.add(magenta);
  }

  function build(ctx) {
    const { THREE, root } = ctx;
    const safe = !!ctx.manifest.get("flags.safeMode");

    // world shell
    const spawn = buildSpawnRoom(THREE, root);
    buildHallwayToLobby(THREE, root, spawn.doorZ);

    buildLobby(THREE, root, safe);
    buildPit(THREE, root);
    buildBalcony(THREE, root, safe);
    buildFarRooms(THREE, root);

    // --- anchors (SAFE positions, away from walls) ---
    // Spawn room center is always clear.
    const anchors = {
      spawn:    { pos: spawn.spawnPadPos.clone().add(new THREE.Vector3(0, 0, 0)), yaw: Math.PI },

      // lobby anchor placed near hallway mouth, NOT near shell wall thickness
      lobby:    { pos: new THREE.Vector3(0, 0, 12.6), yaw: Math.PI },

      // poker near pit entrance area (open)
      poker:    { pos: new THREE.Vector3(0, 0, -7.8), yaw: 0 },

      // store / scorpion / spectate safe pads on platforms
      store:    { pos: new THREE.Vector3(-26, 0, 2.0), yaw: Math.PI / 2 },
      scorpion: { pos: new THREE.Vector3(26, 0, 2.0), yaw: -Math.PI / 2 },
      spectate: { pos: new THREE.Vector3(0, 3.0, -14), yaw: 0 }
    };

    // --- visible telepads ---
    addTelepad(THREE, root, anchors.spawn.pos, "SPAWN", 0xffd36b);
    addTelepad(THREE, root, anchors.lobby.pos, "LOBBY", 0x66ccff);
    addTelepad(THREE, root, anchors.poker.pos, "POKER", 0x66ccff);
    addTelepad(THREE, root, anchors.store.pos, "STORE", 0x66ccff);
    addTelepad(THREE, root, anchors.scorpion.pos, "SCORPION", 0xff6bd6);
    addTelepad(THREE, root, anchors.spectate.pos, "SPECTATE", 0x66ccff);

    return {
      anchors,
      safeUnstuck() {
        // always use spawn pad center (guaranteed clear)
        return anchors.spawn.pos.clone();
      }
    };
  }

  return { lights, build };
})();
