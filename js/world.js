// /js/world.js — Scarlett WORLD 9.4 (Sealed lobby + carpet + proper stairs + teleport pads at entrances + labels)
// ✅ Spawns VIP
// ✅ Teleport pads in front of STORE / EVENT / POKER
// ✅ Pressing pad teleports inside the square room
// ✅ Circle sealed (solid walls), no exterior leaks
// ✅ Carpet wrap to pit edge
// ✅ Stairs shortened + landing intersection (no bot on steps)
// ✅ Chairs face table

export const World = (() => {
  let floors = [];
  let teleportPads = [];
  const spawns = new Map();

  const demo = {
    tableAnchor: null,
    seatAnchors: [],
    vipWelcomeSign: null,
    rooms: {
      vip: null,
      store: null,
      event: null,
      poker: null
    }
  };

  function build({ THREE, scene, log }) {
    floors = [];
    teleportPads = [];
    spawns.clear();

    demo.tableAnchor = null;
    demo.seatAnchors = [];
    demo.vipWelcomeSign = null;
    demo.rooms.vip = null;
    demo.rooms.store = null;
    demo.rooms.event = null;
    demo.rooms.poker = null;

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- palette ----------
    const colBG = 0x05060a;
    const colFloor = 0x1a1d28;
    const colPit = 0x0f121a;
    const colWall = 0x14182a;

    const colAqua = 0x7fe7ff;
    const colPink = 0xff2d7a;

    // ---------- materials ----------
    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.82, metalness: 0.08, side: THREE.DoubleSide });
    const matPit   = new THREE.MeshStandardMaterial({ color: colPit, roughness: 0.92, metalness: 0.05, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall, roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: 0x222a4a, roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness: 0.22, metalness: 0.92 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x070810, emissive: colAqua, emissiveIntensity: 3.2, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x070810, emissive: colPink, emissiveIntensity: 3.2, roughness: 0.25 });

    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.18,
      roughness: 0.06, metalness: 0.0, transmission: 0.65, thickness: 0.12
    });

    const matFelt  = new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.12 });

    // Carpet texture (fail-safe)
    const matCarpet = new THREE.MeshStandardMaterial({ color: 0x121425, roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide });
    tryLoadCarpet(THREE, matCarpet);

    // ---------- dims ----------
    const LOBBY_R = 18.2;
    const WALL_H  = 11.5;
    const WALL_T  = 0.35;

    const pitDepth   = 1.65;
    const rimR       = 6.7;
    const rampInnerR = rimR + 0.20;
    const rampOuterR = rimR + 3.3;

    const pitFloorY = -pitDepth;
    const tableY    = pitFloorY + 0.72;
    const seatBaseY = pitFloorY + 0.02;

    // ---------- lighting (brighter, stable) ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(18, 30, 14);
    root.add(sun);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x10131b, emissive: 0xffffff, emissiveIntensity: 2.15, roughness: 0.15, metalness: 0.08 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.9, 0); ring1.rotation.x = Math.PI / 2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 9.1, 0); ring2.rotation.x = Math.PI / 2; root.add(ring2);

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.PointLight(0xffffff, 2.6, 72);
      p.position.set(Math.sin(a) * 10.1, 7.8, Math.cos(a) * 10.1);
      root.add(p);
    }

    const pitSpot = new THREE.SpotLight(0xffffff, 3.0, 60, Math.PI / 7, 0.35, 1.1);
    pitSpot.position.set(0, 11.1, 0);
    pitSpot.target.position.set(0, pitFloorY, 0);
    root.add(pitSpot, pitSpot.target);

    // ---------- FLOORS (sealed) ----------
    // Top ring
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 180), matCarpet);
    topRing.rotation.x = -Math.PI / 2;
    root.add(topRing); floors.push(topRing);

    // Ramp
    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, pitFloorY, 0, 220), matFloor);
    root.add(ramp); floors.push(ramp);

    // Pit floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 140), matPit);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = pitFloorY;
    root.add(pitFloor); floors.push(pitFloor);

    // Pit wall
    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 140, 1, true), matWall);
    pitWall.position.set(0, pitFloorY + pitDepth / 2, 0);
    root.add(pitWall);

    // Rim cap + “gap seal” carpet skirt
    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.11, 14, 240), matTrim);
    rimCap.position.set(0, 0.07, 0);
    rimCap.rotation.x = Math.PI / 2;
    root.add(rimCap);

    // ✅ Carpet wrap that “covers” up to the inner pit edge zone (so no exposed void)
    const pitCarpetSkirt = new THREE.Mesh(new THREE.RingGeometry(rimR + 0.05, rampInnerR + 2.2, 180), matCarpet);
    pitCarpetSkirt.rotation.x = -Math.PI / 2;
    pitCarpetSkirt.position.y = pitFloorY + 0.02;
    root.add(pitCarpetSkirt);
    floors.push(pitCarpetSkirt);

    // ---------- WALL SHELL (sealed) ----------
    const wallShell = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T / 2, LOBBY_R + WALL_T / 2, WALL_H, 140, 1, true),
      matWall
    );
    wallShell.position.set(0, WALL_H / 2, 0);
    root.add(wallShell);

    // Krylon trims
    const topTrim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240), matNeonA);
    topTrim.position.set(0, WALL_H - 0.55, 0);
    topTrim.rotation.x = Math.PI / 2;
    root.add(topTrim);

    const bottomTrim = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.06, 0.08, 12, 240), matNeonP);
    bottomTrim.position.set(0, 0.35, 0);
    bottomTrim.rotation.x = Math.PI / 2;
    root.add(bottomTrim);

    // ---------- JUMBOTRONS ----------
    const screenW = 7.8, screenH = 3.4;
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x07080c, roughness: 0.25, metalness: 0.1,
      emissive: 0x101428, emissiveIntensity: 1.35
    });

    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const sx = Math.sin(a) * (LOBBY_R - 1.1);
      const sz = Math.cos(a) * (LOBBY_R - 1.1);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screen.position.set(sx, 8.2, sz);
      screen.lookAt(0, 8.2, 0);
      root.add(screen);
    }

    // ---------- TABLE ----------
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, tableY, 0);
    tableAnchor.name = "TableAnchor";
    root.add(tableAnchor);
    demo.tableAnchor = tableAnchor;

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.25, 72), matFelt);
    tableAnchor.add(tableTop);

    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.17, 18, 200), matLeather);
    tableTrim.position.set(0, 0.22, 0);
    tableTrim.rotation.x = Math.PI / 2;
    tableAnchor.add(tableTrim);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.90, 0.95, 36), matTrim);
    pedestal.position.set(0, -0.60, 0);
    tableAnchor.add(pedestal);

    // ✅ Only keep table guardrail
    const tableRailR = 4.95;
    const tableRail = new THREE.Mesh(new THREE.TorusGeometry(tableRailR, 0.10, 16, 220), matGold);
    tableRail.position.set(0, -0.05, 0);
    tableRail.rotation.x = Math.PI / 2;
    tableAnchor.add(tableRail);

    const tableHalo = new THREE.Mesh(new THREE.TorusGeometry(tableRailR, 0.055, 12, 220), matNeonA);
    tableHalo.position.set(0, 0.18, 0);
    tableHalo.rotation.x = Math.PI / 2;
    tableAnchor.add(tableHalo);

    // ---------- CHAIRS (fixed: face table) ----------
    const chairMat = matTrim;
    const seatR = 4.25;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * seatR;
      const z = Math.cos(a) * seatR;

      const chair = new THREE.Group();
      chair.position.set(x, seatBaseY - tableY, z);
      // ✅ Face the table (no rotateY flip)
      chair.lookAt(0, seatBaseY - tableY, 0);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), chairMat);
      seat.position.set(0, 0.30, 0);
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.12), chairMat);
      back.position.set(0, 0.70, -0.29);
      chair.add(back);

      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10);
      const legOffsets = [
        [-0.28, 0.02, -0.28], [0.28, 0.02, -0.28],
        [-0.28, 0.02,  0.28], [0.28, 0.02,  0.28]
      ];
      for (const [lx, ly, lz] of legOffsets) {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.02, lz);
        chair.add(leg);
      }

      tableAnchor.add(chair);

      const seatAnchor = new THREE.Group();
      seatAnchor.name = `SeatAnchor_${i}`;
      seatAnchor.position.copy(chair.position);
      seatAnchor.quaternion.copy(chair.quaternion);
      tableAnchor.add(seatAnchor);
      demo.seatAnchors.push(seatAnchor);
    }

    // ---------- STAIRS (shorter + landing intersection) ----------
    const stairs = buildStairsSolid(THREE, {
      stepCount: 8,            // ✅ shorter
      stepW: 2.45,
      stepH: pitDepth / 8,
      stepD: 0.62,
      mat: matTrim
    });

    const stairTop = new THREE.Vector3(0, 0.012, rampOuterR - 0.85);
    stairs.position.copy(stairTop);
    root.add(stairs);

    // landing intersection (flat platform at top + bottom)
    const landingTop = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 2.0), matCarpet);
    landingTop.position.copy(stairTop).add(new THREE.Vector3(0, -0.06, -0.25));
    root.add(landingTop);
    floors.push(landingTop);

    const landingBottom = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.18, 2.1), matPit);
    landingBottom.position.set(0, pitFloorY + 0.10, rimR + 0.45);
    root.add(landingBottom);
    floors.push(landingBottom);

    // invisible collider block for stairs (walkable)
    const stairCollider = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, pitDepth + 0.25, 5.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    stairCollider.position.copy(stairTop).add(new THREE.Vector3(0, -(pitDepth / 2), -2.7));
    root.add(stairCollider);
    floors.push(stairCollider);

    // (No guard bot on steps anymore — you asked to remove that interference)

    // ---------- VIP + ROOMS + TELEPORT PADS ----------
    // VIP cube room (spawn)
    const vipCenter = new THREE.Vector3(LOBBY_R - 2.0, 0, 6.2);
    demo.rooms.vip = vipCenter.clone();

    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 6.8), matFloor);
    vipFloor.position.set(vipCenter.x, -0.12, vipCenter.z);
    root.add(vipFloor);
    floors.push(vipFloor);

    const welcome = buildWelcomeSign(THREE, matNeonA, matNeonP, matTrim);
    welcome.position.set(vipCenter.x, 3.4, vipCenter.z - 3.1);
    welcome.lookAt(vipCenter.x, 3.4, vipCenter.z);
    root.add(welcome);
    demo.vipWelcomeSign = welcome;

    // Spawn in VIP facing table
    const spawnPos = vipCenter.clone().add(new THREE.Vector3(0, 0, -1.2));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // Define 3 square rooms (store/event/poker) around the lobby
    const storeCenter = new THREE.Vector3(-LOBBY_R + 3.2, 0, 4.2);
    const eventCenter = new THREE.Vector3(0, 0, -LOBBY_R + 3.2);
    const pokerCenter = new THREE.Vector3(LOBBY_R - 3.2, 0, -4.2);

    demo.rooms.store = storeCenter.clone();
    demo.rooms.event = eventCenter.clone();
    demo.rooms.poker = pokerCenter.clone();

    // Build storefront facades + labels
    const storeFront = buildFrontFacade(THREE, { title: "STORE", neonMat: matNeonA, wallMat: matWall, trimMat: matTrim, glassMat: matGlass });
    storeFront.position.copy(polar(Math.PI * 1.5, LOBBY_R - 0.70).toVec3());
    storeFront.lookAt(0, 0, 0);
    root.add(storeFront);

    const eventFront = buildFrontFacade(THREE, { title: "EVENT ROOM", neonMat: matNeonP, wallMat: matWall, trimMat: matTrim, glassMat: matGlass });
    eventFront.position.copy(polar(Math.PI, LOBBY_R - 0.70).toVec3());
    eventFront.lookAt(0, 0, 0);
    root.add(eventFront);

    const pokerFront = buildFrontFacade(THREE, { title: "POKER ROOM", neonMat: matNeonA, wallMat: matWall, trimMat: matTrim, glassMat: matGlass });
    pokerFront.position.copy(polar(Math.PI * 0.5, LOBBY_R - 0.70).toVec3());
    pokerFront.lookAt(0, 0, 0);
    root.add(pokerFront);

    // Teleport pads placed IN FRONT of each facade (not inside VIP)
    // Pressing pad teleports you INSIDE the square room
    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "ENTER STORE",
      colorMat: matNeonA,
      baseMat: matTrim,
      pos: storeFront.position.clone().add(storeFront.getWorldDirection(new THREE.Vector3()).multiplyScalar(-2.5)),
      to: { x: storeCenter.x, y: 0, z: storeCenter.z, yaw: 0.0 }
    });

    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "ENTER EVENT",
      colorMat: matNeonP,
      baseMat: matTrim,
      pos: eventFront.position.clone().add(eventFront.getWorldDirection(new THREE.Vector3()).multiplyScalar(-2.5)),
      to: { x: eventCenter.x, y: 0, z: eventCenter.z, yaw: Math.PI }
    });

    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "ENTER POKER",
      colorMat: matNeonA,
      baseMat: matTrim,
      pos: pokerFront.position.clone().add(pokerFront.getWorldDirection(new THREE.Vector3()).multiplyScalar(-2.5)),
      to: { x: pokerCenter.x, y: 0, z: pokerCenter.z, yaw: Math.PI * 0.5 }
    });

    // Add a “return to VIP” pad inside each room
    buildRoomCube(THREE, root, floors, matWall, matFloor, storeCenter, "STORE");
    buildRoomCube(THREE, root, floors, matWall, matFloor, eventCenter, "EVENT");
    buildRoomCube(THREE, root, floors, matWall, matFloor, pokerCenter, "POKER");

    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "BACK TO VIP",
      colorMat: matNeonP,
      baseMat: matTrim,
      pos: storeCenter.clone().add(new THREE.Vector3(0, 0.02, -2.5)),
      to: spawns.get("vip_cube")
    });

    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "BACK TO VIP",
      colorMat: matNeonA,
      baseMat: matTrim,
      pos: eventCenter.clone().add(new THREE.Vector3(0, 0.02, -2.5)),
      to: spawns.get("vip_cube")
    });

    createTeleportPad(THREE, root, floors, teleportPads, {
      label: "BACK TO VIP",
      colorMat: matNeonP,
      baseMat: matTrim,
      pos: pokerCenter.clone().add(new THREE.Vector3(0, 0.02, -2.5)),
      to: spawns.get("vip_cube")
    });

    log?.("[world] built ✅ WORLD 9.4");
  }

  // ---------- API ----------
  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }
  function getDemo() { return demo; }
  function getTeleportPads() { return teleportPads; }

  return { build, getSpawn, getFloors, getDemo, getTeleportPads };
})();

// ---------- helpers ----------
function tryLoadCarpet(THREE, matCarpet) {
  const urls = [
    "assets/textures/carpet.jpg",
    "assets/textures/carpet.png",
    "assets/textures/floor_carpet.jpg",
    "assets/textures/floor_carpet.png"
  ];
  const loader = new THREE.TextureLoader();
  let tried = 0;

  const attempt = () => {
    if (tried >= urls.length) return;
    const url = urls[tried++];
    loader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 8);
        matCarpet.map = tex;
        matCarpet.needsUpdate = true;
        console.log("[world] carpet texture ✅", url);
      },
      undefined,
      () => attempt()
    );
  };
  attempt();
}

function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments = 128) {
  const positions = [], normals = [], uvs = [], indices = [];
  const addV = (x, y, z, u, v) => { positions.push(x, y, z); normals.push(0, 1, 0); uvs.push(u, v); };
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

function buildStairsSolid(THREE, { stepCount, stepW, stepH, stepD, mat }) {
  const g = new THREE.Group();
  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
    step.position.set(0, -stepH / 2 - i * stepH, -i * stepD - i * 0.001);
    g.add(step);
  }
  return g;
}

function buildWelcomeSign(THREE, matA, matP, matTrim) {
  const g = new THREE.Group();
  g.name = "WelcomeSign";

  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 0.14), matTrim);
  g.add(plate);

  const glow = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.0, 0.10), matA);
  glow.position.set(0, 0, 0.08);
  g.add(glow);

  const rowY = [0.28, 0.0, -0.28];
  rowY.forEach((y, i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.08), i === 1 ? matP : matA);
    bar.position.set(0, y, 0.10);
    g.add(bar);
  });

  return g;
}

function buildFrontFacade(THREE, { title, neonMat, wallMat, trimMat, glassMat }) {
  const g = new THREE.Group();
  g.name = `Front_${title}`;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.9, 3.3, 0.22), wallMat);
  frame.position.set(0, 1.65, -0.35);
  g.add(frame);

  const left = buildMannequinCase(THREE, { glassMat, trimMat, neonMat });
  left.position.set(-2.2, 0.0, 0.35);
  g.add(left);

  const right = buildMannequinCase(THREE, { glassMat, trimMat, neonMat });
  right.position.set(2.2, 0.0, 0.35);
  g.add(right);

  // sign plate (visual)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.58, 0.18), neonMat);
  sign.position.set(0, 2.70, -0.18);
  g.add(sign);

  // “fake text bars”
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 0.12), trimMat);
  bar1.position.set(0, 2.46, -0.12);
  g.add(bar1);

  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.10, 0.12), trimMat);
  bar2.position.set(0, 2.26, -0.12);
  g.add(bar2);

  // label plate (billboarded by nametags system later if desired)
  g.userData.title = title;

  return g;
}

function buildMannequinCase(THREE, { glassMat, trimMat, neonMat }) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.26, 0.95), trimMat);
  base.position.set(0, 0.13, 0);
  g.add(base);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.85, 0.86), glassMat);
  glass.position.set(0, 1.05, 0);
  g.add(glass);

  // mannequin
  const man = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.65, metalness: 0.05 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), mat);
  torso.position.set(0, 1.00, 0);
  man.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
  head.position.set(0, 1.45, 0);
  man.add(head);

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10);
  const l1 = new THREE.Mesh(legGeo, mat); l1.position.set(-0.08, 0.55, 0);
  const l2 = new THREE.Mesh(legGeo, mat); l2.position.set(0.08, 0.55, 0);
  man.add(l1, l2);

  const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10);
  const a1 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.26, 1.05, 0); a1.rotation.z = 0.35;
  const a2 = new THREE.Mesh(armGeo, mat); a2.position.set(0.26, 1.05, 0); a2.rotation.z = -0.35;
  man.add(a1, a2);

  g.add(man);

  // internal light strip
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.12, 0.12), neonMat);
  strip.position.set(0, 1.90, 0.35);
  g.add(strip);

  return g;
}

function createTeleportPad(THREE, root, floors, teleportPads, { label, colorMat, baseMat, pos, to }) {
  const pad = new THREE.Group();
  pad.name = "TeleportPad";
  pad.position.copy(pos);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.10, 40), baseMat);
  base.position.y = 0.05;
  pad.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.07, 10, 80), colorMat);
  ring.position.y = 0.10;
  ring.rotation.x = Math.PI / 2;
  pad.add(ring);

  // Invisible clickable collider
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 18), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.18;
  hit.userData.teleportTo = to; // ✅ used by index.js select logic
  pad.add(hit);

  // also counts as “floor” so your ray can hit it
  floors.push(hit);
  teleportPads.push(hit);

  root.add(pad);
}

function buildRoomCube(THREE, root, floors, matWall, matFloor, center, label) {
  // Simple sealed cube room shell
  const size = 9.0;
  const h = 5.0;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.25, size), matFloor);
  floor.position.set(center.x, -0.12, center.z);
  root.add(floor);
  floors.push(floor);

  const shell = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), matWall);
  shell.position.set(center.x, h / 2 - 0.12, center.z);
  root.add(shell);

  // hollow effect: add an inner dark box to “feel” like a room
  const inner = new THREE.Mesh(new THREE.BoxGeometry(size - 0.5, h - 0.5, size - 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.02 }));
  inner.position.set(center.x, h / 2 - 0.12, center.z);
  root.add(inner);

  // ceiling light
  const light = new THREE.PointLight(0xffffff, 3.0, 30);
  light.position.set(center.x, 3.8, center.z);
  root.add(light);
}

function polar(a, r) {
  return {
    x: Math.sin(a) * r,
    z: Math.cos(a) * r,
    toVec3() { return new THREE.Vector3(this.x, 0, this.z); }
  };
}
