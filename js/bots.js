// /js/bots.js — Scarlett Bots v3.1 (AVATAR UPDATE 1)
// - Proper seated pose, feet on floor, hands on table
// - Safe materials (no textures required)
// - Optional idle motion

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;
  let playerRig, camera;

  const B = { bots: [], config: { count: 6, idle: true } };

  function makeSuitMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.78,
      metalness: 0.10,
      emissive: 0x001018,
      emissiveIntensity: 0.10
    });
  }
  function makeSkinMat() {
    return new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.65, metalness: 0.0 });
  }

  function makeBot() {
    const bot = new THREE.Group();
    const suit = makeSuitMat();
    const skin = makeSkinMat();

    const hips = new THREE.Group();
    const spine = new THREE.Group();
    const chest = new THREE.Group();
    const headPivot = new THREE.Group();

    bot.add(hips);
    hips.add(spine);
    spine.add(chest);
    chest.add(headPivot);

    const hipsMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.20, 6, 10), suit);
    hipsMesh.position.y = 0.10; hips.add(hipsMesh);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.55, 8, 12), suit);
    torsoMesh.position.y = 0.48; chest.add(torsoMesh);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
    headMesh.position.y = 0.20; headPivot.add(headMesh);

    function makeArm(side) {
      const s = side;
      const shoulder = new THREE.Group();
      const upper = new THREE.Group();
      const lower = new THREE.Group();
      const hand = new THREE.Group();

      chest.add(shoulder);
      shoulder.add(upper);
      upper.add(lower);
      lower.add(hand);

      shoulder.position.set(0.22 * s, 0.72, 0.02);

      const upperMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 6, 10), suit);
      upperMesh.position.y = -0.16; upper.add(upperMesh);

      const lowerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 6, 10), suit);
      lowerMesh.position.y = -0.16; lower.add(lowerMesh);

      const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.10), suit);
      handMesh.position.set(0, -0.02, 0.02); hand.add(handMesh);

      return { shoulder, upper, lower, hand };
    }

    function makeLeg(side) {
      const s = side;
      const hip = new THREE.Group();
      const thigh = new THREE.Group();
      const shin = new THREE.Group();
      const foot = new THREE.Group();

      hips.add(hip);
      hip.add(thigh);
      thigh.add(shin);
      shin.add(foot);

      hip.position.set(0.10 * s, 0.10, 0.00);

      const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.30, 6, 10), suit);
      thighMesh.position.y = -0.18; thigh.add(thighMesh);

      const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 10), suit);
      shinMesh.position.y = -0.18; shin.add(shinMesh);

      const footMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.18), suit);
      footMesh.position.set(0, -0.02, 0.06); foot.add(footMesh);

      return { hip, thigh, shin, foot };
    }

    const armL = makeArm(-1), armR = makeArm(+1);
    const legL = makeLeg(-1), legR = makeLeg(+1);

    spine.position.y = 0.10;
    chest.position.y = 0.10;
    headPivot.position.y = 1.20;

    bot.userData = {
      hips, spine, chest, headPivot,
      armL, armR, legL, legR,
      seated: true,
      seatIndex: 0,
      t: Math.random() * 10
    };

    return bot;
  }

  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const seatPos = new THREE.Vector3();
    s.anchor.getWorldPosition(seatPos);

    bot.position.copy(seatPos);
    bot.rotation.set(0, s.yaw, 0);

    // push slightly away from table (prevents clipping)
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0; toTable.normalize();
    bot.position.addScaledVector(toTable, -0.06);

    const U = bot.userData;

    // lean into backrest slightly
    U.spine.rotation.set(-0.08, 0, 0);
    U.chest.rotation.set(-0.10, 0, 0);
    U.headPivot.rotation.set(0.10, 0, 0);

    // legs (sit)
    const thighForward = 1.05;
    const shinDown = -1.10;
    U.legL.thigh.rotation.set(thighForward, 0, 0);
    U.legR.thigh.rotation.set(thighForward, 0, 0);
    U.legL.shin.rotation.set(shinDown, 0, 0);
    U.legR.shin.rotation.set(shinDown, 0, 0);
    U.legL.foot.rotation.set(0.15, 0, 0);
    U.legR.foot.rotation.set(0.15, 0, 0);

    // feet touch floor: measure lowest foot world y and shift bot
    const fL = new THREE.Vector3(), fR = new THREE.Vector3();
    U.legL.foot.getWorldPosition(fL);
    U.legR.foot.getWorldPosition(fR);
    const minFootY = Math.min(fL.y, fR.y);
    bot.position.y += (0 - minFootY);

    // arms: hands on table edge
    U.armL.shoulder.rotation.set(0.55, 0, 0.20);
    U.armR.shoulder.rotation.set(0.55, 0, -0.20);

    U.armL.upper.rotation.set(0.60, 0.10, 0.0);
    U.armR.upper.rotation.set(0.60, -0.10, 0.0);

    U.armL.lower.rotation.set(-0.85, 0.05, 0.0);
    U.armR.lower.rotation.set(-0.85, -0.05, 0.0);

    U.armL.hand.position.set(-0.18, -0.24, -0.28);
    U.armR.hand.position.set(+0.18, -0.24, -0.28);
    U.armL.hand.rotation.set(-0.25, 0, 0);
    U.armR.hand.rotation.set(-0.25, 0, 0);

    // tiny forward nudge so hands reach
    bot.position.addScaledVector(toTable, 0.06);

    U.seated = true;
    U.seatIndex = seatIndex;
  }

  function animateSeated(bot, dt) {
    const U = bot.userData;
    if (!U?.seated) return;

    U.t += dt;
    const breathe = 0.015 * Math.sin(U.t * 1.6);
    const nod = 0.02 * Math.sin(U.t * 0.9 + 1.1);

    U.chest.position.y = 0.10 + breathe;
    U.headPivot.rotation.x = 0.10 + nod * 0.12;

    U.armL.hand.rotation.z = Math.sin(U.t * 1.9) * 0.06;
    U.armR.hand.rotation.z = -Math.sin(U.t * 2.1) * 0.06;
  }

  function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M, config: _C } = {}) {
    THREE = _T; scene = _S; getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0,0,-8.8);
    metrics = _M || { seatY: 0.42, tableY: 0.92 };
    B.config = Object.assign(B.config, _C || {});

    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    const count = Math.max(1, Math.min(6, B.config.count || 6));
    for (let i=0;i<count;i++){
      const bot = makeBot();
      bot.name = "Bot_" + (i+1);
      bot.scale.setScalar(1.0);
      scene.add(bot);
      B.bots.push(bot);
      sitBot(bot, i+1);
    }
  }

  function setPlayerRig(_playerRig, _camera) { playerRig = _playerRig; camera = _camera; }
  function update(dt) {
    if (!B.config.idle) return;
    for (const bot of B.bots) animateSeated(bot, dt);
  }

  return { init, update, setPlayerRig };
})();
