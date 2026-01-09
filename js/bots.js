// /js/bots.js — Scarlett Bots v4.0 (ONE MESH + BOTH SKINS: MANNEQUIN + CYBER)
// Goals:
// ✅ Single mesh per bot (low-poly procedural geometry)
// ✅ Two looks: "mannequin" (neutral) + "cyber" (atlas + emissive glow if texture exists)
// ✅ Seated placement uses SeatAnchor world position (no floating)
// ✅ Simple seated pose (lean + arms forward feel)
// ✅ No BufferGeometryUtils, GitHub Pages safe

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics, log;
  let vCache = "0";

  const B = {
    bots: [],
    // default looks: you said "both" — mix them
    // first 3 bots mannequin, last 3 cyber
    defaultSkins: ["mannequin","mannequin","mannequin","cyber","cyber","cyber"],
  };

  // -----------------------------
  // Minimal geometry merge (no addons)
  // -----------------------------
  function mergeGeometriesNonIndexed(THREE, geos) {
    let totalVerts = 0;
    for (const g of geos) totalVerts += g.attributes.position.count;

    const pos = new Float32Array(totalVerts * 3);
    const uv  = new Float32Array(totalVerts * 2);

    let pOff = 0, uOff = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, pOff);
      uv.set(g.attributes.uv.array, uOff);
      pOff += g.attributes.position.array.length;
      uOff += g.attributes.uv.array.length;
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeVertexNormals();
    return out;
  }

  function uvCylWrap(geo, zone) {
    // zone = {u0,u1,v0,v1} region inside your atlas
    geo = geo.toNonIndexed();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);

    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const theta = Math.atan2(z, x);
      let U = (theta / (Math.PI * 2)) + 0.5;
      let V = (y + 0.25) / 1.8;
      V = Math.max(0, Math.min(1, V));

      U = zone.u0 + U * (zone.u1 - zone.u0);
      V = zone.v0 + V * (zone.v1 - zone.v0);

      uv[i*2+0] = U;
      uv[i*2+1] = V;
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  function uvHead(geo, zone) {
    geo = geo.toNonIndexed();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);

    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const theta = Math.atan2(z, x);
      let U = (theta / (Math.PI * 2)) + 0.5;
      let V = (y + 0.20) / 0.70;
      V = Math.max(0, Math.min(1, V));

      U = zone.u0 + U * (zone.u1 - zone.u0);
      V = zone.v0 + V * (zone.v1 - zone.v0);

      uv[i*2+0] = U;
      uv[i*2+1] = V;
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  // -----------------------------
  // One low-poly “avatar” mesh
  // -----------------------------
  function makeBotGeometry() {
    const parts = [];
    const M = new THREE.Matrix4();

    // Atlas zones (safe defaults)
    // Body gets most of atlas, head gets top-right corner
    const bodyZone = { u0: 0.00, u1: 0.70, v0: 0.00, v1: 1.00 };
    const headZone = { u0: 0.70, u1: 1.00, v0: 0.50, v1: 1.00 };

    function add(geo, mat) {
      const g = geo.clone();
      g.applyMatrix4(mat);
      parts.push(g);
    }

    // Torso (low poly)
    add(
      uvCylWrap(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.95, 0)
    );

    // Hips
    add(
      uvCylWrap(new THREE.CylinderGeometry(0.20, 0.20, 0.22, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.68, 0)
    );

    // Neck
    add(
      uvCylWrap(new THREE.CylinderGeometry(0.07, 0.08, 0.10, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 1.22, 0.02)
    );

    // Head
    add(
      uvHead(new THREE.SphereGeometry(0.14, 10, 8), headZone),
      M.clone().makeTranslation(0, 1.35, 0.02)
    );

    // Arms (forward resting)
    {
      const armL = uvCylWrap(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8, 1, false), bodyZone);
      const armR = uvCylWrap(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8, 1, false), bodyZone);

      const ML = new THREE.Matrix4()
        .makeRotationZ(0.55)
        .multiply(new THREE.Matrix4().makeRotationX(-0.70))
        .multiply(new THREE.Matrix4().makeTranslation(-0.28, 0.98, -0.10));

      const MR = new THREE.Matrix4()
        .makeRotationZ(-0.55)
        .multiply(new THREE.Matrix4().makeRotationX(-0.70))
        .multiply(new THREE.Matrix4().makeTranslation(0.28, 0.98, -0.10));

      add(armL, ML);
      add(armR, MR);
    }

    // Legs (bent seated)
    {
      const legL = uvCylWrap(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8, 1, false), bodyZone);
      const legR = uvCylWrap(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8, 1, false), bodyZone);

      const ML = new THREE.Matrix4()
        .makeRotationX(1.10)
        .multiply(new THREE.Matrix4().makeTranslation(-0.10, 0.34, 0.12));

      const MR = new THREE.Matrix4()
        .makeRotationX(1.10)
        .multiply(new THREE.Matrix4().makeTranslation(0.10, 0.34, 0.12));

      add(legL, ML);
      add(legR, MR);
    }

    // Feet
    add(
      uvCylWrap(new THREE.BoxGeometry(0.10, 0.05, 0.22), bodyZone),
      M.clone().makeTranslation(-0.10, 0.02, 0.26)
    );
    add(
      uvCylWrap(new THREE.BoxGeometry(0.10, 0.05, 0.22), bodyZone),
      M.clone().makeTranslation(0.10, 0.02, 0.26)
    );

    return mergeGeometriesNonIndexed(THREE, parts);
  }

  // -----------------------------
  // Materials: mannequin + cyber
  // -----------------------------
  function makeMannequinMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x8aa0b8,
      roughness: 0.65,
      metalness: 0.05,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    });
  }

  function makeCyberMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.80,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.0
    });

    // Try to load atlas; if missing, it still renders with emissive color
    const loader = new THREE.TextureLoader();
    const url = `./assets/textures/cyber_suit_atlas.png?v=${encodeURIComponent(vCache)}`;

    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.emissiveMap = tex;
        mat.needsUpdate = true;
        log?.(`[bots] cyber atlas loaded ✅ ${url}`);
      },
      undefined,
      () => {
        // silently keep fallback
        log?.(`[bots] cyber atlas missing (fallback material used) ⚠️`);
      }
    );

    return mat;
  }

  function buildMaterials() {
    return {
      mannequin: makeMannequinMaterial(),
      cyber: makeCyberMaterial()
    };
  }

  // -----------------------------
  // Seating logic (stable)
  // -----------------------------
  function seatBot(mesh, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const p = new THREE.Vector3();
    s.anchor.getWorldPosition(p);

    mesh.position.copy(p);
    mesh.rotation.set(0, s.yaw, 0);

    // Push slightly away from table so chest doesn't clip
    const toTable = new THREE.Vector3().subVectors(tableFocus, mesh.position);
    toTable.y = 0;
    toTable.normalize();
    mesh.position.addScaledVector(toTable, -0.10);

    // Drop onto seat cushion
    mesh.position.y -= (metrics?.seatDrop ?? 0.075);

    // slight “lean in”
    mesh.rotation.x = -0.02;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  function setSkin(botIndex, skinName) {
    const bot = B.bots[botIndex];
    if (!bot) return;
    const mat = B.materials?.[skinName];
    if (!mat) return;
    bot.material = mat;
    bot.userData.skin = skinName;
  }

  function toggleAllSkins() {
    for (let i=0;i<B.bots.length;i++){
      const cur = B.bots[i].userData.skin || "mannequin";
      setSkin(i, cur === "mannequin" ? "cyber" : "mannequin");
    }
  }

  async function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M, v, log: _L } = {}) {
    THREE = _T;
    scene = _S;
    getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatDrop: 0.075 };
    log = _L || console.log;
    vCache = v || Date.now().toString();

    // cleanup
    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    // build once
    const geometry = makeBotGeometry();
    B.materials = buildMaterials();

    // create 6 seated bots
    for (let i=0;i<6;i++){
      const skin = B.defaultSkins[i] || "mannequin";
      const bot = new THREE.Mesh(geometry, B.materials[skin] || B.materials.mannequin);
      bot.name = `Bot_${i+1}`;
      bot.userData.skin = skin;

      // Match your player height feel
      bot.scale.setScalar(0.92);

      scene.add(bot);
      B.bots.push(bot);

      seatBot(bot, i+1);
    }

    log("[bots] v4.0 init ✅ (one-mesh bots + mannequin/cyber skins)");
  }

  function update(dt) {
    // Later: subtle idle motion, winner animation, turn highlight
  }

  return {
    init,
    update,
    setSkin,
    toggleAllSkins,
    _debug: { B }
  };
})();
