// /js/bots.js — Scarlett Bots v4.1 (ONE MESH + ACTIVE/WINNER GLOW)
// ✅ One mesh per bot (low-poly merged geometry, no BufferGeometryUtils)
// ✅ Two skins: mannequin + cyber atlas (fallback safe)
// ✅ Seated using SeatAnchor world position (no float)
// ✅ Active seat glow red, winner glow gold

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics, log;
  let vCache = "0";

  const B = {
    bots: [],
    defaultSkins: ["mannequin","mannequin","mannequin","cyber","cyber","cyber"],
    materials: null
  };

  let activeSeat = -1; // 0..5
  let winnerSeat = -1; // 0..5

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

  function makeBotGeometry() {
    const parts = [];
    const M = new THREE.Matrix4();

    const bodyZone = { u0: 0.00, u1: 0.70, v0: 0.00, v1: 1.00 };
    const headZone = { u0: 0.70, u1: 1.00, v0: 0.50, v1: 1.00 };

    function add(geo, mat) {
      const g = geo.clone();
      g.applyMatrix4(mat);
      parts.push(g);
    }

    add(
      uvCylWrap(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.95, 0)
    );

    add(
      uvCylWrap(new THREE.CylinderGeometry(0.20, 0.20, 0.22, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 0.68, 0)
    );

    add(
      uvCylWrap(new THREE.CylinderGeometry(0.07, 0.08, 0.10, 10, 1, false), bodyZone),
      M.clone().makeTranslation(0, 1.22, 0.02)
    );

    add(
      uvHead(new THREE.SphereGeometry(0.14, 10, 8), headZone),
      M.clone().makeTranslation(0, 1.35, 0.02)
    );

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

    add(new THREE.BoxGeometry(0.10, 0.05, 0.22).toNonIndexed(), M.clone().makeTranslation(-0.10, 0.02, 0.26));
    add(new THREE.BoxGeometry(0.10, 0.05, 0.22).toNonIndexed(), M.clone().makeTranslation( 0.10, 0.02, 0.26));

    return mergeGeometriesNonIndexed(THREE, parts);
  }

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

    const loader = new THREE.TextureLoader();
    const url = `./assets/textures/cyber_suit_atlas.png?v=${encodeURIComponent(vCache)}`;

    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.emissiveMap = tex;
        mat.needsUpdate = true;
        log?.(`[bots] cyber atlas loaded ✅`);
      },
      undefined,
      () => {
        log?.(`[bots] cyber atlas missing (fallback used) ⚠️`);
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

  function seatBot(mesh, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const p = new THREE.Vector3();
    s.anchor.getWorldPosition(p);

    mesh.position.copy(p);
    mesh.rotation.set(0, s.yaw, 0);

    const toTable = new THREE.Vector3().subVectors(tableFocus, mesh.position);
    toTable.y = 0;
    toTable.normalize();
    mesh.position.addScaledVector(toTable, -0.10);

    mesh.position.y -= (metrics?.seatDrop ?? 0.075);

    mesh.rotation.x = -0.02;
  }

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

  function setActiveSeat(seat) { activeSeat = (typeof seat === "number") ? seat : -1; }
  function setWinnerSeat(seat) { winnerSeat = (typeof seat === "number") ? seat : -1; }

  async function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M, v, log: _L } = {}) {
    THREE = _T;
    scene = _S;
    getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatDrop: 0.075 };
    log = _L || console.log;
    vCache = v || Date.now().toString();

    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    const geometry = makeBotGeometry();
    B.materials = buildMaterials();

    for (let i=0;i<6;i++){
      const skin = B.defaultSkins[i] || "mannequin";
      const bot = new THREE.Mesh(geometry, B.materials[skin] || B.materials.mannequin);
      bot.name = `Bot_${i+1}`;
      bot.userData.skin = skin;

      bot.scale.setScalar(0.92);
      scene.add(bot);
      B.bots.push(bot);

      seatBot(bot, i+1);
    }

    log("[bots] v4.1 init ✅");
  }

  function update(dt) {
    const t = performance.now() * 0.004;

    for (let i=0;i<B.bots.length;i++){
      const bot = B.bots[i];
      if (!bot?.material) continue;

      if (i === activeSeat) {
        bot.material.emissive = new THREE.Color(0xff2d2d);
        bot.material.emissiveIntensity = 0.55 + Math.sin(t*6)*0.18;
      } else if (i === winnerSeat) {
        bot.material.emissive = new THREE.Color(0xffcc00);
        bot.material.emissiveIntensity = 0.65 + Math.sin(t*7)*0.20;
      } else {
        if (bot.userData.skin === "cyber") {
          bot.material.emissive = new THREE.Color(0x00ffff);
          bot.material.emissiveIntensity = 2.0;
        } else {
          bot.material.emissive = new THREE.Color(0x000000);
          bot.material.emissiveIntensity = 0.0;
        }
      }

      bot.material.needsUpdate = true;
    }
  }

  return {
    init,
    update,
    setSkin,
    toggleAllSkins,
    setActiveSeat,
    setWinnerSeat,
  };
})();
