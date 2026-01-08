// /js/bots.js — Scarlett Poker VR Bots v1.4 (Better Sitting + More Bots + Lobby Crowd)
// No external imports. world.js passes THREE in.

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let bots = [];
  let getSeats = null;
  let lobbyZone = null;

  // world metrics
  let METRICS = { tableY: 0.92, seatY: 0.52 };

  function L(...a) { try { console.log(...a); } catch {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  const BOT_SHIRT_TEX_URL = "./assets/textures/avatars/bot_shirt_futuristic_blue.png";

  const Mats = { shirt: null, dark: null, skin: null, loaded: false };

  async function ensureMaterials() {
    if (Mats.loaded) return;
    Mats.loaded = true;

    Mats.dark = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.9, metalness: 0.08 });
    Mats.skin = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.85, metalness: 0.0 });

    const loader = new THREE.TextureLoader();
    const tex = await new Promise((resolve) => {
      loader.load(
        BOT_SHIRT_TEX_URL,
        (t) => { try { t.colorSpace = THREE.SRGBColorSpace; } catch {} resolve(t); },
        undefined,
        () => resolve(null)
      );
    });

    Mats.shirt = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex || null,
      roughness: 0.92,
      metalness: 0.02
    });

    if (!tex) L("[Bots] ⚠️ missing shirt texture:", BOT_SHIRT_TEX_URL);
    else L("[Bots] shirt texture loaded ✅");
  }

  function makeBotAvatar() {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    // Slightly smaller so chair fits better
    g.scale.setScalar(0.92);

    const matBody = Mats.shirt || new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.9 });
    const matDark = Mats.dark || new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.9 });
    const matSkin = Mats.skin || new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.85 });

    const hips = new THREE.Group();
    hips.name = "Hips";
    g.add(hips);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), matBody);
    torso.position.set(0, 0.52, 0);
    hips.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), matSkin);
    head.position.set(0, 0.78, 0.02);
    hips.add(head);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 10), matDark);
    neck.position.set(0, 0.70, 0.02);
    hips.add(neck);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), matBody);
    armL.position.set(-0.18, 0.56, 0.0);
    armL.rotation.z = 0.22;
    hips.add(armL);

    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), matBody);
    armR.position.set(0.18, 0.56, 0.0);
    armR.rotation.z = -0.22;
    hips.add(armR);

    const legL = new THREE.Group(); hips.add(legL);
    const legR = new THREE.Group(); hips.add(legR);

    const thighL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 6, 10), matDark);
    thighL.position.set(-0.08, 0.28, 0.02);
    legL.add(thighL);

    const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 10), matDark);
    shinL.position.set(-0.08, 0.10, 0.12);
    legL.add(shinL);

    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.16), matDark);
    footL.position.set(-0.08, 0.03, 0.22);
    legL.add(footL);

    const thighR = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 6, 10), matDark);
    thighR.position.set(0.08, 0.28, 0.02);
    legR.add(thighR);

    const shinR = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 10), matDark);
    shinR.position.set(0.08, 0.10, 0.12);
    legR.add(shinR);

    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.16), matDark);
    footR.position.set(0.08, 0.03, 0.22);
    legR.add(footR);

    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handL.position.set(-0.25, 0.40, 0.08);
    hips.add(handL);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handR.position.set(0.25, 0.40, 0.08);
    hips.add(handR);

    g.userData = {
      hips, head, torso, legL, legR,
      mode: "sit",
      t: 0,
      seed: Math.random() * 10,
      walk: { target: null, speed: 0.55, turnSpeed: 3.2 }
    };

    return g;
  }

  function setSitPose(av, amt) {
    const u = av.userData;
    const t = clamp(amt, 0, 1);

    // More chair-friendly sit
    const legForward = lerp(0.00, 0.25, t);
    const torsoLean  = lerp(-0.04, 0.14, t);
    const hipBend    = lerp(0.02, -0.92, t);

    u.torso.rotation.x = torsoLean;
    u.head.rotation.x  = lerp(0.02, -0.05, t);

    u.legL.rotation.x = hipBend;
    u.legR.rotation.x = hipBend;

    u.legL.position.z = legForward;
    u.legR.position.z = legForward;
  }

  function placeAtSeat(av, seat) {
    // SeatAnchor world snap
    if (seat?.anchor?.getWorldPosition) {
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      seat.anchor.getWorldPosition(wp);
      seat.anchor.getWorldQuaternion(wq);

      av.position.set(wp.x, 0, wp.z);
      av.quaternion.copy(wq);
    } else {
      const p = seat.position.clone();
      av.position.set(p.x, 0, p.z);
      if (typeof seat.yaw === "number") av.rotation.y = seat.yaw;
    }

    // ✅ Better hip height: seatY + tuned offset (smaller than before)
    // If they still float: reduce 0.15 → 0.13
    // If they sink: increase 0.15 → 0.17
    const hipAboveSeat = 0.15;
    av.userData.hips.position.y = (seat.sitY ?? METRICS.seatY) + hipAboveSeat;

    // ✅ Pull them BACK onto chair slightly (fix “past the seat”)
    // Positive Z is toward table; negative Z is toward chair back for our chair local.
    av.translateZ(-0.04);

    setSitPose(av, 1);
    av.userData.mode = "sit";
  }

  function randomLobbyTarget() {
    const z = lobbyZone || { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) };
    const x = lerp(z.min.x + 0.8, z.max.x - 0.8, Math.random());
    const zz = lerp(z.min.z + 0.8, z.max.z - 0.8, Math.random());
    return new THREE.Vector3(x, 0, zz);
  }

  function setWalkMode(av, startPos) {
    av.userData.mode = "walk";
    setSitPose(av, 0);
    av.userData.hips.position.y = 0.92;

    if (startPos) av.position.set(startPos.x, 0, startPos.z);
    av.userData.walk.target = null;
  }

  function updateWalk(av, dt) {
    const w = av.userData.walk;
    if (!w.target || av.position.distanceTo(w.target) < 0.35) w.target = randomLobbyTarget();

    const dir = new THREE.Vector3().subVectors(w.target, av.position);
    dir.y = 0;
    const desiredYaw = Math.atan2(dir.x, dir.z);

    let yaw = av.rotation.y;
    let delta = desiredYaw - yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    yaw += delta * clamp(w.turnSpeed * dt, 0, 1);
    av.rotation.y = yaw;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    av.position.add(forward.multiplyScalar(w.speed * dt));
  }

  function updateIdle(av, t) {
    const u = av.userData;
    const breathe = Math.sin(t * 1.8 + u.seed) * 0.015;
    u.torso.position.y = 0.52 + breathe;
    u.head.rotation.y = Math.sin(t * 0.9 + u.seed) * 0.18;
  }

  return {
    async init({ THREE: _THREE, scene, getSeats: _getSeats, getLobbyZone, metrics }) {
      THREE = _THREE;
      getSeats = _getSeats;
      lobbyZone = getLobbyZone ? getLobbyZone() : null;

      if (metrics?.tableY) METRICS.tableY = metrics.tableY;
      if (metrics?.seatY)  METRICS.seatY = metrics.seatY;

      await ensureMaterials();

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      bots = [];

      const seats = (typeof getSeats === "function") ? getSeats() : [];

      // ✅ Seat bots 1..5 (5 seated bots)
      for (let i = 1; i <= 5; i++) {
        const seat = seats[i];
        if (!seat) continue;
        const av = makeBotAvatar();
        placeAtSeat(av, seat);
        root.add(av);
        bots.push(av);
      }

      // ✅ Add lobby crowd walkers (8)
      const crowdCount = 8;
      for (let i = 0; i < crowdCount; i++) {
        const av = makeBotAvatar();
        const z = lobbyZone || { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) };
        const start = new THREE.Vector3(
          lerp(z.min.x + 1.0, z.max.x - 1.0, Math.random()),
          0,
          lerp(z.min.z + 1.0, z.max.z - 1.0, Math.random())
        );
        setWalkMode(av, start);
        root.add(av);
        bots.push(av);
      }

      L("[Bots] init ✅ total=" + bots.length + " seated=5 walkers=8");
    },

    update(dt) {
      if (!root) return;
      root.userData.t = (root.userData.t || 0) + dt;

      for (const av of bots) {
        const t = root.userData.t;
        if (av.userData.mode === "walk") updateWalk(av, dt);
        updateIdle(av, t);
      }
    }
  };
})();
