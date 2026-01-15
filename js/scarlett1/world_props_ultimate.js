// /js/scarlett1/world_props_ultimate.js
// Ultimate Props Pack (Quest-safe)
// Adds: store mannequins + glass cases + VIP ropes + trophy wall + Scorp statue + rune floor + arcade blocks + lobby props

export function buildUltimateProps({ THREE, scene, worldData }) {
  const group = new THREE.Group();
  group.name = "UltimateProps";
  scene.add(group);

  const rooms = _inferRoomCenters(worldData);

  // Shared mats
  const mats = {
    dark: new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.95, metalness: 0.05 }),
    mid:  new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.7, metalness: 0.12 }),
    metal:new THREE.MeshStandardMaterial({ color: 0x2a3448, roughness: 0.45, metalness: 0.4 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x06202a, emissive: 0x00e5ff, emissiveIntensity: 0.9, roughness: 0.6, metalness: 0.2 }),
    mag:  new THREE.MeshStandardMaterial({ color: 0x1a081a, emissive: 0xff2bd6, emissiveIntensity: 0.85, roughness: 0.65, metalness: 0.2 }),
    grn:  new THREE.MeshStandardMaterial({ color: 0x08150d, emissive: 0x33ff66, emissiveIntensity: 0.8, roughness: 0.7, metalness: 0.15 }),
    glass:new THREE.MeshPhysicalMaterial({
      color: 0x99ccff,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.95,
      transparent: true,
      opacity: 0.35,
      thickness: 0.15,
      ior: 1.25
    })
  };

  // LOBBY props around center
  _buildLobbySet(THREE, group, mats);

  // Room sets
  _buildStore(THREE, group, mats, rooms.STORE);
  _buildVIP(THREE, group, mats, rooms.VIP);
  _buildScorp(THREE, group, mats, rooms.SCORP);
  _buildGames(THREE, group, mats, rooms.GAMES);

  return {
    group,
    update(dt) {
      const t = (performance.now() || 0) * 0.001;

      // pulse all emissive materials slightly
      const k = 0.92 + Math.sin(t * 1.6) * 0.08;
      mats.cyan.emissiveIntensity = 0.9 * k;
      mats.mag.emissiveIntensity = 0.85 * k;
      mats.grn.emissiveIntensity = 0.8 * k;

      // rotate featured pedestal
      const ped = group.getObjectByName("STORE_FEATURED");
      if (ped) ped.rotation.y += dt * 0.6;

      // rune floor shimmer
      const rune = group.getObjectByName("SCORP_RUNE");
      if (rune) rune.rotation.z = Math.sin(t * 0.6) * 0.05;
    }
  };
}

// ---------- Helpers ----------
function _inferRoomCenters(worldData) {
  // world_ultimate creates pads with names: PAD_STORE, PAD_VIP, PAD_SCORP, PAD_GAMES in some builds
  // Our world_ultimate.js from earlier makes pads as meshes named by our function, so we infer by pad.userData.target
  const out = { STORE: null, VIP: null, SCORP: null, GAMES: null };

  const pads = worldData?.pads || [];
  for (const p of pads) {
    const n = (p?.name || "").toUpperCase();
    const t = p?.userData?.target;
    if (!t) continue;

    if (n.includes("STORE")) out.STORE = t.clone();
    else if (n.includes("VIP")) out.VIP = t.clone();
    else if (n.includes("SCORP")) out.SCORP = t.clone();
    else if (n.includes("GAMES")) out.GAMES = t.clone();
  }

  // Fallback if names missing (use directional guesses)
  // (These defaults match your current big-lobby layout)
  if (!out.STORE) out.STORE = new worldData.group.position.constructor(0, 0, -(18 + 18 + 9)); // north
  if (!out.VIP) out.VIP = new worldData.group.position.constructor((18 + 18 + 9), 0, 0);     // east
  if (!out.SCORP) out.SCORP = new worldData.group.position.constructor(0, 0, (18 + 18 + 9));  // south
  if (!out.GAMES) out.GAMES = new worldData.group.position.constructor(-(18 + 18 + 9), 0, 0); // west

  return out;
}

function _buildLobbySet(THREE, group, mats) {
  // pillars
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 4.2, 16);
  const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 10, 22);

  const positions = [
    [6.5, 0, 6.5], [-6.5, 0, 6.5], [6.5, 0, -6.5], [-6.5, 0, -6.5],
    [10.5,0, 0], [-10.5,0,0], [0,0,10.5], [0,0,-10.5]
  ];

  for (let i = 0; i < positions.length; i++) {
    const [x, , z] = positions[i];
    const p = new THREE.Mesh(pillarGeo, mats.mid);
    p.position.set(x, 2.1, z);
    group.add(p);

    const r = new THREE.Mesh(ringGeo, (i % 2 === 0) ? mats.cyan : mats.mag);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 1.05, z);
    group.add(r);
  }

  // benches
  const bench = (x, z, rotY) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.55), mats.dark);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.14), mats.mid);
    seat.position.set(0, 0.25, 0);
    back.position.set(0, 0.55, -0.2);
    g.add(seat, back);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
  };

  bench(0, 7.8, Math.PI);
  bench(0, -7.8, 0);
  bench(7.8, 0, -Math.PI / 2);
  bench(-7.8, 0, Math.PI / 2);

  // ceiling ring
  const ceil = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.12, 10, 64), mats.grn);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5.0;
  group.add(ceil);
}

function _buildStore(THREE, group, mats, center) {
  if (!center) return;

  // Glass display cases
  const caseGeo = new THREE.BoxGeometry(2.2, 1.1, 1.2);
  for (let i = -1; i <= 1; i++) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 1.3), mats.dark);
    base.position.set(center.x + i * 3.0, 0.09, center.z - 3.5);
    group.add(base);

    const glass = new THREE.Mesh(caseGeo, mats.glass);
    glass.position.set(center.x + i * 3.0, 0.75, center.z - 3.5);
    group.add(glass);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.3), mats.cyan);
    glow.position.set(center.x + i * 3.0, 1.34, center.z - 3.5);
    group.add(glow);
  }

  // Mannequins (stylized)
  const man = (x, z, accentMat) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 14), mats.mid);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), mats.mid);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 10, 24), accentMat);
    halo.rotation.x = Math.PI / 2;

    body.position.y = 1.12;
    head.position.y = 1.55;
    halo.position.y = 1.62;

    g.add(body, head, halo);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.22, 20), mats.dark);
    plinth.position.y = 0.11;
    g.add(plinth);

    g.position.set(x, 0, z);
    group.add(g);
  };

  man(center.x - 3.5, center.z + 2.5, mats.mag);
  man(center.x,       center.z + 2.5, mats.cyan);
  man(center.x + 3.5, center.z + 2.5, mats.grn);

  // Featured rotating pedestal
  const ped = new THREE.Group();
  ped.name = "STORE_FEATURED";
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.28, 28), mats.dark);
  base.position.y = 0.14;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 10, 28), mats.mag);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.33;
  const item = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mats.cyan);
  item.position.y = 0.75;
  ped.add(base, ring, item);
  ped.position.set(center.x, 0, center.z);
  group.add(ped);
}

function _buildVIP(THREE, group, mats, center) {
  if (!center) return;

  // Velvet rope posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.05, 14);
  const capGeo = new THREE.SphereGeometry(0.07, 14, 14);

  const ropeMat = mats.mag;

  const posts = [
    [-3.0, -2.5], [-1.0, -2.5], [1.0, -2.5], [3.0, -2.5],
    [-3.0,  2.5], [-1.0,  2.5], [1.0,  2.5], [3.0,  2.5],
  ];

  for (const [dx, dz] of posts) {
    const p = new THREE.Mesh(postGeo, mats.metal);
    p.position.set(center.x + dx, 0.55, center.z + dz);
    group.add(p);

    const cap = new THREE.Mesh(capGeo, ropeMat);
    cap.position.set(center.x + dx, 1.08, center.z + dz);
    group.add(cap);
  }

  // Rope lines (simple tubes via cylinders)
  const rope = (ax, az, bx, bz) => {
    const a = new THREE.Vector3(center.x + ax, 0.95, center.z + az);
    const b = new THREE.Vector3(center.x + bx, 0.95, center.z + bz);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);

    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 12), ropeMat);
    cyl.position.copy(mid);
    cyl.lookAt(b);
    cyl.rotateX(Math.PI / 2);
    group.add(cyl);
  };

  // front/back ropes
  rope(-3.0, -2.5, -1.0, -2.5);
  rope(-1.0, -2.5,  1.0, -2.5);
  rope( 1.0, -2.5,  3.0, -2.5);

  rope(-3.0,  2.5, -1.0,  2.5);
  rope(-1.0,  2.5,  1.0,  2.5);
  rope( 1.0,  2.5,  3.0,  2.5);

  // Trophy wall (big panel + trophies)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.0, 0.25), mats.dark);
  wall.position.set(center.x, 1.8, center.z + 7.6);
  group.add(wall);

  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 14), mats.metal);
    t.position.set(center.x - 2.5 + i, 1.55, center.z + 7.45);
    group.add(t);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mats.mag);
    glow.position.set(center.x - 2.5 + i, 1.85, center.z + 7.45);
    group.add(glow);
  }

  // Spotlight
  const spot = new THREE.SpotLight(0xff66dd, 0.9, 20, Math.PI / 8, 0.35, 1);
  spot.position.set(center.x, 5.2, center.z + 6.0);
  spot.target.position.set(center.x, 1.5, center.z + 7.6);
  group.add(spot);
  group.add(spot.target);
}

function _buildScorp(THREE, group, mats, center) {
  if (!center) return;

  // Centerpiece statue (scorpion-ish abstract)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.35, 24), mats.dark);
  base.position.set(center.x, 0.18, center.z);
  group.add(base);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), mats.grn);
  core.position.set(center.x, 1.35, center.z);
  group.add(core);

  // “Tail” arc segments
  const segGeo = new THREE.TorusGeometry(0.35, 0.06, 10, 22);
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(segGeo, mats.grn);
    seg.rotation.x = Math.PI / 2;
    seg.rotation.z = i * 0.32;
    seg.position.set(center.x + 0.25 + i * 0.18, 1.2 + i * 0.22, center.z);
    group.add(seg);
  }

  // Rune floor (glowing disc)
  const rune = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 48), mats.mag);
  rune.name = "SCORP_RUNE";
  rune.rotation.x = -Math.PI / 2;
  rune.position.set(center.x, 0.03, center.z);
  group.add(rune);

  // 4 rune “spokes”
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 2.4), mats.cyan);
    bar.position.set(center.x, 0.04, center.z);
    bar.rotation.y = i * (Math.PI / 2);
    group.add(bar);
  }
}

function _buildGames(THREE, group, mats, center) {
  if (!center) return;

  // Arcade blocks
  const cab = (x, z, mat) => {
    const g = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.6, 0.85), mats.dark);
    body.position.y = 0.8;

    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.45), mat);
    face.position.set(0, 1.1, -0.43);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.85), mats.mid);
    top.position.y = 1.6;

    g.add(body, top, face);
    g.position.set(x, 0, z);
    group.add(g);
  };

  for (let i = 0; i < 6; i++) {
    cab(center.x - 3.2 + i * 1.3, center.z - 3.2, (i % 2 ? mats.cyan : mats.mag));
    cab(center.x - 3.2 + i * 1.3, center.z + 3.2, (i % 2 ? mats.grn : mats.cyan));
  }

  // Score wall
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.8, 0.25), mats.dark);
  wall.position.set(center.x, 1.7, center.z - 7.6);
  group.add(wall);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.2), mats.cyan);
  glow.position.set(center.x, 1.7, center.z - 7.45);
  glow.rotation.y = Math.PI;
  group.add(glow);
}
