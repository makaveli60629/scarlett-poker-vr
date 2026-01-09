// /js/bots.js — Scarlett Bots v3.0 (ONE-MESH LOWPOLY + SEATED CORRECT)
// ✅ One Mesh per bot (merged geometry) WITHOUT BufferGeometryUtils import
// ✅ Seated correctly using SeatAnchor world position
// ✅ Lower head, hands on table, feet touch floor
// ✅ No walkers by default

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;

  const B = { bots: [], WALKERS: 0 };

  // Minimal geometry merge (positions/normals/uv + index)
  function mergeGeometries(THREE, geoms) {
    // Convert to non-indexed for simplicity
    const list = geoms.map(g => g.index ? g.toNonIndexed() : g);
    let total = 0;
    for (const g of list) total += g.attributes.position.count;

    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const uv  = new Float32Array(total * 2);

    let o3 = 0, o2 = 0;
    for (const g of list) {
      const p = g.attributes.position.array;
      const n = g.attributes.normal?.array;
      const u = g.attributes.uv?.array;

      pos.set(p, o3);
      if (n) nor.set(n, o3);
      if (u) uv.set(u, o2);

      o3 += p.length;
      o2 += u ? u.length : (g.attributes.position.count * 2);
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }

  function botMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.75,
      metalness: 0.12,
      emissive: 0x001018,
      emissiveIntensity: 0.10
    });
  }

  function skinMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 0.65,
      metalness: 0.02
    });
  }

  function makeBotOneMesh() {
    // Build parts as simple lowpoly primitives, then merge
    const parts = [];

    // Torso (box-ish)
    const torso = new THREE.BoxGeometry(0.34, 0.52, 0.18);
    torso.translate(0, 0.90, 0);
    parts.push(torso);

    // Pelvis
    const pelvis = new THREE.BoxGeometry(0.30, 0.18, 0.16);
    pelvis.translate(0, 0.62, 0.02);
    parts.push(pelvis);

    // Head (low sphere)
    const head = new THREE.SphereGeometry(0.12, 10, 8);
    head.translate(0, 1.18, 0.02);
    parts.push(head);

    // Upper arms
    const armL = new THREE.BoxGeometry(0.10, 0.30, 0.10);
    armL.translate(-0.25, 0.92, 0.00);
    parts.push(armL);

    const armR = new THREE.BoxGeometry(0.10, 0.30, 0.10);
    armR.translate(0.25, 0.92, 0.00);
    parts.push(armR);

    // Forearms (toward table pose)
    const foreL = new THREE.BoxGeometry(0.10, 0.26, 0.10);
    foreL.rotateX(-0.85);
    foreL.translate(-0.25, 0.77, -0.14);
    parts.push(foreL);

    const foreR = new THREE.BoxGeometry(0.10, 0.26, 0.10);
    foreR.rotateX(-0.85);
    foreR.translate(0.25, 0.77, -0.14);
    parts.push(foreR);

    // Thighs (bent sitting)
    const thighL = new THREE.BoxGeometry(0.11, 0.30, 0.11);
    thighL.rotateX(0.95);
    thighL.translate(-0.10, 0.48, 0.12);
    parts.push(thighL);

    const thighR = new THREE.BoxGeometry(0.11, 0.30, 0.11);
    thighR.rotateX(0.95);
    thighR.translate(0.10, 0.48, 0.12);
    parts.push(thighR);

    // Shins down to floor
    const shinL = new THREE.BoxGeometry(0.10, 0.34, 0.10);
    shinL.translate(-0.10, 0.20, 0.20);
    parts.push(shinL);

    const shinR = new THREE.BoxGeometry(0.10, 0.34, 0.10);
    shinR.translate(0.10, 0.20, 0.20);
    parts.push(shinR);

    // Merge all to ONE geometry
    const geom = mergeGeometries(THREE, parts);

    // Single material (suit). Head will be faked via emissive “skin panel” later.
    const mesh = new THREE.Mesh(geom, botMaterial());
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  function sitBot(botMesh, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const anchorPos = new THREE.Vector3();
    s.anchor.getWorldPosition(anchorPos);

    botMesh.position.copy(anchorPos);
    botMesh.rotation.set(0, s.yaw, 0);

    // push back from table a little (prevent clipping)
    const toTable = new THREE.Vector3().subVectors(tableFocus, botMesh.position);
    toTable.y = 0; toTable.normalize();
    botMesh.position.addScaledVector(toTable, -0.10);

    // lower to sit on cushion
    botMesh.position.y -= (metrics?.seatDrop ?? 0.07);
  }

  function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M } = {}) {
    THREE = _T; scene = _S; getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatDrop: 0.07 };

    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    for (let i=0;i<6;i++){
      const bot = makeBotOneMesh();
      bot.name = "BotMesh_" + (i+1);

      // scale close to player height seated
      bot.scale.setScalar(1.05);

      scene.add(bot);
      B.bots.push(bot);
      sitBot(bot, i+1);
    }
  }

  function update(dt) {}

  return { init, update };
})();
