// /js/world.js — Scarlett MASTER WORLD v4 (EXPANDED LOBBY + EXPANDED PIT + STAIRS + UPRIGHT TAGS)
// ✅ Lobby expanded
// ✅ Pit expanded ~2x (more space, chairs visible)
// ✅ Stairs restored + gate opening cut
// ✅ Tags are upright yaw-only planes (no head-tilt following)
// ✅ Cards always face viewer (yaw-only) + stable tilt
// ✅ Store displays bigger + canopy roof + underlights
// ✅ Leaderboard board + plants
// ✅ Tight geometry (rings align), no "center blocking floor"

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, grips, log;

  const state = {
    root: null,

    // sizes (expanded)
    lobbyR: 20.5,
    wallH: 11.5,

    pitInner: 7.6,     // expanded pit
    pitOuter: 13.2,    // expanded lip
    pitDepth: 1.45,

    // gameplay-ish
    tableAnchor: null,
    cards: null,
    boardPhase: 0,
    boardTimer: 0,

    // gaze tags (planes)
    tags: [],

    // telepads / menu interaction
    telepads: [],
    targets: {},

    // menu
    menu: null,
    menuButtons: [],
    menuOpen: false,
    hudRoot: null,
    hudVisible: true,

    t: 0
  };

  const THEME = {
    bg: 0x05060a,
    wall: 0x222b3a,
    wall2: 0x161c27,
    floor: 0x3a4354,
    pit: 0x0b1420,
    felt: 0x0f5a3f,
    aqua: 0x7fe7ff,
    pink: 0xff2d7a,
    violet: 0xa78bff,
    neonTrim: 0x3cf2ff
  };

  const add = (o) => (state.root.add(o), o);

  function matStd({ color, rough = 0.85, metal = 0.08, emissive = 0x000000, ei = 0 } = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei });
  }

  // ---------- CANVAS TEXTURES ----------
  function makeCanvasTexture(lines, {
    w = 768, h = 256,
    title = "#e8ecff",
    sub = "#98a0c7",
    accent = "rgba(127,231,255,.40)",
    bg = "rgba(10,12,18,.78)",
    titleSize = 58,
    subSize = 36
  } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    g.strokeStyle = accent;
    g.lineWidth = 10;
    g.strokeRect(16, 16, w - 32, h - 32);

    g.textAlign = "center";
    g.textBaseline = "middle";

    const [t1, t2] = Array.isArray(lines) ? lines : [String(lines), ""];

    // title
    g.fillStyle = title;
    g.font = `900 ${titleSize}px system-ui, Segoe UI, Arial`;
    g.fillText(t1, w / 2, h * 0.44);

    // sub
    if (t2) {
      g.fillStyle = sub;
      g.font = `800 ${subSize}px system-ui, Segoe UI, Arial`;
      g.fillText(t2, w / 2, h * 0.70);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeUprightTagPlane(name, money) {
    const tex = makeCanvasTexture([name, money], {
      w: 768, h: 256,
      title: "#e8ecff",
      sub: "#7fe7ff",
      accent: "rgba(255,45,122,.30)",
      titleSize: 62,
      subSize: 36
    });

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x050a10,
      emissiveIntensity: 0.6
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.22), mat);
    plane.visible = false;
    plane.userData.kind = "tag";
    return plane;
  }

  function makeWallSign(text) {
    const tex = makeCanvasTexture([text, ""], {
      w: 1024, h: 256,
      title: "#ffe1ec",
      accent: "rgba(255,45,122,.35)",
      titleSize: 54,
      subSize: 1
    });
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.55,
      metalness: 0.10,
      emissive: 0x050a10,
      emissiveIntensity: 0.9
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.8), mat);
  }

  function cameraForward(out = new THREE.Vector3()) {
    camera.getWorldDirection(out);
    out.y = 0;
    return out.normalize();
  }

  function yawFace(obj, tilt = -0.06) {
    const dx = camera.position.x - obj.position.x;
    const dz = camera.position.z - obj.position.z;
    const yaw = Math.atan2(dx, dz);
    obj.rotation.set(tilt, yaw, 0);
  }

  // ---------- LIGHTING (BRIGHT + STABLE) ----------
  function buildLights() {
    add(new THREE.AmbientLight(0xffffff, 1.10));
    add(new THREE.HemisphereLight(0xdfe9ff, 0x0b0d14, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(16, 18, 12);
    add(sun);

    // ring lights
    const ringR = state.lobbyR - 3.8;
    const ringY = 5.6;
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const l = new THREE.PointLight(0xffffff, 1.55, 56, 2.0);
      l.position.set(Math.cos(a) * ringR, ringY, Math.sin(a) * ringR);
      add(l);
    }

    // pit hero lights
    const pitA = new THREE.PointLight(THEME.aqua, 2.1, 120);
    pitA.position.set(0, 9, 0);
    add(pitA);

    const pitB = new THREE.PointLight(THEME.pink, 1.8, 110);
    pitB.position.set(10, 8, -7);
    add(pitB);

    // overhead circular fixture above pit
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(state.pitOuter - 0.9, 0.12, 18, 200),
      matStd({ color: THEME.neonTrim, rough: 0.3, metal: 0.9, emissive: THEME.neonTrim, ei: 1.3 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 8.9;
    add(halo);

    log?.("[world] lights ✅");
  }

  // ---------- LOBBY + PIT (EXPANDED, OPEN) ----------
  function buildLobbyAndPit() {
    const { lobbyR, wallH, pitInner, pitOuter, pitDepth } = state;

    // Outer lobby floor ring (hole stays open)
    const outerFloor = new THREE.Mesh(
      new THREE.RingGeometry(pitOuter, lobbyR, 220),
      matStd({ color: THEME.floor, rough: 0.9, metal: 0.05 })
    );
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = 0.02;
    add(outerFloor);

    // Lip ring (pit edge seal)
    const lip = new THREE.Mesh(
      new THREE.RingGeometry(pitInner, pitOuter, 220),
      matStd({ color: THEME.floor, rough: 0.92, metal: 0.05 })
    );
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = 0.02;
    add(lip);

    // Pit floor
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitInner - 0.20, 200),
      matStd({ color: THEME.pit, rough: 0.98, metal: 0.02 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    add(pitFloor);

    // Pit wall
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitInner, pitInner, pitDepth, 200, 1, true),
      matStd({ color: THEME.wall2, rough: 0.90, metal: 0.08 })
    );
    pitWall.position.y = -pitDepth / 2;
    pitWall.material.side = THREE.DoubleSide;
    add(pitWall);

    // Guard rail rings (tight + clean)
    const railA = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.25, 0.07, 18, 240),
      matStd({ color: THEME.aqua, rough: 0.25, metal: 0.85, emissive: 0x062028, ei: 1.2 })
    );
    railA.rotation.x = Math.PI / 2;
    railA.position.y = 0.82;
    add(railA);

    const railB = new THREE.Mesh(
      new THREE.TorusGeometry(pitInner + 0.42, 0.05, 18, 240),
      matStd({ color: THEME.violet, rough: 0.25, metal: 0.85, emissive: 0x120a24, ei: 0.9 })
    );
    railB.rotation.x = Math.PI / 2;
    railB.position.y = 0.90;
    add(railB);

    // Segmented outer wall with big openings (4 door mouths)
    buildSegmentedRingWall({ radius: lobbyR - 0.20, height: wallH, thickness: 0.45 });

    // Neon trims
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.35, 0.11, 18, 260),
      matStd({ color: THEME.neonTrim, rough: 0.28, metal: 0.95, emissive: THEME.neonTrim, ei: 1.15 })
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = wallH - 0.55;
    add(trimTop);

    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyR - 0.32, 0.09, 18, 260),
      matStd({ color: THEME.pink, rough: 0.28, metal: 0.88, emissive: THEME.pink, ei: 0.85 })
    );
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = 0.42;
    add(trimBottom);

    // spawn target
    state.targets.pitEntry = new THREE.Vector3(0, 0, pitInner - 1.05);

    log?.("[world] lobby+pits ✅ (expanded)");
  }

  function angleDist(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  function buildSegmentedRingWall({ radius, height, thickness }) {
    const segCount = 18;
    const step = (Math.PI * 2) / segCount;
    const arc = (Math.PI * 2 * radius) / segCount;
    const segW = arc * 0.93;

    const doorAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const doorHalfAngle = 0.27;

    const wallMat = matStd({ color: THEME.wall, rough: 0.92, metal: 0.07 });

    for (let i = 0; i < segCount; i++) {
      const a = -Math.PI + i * step + step / 2;

      let skip = false;
      for (const da of doorAngles) {
        if (angleDist(a, da) < doorHalfAngle) { skip = true; break; }
      }
      if (skip) continue;

      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;

      const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, height, thickness), wallMat);
      seg.position.set(x, height / 2, z);
      seg.rotation.y = a;
      add(seg);
    }
  }

  // ---------- STAIRS + GATE OPENING (RESTORED) ----------
  function buildStairsAndGate() {
    const { pitInner, pitDepth } = state;

    const openingW = 4.4;
    const stepCount = 10;
    const stepH = pitDepth / stepCount;
    const stepD = 0.62;

    const stepMat = matStd({ color: THEME.floor, rough: 0.92, metal: 0.05 });

    // stairs down into pit at +Z
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(openingW, stepH * 0.95, stepD), stepMat);
      step.position.set(0, -stepH * (i + 0.5), pitInner + 0.45 + i * stepD);
      add(step);
    }

    // gate posts (opening)
    const postMat = matStd({ color: THEME.violet, rough: 0.35, metal: 0.85, emissive: THEME.violet, ei: 0.55 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 16), postMat);
    const p2 = p1.clone();

    p1.position.set(-openingW / 2 - 0.1, 0.58, pitInner + 0.20);
    p2.position.set(openingW / 2 + 0.1, 0.58, pitInner + 0.20);
    add(p1); add(p2);

    // short rail segments left/right of opening
    const railMat = matStd({ color: THEME.aqua, rough: 0.25, metal: 0.9, emissive: THEME.aqua, ei: 0.75 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), railMat);
    const railR = railL.clone();
    railL.position.set(-openingW / 2 - 1.25, 0.90, pitInner + 0.20);
    railR.position.set(openingW / 2 + 1.25, 0.90, pitInner + 0.20);
    add(railL); add(railR);

    // guard right at entrance
    const guard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.86, 6, 12),
      matStd({ color: THEME.pink, rough: 0.35, metal: 0.25, emissive: THEME.pink, ei: 0.65 })
    );
    guard.position.set(0, 0.98, pitInner + 1.55);
    add(guard);

    const gtag = makeUprightTagPlane("GUARD", "$—");
    gtag.scale.set(1.35, 1.35, 1);
    gtag.position.set(0, 1.55, 0);
    guard.add(gtag);
    state.tags.push({ host: guard, plane: gtag });

    log?.("[world] stairs+gate ✅");
  }

  // ---------- ROOMS + HALLWAYS (RE-ALIGNED TO BIGGER LOBBY) ----------
  function buildRoomsAndHallways() {
    const hallStartR = state.lobbyR - 2.2;
    const hallW = 5.0;
    const hallH = 3.4;
    const hallL = 9.2;

    const roomSize = 12.2;
    const roomH = 5.6;
    const roomDist = state.lobbyR + 9.8;

    const hallWallMat = matStd({ color: THEME.wall2, rough: 0.9, metal: 0.06 });
    const roomWallMat = matStd({ color: THEME.wall, rough: 0.9, metal: 0.06 });
    const floorMat = matStd({ color: THEME.floor, rough: 0.88, metal: 0.04 });

    const rooms = [
      { key: "vip",   label: "VIP",   dir: new THREE.Vector3(0, 0, 1),  col: THEME.violet },
      { key: "store", label: "STORE", dir: new THREE.Vector3(1, 0, 0),  col: THEME.aqua },
      { key: "event", label: "EVENT", dir: new THREE.Vector3(0, 0, -1), col: THEME.pink },
      { key: "poker", label: "POKER", dir: new THREE.Vector3(-1, 0, 0), col: THEME.aqua }
    ];

    for (const r of rooms) {
      const yaw = Math.atan2(r.dir.x, r.dir.z);
      const hallCenter = r.dir.clone().multiplyScalar(hallStartR + hallL * 0.5);

      // hallway floor
      const hf = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallL), floorMat);
      hf.rotation.x = -Math.PI / 2;
      hf.position.set(hallCenter.x, 0.02, hallCenter.z);
      hf.rotation.y = yaw;
      add(hf);

      // side walls only
      const side = new THREE.BoxGeometry(hallL, hallH, 0.20);
      const w1 = new THREE.Mesh(side, hallWallMat);
      const w2 = new THREE.Mesh(side, hallWallMat);
      w1.position.set(0, hallH / 2, hallW * 0.5);
      w2.position.set(0, hallH / 2, -hallW * 0.5);
      w1.rotation.y = Math.PI / 2;
      w2.rotation.y = Math.PI / 2;

      const hg = new THREE.Group();
      hg.position.set(hallCenter.x, 0, hallCenter.z);
      hg.rotation.y = yaw;
      hg.add(w1, w2);
      add(hg);

      // entrance sign (flat, fixed)
      const entrance = r.dir.clone().multiplyScalar(state.lobbyR - 1.2);
      const sign = makeWallSign(r.label);
      sign.position.set(entrance.x, 3.25, entrance.z);
      sign.rotation.y = yaw;
      add(sign);

      // room center
      const roomCenter = r.dir.clone().multiplyScalar(roomDist);

      // room floor
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat);
      rf.rotation.x = -Math.PI / 2;
      rf.position.set(roomCenter.x, 0.02, roomCenter.z);
      add(rf);

      // walls with door aligned to hallway
      buildRoomWithDoor(roomCenter, yaw, roomSize, roomH, roomWallMat);

      // targets
      state.targets[`${r.key}Front`] = entrance.clone().setY(0);
      state.targets[`${r.key}Inside`] = roomCenter.clone().setY(0);

      // store frontage extras
      if (r.key === "store") {
        buildStoreFront(entrance, yaw, r.dir);
        buildLeaderboard(entrance, yaw, r.dir);
        buildPlantsNearStore(entrance, yaw, r.dir);
      }
    }

    log?.("[world] rooms/halls ✅ (expanded)");
  }

  function buildRoomWithDoor(center, yaw, size, height, wallMat) {
    const half = size / 2;
    const doorW = 4.0;
    const doorH = 3.4;

    const g = new THREE.Group();
    g.position.copy(center);
    g.rotation.y = yaw;

    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), matStd({ color: THEME.wall2, rough: 0.95, metal: 0.02 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = height;
    g.add(ceil);

    // back wall
    const back = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    back.position.set(0, height / 2, -half);
    g.add(back);

    // left/right
    const left = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-half, height / 2, 0);
    g.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(size, height), wallMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(half, height / 2, 0);
    g.add(right);

    // front wall split for door
    const frontZ = half;

    const topSeg = new THREE.Mesh(new THREE.PlaneGeometry(size, height - doorH), wallMat);
    topSeg.position.set(0, doorH + (height - doorH) / 2, frontZ);
    topSeg.rotation.y = Math.PI;
    g.add(topSeg);

    const sideW = (size - doorW) / 2;

    const leftSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    leftSeg.position.set(-(doorW / 2 + sideW / 2), doorH / 2, frontZ);
    leftSeg.rotation.y = Math.PI;
    g.add(leftSeg);

    const rightSeg = new THREE.Mesh(new THREE.PlaneGeometry(sideW, doorH), wallMat);
    rightSeg.position.set((doorW / 2 + sideW / 2), doorH / 2, frontZ);
    rightSeg.rotation.y = Math.PI;
    g.add(rightSeg);

    // interior light
    const lamp = new THREE.PointLight(0xffffff, 1.25, 24);
    lamp.position.set(0, 3.6, 0);
    g.add(lamp);

    add(g);
  }

  // ---------- STORE FRONT (BIGGER DISPLAYS + ROOF + LIGHTS) ----------
  function buildStoreFront(entrance, yaw, dir) {
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      transmission: 0.94,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06
    });

    const frameMat = matStd({ color: 0x0f1220, rough: 0.7, metal: 0.25 });
    const canopyMat = matStd({ color: THEME.wall2, rough: 0.85, metal: 0.12, emissive: 0x03060a, ei: 0.4 });

    const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

    // canopy roof over both displays
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.35, 2.2), canopyMat);
    canopy.position.copy(entrance).add(dir.clone().multiplyScalar(-1.15));
    canopy.position.y = 3.05;
    canopy.rotation.y = yaw;
    add(canopy);

    // underlights
    for (const s of [-1.8, 1.8]) {
      const spot = new THREE.PointLight(THEME.aqua, 0.85, 8);
      spot.position.copy(canopy.position).add(perp.clone().multiplyScalar(s));
      spot.position.y = 2.65;
      add(spot);
    }

    // bigger spaced displays
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.copy(entrance)
        .add(dir.clone().multiplyScalar(-0.95))
        .add(perp.clone().multiplyScalar(s * 2.7));
      g.rotation.y = yaw;

      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.75, 1.05), glassMat);
      glass.position.y = 1.38;
      g.add(glass);

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.12), frameMat);
      base.position.y = 0.09;
      g.add(base);

      // “better mannequin” placeholder (taller, more humanoid)
      const man = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 1.15, 8, 14),
        matStd({ color: 0xb8c2ff, rough: 0.55, metal: 0.12, emissive: 0x0d123a, ei: 0.55 })
      );
      man.position.set(0, 1.05, 0);
      g.add(man);

      const glow = new THREE.PointLight(s === 1 ? THEME.pink : THEME.aqua, 0.85, 9);
      glow.position.set(0, 1.85, 0.65);
      g.add(glow);

      add(g);
    }
  }

  // ---------- LEADERBOARD BOARD (STORE RIGHT SIDE) ----------
  function buildLeaderboard(entrance, yaw, dir) {
    const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

    const board = new THREE.Group();
    board.position.copy(entrance)
      .add(dir.clone().multiplyScalar(-0.9))
      .add(perp.clone().multiplyScalar(5.2));
    board.rotation.y = yaw;

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.4),
      matStd({ color: 0x0b0d14, rough: 0.9, metal: 0.05, emissive: 0x050a10, ei: 0.6 })
    );
    back.position.set(0, 1.8, 0);
    board.add(back);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.2),
      new THREE.MeshStandardMaterial({
        map: makeCanvasTexture(["LEADERBOARD", "Sports • Bets • Rankings"], {
          w: 1024, h: 512,
          title: "#e8ecff",
          sub: "#ff2d7a",
          accent: "rgba(127,231,255,.35)",
          titleSize: 70,
          subSize: 44
        }),
        transparent: true,
        roughness: 0.65,
        metalness: 0.1,
        emissive: THEME.aqua,
        emissiveIntensity: 0.25
      })
    );
    sign.position.set(0, 1.8, 0.01);
    board.add(sign);

    const glow = new THREE.PointLight(THEME.violet, 0.9, 12);
    glow.position.set(0, 2.0, 0.6);
    board.add(glow);

    add(board);
  }

  // ---------- PLANTS (SIMPLE BUT NICE) ----------
  function buildPlantsNearStore(entrance, yaw, dir) {
    const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

    function plant(pos) {
      const g = new THREE.Group();
      g.position.copy(pos);

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 0.34, 18),
        matStd({ color: 0x1a2230, rough: 0.8, metal: 0.1 })
      );
      pot.position.y = 0.17;
      g.add(pot);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.55, 10),
        matStd({ color: 0x2e7d32, rough: 0.85, metal: 0.05, emissive: 0x081a0a, ei: 0.25 })
      );
      stem.position.y = 0.55;
      g.add(stem);

      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 14, 14),
        matStd({ color: 0x3ddc84, rough: 0.85, metal: 0.02, emissive: 0x072015, ei: 0.35 })
      );
      leaves.position.y = 0.88;
      g.add(leaves);

      add(g);
    }

    const base = entrance.clone().add(dir.clone().multiplyScalar(-0.7));
    plant(base.clone().add(perp.clone().multiplyScalar(-5.0)));
    plant(base.clone().add(perp.clone().multiplyScalar(-4.0)));
    plant(base.clone().add(perp.clone().multiplyScalar(3.8)));
  }

  // ---------- TABLE + BOTS (MORE SPACE) ----------
  function buildTableAndBots() {
    const { pitDepth, pitInner } = state;

    state.tableAnchor = new THREE.Group();
    state.tableAnchor.position.set(0, -pitDepth, 0);
    add(state.tableAnchor);

    const felt = matStd({ color: THEME.felt, rough: 0.92, metal: 0.02 });
    const leather = matStd({ color: 0x3a2416, rough: 0.75, metal: 0.08 });
    const baseMat = matStd({ color: 0x1f2633, rough: 0.65, metal: 0.35 });

    // bigger table
    const top = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.20, 0.20, 80), felt);
    top.position.y = 0.98;
    state.tableAnchor.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.10, 0.16, 18, 160), leather);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.10;
    state.tableAnchor.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.25, 1.05, 32), baseMat);
    base.position.y = 0.52;
    state.tableAnchor.add(base);

    // community cards hover group (faces viewer in update)
    state.cards = new THREE.Group();
    state.cards.position.set(0, 2.55, 0);
    state.tableAnchor.add(state.cards);

    const cardMat = matStd({ color: 0xffffff, rough: 0.35, metal: 0.05 });
    const geo = new THREE.PlaneGeometry(0.72, 1.02);

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, cardMat);
      c.position.set((i - 2) * 0.84, 0, 0);
      c.visible = (i < 3); // flop only
      state.cards.add(c);
    }

    state.boardPhase = 0;
    state.boardTimer = 0;

    // chairs + bots (radius bigger, chairs visible)
    const chairMat = matStd({ color: 0x2a2f3a, rough: 0.75, metal: 0.2 });
    const botMat = matStd({ color: 0xb8c2ff, rough: 0.55, metal: 0.15, emissive: 0x121a55, ei: 0.55 });

    const seats = 6;
    const seatR = Math.min(pitInner - 1.25, 6.2);

    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const cx = Math.cos(a) * seatR;
      const cz = Math.sin(a) * seatR;

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.95), chairMat);
      chair.position.set(cx, 0.14, cz);
      chair.rotation.y = -a + Math.PI;
      state.tableAnchor.add(chair);

      const bot = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.78, 6, 12), botMat);
      bot.position.set(cx, 0.72, cz);
      bot.rotation.y = -a + Math.PI;
      state.tableAnchor.add(bot);

      // SMALLER tag, upright plane, gaze-only
      const tag = makeUprightTagPlane(`BOT_${i + 1}`, "$5000");
      tag.position.set(0, 1.40, 0);
      bot.add(tag);

      state.tags.push({ host: bot, plane: tag });
    }

    log?.("[world] table+bots ✅ (bigger)");
  }

  // ---------- JUMBOTRONS (FLAT, FIXED) ----------
  function buildJumbotrons() {
    const r = state.lobbyR - 1.0;
    const y = state.wallH - 2.8;

    const items = [
      { a: 0,           text: "SCARLETT VR POKER" },
      { a: Math.PI/2,   text: "VIP • STORE • EVENT • POKER" },
      { a: Math.PI,     text: "WELCOME TO THE EMPIRE" },
      { a: -Math.PI/2,  text: "TABLE STATUS: OPEN" }
    ];

    for (const p of items) {
      const x = Math.sin(p.a) * r;
      const z = Math.cos(p.a) * r;
      const sign = makeWallSign(p.text);
      sign.position.set(x, y, z);
      sign.lookAt(0, y, 0);
      add(sign);
    }
  }

  // ---------- HUD (TABLE HUD POSITIONED CORRECTLY) ----------
  function buildHUD() {
    const hud = new THREE.Group();
    hud.name = "ScarlettHUDRoot";
    hud.position.set(0, 2.7, state.pitInner + 2.8); // higher and not at guard
    add(hud);
    state.hudRoot = hud;

    const tex = makeCanvasTexture(["POT: $0", "TURN: BOT_1"], {
      w: 1024, h: 256,
      title: "#e8ecff",
      sub: "#7fe7ff",
      accent: "rgba(255,45,122,.28)",
      titleSize: 62,
      subSize: 40
    });

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.75),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, metalness: 0.08, emissive: 0x050a10, emissiveIntensity: 0.7 })
    );
    panel.position.set(0, 0, 0);
    hud.add(panel);
  }

  // ---------- MENU (kept, but world-only) ----------
  function buildMenu() {
    state.menu = new THREE.Group();
    state.menu.name = "ScarlettMenu";
    state.menu.visible = false;
    camera.add(state.menu);
    state.menu.position.set(0, -0.05, -1.05);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.84, roughness: 0.9, metalness: 0.05 })
    );
    back.position.set(0, 0, 0);
    state.menu.add(back);

    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.18),
      new THREE.MeshStandardMaterial({
        map: makeCanvasTexture(["TELEPORT MENU", ""], { w: 768, h: 256, titleSize: 56, accent: "rgba(127,231,255,.28)" }),
        transparent: true
      })
    );
    title.position.set(0, 0.22, 0.01);
    state.menu.add(title);

    const items = ["VIP", "STORE", "EVENT", "POKER", "PIT", "HUD"];
    state.menuButtons = [];

    const btnGeo = new THREE.PlaneGeometry(0.28, 0.09);
    items.forEach((key, idx) => {
      const tex = makeCanvasTexture([key, ""], { w: 512, h: 192, titleSize: 58 });
      const mat = new THREE.MeshStandardMaterial({
        map: tex, transparent: true,
        emissive: THEME.aqua, emissiveIntensity: 0.22,
        roughness: 0.7, metalness: 0.1
      });
      const btn = new THREE.Mesh(btnGeo, mat);
      btn.position.set(-0.30 + (idx % 2) * 0.60, 0.10 - Math.floor(idx / 2) * 0.12, 0.02);
      btn.userData.menuKey = key;
      state.menu.add(btn);
      state.menuButtons.push(btn);
    });
  }

  function toggleMenu() {
    state.menuOpen = !state.menuOpen;
    if (state.menu) state.menu.visible = state.menuOpen;
    log?.(`[menu] open=${state.menuOpen}`);
  }

  function toggleHUD() {
    state.hudVisible = !state.hudVisible;
    if (state.hudRoot) state.hudRoot.visible = state.hudVisible;
  }

  // ---------- TELEPADS ----------
  function telepad(name, pos, color) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.1,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.95
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.80, 1.10, 72), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 0.02;
    ring.userData.telepad = { name };
    state.telepads.push(ring);
    add(ring);
    return ring;
  }

  function doTeleport(key) {
    const t = state.targets[key];
    if (!t) return;
    player.position.set(t.x, 0, t.z);
  }

  function wireSelectTriggers() {
    function rayFromController(controller) {
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
      return { origin, dir };
    }
    function hitObjects(controller, objs, max = 40) {
      const { origin, dir } = rayFromController(controller);
      const ray = new THREE.Raycaster(origin, dir, 0.01, max);
      const hits = ray.intersectObjects(objs, true);
      return hits?.[0]?.object || null;
    }

    for (const c of controllers || []) {
      c.addEventListener("selectstart", () => {
        // menu clicks
        if (state.menuOpen) {
          const hitBtn = hitObjects(c, state.menuButtons, 8);
          const key = hitBtn?.userData?.menuKey;
          if (key) {
            if (key === "HUD") toggleHUD();
            if (key === "VIP") doTeleport("vipInside");
            if (key === "STORE") doTeleport("storeInside");
            if (key === "EVENT") doTeleport("eventInside");
            if (key === "POKER") doTeleport("pokerInside");
            if (key === "PIT") doTeleport("pitEntry");
            return;
          }
        }

        // telepads
        const hitPad = hitObjects(c, state.telepads, 60);
        const name = hitPad?.userData?.telepad?.name;
        if (!name) return;

        if (name === "STORE") doTeleport("storeInside");
        else if (name === "POKER") doTeleport("pokerInside");
        else if (name === "EVENT") doTeleport("eventInside");
        else if (name === "VIP") doTeleport("vipInside");
        else if (name === "PIT") doTeleport("pitEntry");
      });
    }
  }

  // ---------- SPAWN ----------
  function setVIPSpawn() {
    const vip = state.targets.vipInside || new THREE.Vector3(0, 0, state.lobbyR + 10);
    player.position.set(vip.x, 0, vip.z);
    player.rotation.set(0, Math.PI, 0);
    log?.("[world] spawn -> VIP ✅");
  }

  // ---------- INIT ----------
  async function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    renderer = ctx.renderer;
    camera = ctx.camera;
    player = ctx.player;
    controllers = ctx.controllers || [];
    grips = ctx.grips || [];
    log = ctx.log || console.log;

    state.root = new THREE.Group();
    state.root.name = "WorldRoot";
    scene.add(state.root);

    buildLights();
    buildLobbyAndPit();
    buildStairsAndGate();
    buildRoomsAndHallways();
    buildTableAndBots();
    buildJumbotrons();
    buildHUD();
    buildMenu();

    // targets based on expanded lobby
    const frontR = state.lobbyR - 1.2;
    const roomDist = state.lobbyR + 9.8;

    state.targets.vipFront   = new THREE.Vector3(0, 0, frontR);
    state.targets.storeFront = new THREE.Vector3(frontR, 0, 0);
    state.targets.eventFront = new THREE.Vector3(0, 0, -frontR);
    state.targets.pokerFront = new THREE.Vector3(-frontR, 0, 0);

    state.targets.vipInside   = new THREE.Vector3(0, 0, roomDist);
    state.targets.storeInside = new THREE.Vector3(roomDist, 0, 0);
    state.targets.eventInside = new THREE.Vector3(0, 0, -roomDist);
    state.targets.pokerInside = new THREE.Vector3(-roomDist, 0, 0);

    // telepads placed at expanded entrances + pit
    telepad("PIT", new THREE.Vector3(0, 0, state.pitInner + 3.2), THEME.aqua);
    telepad("VIP", state.targets.vipFront, THEME.violet);
    telepad("STORE", state.targets.storeFront, THEME.aqua);
    telepad("EVENT", state.targets.eventFront, THEME.pink);
    telepad("POKER", state.targets.pokerFront, THEME.aqua);

    wireSelectTriggers();
    setVIPSpawn();

    log?.("[world] init ✅ MASTER WORLD v4 (expanded + fixed)");
  }

  // ---------- UPDATE ----------
  function update({ dt, t }) {
    state.t = t;

    // community cards: ALWAYS face viewer (yaw-only), stable tilt
    if (state.cards) {
      const worldPos = new THREE.Vector3();
      state.cards.getWorldPosition(worldPos);

      const dx = camera.position.x - worldPos.x;
      const dz = camera.position.z - worldPos.z;
      const yaw = Math.atan2(dx, dz);

      // more “flat to viewer” than before
      state.cards.rotation.set(-0.12, yaw, 0);

      // staged board: flop -> turn -> river
      state.boardTimer += dt;
      if (state.boardTimer > 6 && state.boardPhase === 0) {
        state.cards.children[3].visible = true;
        state.boardPhase = 1;
        log?.("[poker-demo] TURN ✅");
      }
      if (state.boardTimer > 12 && state.boardPhase === 1) {
        state.cards.children[4].visible = true;
        state.boardPhase = 2;
        log?.("[poker-demo] RIVER ✅");
      }
    }

    // telepad pulse
    for (const p of state.telepads) {
      if (p.material?.emissiveIntensity != null) {
        p.material.emissiveIntensity = 1.85 + Math.sin(t * 2.1) * 0.25;
      }
    }

    // gaze tags: show ONLY when you look at them, and stay upright (yaw-only)
    const fwd = cameraForward(new THREE.Vector3());
    const camPos = camera.position.clone();

    for (const it of state.tags) {
      const host = it.host;
      const plane = it.plane;

      const hp = new THREE.Vector3();
      host.getWorldPosition(hp);

      const to = hp.clone().sub(camPos);
      const dist = to.length();
      to.y = 0;
      to.normalize();

      const dot = fwd.dot(to);
      const show = (dist < 12.0) && (dot > 0.93); // tighter cone
      plane.visible = show;

      if (show) {
        // enforce upright yaw-only facing (NO head pitch/roll tracking)
        const wp = new THREE.Vector3();
        plane.getWorldPosition(wp);
        const dx = camera.position.x - wp.x;
        const dz = camera.position.z - wp.z;
        const yaw = Math.atan2(dx, dz);
        plane.rotation.set(-0.02, yaw, 0);
      }
    }
  }

  return { init, update, toggleMenu };
})();
