// /js/world.js — Scarlett WORLD 8.1 (No flicker stairs + store build + demo anchors)
export const World = (() => {
  let floors = [];
  const spawns = new Map();
  const demo = { tableAnchor: null, pitDepth: 0, bots: [], chipAnchor: null, storeAnchor: null };

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();
    demo.tableAnchor = null;
    demo.chipAnchor = null;
    demo.bots = [];
    demo.storeAnchor = null;

    const root = new THREE.Group();
    scene.add(root);

    // Materials
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.92, metalness: 0.06, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0x14182a, roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: 0x222a4a, roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.12 });
    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0x7fe7ff, emissiveIntensity: 3.4, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0xff2d7a, emissiveIntensity: 3.4, roughness: 0.25 });
    const matBlue  = new THREE.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x2a6bff, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.25 });

    // Dimensions
    const LOBBY_R = 17.5;
    const WALL_H  = 11.0;
    const WALL_T  = 0.35;
    const HALL_W  = 4.6, HALL_L = 11.4;
    const ROOM_W  = 12,  ROOM_D = 12,  ROOM_H = 6.8;

    const pitDepth   = 1.65;
    demo.pitDepth = pitDepth;
    const rimR       = 6.7;
    const rampInnerR = rimR + 0.20;
    const rampOuterR = rimR + 3.3;
    const tableY     = -pitDepth + 0.72;

    // Lighting — fewer dynamic lights, still “super bright”
    root.add(new THREE.AmbientLight(0xffffff, 1.05));
    const sun = new THREE.DirectionalLight(0xffffff, 1.55);
    sun.position.set(18, 30, 14);
    root.add(sun);

    // Ceiling rings (bright, cheap)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xffffff, emissiveIntensity: 1.85, roughness: 0.15, metalness: 0.12 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.2, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.6, 0); ring1.rotation.x = Math.PI / 2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 8.9, 0); ring2.rotation.x = Math.PI / 2; root.add(ring2);

    // 8 strong fills instead of 16 (performance)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.2, 52);
      p.position.set(Math.sin(a) * 9.6, 7.4, Math.cos(a) * 9.6);
      root.add(p);
    }

    const pitSpot = new THREE.SpotLight(0xffffff, 3.0, 55, Math.PI / 7, 0.35, 1.1);
    pitSpot.position.set(0, 10.5, 0);
    pitSpot.target.position.set(0, -pitDepth, 0);
    root.add(pitSpot, pitSpot.target);

    // Floors
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 160), matFloor);
    topRing.rotation.x = -Math.PI / 2;
    root.add(topRing);
    floors.push(topRing);

    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, -pitDepth, 0, 180), matFloor);
    root.add(ramp);
    floors.push(ramp);

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 120), matFloor);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    root.add(pitFloor);
    floors.push(pitFloor);

    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.10, 14, 240), matTrim);
    rimCap.position.set(0, 0.06, 0);
    rimCap.rotation.x = Math.PI / 2;
    root.add(rimCap);

    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 120, 1, true), matWall);
    pitWall.position.set(0, -pitDepth / 2, 0);
    root.add(pitWall);

    // Rails + posts
    const railR = rampOuterR - 0.22;

    const blueRail = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.18, 0.10, 16, 260), matBlue);
    blueRail.position.set(0, 0.88, 0); blueRail.rotation.x = Math.PI / 2; root.add(blueRail);

    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.06, 0.10, 16, 260), matGold);
    goldRail.position.set(0, 1.05, 0); goldRail.rotation.x = Math.PI / 2; root.add(goldRail);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(railR - 0.06, 0.055, 12, 260), matNeonA);
    halo.position.set(0, 1.22, 0); halo.rotation.x = Math.PI / 2; root.add(halo);

    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.92, 10);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.sin(a) * (railR - 0.06);
      const z = Math.cos(a) * (railR - 0.06);
      const post = new THREE.Mesh(postGeo, matGold);
      post.position.set(x, 0.62, z);
      root.add(post);
    }

    // Table + anchors
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, tableY, 0);
    root.add(tableAnchor);
    demo.tableAnchor = tableAnchor;

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.25, 72), matFelt);
    tableTop.position.set(0, 0, 0);
    tableAnchor.add(tableTop);

    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.17, 18, 200), matLeather);
    tableTrim.position.set(0, 0.22, 0);
    tableTrim.rotation.x = Math.PI / 2;
    tableAnchor.add(tableTrim);

    const chipAnchor = new THREE.Group();
    chipAnchor.position.set(0, 0.20, 0);
    tableAnchor.add(chipAnchor);
    demo.chipAnchor = chipAnchor;

    // ✅ Stairs: ONE mesh (no z-fighting) + lifted slightly above ramp
    const stairs = buildStairsSolid(THREE, {
      stepCount: 10,
      stepW: 2.2,
      stepH: pitDepth / 10,
      stepD: 0.58,
      mat: matTrim
    });

    const stairsDir = new THREE.Vector3(0, 0, 1);
    const stairTop = stairsDir.clone().multiplyScalar(rampOuterR - 0.9);
    stairs.position.set(stairTop.x, 0.012, stairTop.z); // tiny lift prevents coplanar flicker
    stairs.rotation.y = Math.PI;
    root.add(stairs);

    // Add a single invisible collider ramp under stairs to keep movement smooth
    const stairCollider = new THREE.Mesh(new THREE.BoxGeometry(2.4, pitDepth + 0.2, 6.2), new THREE.MeshBasicMaterial({ visible: false }));
    stairCollider.position.copy(stairs.position).add(new THREE.Vector3(0, -(pitDepth/2), -3.0));
    root.add(stairCollider);
    floors.push(stairCollider);

    // Guard bot at top
    const guard = buildGuardBot(THREE);
    guard.position.set(stairTop.x, 0, stairTop.z + 1.1);
    guard.lookAt(0, 0, 0);
    root.add(guard);
    demo.bots.push(guard);

    // Lobby walls (continuous shell)
    const wallShell = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T/2, LOBBY_R + WALL_T/2, WALL_H, 128, 1, true),
      matWall
    );
    wallShell.position.set(0, WALL_H/2, 0);
    root.add(wallShell);

    const topBand = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240), matNeonA);
    topBand.position.set(0, WALL_H - 0.55, 0);
    topBand.rotation.x = Math.PI / 2;
    root.add(topBand);

    // Hallways + rooms
    const roomDefs = [
      { label: "STORE", ax: 0, neon: matNeonA },
      { label: "SCORPION", ax: Math.PI/2, neon: matNeonP },
      { label: "SPECTATE", ax: Math.PI, neon: matNeonA },
      { label: "LOUNGE", ax: -Math.PI/2, neon: matNeonP },
    ];

    roomDefs.forEach((r) => {
      const dir = new THREE.Vector3(Math.sin(r.ax), 0, Math.cos(r.ax));

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L/2 - 0.25);
      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x, -0.11, hallCenter.z);
      hallFloor.rotation.y = r.ax;
      root.add(hallFloor);
      floors.push(hallFloor);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 0.6, 0.14, HALL_L - 0.6), r.neon);
      strip.position.set(hallCenter.x, 4.2, hallCenter.z);
      strip.rotation.y = r.ax;
      root.add(strip);

      // room
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D/2 - 0.7);
      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.25, ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x, -0.12, roomCenter.z);
      roomFloor.rotation.y = r.ax;
      root.add(roomFloor);
      floors.push(roomFloor);

      // Bright room lights (2 strong)
      const roomLight1 = new THREE.PointLight(0xffffff, 2.8, 44);
      roomLight1.position.set(roomCenter.x, 5.7, roomCenter.z);
      root.add(roomLight1);

      const roomLight2 = new THREE.PointLight(0xffffff, 2.2, 40);
      roomLight2.position.set(roomCenter.x, 3.0, roomCenter.z);
      root.add(roomLight2);

      // STORE build-out
      if (r.label === "STORE") {
        const store = buildStore(THREE, { matTrim, matNeonA, matWall });
        store.position.copy(roomCenter);
        store.rotation.y = r.ax;
        root.add(store);
        demo.storeAnchor = store;
      }
    });

    // Jumbotrons
    const screenW = 7.6, screenH = 3.3;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.sin(a) * (LOBBY_R - 1.0);
      const sz = Math.cos(a) * (LOBBY_R - 1.0);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x07080c,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x101428,
        emissiveIntensity: 1.25
      });

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.1, sz);
      screen.lookAt(0, 8.1, 0);
      root.add(screen);
    }

    // VIP spawn
    const vipBase = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0, 0, -1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    log?.("[world] built ✅ 8.1 (stable stairs + store + demo anchors)");
  }

  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
    const positions = [], normals = [], uvs = [], indices = [];
    const addV = (x,y,z,u,v) => { positions.push(x,y,z); normals.push(0,1,0); uvs.push(u,v); };
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const cx = Math.sin(t), cz = Math.cos(t);
      addV(cx * innerR, yInner, cz * innerR, 0, i / segments);
      addV(cx * outerR, yOuter, cz * outerR, 1, i / segments);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  }

  // One solid stair mesh: no coplanar overlaps = no flicker
  function buildStairsSolid(THREE, { stepCount, stepW, stepH, stepD, mat }) {
    const g = new THREE.Group();
    g.name = "PitStairsSolid";

    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      // tiny z offset per step prevents depth fighting between adjacent steps
      step.position.set(0, -stepH/2 - i*stepH, -i*stepD - (i * 0.001));
      g.add(step);
    }
    return g;
  }

  function buildGuardBot(THREE) {
    const g = new THREE.Group();
    g.name = "GuardBot";
    const mat = new THREE.MeshStandardMaterial({ color: 0x334a7a, roughness: 0.55, metalness: 0.12 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.70, 6, 14), mat);
    body.position.set(0, 1.1, 0); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 18), mat);
    head.position.set(0, 1.75, 0); g.add(head);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), new THREE.MeshStandardMaterial({
      color: 0x0b0d14, emissive: 0x7fe7ff, emissiveIntensity: 2.8
    }));
    badge.position.set(0, 1.25, 0.26); g.add(badge);
    return g;
  }

  function buildStore(THREE, { matTrim, matNeonA, matWall }) {
    const s = new THREE.Group();
    s.name = "StoreBuild";

    // kiosk
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 2.4), matTrim);
    base.position.set(0, 0.18, 0);
    s.add(base);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 0.9), matWall);
    counter.position.set(0, 0.85, -0.6);
    s.add(counter);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 0.18), matNeonA);
    sign.position.set(0, 2.25, -1.25);
    s.add(sign);

    // shelves left/right
    const shelfGeo = new THREE.BoxGeometry(0.35, 2.4, 5.4);
    const shelfL = new THREE.Mesh(shelfGeo, matWall);
    shelfL.position.set(-4.8, 1.2, 0);
    s.add(shelfL);

    const shelfR = new THREE.Mesh(shelfGeo, matWall);
    shelfR.position.set(4.8, 1.2, 0);
    s.add(shelfR);

    // pads (display stands)
    for (let i = 0; i < 5; i++) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.20, 22), matTrim);
      pad.position.set(-1.2 + i*0.6, 0.12, 1.4);
      s.add(pad);

      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.05, 10, 40), matNeonA);
      glow.position.copy(pad.position).add(new THREE.Vector3(0, 0.18, 0));
      glow.rotation.x = Math.PI / 2;
      s.add(glow);
    }

    return s;
  }

  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }
  function getDemo() { return demo; }

  return { build, getSpawn, getFloors, getDemo };
})();
