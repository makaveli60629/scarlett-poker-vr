// /js/world.js — Scarlett World 6.7 (VIP only + pit table + lots of lights + tall walls)
// ✅ NO center spawn pad anymore
// ✅ VIP spawn pad only (pink area)
// ✅ Sunk pit + table
// ✅ Tall circular walls (jumbotron-ready)
// ✅ Gold rail ring
// ✅ Jumbotron placeholders added (you can swap textures later)
// ✅ Floors are registered for teleport raycasting

export const World = (() => {
  let floors = [];
  let spawns = new Map();

  function build({ THREE, scene, log, BUILD }) {
    floors = [];
    spawns = new Map();

    const group = new THREE.Group();
    group.name = "WorldRoot";
    scene.add(group);

    // ---------- SCALE ----------
    const LOBBY_R = 18;
    const WALL_H = 10; // taller for jumbotrons
    const FLOOR_Y = 0;

    // ---------- MATERIALS ----------
    const matFloor = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 });
    const matWall  = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.08 });
    const matGold  = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.75 });
    const matNeonPink = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.35, emissiveIntensity: 2.0 });

    // ---------- LIGHTS (LOTS) ----------
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    group.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(12, 24, 10);
    group.add(key);

    // 3 ring lights overhead
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.PointLight(0xffffff, 1.15, 70);
      ring.position.set(0, 8.8 + i * 0.6, 0);
      group.add(ring);
    }

    // VIP accent spotlights
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spot = new THREE.SpotLight(0xffffff, 1.35, 60, Math.PI / 5, 0.45, 1.2);
      spot.position.set(Math.cos(a) * 9, 9, Math.sin(a) * 9);
      spot.target.position.set(0, 0, 0);
      group.add(spot);
      group.add(spot.target);
    }

    // ---------- LOBBY FLOOR ----------
    const lobbyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 0.25, 96),
      matFloor
    );
    lobbyFloor.position.y = FLOOR_Y - 0.125;
    lobbyFloor.receiveShadow = true;
    group.add(lobbyFloor);
    floors.push(lobbyFloor);

    // ---------- TALL CIRCULAR WALL ----------
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + 0.35, LOBBY_R + 0.35, WALL_H, 96, 1, true),
      matWall
    );
    wall.position.y = WALL_H / 2;
    group.add(wall);

    // ---------- GOLD RAIL RING ----------
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(12.3, 0.12, 24, 240),
      matGold
    );
    rail.position.set(0, 1.05, 0);
    rail.rotation.x = Math.PI / 2;
    group.add(rail);

    // ---------- PIT (DIVOT) ----------
    // A “sunken” circular pit in the middle
    const pitR = 6.4;
    const pitDepth = 1.2;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, 0.22, 80),
      matFloor
    );
    pitFloor.position.set(0, FLOOR_Y - pitDepth - 0.11, 0);
    group.add(pitFloor);
    floors.push(pitFloor);

    // pit wall ring
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR + 0.08, pitR + 0.08, pitDepth, 80, 1, true),
      matWall
    );
    pitWall.position.set(0, FLOOR_Y - pitDepth / 2, 0);
    group.add(pitWall);

    // ---------- TABLE (SUNKEN) ----------
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.22, 48),
      new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.18 })
    );
    tableTop.position.set(0, FLOOR_Y - pitDepth + 0.55, 0);
    group.add(tableTop);

    // ---------- TELEPORT MACHINE IN VIP (pink) ----------
    const vipA = Math.PI * 0.35; // angle where VIP sits
    const vipPos = new THREE.Vector3(Math.cos(vipA) * 11.2, FLOOR_Y, Math.sin(vipA) * 11.2);

    const vipPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.15, 1.2),
      new THREE.MeshStandardMaterial({ emissive: 0xff2d7a, emissiveIntensity: 1.6, roughness: 0.35 })
    );
    vipPad.position.copy(vipPos).add(new THREE.Vector3(0, 0.08, 0));
    group.add(vipPad);

    // small pink “hall light”
    const vipGlow = new THREE.PointLight(0xff2d7a, 2.0, 18);
    vipGlow.position.copy(vipPos).add(new THREE.Vector3(0, 2.2, 0));
    group.add(vipGlow);

    // Spawn point (PERMANENT)
    spawns.set("lobby_vip_A", { x: vipPos.x, y: 0, z: vipPos.z, yaw: Math.atan2(-vipPos.x, -vipPos.z) });

    // NOTE: We are intentionally NOT creating lobby_center spawn anymore.

    // ---------- JUMBOTRON PLACEHOLDERS ----------
    // 4 screens around the wall, high up
    const screenW = 7.0, screenH = 3.0;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.cos(a) * (LOBBY_R - 0.8);
      const sz = Math.sin(a) * (LOBBY_R - 0.8);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(screenW, screenH),
        new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, emissiveIntensity: 0.85 })
      );
      screen.position.set(sx, 7.0, sz);
      screen.lookAt(0, 7.0, 0);
      group.add(screen);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(screenW, screenH, 0.12),
        matWall
      );
      back.position.copy(screen.position);
      back.quaternion.copy(screen.quaternion);
      back.translateZ(-0.08);
      group.add(back);
    }

    log?.(`[world] built ✅ (VIP-only spawn + pit + tall walls + lights)`);
  }

  function getSpawn(name) {
    // VIP is the only allowed default now.
    if (name === "lobby_vip_A") return spawns.get("lobby_vip_A");
    // If anything requests another spawn, force VIP to prevent accidental center spawns.
    return spawns.get("lobby_vip_A");
  }

  function getFloors() { return floors; }

  return { build, getSpawn, getFloors };
})();
