// /js/bots.js — Scarlett Bots v3.1 (ONE MESH + UV + NO BufferGeometryUtils)
// - No BufferGeometryUtils import (fixes your crash)
// - One mesh per bot, seated correctly, hands toward table
// - UVs generated so you can texture with shirt/cyber atlas later

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;

  const B = {
    bots: [],
    WALKERS: 0,
  };

  // --------- Minimal geometry merge (no addons needed) ---------
  function mergeGeometriesNonIndexed(THREE, geos) {
    // All geometries MUST be non-indexed and must have position + uv
    let totalVerts = 0;
    for (const g of geos) totalVerts += g.attributes.position.count;

    const pos = new Float32Array(totalVerts * 3);
    const uv  = new Float32Array(totalVerts * 2);

    let pOff = 0, uOff = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, pOff); pOff += g.attributes.position.array.length;
      uv.set(g.attributes.uv.array, uOff); uOff += g.attributes.uv.array.length;
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeVertexNormals();
    return out;
  }

  function makeUvWrap(geo, { u0=0.0, u1=1.0, v0=0.0, v1=1.0 } = {}) {
    geo = geo.toNonIndexed();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);

    // cylindrical wrap around Y axis
    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const theta = Math.atan2(z, x); // -pi..pi
      let U = (theta / (Math.PI * 2)) + 0.5;
      let V = (y + 0.2) / 1.8;
      V = Math.max(0, Math.min(1, V));

      // map into atlas region
      U = u0 + U * (u1 - u0);
      V = v0 + V * (v1 - v0);

      uv[i*2+0] = U;
      uv[i*2+1] = V;
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  function makeUvHead(geo, { u0=0.70, u1=1.0, v0=0.50, v1=1.0 } = {}) {
    geo = geo.toNonIndexed();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);

    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const theta = Math.atan2(z, x);
      let U = (theta / (Math.PI * 2)) + 0.5;
      let V = (y + 0.25) / 0.55;
      V = Math.max(0, Math.min(1, V));

      U = u0 + U * (u1 - u0);
      V = v0 + V * (v1 - v0);

      uv[i*2+0] = U;
      uv[i*2+1] = V;
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  function makeBotGeometry() {
    const parts = [];
    const M = new THREE.Matrix4();

    function add(geo, mat) {
      const g = geo.clone();
      g.applyMatrix4(mat);
      parts.push(g);
    }

    // Build parts with UV zones:
    // Body uses left 0..0.70 of texture, head uses top-right.
    const bodyZone = { u0:0.0, u1:0.70, v0:0.0, v1:1.0 };
    const headZone = { u0:0.70, u1:1.0, v0:0.50, v1:1.0 };

    // Torso
    add(
      makeUvWrap(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.95, 0)
    );

    // Hips
    add(
      makeUvWrap(new THREE.CylinderGeometry(0.20, 0.20, 0.20, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.68, 0)
    );

    // Neck
    add(
      makeUvWrap(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 1.22, 0.02)
    );

    // Head
    add(
      makeUvHead(new THREE.SphereGeometry(0.14, 10, 8), headZone),
      M.clone().makeTranslation(0, 1.35, 0.02)
    );

    // Arms (tilted slightly forward)
    {
      const armL = makeUvWrap(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8), bodyZone);
      const armR = makeUvWrap(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8), bodyZone);

      const ML = new THREE.Matrix4()
        .makeRotationZ(0.55)
        .multiply(new THREE.Matrix4().makeTranslation(-0.28, 0.98, -0.05));
      const MR = new THREE.Matrix4()
        .makeRotationZ(-0.55)
        .multiply(new THREE.Matrix4().makeTranslation(0.28, 0.98, -0.05));

      add(armL, ML);
      add(armR, MR);
    }

    // Legs
    {
      const legL = makeUvWrap(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), bodyZone);
      const legR = makeUvWrap(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), bodyZone);

      const ML = new THREE.Matrix4()
        .makeRotationX(0.25)
        .multiply(new THREE.Matrix4().makeTranslation(-0.10, 0.32, 0.10));
      const MR = new THREE.Matrix4()
        .makeRotationX(0.25)
        .multiply(new THREE.Matrix4().makeTranslation(0.10, 0.32, 0.10));

      add(legL, ML);
      add(legR, MR);
    }

    // Feet
    add(
      makeUvWrap(new THREE.BoxGeometry(0.10, 0.05, 0.22), bodyZone),
      M.clone().makeTranslation(-0.10, 0.02, 0.22)
    );
    add(
      makeUvWrap(new THREE.BoxGeometry(0.10, 0.05, 0.22), bodyZone),
      M.clone().makeTranslation(0.10, 0.02, 0.22)
    );

    // Merge (no addons)
    return mergeGeometriesNonIndexed(THREE, parts);
  }

  async function makeMaterial(v) {
    const loader = new THREE.TextureLoader();

    // Safe default if texture missing
    const mat = new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.75,
      metalness: 0.12,
      emissive: 0x001018,
      emissiveIntensity: 0.10
    });

    // Use shirt_diffuse.png if present (your file list shows it)
    loader.load(
      `./assets/textures/shirt_diffuse.png?v=${v}`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      },
      undefined,
      () => {
        // if it fails, stay on safe default
      }
    );

    return mat;
  }

  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const anchorPos = new THREE.Vector3();
    s.anchor.getWorldPosition(anchorPos);

    bot.position.copy(anchorPos);
    bot.rotation.set(0, s.yaw, 0);

    // push slightly away from table so body doesn't clip
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0;
    toTable.normalize();
    bot.position.addScaledVector(toTable, -0.10);

    // seat drop
    bot.position.y -= (metrics?.seatDrop ?? 0.07);

    // slight lean for "hands toward table"
    bot.rotation.x = -0.02;
  }

  async function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M, v } = {}) {
    THREE = _T;
    scene = _S;
    getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatDrop: 0.07 };

    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    const geo = makeBotGeometry();
    const mat = await makeMaterial(v || Date.now().toString());

    for (let i=0;i<6;i++){
      const bot = new THREE.Mesh(geo, mat);
      bot.name = `Bot_${i+1}`;
      bot.scale.setScalar(0.92);
      scene.add(bot);
      B.bots.push(bot);

      sitBot(bot, i+1);
    }
  }

  function update() {}
  function setPlayerRig() {}

  return { init, update, setPlayerRig };
})();
