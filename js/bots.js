// /js/bots.js — Scarlett Bots v2.3 (SEATED STABLE + CORRECT HEIGHT)
// ✅ Butt on seat, feet to floor, head lowered
// ✅ Arms toward table (hands-on-table vibe)
// ✅ No walkers
// ✅ Uses SeatAnchor world position correctly

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;
  const B = { bots: [] };

  function makeBotMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.75,
      metalness: 0.12,
      emissive: 0x001018,
      emissiveIntensity: 0.12
    });
  }

  function makeBot() {
    const g = new THREE.Group();
    const mat = makeBotMaterial();

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 8, 16), mat);
    torso.position.y = 0.78;
    g.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.65 })
    );
    head.position.y = 1.16;
    g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.32, 8, 12);
    const armL = new THREE.Mesh(armGeo, mat);
    const armR = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.24, 0.82, -0.10);
    armR.position.set( 0.24, 0.82, -0.10);
    armL.rotation.x = -0.95; armR.rotation.x = -0.95;
    armL.rotation.z =  0.25; armR.rotation.z = -0.25;
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.48, 8, 12);
    const legL = new THREE.Mesh(legGeo, mat);
    const legR = new THREE.Mesh(legGeo, mat);
    legL.rotation.x = 1.35; legR.rotation.x = 1.35;
    legL.position.set(-0.10, 0.34, 0.12);
    legR.position.set( 0.10, 0.34, 0.12);
    g.add(legL, legR);

    g.userData = { torso, head, armL, armR, legL, legR };
    return g;
  }

  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const anchorPos = new THREE.Vector3();
    s.anchor.getWorldPosition(anchorPos);

    bot.position.copy(anchorPos);
    bot.rotation.set(0, s.yaw, 0);

    // push slightly away from table (avoid clipping)
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0; toTable.normalize();
    bot.position.addScaledVector(toTable, -0.10);

    // drop to seat cushion
    bot.position.y -= (metrics?.seatDrop ?? 0.07);

    // slight lean forward to look “engaged”
    bot.rotation.x = 0.02;
  }

  function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M } = {}) {
    THREE = _T; scene = _S; getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatDrop: 0.07 };

    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    for (let i=0;i<6;i++){
      const bot = makeBot();
      bot.name = "Bot_"+(i+1);
      bot.scale.setScalar(0.92);
      scene.add(bot);
      B.bots.push(bot);
      sitBot(bot, i+1);
    }
  }

  function update(dt) {}

  return { init, update };
})();
