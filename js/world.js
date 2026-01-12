// /js/world.js — Scarlett WORLD 8.0 (ULTIMATE ATMOSPHERE + PHYSICS + TERRAIN)
export const World = (() => {
  let floors = [];
  const spawns = new Map();
  
  // Materials defined at module level for animation access
  let matNeonA, matNeonP, matGold;

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- ATMOSPHERE & FOG ----------
    // Feature #6: Volumetric Atmosphere
    scene.fog = new THREE.FogExp2(0x0b0d14, 0.02); 

    // ---------- THEME & MATERIALS ----------
    const colFloor = 0x0b0d14;
    const colWall  = 0x14182a;
    const colGold  = 0xd2b46a;
    const colAqua  = 0x7fe7ff;
    const colPink  = 0xff2d7a;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall, roughness: 0.8, metalness: 0.2 });
    matGold = new THREE.MeshStandardMaterial({ color: colGold, roughness: 0.2, metalness: 0.9 });
    
    // Feature #1: Breathing Neon Shaders
    matNeonA = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: colAqua, emissiveIntensity: 2.0 });
    matNeonP = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: colPink, emissiveIntensity: 2.0 });

    // ---------- DIMENSIONS ----------
    const LOBBY_R = 17, WALL_H = 10.5, HALL_L = 11.2, ROOM_W = 12, ROOM_D = 12, ROOM_H = 6.5;
    const pitR = 6.4, pitDepth = 1.8, rampOuterR = pitR + 2.5;

    // ---------- LIGHTING ENGINE ----------
    root.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    root.add(sun);

    // Feature #92: Progressive Chandelier (Overhead Rings)
    const ringGeo = new THREE.TorusGeometry(9.5, 0.1, 16, 100);
    const ring1 = new THREE.Mesh(ringGeo, matNeonA);
    ring1.position.y = 9; ring1.rotation.x = Math.PI/2;
    root.add(ring1);

    // ---------- TERRAIN: THE PIT & RAMP ----------
    // Top Floor (Ring with hole)
    const topFloor = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R + 10, 64), matFloor);
    topFloor.rotation.x = -Math.PI / 2;
    root.add(topFloor);
    floors.push(topFloor);

    // Feature #1: Sloped Ramp (Gravity-Ready)
    const ramp = new THREE.Mesh(makeRampGeometry(THREE, pitR, rampOuterR, -pitDepth, 0), matFloor);
    root.add(ramp);
    floors.push(ramp);

    // Pit Floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitR, 64), matFloor);
    pitFloor.position.y = -pitDepth;
    pitFloor.rotation.x = -Math.PI / 2;
    root.add(pitFloor);
    floors.push(pitFloor);

    // ---------- PIT GUARDRAIL ----------
    const guard = new THREE.Mesh(new THREE.TorusGeometry(rampOuterR - 0.2, 0.08, 12, 100), matGold);
    guard.position.y = 1.1; guard.rotation.x = Math.PI / 2;
    root.add(guard);

    // ---------- ROOMS & HALLWAYS (Open Doors) ----------
    const rooms = [
      { name: "STORE", angle: 0, color: matNeonA },
      { name: "SCORPION", angle: Math.PI/2, color: matNeonP },
      { name: "SPECTATE", angle: Math.PI, color: matNeonA },
      { name: "LOUNGE", angle: -Math.PI/2, color: matNeonP }
    ];

    rooms.forEach(r => {
      const dir = new THREE.Vector3(Math.sin(r.angle), 0, Math.cos(r.angle));
      
      // Hallway Entrance
      const hallPos = dir.clone().multiplyScalar(LOBBY_R + (HALL_L/2));
      const hall = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, HALL_L), matFloor);
      hall.position.set(hallPos.x, -0.05, hallPos.z);
      hall.rotation.y = r.angle;
      root.add(hall);
      floors.push(hall);

      // Feature #20: Open Doorways
      // (This builds the room with the cutout facing the lobby)
      const roomPos = dir.clone().multiplyScalar(LOBBY_R + HALL_L + (ROOM_D/2));
      buildRoomWithDoor(THREE, root, roomPos, r.angle, ROOM_W, ROOM_D, ROOM_H, matWall);
    });

    // ---------- VIP SPAWN CUBE ----------
    const vipPos = new THREE.Vector3(LOBBY_R - 2, 0, 6);
    spawns.set("default", { x: vipPos.x, y: 0.1, z: vipPos.z, yaw: -Math.PI/2 });

    log?.("Scarlett World 8.0: Singularity Built ✅");
  }

  // --- PHYSICS ENGINE: RAMP GEOMETRY ---
  function makeRampGeometry(THREE, iR, oR, yI, yO) {
    const g = new THREE.BufferGeometry();
    const pos = [], indices = [];
    const segs = 72;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const s = Math.sin(a), c = Math.cos(a);
      pos.push(s * iR, yI, c * iR); // Inner
      pos.push(s * oR, yO, c * oR); // Outer
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    g.setIndex(indices);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  // --- ARCHITECTURE ENGINE: ROOM WITH DOOR ---
  function buildRoomWithDoor(THREE, root, pos, rot, w, d, h, mat) {
    const roomGroup = new THREE.Group();
    roomGroup.position.copy(pos);
    roomGroup.rotation.y = rot;
    root.add(roomGroup);

    const wallT = 0.3;
    // Walls: Left, Right, Back
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(wallT, h, d), mat);
    leftW.position.x = -w/2; leftW.position.y = h/2;
    roomGroup.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry(wallT, h, d), mat);
    rightW.position.x = w/2; rightW.position.y = h/2;
    roomGroup.add(rightW);

    const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallT), mat);
    backW.position.z = d/2; backW.position.y = h/2;
    roomGroup.add(backW);

    // Front Wall with Doorway Cutout
    const doorW = 3;
    const sideWallW = (w - doorW) / 2;
    const sideWall = new THREE.BoxGeometry(sideWallW, h, wallT);
    
    const fLeft = new THREE.Mesh(sideWall, mat);
    fLeft.position.set(-(w/2 - sideWallW/2), h/2, -d/2);
    roomGroup.add(fLeft);

    const fRight = new THREE.Mesh(sideWall, mat);
    fRight.position.set((w/2 - sideWallW/2), h/2, -d/2);
    roomGroup.add(fRight);
  }

  return {
    build,
    getSpawn: () => spawns.get("default"),
    getFloors: () => floors,
    // Feature: The Frame Update for Animations
    update: (time) => {
      if (matNeonA) matNeonA.emissiveIntensity = 2 + Math.sin(time * 2) * 1;
      if (matNeonP) matNeonP.emissiveIntensity = 2 + Math.cos(time * 2) * 1;
      if (matGold) matGold.emissiveIntensity = 0.2 + Math.sin(time) * 0.1;
    }
  };
})();
