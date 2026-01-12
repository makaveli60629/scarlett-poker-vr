// /js/world.js — Scarlett MASTER WORLD v2 (Bright + Ring + Walls + Clean Pit + Screens + Cards)
// ✅ NO imports (GitHub Pages safe). Uses injected THREE.
// ✅ Much brighter lighting + neon accents
// ✅ Circular lobby ring + outer wall with 4 door gaps
// ✅ Deep obvious pit/divot w/ inner wall (tight seam)
// ✅ Jumbotrons moved onto top wall band
// ✅ Simple card dealing animation "today"

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
    t: 0,
    colliders: [],
    cards: [],
    cardT: 0
  };

  const log = (m) => S.log?.(m);

  function add(obj, collider = false) {
    S.root.add(obj);
    if (collider) S.colliders.push(obj);
    return obj;
  }

  function mat(color, rough = 1, metal = 0, emissive = 0x000000, emiI = 0) {
    const m = new S.THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive: new S.THREE.Color(emissive),
      emissiveIntensity: emiI
    });
    return m;
  }

  function buildLights() {
    const { THREE } = S;

    // Stronger base light
    add(new THREE.HemisphereLight(0xffffff, 0x0a0b12, 1.45));

    // Multiple overhead lights
    const mkSpot = (x, z, i) => {
      const l = new THREE.PointLight(0xffffff, i, 90);
      l.position.set(x, 9.5, z);
      add(l);
      return l;
    };

    mkSpot(0, 0, 40);
    mkSpot(14, 0, 26);
    mkSpot(-14, 0, 26);
    mkSpot(0, 14, 26);
    mkSpot(0, -14, 26);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(10, 16, 10);
    add(key);

    const fill = new THREE.DirectionalLight(0xaad5ff, 0.55);
    fill.position.set(-12, 10, -14);
    add(fill);

    log("[world] lights ✅ (bright)");
  }

  function buildFloorAndRing() {
    const { THREE } = S;

    // Base floor (big)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(70, 128),
      mat(0x141626, 1, 0)
    );
    floor.rotation.x = -Math.PI / 2;
    add(floor, true);

    // Ring walkway (make it visible)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(10, 18, 128),
      mat(0x0f1224, 0.85, 0.08)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    add(ring, true);

    // Neon ring trim (glow)
    const neon = new THREE.Mesh(
      new THREE.RingGeometry(17.9, 18.25, 128),
      mat(0x121428, 0.4, 0.2, 0x2dfcff, 0.9)
    );
    neon.rotation.x = -Math.PI / 2;
    neon.position.y = 0.06;
    add(neon);

    log("[world] floor + ring ✅");
  }

  function buildOuterWallWithDoors() {
    const { THREE } = S;

    // Cylindrical wall made from 4 segments with gaps at N/S/E/W
    const R = 20.0;
    const H = 8.5;
    const thick = 0.6;

    // helper: segment wall arc
    const makeArc = (a0, a1) => {
      const segs = 40;
      const shape = new THREE.Shape();
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const a = a0 + (a1 - a0) * t;
        pts.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R));
      }
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);

      // extrude up by height
      const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      geo.translate(0, 0, 0);

      const wall = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1, metalness: 0.05, transparent: true, opacity: 0.32 })
      );
      wall.position.y = 0;
      add(wall);

      // top cap band (where jumbos sit)
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(R, 0.18, 10, 160, Math.abs(a1 - a0)),
        mat(0x141a33, 0.5, 0.2, 0xff2d7a, 0.45)
      );
      band.rotation.x = Math.PI / 2;
      band.rotation.z = (a0 + a1) / 2;
      band.position.y = H - 0.3;
      add(band);

      return wall;
    };

    // Door gaps centered at N/S/E/W: leave ~30° gaps each
    const gap = (Math.PI / 6); // 30°
    // arcs between gaps
    makeArc(gap, Math.PI / 2 - gap);
    makeArc(Math.PI / 2 + gap, Math.PI - gap);
    makeArc(Math.PI + gap, 3 * Math.PI / 2 - gap);
    makeArc(3 * Math.PI / 2 + gap, 2 * Math.PI - gap);

    log("[world] outer wall + door gaps ✅");
  }

  function buildPitDivotClean() {
    const { THREE } = S;

    // Make the divot OBVIOUS and tight:
    // - rim ring
    // - inner vertical wall cylinder
    // - pit floor
    // - clean seam ring overlay

    const rimY = 0.06;
    const pitY = -1.05;          // deeper so you SEE it
    const innerR = 6.35;
    const rimOuter = 9.0;

    // Rim (walkable ring at top)
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(innerR, rimOuter, 160),
      mat(0x0a0c18, 0.85, 0.15, 0x2dfcff, 0.25)
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = rimY;
    add(rim, true);

    // Inner wall (vertical)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(innerR, innerR, (rimY - pitY), 96, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14, roughness: 1, metalness: 0.1,
        side: THREE.DoubleSide, transparent: true, opacity: 0.55
      })
    );
    wall.position.y = (rimY + pitY) / 2;
    add(wall);

    // Pit floor
    const pit = new THREE.Mesh(
      new THREE.CircleGeometry(innerR - 0.05, 160),
      mat(0x070812, 1, 0, 0x1b2cff, 0.15)
    );
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = pitY;
    add(pit, true);

    // Seam ring (makes it look “tight”)
    const seam = new THREE.Mesh(
      new THREE.RingGeometry(innerR - 0.08, innerR + 0.08, 160),
      mat(0x121428, 0.4, 0.25, 0x2dfcff, 0.95)
    );
    seam.rotation.x = -Math.PI / 2;
    seam.position.y = rimY + 0.01;
    add(seam);

    // Table (bigger + clearer)
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.2, 0.28, 48),
      mat(0x0f6a42, 0.9, 0.05, 0x0f6a42, 0.05)
    );
    tableTop.position.set(0, pitY + 0.82, 0);
    add(tableTop, true);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.95, 1.05, 24),
      mat(0x10131c, 0.8, 0.2)
    );
    tableBase.position.set(0, pitY + 0.32, 0);
    add(tableBase);

    // Rail (prevents falling) — tightened to rim
    const railR = rimOuter - 0.25;
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.085, 12, 220),
      mat(0x2a2f52, 0.5, 0.35, 0xff2d7a, 0.35)
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = rimY + 1.15;
    add(rail);

    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 1.05, 12),
        mat(0x1f2440, 0.7, 0.2)
      );
      post.position.set(Math.cos(a) * railR, rimY + 0.62, Math.sin(a) * railR);
      add(post);
    }

    log("[world] pit/divot ✅ (clean + tight)");
  }

  function buildRoomsAndHalls() {
    const { THREE } = S;

    const roomDist = 32;
    const roomSize = { w: 20, h: 8.5, d: 20 };
    const hall = { w: 7, h: 4.5, len: roomDist - 19 };

    const roomMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14, roughness: 1, metalness: 0.05,
      transparent: true, opacity: 0.28
    });

    const makeRoom = (name, x, z) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, 0, z);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize.w, 0.35, roomSize.d),
        mat(0x14172a, 1, 0.05, 0x1b2cff, 0.08)
      );
      floor.position.y = 0.175;
      g.add(floor);

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize.w, roomSize.h, roomSize.d),
        roomMat
      );
      box.position.y = roomSize.h / 2;
      g.add(box);

      // Room light
      const l = new THREE.PointLight(0xffffff, 18, 55);
      l.position.set(0, 6.5, 0);
      g.add(l);

      add(g, true);
      return g;
    };

    const makeHall = (x, z, rotY) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(hall.w, hall.h, hall.len),
        new THREE.MeshStandardMaterial({
          color: 0x0a0c18, roughness: 1, metalness: 0.05,
          transparent: true, opacity: 0.30
        })
      );
      tube.position.y = hall.h / 2;
      tube.position.z = -hall.len / 2;
      g.add(tube);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(hall.w, 0.28, hall.len),
        mat(0x111326, 1, 0.08, 0x2dfcff, 0.12)
      );
      floor.position.y = 0.14;
      floor.position.z = -hall.len / 2;
      g.add(floor);

      // Hall light strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(hall.w - 0.6, 0.08, hall.len - 0.8),
        mat(0x111326, 0.4, 0.2, 0x2dfcff, 0.85)
      );
      strip.position.y = 0.24;
      strip.position.z = -hall.len / 2;
      g.add(strip);

      add(g, true);
      return g;
    };

    makeRoom("Room_North", 0, -roomDist);
    makeRoom("Room_South", 0, roomDist);
    makeRoom("Room_East", roomDist, 0);
    makeRoom("Room_West", -roomDist, 0);

    makeHall(0, -19.0, 0);
    makeHall(0, 19.0, Math.PI);
    makeHall(19.0, 0, -Math.PI / 2);
    makeHall(-19.0, 0, Math.PI / 2);

    log("[world] rooms + halls ✅ (boxed + lit)");
  }

  function buildJumbotronsOnWalls() {
    const { THREE } = S;

    // Place higher, on wall band (top)
    const y = 7.35;
    const R = 19.6;

    const make = (angle, w = 10.5, h = 5.8) => {
      const x = Math.cos(angle) * R;
      const z = Math.sin(angle) * R;
      const rotY = -angle + Math.PI / 2;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.45),
        mat(0x10142a, 0.6, 0.2, 0xff2d7a, 0.18)
      );
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      add(frame);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 1.0, h - 1.0),
        new THREE.MeshStandardMaterial({
          color: 0x0b1026,
          emissive: new THREE.Color(0x1b2cff),
          emissiveIntensity: 1.4,
          roughness: 0.8,
          metalness: 0.1
        })
      );
      screen.position.set(x, y, z + 0.24);
      screen.rotation.y = rotY;
      add(screen);
    };

    // 4 cardinal screens
    make(0);                // East-ish wall
    make(Math.PI / 2);      // South
    make(Math.PI);          // West
    make(3 * Math.PI / 2);  // North

    log("[world] jumbotrons ✅ (on wall top band)");
  }

  function buildSimpleCardDealing() {
    const { THREE } = S;

    // 12 cards around the table that animate (simple proof-of-life)
    const cardGeo = new THREE.PlaneGeometry(0.55, 0.78);
    const face = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.12,
      roughness: 0.6,
      metalness: 0.05
    });
    const back = new THREE.MeshStandardMaterial({
      color: 0x1b2cff,
      emissive: new THREE.Color(0x1b2cff),
      emissiveIntensity: 0.55,
      roughness: 0.55,
      metalness: 0.15
    });

    // make cards double-sided using two planes
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();

      const front = new THREE.Mesh(cardGeo, face);
      front.position.z = 0.001;
      g.add(front);

      const b = new THREE.Mesh(cardGeo, back);
      b.rotation.y = Math.PI;
      b.position.z = -0.001;
      g.add(b);

      g.rotation.x = -Math.PI / 2;
      add(g);

      S.cards.push(g);
    }

    log("[world] cards ✅ (dealing demo)");
  }

  async function init({ THREE, scene, renderer, camera, player, controllers, log: logFn }) {
    S.THREE = THREE;
    S.scene = scene;
    S.renderer = renderer;
    S.camera = camera;
    S.player = player;
    S.controllers = controllers;
    S.log = logFn || console.log;

    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    scene.add(S.root);

    log("[world] init … v2");

    buildLights();
    buildFloorAndRing();
    buildOuterWallWithDoors();
    buildPitDivotClean();
    buildRoomsAndHalls();
    buildJumbotronsOnWalls();
    buildSimpleCardDealing();

    // Spawn in the ring lobby, looking at center
    if (player) {
      player.position.set(0, 0, 12.5);
      player.rotation.set(0, Math.PI, 0);
    }

    log("[world] build complete ✅ (MASTER v2)");
  }

  function update(dt) {
    S.t += dt;

    // Animate the cards "dealing" in a loop around table
    // Position them just above the table top
    const pitY = -1.05;
    const tableY = pitY + 0.98;
    const r0 = 2.1;
    const r1 = 3.1;

    S.cardT += dt;
    const phase = (S.cardT * 0.55) % 1;

    for (let i = 0; i < S.cards.length; i++) {
      const a = (i / S.cards.length) * Math.PI * 2;
      const g = S.cards[i];

      // ease in/out “deal” motion
      const local = (phase + i * 0.07) % 1;
      const k = local < 0.5 ? (local / 0.5) : (1 - (local - 0.5) / 0.5);

      const r = r0 + (r1 - r0) * k;
      g.position.set(Math.cos(a) * r, tableY + 0.02 + 0.06 * k, Math.sin(a) * r);
      g.rotation.y = -a + Math.PI / 2;
    }
  }

  return { init, update, get colliders() { return S.colliders; } };
})();
