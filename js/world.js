// /js/world.js — Scarlett MASTER WORLD v8 (FULL, stable, no bare "three" imports)
// ✅ No `import ... from "three"` anywhere (index injects THREE)
// ✅ FULL lobby: floor + walls + pit divot + rail + stairs + guard opening
// ✅ FULL table: lowered into pit, chairs around, tightened geometry
// ✅ Jumbotrons embedded into walls (not floating)
// ✅ Teleport Arch + pad (room portal)
// ✅ Store: sign + 3 mannequins in display + shirt material applied (if texture exists)
// ✅ Scorpion room: elongated 6-seat oval table + auto-seat zone + 4 bots seated
// ✅ PokerSim: single instance, deals, community hover only when looked at, showdown visual
// ✅ Pot HUD: faces camera + slight tilt down + shows POT / TURN / BET / ACTION / WINNER
// ✅ Chips: flat on table (no sideways) + thrown animation that lands flat
// ✅ Lobby bots: full body (shoulders/hips/knees/feet) + walk cycle (no sliding)
// ✅ Colliders exposed for teleport ring

export const World = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    root: null,

    // groups
    lobby: null,
    store: null,
    scorpion: null,

    // colliders for teleport
    colliders: [],

    // time
    t: 0,

    // teleport pad / room
    room: "lobby",
    roomTargets: {
      lobby: { pos: [0, 0, 8], yaw: 0 },
      store: { pos: [10, 0, 6], yaw: -Math.PI / 2 },
      scorpion: { pos: [-10, 0, 6], yaw: Math.PI / 2 },
    },

    // pit/table
    pit: {
      center: [0, 0, 0],
      radiusOuter: 10.5,
      radiusInner: 6.2,
      depth: 1.35,
    },

    // HUD + chips
    pot: {
      value: 0,
      root: null,
      text: null,
      last: { pot: -1, turn: -1, bet: -1, action: "", winner: "" },
      chipsRoot: null,
      chipPool: [],
      seatChipTargets: [],
      fly: [],
    },

    // bots
    bots: {
      lobby: [],
      scorpion: [],
      mannequins: [],
    },

    // poker
    poker: {
      seats: 6,
      seatPos: [],
      activeSeat: 0,
      stage: "idle",
      stageT: 0,
      pot: 0,
      bet: 0,
      winner: "",
      // visuals
      table: null,
      cardsRoot: null,
      community: [],
      hole: [], // [seat][2]
      hoverOnlyCommunity: true,
      hoverFocusDist: 1.8,
      // simple “hand reveal” visual
      showdown: false,
    },

    // lighting
    lights: [],
  };

  // ---------------- utils ----------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function v3(x = 0, y = 0, z = 0) {
    return new S.THREE.Vector3(x, y, z);
  }

  function setMat(mesh, mat) {
    mesh.material = mat;
    mesh.material.needsUpdate = true;
  }

  function safeColor(hex) {
    return new S.THREE.Color(hex);
  }

  function makeStandard(hex, rough = 0.95, metal = 0.05, emissive = 0x000000, emissiveIntensity = 0) {
    return new S.THREE.MeshStandardMaterial({
      color: safeColor(hex),
      roughness: rough,
      metalness: metal,
      emissive: safeColor(emissive),
      emissiveIntensity,
    });
  }

  function makePanelMaterial() {
    return new S.THREE.MeshStandardMaterial({
      color: safeColor(0x0b0d14),
      roughness: 1,
      metalness: 0.05,
    });
  }

  function addCollider(obj) {
    if (!obj) return;
    S.colliders.push(obj);
  }

  // Simple text sprite using canvas
  function makeTextTag(text, colorHex = 0x2dfcff, bgAlpha = 0.35) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(10,12,18,${bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 72px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#e8ecff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 36, canvas.height / 2);

    ctx.strokeStyle = `rgba(255,255,255,0.22)`;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    const tex = new S.THREE.CanvasTexture(canvas);
    tex.colorSpace = S.THREE.SRGBColorSpace;

    const mat = new S.THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new S.THREE.PlaneGeometry(2.8, 0.7);
    const mesh = new S.THREE.Mesh(geo, mat);
    mesh.userData._tagCanvas = canvas;
    mesh.userData._tagCtx = ctx;
    mesh.userData._tagTex = tex;
    mesh.userData._tagColor = colorHex;
    mesh.userData._tagBg = bgAlpha;

    mesh.userData.setText = (t) => {
      const c = mesh.userData._tagCanvas;
      const g = mesh.userData._tagCtx;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = `rgba(10,12,18,${mesh.userData._tagBg})`;
      g.fillRect(0, 0, c.width, c.height);
      g.font = "bold 72px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      g.fillStyle = "#e8ecff";
      g.textBaseline = "middle";
      g.fillText(t, 36, c.height / 2);
      g.strokeStyle = `rgba(255,255,255,0.22)`;
      g.lineWidth = 6;
      g.strokeRect(8, 8, c.width - 16, c.height - 16);
      mesh.userData._tagTex.needsUpdate = true;
    };

    return mesh;
  }

  async function tryLoadTexture(url) {
    return await new Promise((resolve) => {
      const loader = new S.THREE.TextureLoader();
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = S.THREE.SRGBColorSpace;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  // ---------------- build: lights ----------------
  function buildLights() {
    // Clear old
    for (const l of S.lights) S.scene.remove(l);
    S.lights = [];

    // Bright but not washed out
    const hemi = new S.THREE.HemisphereLight(0xffffff, 0x05060a, 0.95);
    S.scene.add(hemi);
    S.lights.push(hemi);

    const key = new S.THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 12, 8);
    key.castShadow = false;
    S.scene.add(key);
    S.lights.push(key);

    const fill1 = new S.THREE.PointLight(0x7fe7ff, 18, 70);
    fill1.position.set(0, 6.5, 10);
    S.scene.add(fill1);
    S.lights.push(fill1);

    const fill2 = new S.THREE.PointLight(0xff2d7a, 14, 70);
    fill2.position.set(-10, 6.5, 0);
    S.scene.add(fill2);
    S.lights.push(fill2);

    const rim = new S.THREE.PointLight(0xb56bff, 10, 70);
    rim.position.set(10, 7, -6);
    S.scene.add(rim);
    S.lights.push(rim);

    S.log("[world] lights ✅");
  }

  // ---------------- build: lobby shell ----------------
  function buildLobbyShell() {
    const G = new S.THREE.Group();
    G.name = "Lobby";
    S.root.add(G);
    S.lobby = G;

    // Main floor
    const floor = new S.THREE.Mesh(
      new S.THREE.CircleGeometry(22, 128),
      makeStandard(0x111326, 1, 0.05)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    G.add(floor);
    addCollider(floor);

    // Walls cylinder
    const wall = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(22, 22, 10, 128, 1, true),
      new S.THREE.MeshStandardMaterial({
        color: safeColor(0x0b0d14),
        roughness: 1,
        metalness: 0.05,
        side: S.THREE.DoubleSide,
      })
    );
    wall.position.y = 5;
    G.add(wall);

    // Crown/arch glow accent ring near top
    const ring = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(21.6, 0.08, 16, 140),
      makeStandard(0x2b2f52, 0.9, 0.2, 0x6d3bff, 0.9)
    );
    ring.position.y = 9.2;
    ring.rotation.x = Math.PI / 2;
    G.add(ring);

    S.log("[world] floor ✅");
    S.log("[world] walls ✅");

    return { floor, wall };
  }

  // ---------------- build: pit + rail + stairs + chairs ----------------
  function buildPitAndTable() {
    const pitG = new S.THREE.Group();
    pitG.name = "PitSystem";
    S.lobby.add(pitG);

    const { radiusOuter, radiusInner, depth } = S.pit;
    const pitCenter = v3(0, 0, 0);

    // Outer platform ring (tight join)
    const ringFloor = new S.THREE.Mesh(
      new S.THREE.RingGeometry(radiusInner + 0.06, radiusOuter, 128),
      makeStandard(0x121634, 1, 0.05)
    );
    ringFloor.rotation.x = -Math.PI / 2;
    ringFloor.position.copy(pitCenter);
    pitG.add(ringFloor);
    addCollider(ringFloor);

    // Pit inner floor (down)
    const pitFloor = new S.THREE.Mesh(
      new S.THREE.CircleGeometry(radiusInner, 128),
      makeStandard(0x0c0f22, 1, 0.06)
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.set(0, -depth, 0);
    pitG.add(pitFloor);
    addCollider(pitFloor);

    // Pit wall cylinder to visually connect
    const pitWall = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(radiusInner, radiusInner, depth, 128, 1, true),
      new S.THREE.MeshStandardMaterial({
        color: safeColor(0x0a0c16),
        roughness: 1,
        metalness: 0.05,
        side: S.THREE.DoubleSide,
      })
    );
    pitWall.position.set(0, -depth / 2, 0);
    pitG.add(pitWall);

    // Rail (guardrail) around inner edge
    const railG = new S.THREE.Group();
    railG.name = "GuardRail";
    pitG.add(railG);

    const railRadius = radiusInner + 0.22;
    const railHeight = 1.05;

    const railRing = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(railRadius, 0.06, 18, 140),
      makeStandard(0x30385f, 0.6, 0.25, 0x3b7cff, 0.35)
    );
    railRing.position.y = 0.95;
    railRing.rotation.x = Math.PI / 2;
    railG.add(railRing);

    // Posts
    const postGeo = new S.THREE.CylinderGeometry(0.045, 0.055, railHeight, 10);
    const postMat = makeStandard(0x3a4470, 0.7, 0.18);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const p = new S.THREE.Mesh(postGeo, postMat);
      p.position.set(Math.cos(a) * railRadius, railHeight / 2, Math.sin(a) * railRadius);
      railG.add(p);
    }

    // "Gate" opening (visual) at angle 0 (front)
    const gate = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(0.8, 0.9, 0.08),
      makeStandard(0x151a33, 0.9, 0.1, 0x7fe7ff, 0.2)
    );
    gate.position.set(railRadius, 0.55, 0);
    gate.rotation.y = -Math.PI / 2;
    railG.add(gate);

    // Stairs down through gate (short, doesn't collide with seats)
    const stairsG = new S.THREE.Group();
    stairsG.name = "Stairs";
    pitG.add(stairsG);

    const steps = 8;
    const stepW = 1.25;
    const stepH = depth / steps;
    const stepD = 0.55;
    const stairMat = makeStandard(0x1a1f3a, 1, 0.05);

    for (let i = 0; i < steps; i++) {
      const s = new S.THREE.Mesh(new S.THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
      s.position.set(radiusInner + 0.72 + i * 0.05, -i * stepH - stepH / 2, -0.25 - i * stepD);
      s.rotation.y = -Math.PI / 2;
      stairsG.add(s);
      addCollider(s);
    }

    // Table in pit (lowered)
    const tableG = new S.THREE.Group();
    tableG.name = "MainPokerTable";
    pitG.add(tableG);

    const tableY = -depth + 0.18; // ✅ dead down into pit
    tableG.position.set(0, tableY, 0);

    // Table base
    const base = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(1.1, 1.5, 0.8, 24),
      makeStandard(0x141a2f, 0.9, 0.1)
    );
    base.position.y = 0.4;
    tableG.add(base);

    // Table top (felt + leather rim)
    const top = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(3.1, 3.1, 0.22, 56),
      makeStandard(0x0f5b3f, 0.92, 0.05)
    );
    top.position.y = 0.9;
    tableG.add(top);

    const rim = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.12, 0.18, 14, 64),
      makeStandard(0x2b1b12, 0.55, 0.08)
    );
    rim.position.y = 0.96;
    rim.rotation.x = Math.PI / 2;
    tableG.add(rim);

    // Chairs (6)
    const chairG = new S.THREE.Group();
    chairG.name = "Chairs";
    tableG.add(chairG);

    const chairSeatGeo = new S.THREE.BoxGeometry(0.7, 0.12, 0.7);
    const chairBackGeo = new S.THREE.BoxGeometry(0.7, 0.75, 0.12);
    const chairLegGeo = new S.THREE.CylinderGeometry(0.04, 0.05, 0.5, 10);
    const chairMat = makeStandard(0x22284a, 0.9, 0.08);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4.2;
      const c = new S.THREE.Group();
      c.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      c.rotation.y = -a + Math.PI;

      const seat = new S.THREE.Mesh(chairSeatGeo, chairMat);
      seat.position.y = 0.35;

      const back = new S.THREE.Mesh(chairBackGeo, chairMat);
      back.position.set(0, 0.8, -0.29);

      c.add(seat);
      c.add(back);

      for (let k = 0; k < 4; k++) {
        const lx = k < 2 ? -0.28 : 0.28;
        const lz = (k % 2 === 0) ? -0.28 : 0.28;
        const leg = new S.THREE.Mesh(chairLegGeo, chairMat);
        leg.position.set(lx, 0.1, lz);
        c.add(leg);
      }

      chairG.add(c);
    }

    // Expose main table for poker
    S.poker.table = tableG;

    S.log("[world] pit/table/rail/stairs/chairs ✅");
  }

  // ---------------- build: jumbotrons embedded ----------------
  function buildJumbotrons() {
    const G = new S.THREE.Group();
    G.name = "Jumbotrons";
    S.lobby.add(G);

    // 4 panels embedded into wall
    const panelGeo = new S.THREE.PlaneGeometry(6.4, 3.6);
    const frameGeo = new S.THREE.BoxGeometry(6.7, 3.9, 0.18);

    const screenMat = new S.THREE.MeshStandardMaterial({
      color: safeColor(0x071023),
      roughness: 0.25,
      metalness: 0.05,
      emissive: safeColor(0x1133ff),
      emissiveIntensity: 0.65, // bright
    });

    const frameMat = makeStandard(0x141a2f, 0.9, 0.18);

    const r = 21.8;
    const y = 6.3; // high on wall
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const frame = new S.THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, y, z);
      frame.lookAt(0, y, 0);

      const screen = new S.THREE.Mesh(panelGeo, screenMat.clone());
      screen.position.set(0, 0, 0.1);
      frame.add(screen);

      // If a screen ever goes "blue", this keeps it emissive not broken
      screen.userData._isJumbo = true;

      G.add(frame);
    }

    S.log("[world] jumbotrons ✅");
  }

  // ---------------- build: teleport arch + pads ----------------
  function buildTeleportArch() {
    const archG = new S.THREE.Group();
    archG.name = "TeleportArch";
    S.lobby.add(archG);

    archG.position.set(0, 0, 14);
    archG.rotation.y = Math.PI;

    const arch = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(2.4, 0.18, 16, 80, Math.PI),
      makeStandard(0x1b2242, 0.7, 0.18, 0xb56bff, 0.8)
    );
    arch.rotation.z = Math.PI;
    arch.position.y = 2.25;
    archG.add(arch);

    const p1 = new S.THREE.PointLight(0xb56bff, 10, 18);
    p1.position.set(0, 2.4, 0.4);
    archG.add(p1);

    // Pad (portal trigger visual)
    const pad = new S.THREE.Mesh(
      new S.THREE.CircleGeometry(1.25, 48),
      new S.THREE.MeshStandardMaterial({
        color: safeColor(0x0a0c16),
        roughness: 1,
        metalness: 0.05,
        emissive: safeColor(0x7fe7ff),
        emissiveIntensity: 0.25,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.02;
    pad.name = "TeleportPad";
    archG.add(pad);
    addCollider(pad);

    archG.userData.pad = pad;
    archG.userData.radius = 1.3;

    S.log("[world] teleport arch ✅ (pad added)");
  }

  // ---------------- build: store ----------------
  async function buildStore() {
    const G = new S.THREE.Group();
    G.name = "Store";
    S.root.add(G);
    S.store = G;

    // Place store “room” to the right
    G.position.set(10, 0, 6);
    G.rotation.y = -Math.PI / 2;

    const floor = new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(10, 8),
      makeStandard(0x0f1327, 1, 0.06)
    );
    floor.rotation.x = -Math.PI / 2;
    G.add(floor);
    addCollider(floor);

    const back = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(10, 4.5, 0.3),
      makePanelMaterial()
    );
    back.position.set(0, 2.25, -4);
    G.add(back);

    const side = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(0.3, 4.5, 8),
      makePanelMaterial()
    );
    side.position.set(-5, 2.25, 0);
    G.add(side);

    const sign = makeTextTag("SCARLETT STORE", 0xff2d7a, 0.25);
    sign.position.set(0, 3.55, -3.85);
    sign.scale.setScalar(1.0);
    G.add(sign);

    const glow = new S.THREE.PointLight(0xff2d7a, 12, 20);
    glow.position.set(0, 3.2, -2.5);
    G.add(glow);

    // Display case platform
    const caseBase = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(8.8, 0.35, 2.6),
      makeStandard(0x121734, 1, 0.06, 0x7fe7ff, 0.15)
    );
    caseBase.position.set(0, 0.18, -1.3);
    G.add(caseBase);

    // Mannequins (3)
    const tex = await tryLoadTexture("./assets/textures/shirt.png");
    const shirtMat = tex
      ? new S.THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.05 })
      : makeStandard(0x2230ff, 0.9, 0.05, 0x2230ff, 0.25);

    for (let i = 0; i < 3; i++) {
      const man = makeMannequin();
      man.position.set(-2.6 + i * 2.6, 0.35, -1.15);
      man.rotation.y = Math.PI;
      G.add(man);
      S.bots.mannequins.push(man);

      // Apply shirt to torso
      const torso = man.getObjectByName("Torso");
      if (torso) {
        torso.material = shirtMat.clone();
        S.log(`[store] shirt applied ✅ (Mannequin_${i + 1})`);
      }
    }

    // Keep a collider surface in store
    S.log("[world] store ✅");
  }

  function makeMannequin() {
    const G = new S.THREE.Group();
    G.name = "Mannequin";

    const skin = makeStandard(0x1a1f3a, 0.95, 0.05);

    const torso = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.6, 0.75, 0.35), skin);
    torso.name = "Torso";
    torso.position.y = 1.25;
    G.add(torso);

    const head = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.22, 18, 18), skin);
    head.position.y = 1.75;
    G.add(head);

    const pelvis = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.5, 0.25, 0.3), skin);
    pelvis.position.y = 0.9;
    G.add(pelvis);

    const legGeo = new S.THREE.CylinderGeometry(0.08, 0.09, 0.75, 12);
    const footGeo = new S.THREE.BoxGeometry(0.22, 0.1, 0.38);

    const lLeg = new S.THREE.Mesh(legGeo, skin);
    lLeg.position.set(-0.15, 0.45, 0);
    G.add(lLeg);

    const rLeg = new S.THREE.Mesh(legGeo, skin);
    rLeg.position.set(0.15, 0.45, 0);
    G.add(rLeg);

    const lFoot = new S.THREE.Mesh(footGeo, skin);
    lFoot.position.set(-0.15, 0.06, 0.06);
    G.add(lFoot);

    const rFoot = new S.THREE.Mesh(footGeo, skin);
    rFoot.position.set(0.15, 0.06, 0.06);
    G.add(rFoot);

    const armGeo = new S.THREE.CylinderGeometry(0.06, 0.07, 0.6, 10);
    const lArm = new S.THREE.Mesh(armGeo, skin);
    lArm.position.set(-0.42, 1.25, 0);
    lArm.rotation.z = 0.35;
    G.add(lArm);

    const rArm = new S.THREE.Mesh(armGeo, skin);
    rArm.position.set(0.42, 1.25, 0);
    rArm.rotation.z = -0.35;
    G.add(rArm);

    return G;
  }

  // ---------------- build: scorpion room + elongated table ----------------
  function buildScorpionRoom() {
    const G = new S.THREE.Group();
    G.name = "ScorpionRoom";
    S.root.add(G);
    S.scorpion = G;

    // Place scorpion room to left
    G.position.set(-10, 0, 6);
    G.rotation.y = Math.PI / 2;

    // Floor and walls
    const floor = new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(12, 10),
      makeStandard(0x0c1024, 1, 0.06)
    );
    floor.rotation.x = -Math.PI / 2;
    G.add(floor);
    addCollider(floor);

    const back = new S.THREE.Mesh(new S.THREE.BoxGeometry(12, 5, 0.3), makePanelMaterial());
    back.position.set(0, 2.5, -5);
    G.add(back);

    const left = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.3, 5, 10), makePanelMaterial());
    left.position.set(-6, 2.5, 0);
    G.add(left);

    const right = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.3, 5, 10), makePanelMaterial());
    right.position.set(6, 2.5, 0);
    G.add(right);

    // Neon scorpion glow
    const arch = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.2, 0.18, 16, 90, Math.PI),
      makeStandard(0x1b2242, 0.65, 0.2, 0xff2d7a, 1.0)
    );
    arch.rotation.z = Math.PI;
    arch.position.set(0, 3.2, -4.2);
    G.add(arch);

    const scLight = new S.THREE.PointLight(0xff2d7a, 18, 22);
    scLight.position.set(0, 3.2, -3.2);
    G.add(scLight);

    // Table: elongated oval (6 seats)
    const tableG = new S.THREE.Group();
    tableG.name = "ScorpionTable";
    tableG.position.set(0, 0, 0);
    G.add(tableG);

    const top = new S.THREE.Mesh(
      new S.THREE.CapsuleGeometry(3.0, 2.1, 8, 20), // oval-ish
      makeStandard(0x0f5b3f, 0.92, 0.05)
    );
    top.scale.set(1.0, 0.15, 1.0);
    top.position.y = 0.95;
    tableG.add(top);

    const rim = new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.05, 0.18, 14, 64),
      makeStandard(0x2b1b12, 0.55, 0.08)
    );
    rim.position.y = 0.98;
    rim.rotation.x = Math.PI / 2;
    tableG.add(rim);

    const base = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(1.2, 1.6, 0.85, 20),
      makeStandard(0x141a2f, 0.9, 0.1)
    );
    base.position.y = 0.42;
    tableG.add(base);

    // Seat positions around elongated table
    const seats = [];
    const seatR = 3.9;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      seats.push([Math.cos(a) * seatR, 0, Math.sin(a) * seatR]);
    }
    S.poker.seatPos = seats;

    // Seat markers (invisible)
    for (let i = 0; i < 6; i++) {
      const m = new S.THREE.Object3D();
      m.position.set(seats[i][0], 0, seats[i][2]);
      m.lookAt(0, 0, 0);
      tableG.add(m);
    }

    // Auto-seat zone (stand on it -> seated)
    const sitPad = new S.THREE.Mesh(
      new S.THREE.CircleGeometry(1.1, 36),
      new S.THREE.MeshStandardMaterial({
        color: safeColor(0x0a0c16),
        roughness: 1,
        metalness: 0.05,
        emissive: safeColor(0x7fe7ff),
        emissiveIntensity: 0.18,
      })
    );
    sitPad.rotation.x = -Math.PI / 2;
    sitPad.position.set(0, 0.02, 3.8);
    sitPad.name = "ScorpionSitPad";
    tableG.add(sitPad);
    addCollider(sitPad);
    tableG.userData.sitPad = { obj: sitPad, r: 1.1 };

    // 4 bots seated (seats 1..4)
    for (let i = 1; i <= 4; i++) {
      const bot = makeFullBodyBot(i);
      bot.position.set(seats[i][0], 0, seats[i][2]);
      bot.lookAt(0, 0.9, 0);
      bot.userData.seat = i;
      bot.userData.seated = true;
      bot.userData.walk = { speed: 0 };
      tableG.add(bot);
      S.bots.scorpion.push(bot);
    }

    S.log("[world] scorpion ✅");
    S.log("[world] scorpion bots ✅ (4 seated)");

    // Attach poker visuals to scorpion table (main play area)
    S.poker.table = tableG;
  }

  // ---------------- bots: full body with limbs + animation tags ----------------
  function makeFullBodyBot(seed = 1) {
    const G = new S.THREE.Group();
    G.name = `Bot_${seed}`;

    const body = makeStandard(0x2a2f52, 0.9, 0.08);
    const trim = makeStandard(0x151a33, 0.9, 0.08, 0x7fe7ff, 0.12);

    const torso = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.52, 0.75, 0.32), body);
    torso.name = "Torso";
    torso.position.y = 1.25;
    G.add(torso);

    const shoulder = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.66, 0.18, 0.34), trim);
    shoulder.position.y = 1.62;
    G.add(shoulder);

    const head = new S.THREE.Mesh(new S.THREE.SphereGeometry(0.22, 18, 18), trim);
    head.position.y = 1.85;
    G.add(head);

    const pelvis = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.52, 0.22, 0.3), body);
    pelvis.position.y = 0.92;
    G.add(pelvis);

    // Arms (tagged for anim)
    function arm(side) {
      const a = new S.THREE.Group();
      a.position.set(0.38 * side, 1.55, 0);

      const upper = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.06, 0.07, 0.35, 10), body);
      upper.position.y = -0.18;
      upper.rotation.z = 0.25 * side;
      upper.userData._arm = side;
      a.add(upper);

      const fore = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.055, 0.06, 0.32, 10), body);
      fore.position.y = -0.52;
      fore.rotation.z = 0.1 * side;
      fore.userData._fore = side;
      a.add(fore);

      const hand = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.12, 0.08, 0.14), trim);
      hand.position.y = -0.72;
      a.add(hand);
      return a;
    }
    G.add(arm(-1));
    G.add(arm(1));

    // Legs (tagged for anim)
    function leg(side) {
      const l = new S.THREE.Group();
      l.position.set(0.16 * side, 0.85, 0);

      const thigh = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.08, 0.09, 0.42, 10), body);
      thigh.position.y = -0.25;
      thigh.userData._leg = side;
      l.add(thigh);

      const calf = new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.07, 0.08, 0.42, 10), body);
      calf.position.y = -0.68;
      calf.userData._calf = side;
      l.add(calf);

      const foot = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.22, 0.08, 0.34), trim);
      foot.position.set(0, -0.9, 0.07);
      l.add(foot);

      return l;
    }
    G.add(leg(-1));
    G.add(leg(1));

    // name tag
    const tag = makeTextTag(`BOT ${seed}`, 0x7fe7ff, 0.22);
    tag.position.set(0, 2.35, 0);
    tag.scale.setScalar(0.42);
    G.add(tag);

    // walk params
    G.userData.walk = { speed: 0.25 + (seed % 4) * 0.05 };
    G.userData.seated = false;

    return G;
  }

  function buildLobbyBots() {
    const botsG = new S.THREE.Group();
    botsG.name = "LobbyBots";
    S.lobby.add(botsG);

    for (let i = 0; i < 6; i++) {
      const bot = makeFullBodyBot(i + 1);
      const a = (i / 6) * Math.PI * 2;
      bot.position.set(Math.cos(a) * 13.5, 0, Math.sin(a) * 13.5);
      bot.lookAt(0, 1.3, 0);
      bot.userData.pathA = a;
      bot.userData.seated = false;
      botsG.add(bot);
      S.bots.lobby.push(bot);
    }

    S.log("[world] lobby bots ✅");
  }

  // ---------------- poker visuals + sim ----------------
  function initPoker() {
    const P = S.poker;
    P.seats = 6;
    P.activeSeat = 0;
    P.stage = "idle";
    P.stageT = 0;
    P.pot = 0;
    P.bet = 0;
    P.winner = "";
    P.showdown = false;

    // Cards root
    P.cardsRoot = new S.THREE.Group();
    P.cardsRoot.name = "CardsRoot";
    P.table.add(P.cardsRoot);

    // Build community placeholders
    P.community = [];
    for (let i = 0; i < 5; i++) {
      const c = makeCardMesh();
      c.position.set(-1.6 + i * 0.8, 1.07, 0);
      c.rotation.x = -Math.PI / 2;
      c.userData.isCommunity = true;
      c.visible = false;
      P.cardsRoot.add(c);
      P.community.push(c);
    }

    // Hole cards
    P.hole = [];
    for (let s = 0; s < P.seats; s++) {
      const seatArr = [];
      for (let k = 0; k < 2; k++) {
        const c = makeCardMesh();
        c.userData.isCommunity = false;
        c.userData.seat = s;
        c.visible = false;
        P.cardsRoot.add(c);
        seatArr.push(c);
      }
      P.hole.push(seatArr);
    }

    layoutHoleCards();

    S.log("[poker] init ✅ seats=6");
    newHand();
  }

  function makeCardMesh() {
    // low-poly card
    const geo = new S.THREE.BoxGeometry(0.55, 0.02, 0.78);
    const mat = new S.THREE.MeshStandardMaterial({
      color: safeColor(0xe8ecff),
      roughness: 0.8,
      metalness: 0.05,
      emissive: safeColor(0x000000),
      emissiveIntensity: 0,
    });
    const edge = new S.THREE.MeshStandardMaterial({
      color: safeColor(0x0b0d14),
      roughness: 1,
      metalness: 0.05,
    });
    const mesh = new S.THREE.Mesh(geo, [edge, edge, edge, edge, mat, mat]);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.faceUp = true;
    return mesh;
  }

  function layoutHoleCards() {
    const P = S.poker;
    // Place hole cards near each seat, facing table center
    for (let s = 0; s < P.seats; s++) {
      const seat = P.seatPos[s] || [0, 0, 0];
      const base = v3(seat[0], 1.05, seat[2]);
      const dir = base.clone().normalize().multiplyScalar(-0.55);

      const c0 = P.hole[s][0];
      const c1 = P.hole[s][1];

      c0.position.copy(base.clone().add(dir).add(v3(-0.18, 0, 0.0)));
      c1.position.copy(base.clone().add(dir).add(v3(0.18, 0, 0.0)));

      // Face toward center
      c0.lookAt(0, 1.05, 0);
      c1.lookAt(0, 1.05, 0);

      // Lay flat
      c0.rotation.x = -Math.PI / 2;
      c1.rotation.x = -Math.PI / 2;
    }
  }

  function newHand() {
    const P = S.poker;
    P.stage = "preflop";
    P.stageT = 0;
    P.showdown = false;
    P.pot = 0;
    P.bet = 0;
    P.winner = "";

    // Deal hole cards
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) {
        const c = P.hole[s][k];
        c.visible = true;
        c.material[4].color.setHex(0xe8ecff);
        c.material[5].color.setHex(0xe8ecff);
        c.material[4].emissive.setHex(0x000000);
        c.material[5].emissive.setHex(0x000000);
        c.userData.used = false;
        c.scale.set(1, 1, 1);
      }
    }

    // Reset community
    for (let i = 0; i < 5; i++) {
      const c = P.community[i];
      c.visible = false;
      c.userData.revealed = false;
      c.position.y = 1.07;
      c.scale.set(1, 1, 1);
    }

    layoutHoleCards();
    S.log("[poker] new hand ✅");
    S.log("[poker] hole dealt ✅");
  }

  function stepPoker(dt) {
    const P = S.poker;
    P.stageT += dt;

    // Simple staged dealing to match your logs
    if (P.stage === "preflop" && P.stageT > 1.0) {
      // flop
      for (let i = 0; i < 3; i++) {
        P.community[i].visible = true;
        P.community[i].userData.revealed = true;
      }
      P.stage = "flop";
      P.stageT = 0;
      S.log("[poker] community +3 ✅");
    }

    if (P.stage === "flop" && P.stageT > 0.9) {
      P.community[3].visible = true;
      P.community[3].userData.revealed = true;
      P.stage = "turn";
      P.stageT = 0;
      S.log("[poker] community +1 ✅");
    }

    if (P.stage === "turn" && P.stageT > 0.9) {
      P.community[4].visible = true;
      P.community[4].userData.revealed = true;
      P.stage = "river";
      P.stageT = 0;
      S.log("[poker] community +1 ✅");
    }

    if (P.stage === "river" && P.stageT > 0.7) {
      P.stage = "complete";
      P.stageT = 0;
      S.log("[poker] hand complete ✅ (idle)");
    }

    if (P.stage === "complete" && P.stageT > 0.9) {
      doShowdown();
      P.stage = "idle";
      P.stageT = 0;
      S.log("[poker] showdown ✅");
    }
  }

  function doShowdown() {
    const P = S.poker;
    P.showdown = true;

    // Fake a “winning hand” selection: pick one seat and mark both hole cards used
    const winSeat = 1 + Math.floor(Math.random() * 4); // one of the 4 bots
    P.winner = `BOT ${winSeat}`;
    const used0 = P.hole[winSeat][0];
    const used1 = P.hole[winSeat][1];

    used0.userData.used = true;
    used1.userData.used = true;

    // Move used cards forward to be visible
    used0.position.y += 0.14;
    used1.position.y += 0.14;
    used0.position.z += 0.25;
    used1.position.z += 0.25;

    // Dim all other hole cards
    for (let s = 0; s < P.seats; s++) {
      for (let k = 0; k < 2; k++) {
        const c = P.hole[s][k];
        if (s === winSeat) {
          c.material[4].emissive.setHex(0x2dfcff);
          c.material[5].emissive.setHex(0x2dfcff);
          c.material[4].emissiveIntensity = 0.7;
          c.material[5].emissiveIntensity = 0.7;
          c.scale.set(1.05, 1.0, 1.05);
        } else {
          c.material[4].color.setHex(0x6a6f87);
          c.material[5].color.setHex(0x6a6f87);
          c.material[4].emissive.setHex(0x000000);
          c.material[5].emissive.setHex(0x000000);
          c.scale.set(0.98, 1.0, 0.98);
        }
      }
    }

    // pot changes
    S.pot.value = Math.floor(800 + Math.random() * 2400);
  }

  // Community hover only when looked at
  function updateCardHover(dt) {
    const P = S.poker;
    if (!P.hoverOnlyCommunity) return;
    if (!S.camera) return;

    const camPos = S.camera.getWorldPosition(v3());
    const camDir = v3(0, 0, -1).applyQuaternion(S.camera.getWorldQuaternion(new S.THREE.Quaternion())).normalize();

    // Only community cards hover and glow when in focus
    for (const c of P.community) {
      if (!c.visible) continue;

      const wpos = c.getWorldPosition(v3());
      const to = wpos.clone().sub(camPos);
      const dist = to.length();
      const dot = to.normalize().dot(camDir);

      const focused = dist < 6.5 && dot > 0.985;
      const targetY = focused ? 1.22 : 1.07;
      c.position.y = lerp(c.position.y, targetY, clamp(dt * 6, 0, 1));

      const e = focused ? 0.6 : 0.0;
      c.material[4].emissive.setHex(0x7fe7ff);
      c.material[5].emissive.setHex(0x7fe7ff);
      c.material[4].emissiveIntensity = e;
      c.material[5].emissiveIntensity = e;
    }
  }

  // ---------------- pot HUD + chips ----------------
  function buildPotHUDandChips() {
    const G = new S.THREE.Group();
    G.name = "PotHUD";
    S.poker.table.add(G);
    S.pot.root = G;

    G.position.set(0, 1.9, -0.65); // visible from outside
    const tag = makeTextTag("POT: 0 | TURN: 1 | BET: 0 | ACTION: CHECK", 0x2dfcff, 0.22);
    tag.name = "PotText";
    tag.scale.setScalar(0.95);
    G.add(tag);
    S.pot.text = tag;

    // Chips root
    const chips = new S.THREE.Group();
    chips.name = "ChipsRoot";
    S.poker.table.add(chips);
    S.pot.chipsRoot = chips;

    // chip pool
    const chipGeo = new S.THREE.CylinderGeometry(0.09, 0.09, 0.03, 18);
    const chipMat = new S.THREE.MeshStandardMaterial({
      color: safeColor(0xff2d7a),
      roughness: 0.55,
      metalness: 0.12,
      emissive: safeColor(0xff2d7a),
      emissiveIntensity: 0.15,
    });

    for (let i = 0; i < 140; i++) {
      const c = new S.THREE.Mesh(chipGeo, chipMat.clone());
      c.visible = false;
      c.rotation.set(0, 0, 0); // ✅ flat (no sideways)
      chips.add(c);
      S.pot.chipPool.push(c);
    }

    // seat chip targets on scorpion table
    const P = S.poker;
    S.pot.seatChipTargets = [];
    for (let s = 0; s < P.seats; s++) {
      const p = P.seatPos[s] || [0, 0, 0];
      const t = v3(p[0] * 0.45, 1.05, p[2] * 0.45);
      S.pot.seatChipTargets.push(t);
    }

    S.log("[world] pot HUD + chips ✅");
  }

  function setPotHUD({ pot, turn, bet, action, winner }) {
    const L = S.pot.last;
    if (pot === L.pot && turn === L.turn && bet === L.bet && action === L.action && winner === L.winner) return;
    L.pot = pot; L.turn = turn; L.bet = bet; L.action = action; L.winner = winner;

    const win = winner ? ` | WINNER: ${winner}` : "";
    S.pot.text?.userData?.setText?.(`POT: ${pot} | TURN: ${turn} | BET: ${bet} | ACTION: ${action}${win}`);
  }

  function throwChip(from, to, colorHex = 0xff2d7a) {
    const chip = S.pot.chipPool.find((c) => !c.visible);
    if (!chip) return;

    chip.visible = true;
    chip.position.copy(from);
    chip.rotation.set(0, 0, 0); // ✅ flat
    chip.material.color.setHex(colorHex);
    chip.material.emissive.setHex(colorHex);

    S.pot.fly.push({
      chip,
      t: 0,
      dur: 0.38 + Math.random() * 0.18,
      from: from.clone(),
      to: to.clone(),
      arc: 0.35 + Math.random() * 0.25,
    });
  }

  function updateChipFlights(dt) {
    const fly = S.pot.fly;
    if (!fly.length) return;

    for (let i = fly.length - 1; i >= 0; i--) {
      const f = fly[i];
      f.t += dt;
      const u = clamp(f.t / f.dur, 0, 1);
      const yArc = Math.sin(u * Math.PI) * f.arc;

      f.chip.position.set(
        lerp(f.from.x, f.to.x, u),
        lerp(f.from.y, f.to.y, u) + yArc,
        lerp(f.from.z, f.to.z, u)
      );

      // little spin around Y only (still flat)
      f.chip.rotation.y += dt * 6.0;

      if (u >= 1) {
        // land flat on table
        f.chip.position.copy(f.to);
        f.chip.rotation.set(0, f.chip.rotation.y, 0);
        fly.splice(i, 1);
      }
    }
  }

  // ---------------- update: room portal + seating ----------------
  function updateRoomTransitions(dt) {
    // Simple proximity triggers: teleport pad in lobby goes to scorpion (for now)
    // and player can return to lobby by stepping near scorpion back wall.

    if (!S.player) return;

    const p = S.player.position;
    // Lobby arch pad at (0,0,14) radius ~1.3 (in lobby space)
    if (S.room === "lobby") {
      const dx = p.x - 0;
      const dz = p.z - 14;
      const d = Math.hypot(dx, dz);
      if (d < 1.15) {
        // enter scorpion
        gotoRoom("scorpion");
      }
    }

    if (S.room === "scorpion") {
      // auto-seat if stand on sitPad (near tableG local z=3.8 in scorpion space)
      const target = S.roomTargets.scorpion.pos;
      // compute player pos relative to scorpion table world: easiest just check scorpion world coords near (-10,6)
      const sx = -10;
      const sz = 6;
      // Rough check for sit zone (world)
      const sitX = sx + 0;
      const sitZ = sz + 3.8;
      const d2 = Math.hypot(p.x - sitX, p.z - sitZ);
      if (d2 < 1.05 && !window.__SEATED_MODE) {
        // sit down: lock movement
        window.__SEATED_MODE = true;
        // move player to “seat 0” (front)
        const seat0 = S.poker.seatPos[0] || [0, 0, 3.9];
        S.player.position.set(sx + seat0[0], 0, sz + seat0[2]);
        S.player.rotation.y = S.roomTargets.scorpion.yaw + Math.PI;
      }

      // return to lobby if move back near scorpion entrance area
      const backD = Math.hypot(p.x - (sx + 0), p.z - (sz - 4.0));
      if (backD < 1.25) {
        window.__SEATED_MODE = false;
        gotoRoom("lobby");
      }
    }
  }

  function gotoRoom(room) {
    if (!S.roomTargets[room]) return;
    S.room = room;

    const t = S.roomTargets[room];
    S.player.position.set(t.pos[0], t.pos[1], t.pos[2]);
    S.player.rotation.y = t.yaw;

    // Standing in lobby always
    if (room === "lobby") window.__SEATED_MODE = false;

    S.log(`[rm] room=${room}`);
  }

  // ---------------- update: bots ----------------
  function updateLobbyBots(dt) {
    const bots = S.bots.lobby;
    if (!bots.length) return;

    const R = 13.5;
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      const sp = b.userData.walk?.speed || 0.25;
      b.userData.pathA += dt * sp * 0.45;

      const a = b.userData.pathA;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      b.position.x = x;
      b.position.z = z;

      // face direction of travel
      const nx = Math.cos(a + 0.02) * R;
      const nz = Math.sin(a + 0.02) * R;
      b.lookAt(nx, 1.25, nz);

      // walk cycle
      const phase = S.t * (2.8 + sp * 4.0);
      b.traverse((o) => {
        if (o.userData?._leg) o.rotation.x = Math.sin(phase) * 0.55 * o.userData._leg;
        if (o.userData?._calf) o.rotation.x = Math.sin(phase + 0.8) * 0.35 * o.userData._calf;
        if (o.userData?._arm) o.rotation.x = Math.sin(phase + Math.PI) * 0.45 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.sin(phase + Math.PI + 0.8) * 0.25 * o.userData._fore;
      });
    }
  }

  function updateScorpionBots(dt) {
    // seated bots: subtle idle arm motion
    const bots = S.bots.scorpion;
    if (!bots.length) return;

    for (const b of bots) {
      const phase = S.t * 1.25 + (b.userData.seat || 0);
      b.traverse((o) => {
        if (o.userData?._arm) o.rotation.x = Math.sin(phase) * 0.12 * o.userData._arm;
        if (o.userData?._fore) o.rotation.x = Math.sin(phase + 0.8) * 0.08 * o.userData._fore;
      });
    }
  }

  // ---------------- update: pot HUD + chips behavior ----------------
  function updatePot(dt) {
    // Face camera + slight tilt down (your requirement)
    if (S.pot.root && S.camera) {
      const cam = S.camera.getWorldPosition(v3());
      S.pot.root.lookAt(cam.x, cam.y, cam.z);
      S.pot.root.rotation.x -= 0.18;
    }

    // Drive HUD from poker state
    const turn = (S.poker.activeSeat % S.poker.seats) + 1;
    const bet = S.poker.bet | 0;
    const action = S.poker.stage === "idle" ? "SHOWDOWN" : "BETTING";
    const winner = S.poker.winner || "";
    setPotHUD({ pot: S.pot.value | 0, turn, bet, action, winner });

    // Chip throws (everyone, flat landing)
    // On each stage tick, toss a few chips from random seats toward center.
    if (S.poker.stage !== "idle") {
      if (Math.random() < 0.08) {
        const s = 1 + Math.floor(Math.random() * 4);
        const from = S.pot.seatChipTargets[s].clone();
        from.y = 1.05;
        // center pot location
        const to = v3(0, 1.05, -0.15);
        throwChip(from, to, 0xff2d7a);
        S.pot.value += 25 + (Math.random() * 75) | 0;
        S.poker.bet = 25 + (Math.random() * 200) | 0;
      }
    }

    updateChipFlights(dt);
  }

  // ---------------- init pipeline ----------------
  async function init({ THREE, scene, renderer, camera, player, controllers, log }) {
    S.THREE = THREE;
    S.scene = scene;
    S.renderer = renderer;
    S.camera = camera;
    S.player = player;
    S.controllers = controllers;
    S.log = log || console.log;

    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    scene.add(S.root);

    S.colliders = [];

    S.log("[world] init v8 …");

    buildLights();
    buildLobbyShell();
    buildPitAndTable();
    buildJumbotrons();
    buildTeleportArch();
    buildLobbyBots();

    await buildStore();
    buildScorpionRoom();

    initPoker();
    buildPotHUDandChips();

    // Start in lobby, standing
    window.__SEATED_MODE = false;
    gotoRoom("lobby");

    S.log("[world] build complete ✅ (MASTER v8)");
  }

  // ---------------- update loop ----------------
  function update(dt) {
    S.t += dt;

    // Room transitions + seat logic
    updateRoomTransitions(dt);

    // Poker progression only in scorpion room (or when seated)
    if (S.room === "scorpion" || window.__SEATED_MODE) {
      stepPoker(dt);
      updateCardHover(dt);
    }

    updatePot(dt);
    updateLobbyBots(dt);
    updateScorpionBots(dt);

    // keep hole cards layout stable if table moved
    // (cheap, but stable)
    if ((S.t % 2.0) < dt) layoutHoleCards();
  }

  // Expose colliders for teleport
  function colliders() {
    return S.colliders;
  }

  return { init, update, colliders };
})();
