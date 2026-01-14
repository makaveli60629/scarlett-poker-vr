// /js/world_builders.js — Scarlett World Builders (FULL) v1.3
// ✅ Bright readable palette (no gray void)
// ✅ SAFE spawn room (open) + hallway into lobby ring
// ✅ Lobby ring + pit + balcony + room pads
// ✅ safeUnstuck() returns a guaranteed open location

export const WorldBuilders = (() => {

  function mat(THREE, color, rough=0.9, metal=0.05, emissive=null, ei=0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
      emissiveIntensity: ei
    });
  }

  function lights(ctx) {
    const { THREE, scene, root, manifest } = ctx;
    const safe = !!manifest.get("flags.safeMode");

    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x101428, safe ? 1.0 : 1.25);
    hemi.position.set(0, 40, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, safe ? 0.85 : 1.2);
    sun.position.set(25, 45, 25);
    scene.add(sun);

    const fill = new THREE.PointLight(0x66ccff, safe ? 0.5 : 0.85, 80, 2);
    fill.position.set(0, 6.0, 8);
    root.add(fill);

    const warm = new THREE.PointLight(0xffd36b, safe ? 0.35 : 0.55, 60, 2);
    warm.position.set(-6, 4.5, 0);
    root.add(warm);
  }

  function build(ctx) {
    const { THREE, root } = ctx;

    // --- Ground reference plane (helps vision) ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      mat(THREE, 0x0b1220, 0.95, 0.02, 0x000000, 0)
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    ground.name = "GROUND";
    root.add(ground);

    // --- SPAWN ROOM (open, safe, no ceiling collision) ---
    const spawnRoom = new THREE.Group();
    spawnRoom.name = "SPAWN_ROOM";
    spawnRoom.position.set(0, 0, 40);
    root.add(spawnRoom);

    const spawnFloor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      mat(THREE, 0x111a28, 0.95, 0.04, 0x223cff, 0.10)
    );
    spawnFloor.rotation.x = -Math.PI/2;
    spawnFloor.position.y = 0.01;
    spawnRoom.add(spawnFloor);

    // Spawn pad marker
    const spawnPad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent:true, opacity:0.8, side:THREE.DoubleSide })
    );
    spawnPad.rotation.x = -Math.PI/2;
    spawnPad.position.y = 0.03;
    spawnRoom.add(spawnPad);

    // “Portal” frame toward lobby
    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 12, 48),
      mat(THREE, 0x66ccff, 0.35, 0.45, 0x66ccff, 0.55)
    );
    portal.position.set(0, 1.6, -4.6);
    spawnRoom.add(portal);

    // Hallway to lobby
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 2.8, 22),
      mat(THREE, 0x121c2c, 0.9, 0.06, 0x000000, 0)
    );
    hall.position.set(0, 1.4, 29);
    root.add(hall);

    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.06, 21.6),
      mat(THREE, 0x10192a, 0.95, 0.02, 0x223cff, 0.08)
    );
    hallFloor.position.set(0, 0.03, 29);
    root.add(hallFloor);

    // --- LOBBY RING ---
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 10, 72, 1, true),
      mat(THREE, 0x0b1220, 0.9, 0.08, 0x223cff, 0.06)
    );
    shell.material.side = THREE.DoubleSide;
    shell.material.transparent = true;
    shell.material.opacity = 0.55;
    shell.position.set(0, 4.2, 0);
    root.add(shell);

    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.35, 72),
      mat(THREE, 0x121c2c, 0.95, 0.05, 0x000000, 0)
    );
    lobbyFloor.position.set(0, -0.175, 0);
    root.add(lobbyFloor);

    // Ceiling ring glow
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16.5, 0.14, 12, 96),
      mat(THREE, 0x66ccff, 0.3, 0.6, 0x66ccff, 0.45)
    );
    ring.rotation.x = Math.PI/2;
    ring.position.set(0, 8.8, 0);
    root.add(ring);

    // --- PIT (divot) ---
    const pitRadius = 7.1;
    const pitDepth = 3.0;
    const pitFloorY = -pitDepth;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 64),
      mat(THREE, 0x0c1220, 0.95, 0.04, 0x000000, 0)
    );
    pitFloor.position.set(0, pitFloorY - 0.175, 0);
    root.add(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 64, 1, true),
      mat(THREE, 0x0a101e, 0.95, 0.04, 0x000000, 0)
    );
    pitWall.material.side = THREE.DoubleSide;
    pitWall.position.set(0, pitFloorY / 2, 0);
    root.add(pitWall);

    // ramp entrance
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, pitDepth, 8.4),
      mat(THREE, 0x141b28, 0.95, 0.08, 0x000000, 0)
    );
    ramp.position.set(0, pitFloorY / 2, pitRadius + 8.4 * 0.32);
    ramp.rotation.x = -Math.atan2(pitDepth, 8.4);
    root.add(ramp);

    // --- Balcony (spectate) ---
    const balcony = new THREE.Mesh(
      new THREE.RingGeometry(14.2, 16.8, 96),
      mat(THREE, 0x10192a, 0.95, 0.05, 0x223cff, 0.05)
    );
    balcony.rotation.x = -Math.PI/2;
    balcony.position.y = 3.0;
    root.add(balcony);

    // --- Anchors (SAFE) ---
    const anchors = {
      spawn:    { pos: new THREE.Vector3(0, 0, 40),  yaw: Math.PI },
      lobby:    { pos: new THREE.Vector3(0, 0, 13.5), yaw: Math.PI },
      poker:    { pos: new THREE.Vector3(0, 0, 6.0),  yaw: Math.PI },   // edge of pit entrance
      store:    { pos: new THREE.Vector3(-26, 0, 0),  yaw: Math.PI/2 },
      scorpion: { pos: new THREE.Vector3(26, 0, 0),   yaw: -Math.PI/2 },
      spectate: { pos: new THREE.Vector3(0, 3.0, -14),yaw: 0 }
    };

    function safeUnstuck() {
      // always in spawn room center
      return anchors.spawn.pos.clone();
    }

    return { anchors, safeUnstuck, ground };
  }

  return { lights, build };
})();
