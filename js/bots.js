// /js/bots.js — Scarlett Bots v2.0 (SEATED + SCALE + NO FLOAT)
// - Seats bots correctly on SeatAnchor
// - Chairs already face table in your world.js (good)
// - Fix scale so bots ~player height (1.65m eye height, ~1.75m body)
// - Reduce walkers: WALKERS=0 by default

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;
  let playerRig, camera;

  const B = {
    bots: [],
    WALKERS: 0, // ✅ set to 1 or 2 later if you want
  };

  function makeBotMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.75,
      metalness: 0.12,
      emissive: 0x001018,
      emissiveIntensity: 0.15
    });
  }

  function makeBot() {
    const g = new THREE.Group();
    const mat = makeBotMaterial();

    // simple humanoid
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 8, 16), mat);
    torso.position.y = 1.00; g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 14), new THREE.MeshStandardMaterial({
      color: 0xd2b48c, roughness: 0.65
    }));
    head.position.y = 1.52; g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.32, 8, 12);
    const armL = new THREE.Mesh(armGeo, mat);
    const armR = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.26, 1.12, 0); armR.position.set(0.26, 1.12, 0);
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.48, 8, 12);
    const legL = new THREE.Mesh(legGeo, mat);
    const legR = new THREE.Mesh(legGeo, mat);
    legL.position.set(-0.10, 0.40, 0);
    legR.position.set( 0.10, 0.40, 0);
    g.add(legL, legR);

    g.userData = { torso, head, armL, armR, legL, legR, mode:"seated", seatIndex:0 };
    return g;
  }

  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    // place bot on seat anchor
    bot.position.set(0,0,0);
    bot.quaternion.identity();

    // anchor is in chair local; convert to world
    const p = new THREE.Vector3();
    s.anchor.getWorldPosition(p);

    bot.position.copy(p);

    // face table (use seat yaw)
    bot.rotation.y = s.yaw;

    // seat height fix (prevent “floating”)
    // This matches your chair anchor y=0.42 in world.js
    bot.position.y = (metrics?.seatY ?? 0.42);

    // tiny push back so they don't clip table
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0; toTable.normalize();
    bot.position.addScaledVector(toTable, -0.08);

    // seated pose
    bot.userData.torso.position.y = 0.95;
    bot.userData.head.position.y = 1.45;
    bot.userData.legL.rotation.x = 1.25;
    bot.userData.legR.rotation.x = 1.25;
    bot.userData.legL.position.y = 0.28;
    bot.userData.legR.position.y = 0.28;

    bot.userData.mode = "seated";
    bot.userData.seatIndex = seatIndex;
  }

  function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M } = {}) {
    THREE = _T; scene = _S; getSeats = _G; tableFocus = _F || new THREE.Vector3(0,0,-6.5);
    metrics = _M || { seatY: 0.42 };

    // cleanup
    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    // create 6 seated bots (6-max)
    for (let i=0;i<6;i++){
      const bot = makeBot();
      bot.name = "Bot_"+(i+1);

      // scale to match player (~1.75m body)
      bot.scale.setScalar(1.0);

      scene.add(bot);
      B.bots.push(bot);

      sitBot(bot, i+1);
    }
  }

  function setPlayerRig(_playerRig, _camera) {
    playerRig = _playerRig;
    camera = _camera;
  }

  function update(dt) {
    // no walking bots for now (stability)
    // later we can enable WALKERS and create lobby wanderers
  }

  return { init, update, setPlayerRig };
})();
