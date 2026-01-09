// /js/bots.js — Scarlett Bots v3.0 (REAL SIT POSE + FEET ON FLOOR + HANDS ON TABLE)
// Goals:
// - butt on seat (SeatAnchor)
// - feet on floor (y=0) without floating
// - back to backrest (slight lean)
// - hands resting on table edge, facing center
// - safe low-poly rig (no external assets)
// - optional idle breathing + micro hand motion

export const Bots = (() => {
  let THREE, scene, getSeats, tableFocus, metrics;
  let playerRig, camera;

  const B = {
    bots: [],
    config: {
      count: 6,
      idle: true,
      walkingBots: 0
    }
  };

  // ---------- Materials ----------
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

  // ---------- Build a simple poseable rig ----------
  function makeBot() {
    const bot = new THREE.Group();
    bot.name = "Bot";

    const suit = makeSuitMat();
    const skin = makeSkinMat();

    // Root -> hips -> spine -> chest -> head
    const hips = new THREE.Group(); hips.name = "hips";
    const spine = new THREE.Group(); spine.name = "spine";
    const chest = new THREE.Group(); chest.name = "chest";
    const headPivot = new THREE.Group(); headPivot.name = "headPivot";

    bot.add(hips);
    hips.add(spine);
    spine.add(chest);
    chest.add(headPivot);

    // Meshes (low poly)
    const hipsMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.20, 6, 10), suit);
    hipsMesh.position.y = 0.10;
    hips.add(hipsMesh);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.55, 8, 12), suit);
    torsoMesh.position.y = 0.48;
    chest.add(torsoMesh);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
    headMesh.position.y = 0.20;
    headPivot.add(headMesh);

    // Arms (upper+lower+hand)
    function makeArm(side) {
      const s = side; // -1 left, +1 right
      const shoulder = new THREE.Group(); shoulder.name = (s < 0) ? "shoulderL" : "shoulderR";
      const upper = new THREE.Group(); upper.name = (s < 0) ? "upperArmL" : "upperArmR";
      const lower = new THREE.Group(); lower.name = (s < 0) ? "lowerArmL" : "lowerArmR";
      const hand = new THREE.Group();  hand.name  = (s < 0) ? "handL" : "handR";

      chest.add(shoulder);
      shoulder.add(upper);
      upper.add(lower);
      lower.add(hand);

      shoulder.position.set(0.22 * s, 0.72, 0.02);

      const upperMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 6, 10), suit);
      upperMesh.position.y = -0.16;
      upper.add(upperMesh);

      const lowerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 6, 10), suit);
      lowerMesh.position.y = -0.16;
      lower.add(lowerMesh);

      const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.10), suit);
      handMesh.position.set(0, -0.02, 0.02);
      hand.add(handMesh);

      return { shoulder, upper, lower, hand };
    }

    const armL = makeArm(-1);
    const armR = makeArm(+1);

    // Legs (thigh+shin+foot)
    function makeLeg(side) {
      const s = side; // -1 left, +1 right
      const hip = new THREE.Group(); hip.name = (s < 0) ? "hipL" : "hipR";
      const thigh = new THREE.Group(); thigh.name = (s < 0) ? "thighL" : "thighR";
      const shin = new THREE.Group(); shin.name = (s < 0) ? "shinL" : "shinR";
      const foot = new THREE.Group(); foot.name = (s < 0) ? "footL" : "footR";

      hips.add(hip);
      hip.add(thigh);
      thigh.add(shin);
      shin.add(foot);

      hip.position.set(0.10 * s, 0.10, 0.00);

      const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.30, 6, 10), suit);
      thighMesh.position.y = -0.18;
      thigh.add(thighMesh);

      const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 10), suit);
      shinMesh.position.y = -0.18;
      shin.add(shinMesh);

      const footMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.18), suit);
      footMesh.position.set(0, -0.02, 0.06);
      foot.add(footMesh);

      return { hip, thigh, shin, foot };
    }

    const legL = makeLeg(-1);
    const legR = makeLeg(+1);

    // Set default proportions/anchors
    hips.position.y = 0.42; // overwritten when seated using SeatAnchor
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

  // ---------- Seating pose solver ----------
  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    // Get seat anchor in world space
    const seatPos = new THREE.Vector3();
    const seatQuat = new THREE.Quaternion();
    s.anchor.getWorldPosition(seatPos);
    s.anchor.getWorldQuaternion(seatQuat);

    // Place bot root at seat position (but keep feet on floor)
    bot.position.copy(seatPos);
    bot.quaternion.copy(seatQuat);

    // Force facing toward table (seat yaw is reliable)
    bot.rotation.set(0, s.yaw, 0);

    // IMPORTANT: DO NOT override bot.position.y to seatY blindly.
    // Instead, use anchor world y then adjust hips/legs so feet land on floor.
    const floorY = 0;

    // Pose targets
    const seatY = seatPos.y; // should be ~0.42
    const tableY = metrics?.tableY ?? 0.92;

    // Pull bot slightly away from table so backrest contact looks right
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0; toTable.normalize();
    bot.position.addScaledVector(toTable, -0.06);

    // --- Sit pose: hips on seat, torso lean back slightly ---
    const U = bot.userData;

    // hips located at seat height
    U.hips.position.set(0, 0, 0); // hips group is at bot origin in this rig
    // BUT we can offset whole rig slightly
    // We'll set bot.position.y so hips effectively sit on seat
    bot.position.y = seatY;

    // spine/chest lean into backrest a bit
    U.spine.rotation.set(-0.08, 0, 0);
    U.chest.rotation.set(-0.10, 0, 0);

    // head slight forward correction
    U.headPivot.rotation.set(0.10, 0, 0);

    // --- Legs: thighs forward, shins down, feet on floor ---
    // Because we don’t have IK, we use tuned angles + compute foot world Y and compensate.
    const thighForward = 1.05;
    const shinDown = -1.10;

    U.legL.thigh.rotation.set(thighForward, 0, 0);
    U.legR.thigh.rotation.set(thighForward, 0, 0);
    U.legL.shin.rotation.set(shinDown, 0, 0);
    U.legR.shin.rotation.set(shinDown, 0, 0);

    // Feet flat
    U.legL.foot.rotation.set(0.15, 0, 0);
    U.legR.foot.rotation.set(0.15, 0, 0);

    // Measure feet world positions and adjust bot up/down so feet touch floor exactly
    const fL = new THREE.Vector3();
    const fR = new THREE.Vector3();
    U.legL.foot.getWorldPosition(fL);
    U.legR.foot.getWorldPosition(fR);
    const minFootY = Math.min(fL.y, fR.y);

    // shift bot so lowest foot lands on floor
    bot.position.y += (floorY - minFootY);

    // --- Arms: hands on table edge, pointing inward ---
    // We’ll aim hands toward a point near table edge in front of each seat.
    const tableEdgeY = (tableY + 0.07);
    const handIn = 0.18;
    const handForward = -0.28;

    // shoulders slightly forward
    U.armL.shoulder.rotation.set(0.55, 0, 0.20);
    U.armR.shoulder.rotation.set(0.55, 0, -0.20);

    // elbows bent
    U.armL.upper.rotation.set(0.60, 0.10, 0.0);
    U.armR.upper.rotation.set(0.60, -0.10, 0.0);

    U.armL.lower.rotation.set(-0.85, 0.05, 0.0);
    U.armR.lower.rotation.set(-0.85, -0.05, 0.0);

    // Place hands in a stable “rest” relative to chest
    U.armL.hand.position.set(-handIn, -0.24, handForward);
    U.armR.hand.position.set(+handIn, -0.24, handForward);

    // Flatten hands
    U.armL.hand.rotation.set(-0.25, 0.0, 0.0);
    U.armR.hand.rotation.set(-0.25, 0.0, 0.0);

    // Small forward torso nudge so hands reach table area
    // (doesn’t break feet because we corrected foot contact above)
    bot.position.addScaledVector(toTable, 0.06);

    // Save state
    U.seated = true;
    U.seatIndex = seatIndex;
  }

  // ---------- Subtle idle animation (breathing + micro hand motion) ----------
  function animateSeated(bot, dt) {
    const U = bot.userData;
    if (!U?.seated) return;

    U.t += dt;
    const b = 0.015 * Math.sin(U.t * 1.6);
    const n = 0.02 * Math.sin(U.t * 0.9 + 1.1);

    // breathe
    U.chest.position.y = 0.10 + b;
    U.headPivot.rotation.x = 0.10 + n * 0.12;

    // tiny hand movement (like fidgeting chips/cards)
    U.armL.hand.rotation.z = 0.0 + Math.sin(U.t * 1.9) * 0.06;
    U.armR.hand.rotation.z = 0.0 - Math.sin(U.t * 2.1) * 0.06;
  }

  // ---------- Public API ----------
  function init({ THREE: _T, scene: _S, getSeats: _G, tableFocus: _F, metrics: _M, config: _C } = {}) {
    THREE = _T; scene = _S;
    getSeats = _G;
    tableFocus = _F || new THREE.Vector3(0, 0, -6.5);
    metrics = _M || { seatY: 0.42, tableY: 0.92, handTableY: 0.99 };
    B.config = Object.assign(B.config, _C || {});

    // cleanup
    for (const b of B.bots) { try { scene.remove(b); } catch {} }
    B.bots = [];

    // create seated bots (6-max)
    const count = Math.max(1, Math.min(6, B.config.count || 6));
    for (let i = 0; i < count; i++) {
      const bot = makeBot();
      bot.name = "Bot_" + (i + 1);

      // scale for human-ish size
      bot.scale.setScalar(1.0);

      scene.add(bot);
      B.bots.push(bot);

      sitBot(bot, i + 1);
    }
  }

  function setPlayerRig(_playerRig, _camera) {
    playerRig = _playerRig;
    camera = _camera;
  }

  function update(dt) {
    for (const bot of B.bots) {
      if (B.config.idle) animateSeated(bot, dt);
    }
  }

  return { init, update, setPlayerRig };
})();
