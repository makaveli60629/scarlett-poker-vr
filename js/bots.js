// /js/bots.js — Scarlett Poker VR Bots v1.3
// - SeatAnchor snap seating
// - Auto-fit hips using chair/table spacing
// - Some bots sit, some wander lobby
// No external imports. world.js passes THREE in.
// Expects getSeats() -> array of { position, yaw, sitY, lookAt, anchor? }
// Optional init params: metrics { tableY, seatY }, getLobbyZone()

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let bots = [];
  let getSeats = null;
  let lobbyZone = null;

  // world metrics
  let METRICS = {
    tableY: 0.92, // fallback if not provided
    seatY: 0.52   // fallback if not provided
  };

  function L(...a) { try { console.log(...a); } catch {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ✅ Outfit texture (change this if your path differs)
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

    if (!tex) {
      Mats.shirt.color.setHex(0x2b6cff);
      L("[Bots] ⚠️ missing shirt texture:", BOT_SHIRT_TEX_URL);
    } else {
      L("[Bots] shirt texture loaded ✅");
    }
  }

  function makeBotAvatar() {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const matBody = Mats.shirt || new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.9 });
    const matDark = Mats.dark || new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.9 });
    const matSkin = Mats.skin || new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.85 });

    // Root sits on floor; we position parts upward via hips group.
    const hips = new THREE.Group();
    hips.name = "Hips";
    g.add(hips);

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), matBody);
    torso.position.set(0, 0.52, 0);
    torso.name = "Torso";
    hips.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), matSkin);
    head.position.set(0, 0.78, 0.02);
    head.name = "Head";
    hips.add(head);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 10), matDark);
    neck.position.set(0, 0.70, 0.02);
    hips.add(neck);

    // Arms
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), matBody);
    armL.position.set(-0.18, 0.56, 0.0);
    armL.rotation.z = 0.22;
    hips.add(armL);

    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), matBody);
    armR.position.set(0.18, 0.56, 0.0);
    armR.rotation.z = -0.22;
    hips.add(armR);

    // Legs as joints
    const legL = new THREE.Group(); legL.name = "LegL"; hips.add(legL);
    const legR = new THREE.Group(); legR.name = "LegR"; hips.add(legR);

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

    // Hands
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handL.position.set(-0.25, 0.40, 0.08);
    hips.add(handL);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handR.position.set(0.25, 0.40, 0.08);
    hips.add(handR);

    g.userData = {
      hips, head, torso, legL, legR,
      sit: 0,
      mode: "sit",  // "sit" | "walk"
      walk: { target: null, speed: 0.55, turnSpeed: 3.2 }
    };

    // start standing by default (we'll set sit/walk later)
    setSitAmount(g, 0);

    return g;
  }

  function setSitAmount(avatar, amt01) {
    const a = avatar?.userData;
    if (!a) return;

    const t = clamp(amt01, 0, 1);
    a.sit = t;

    // Sitting pose
    const legForward = lerp(0.00, 0.24, t);
    const torsoLean  = lerp(-0.04, 0.16, t);
    const hipBend    = lerp(0.02, -0.85, t);

    a.torso.rotation.x = torsoLean;
    a.head.rotation.x  = lerp(0.02, -0.06, t);

    a.legL.rotation.x = hipBend;
    a.legR.rotation.x = hipBend;

    a.legL.position.z = legForward;
    a.legR.position.z = legForward;
  }

  function autoHipAboveSeat() {
    // You asked for: floor→table, floor→chair, chair→table spacing.
    // We have seatY (chair seat surface) and tableY (felt height).
    const chairToTable = Math.max(0.20, METRICS.tableY - METRICS.seatY);

    // Convert that spacing into a hip offset that "fits" under the table:
    // - Bigger gap => slightly higher hips allowed
    // - Smaller gap => lower hips so thighs don't collide table
    // Tuned so it stays in a sane range.
    const hip = clamp(0.10 + (chairToTable - 0.35) * 0.35, 0.10, 0.20);
    return hip;
  }

  function placeAtSeat(avatar, seat) {
    // Prefer authoritative anchor
    if (seat.anchor && seat.anchor.getWorldPosition) {
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      seat.anchor.getWorldPosition(wp);
      seat.anchor.getWorldQuaternion(wq);

      avatar.position.set(wp.x, 0, wp.z); // root stays on floor
      avatar.quaternion.copy(wq);
    } else {
      const p = seat.position.clone();
      avatar.position.set(p.x, 0, p.z);
      if (typeof seat.yaw === "number") avatar.rotation.y = seat.yaw;
      else if (seat.lookAt) { const t = seat.lookAt.clone(); t.y = 0; avatar.lookAt(t); }
    }

    // ✅ Auto-fit hip height using world spacing
    const hipAboveSeat = autoHipAboveSeat();
    avatar.userData.hips.position.y = (seat.sitY ?? METRICS.seatY) + hipAboveSeat;

    // Small forward slide onto seat
    avatar.translateZ(0.04);

    // Sitting pose
    setSitAmount(avatar, 1);
    avatar.userData.mode = "sit";
  }

  function setWalkMode(avatar, startPos) {
    avatar.userData.mode = "walk";
    setSitAmount(avatar, 0);

    // Stand hips at a reasonable standing height (not seat-based)
    avatar.userData.hips.position.y = 0.92;

    if (startPos) {
      avatar.position.set(startPos.x, 0, startPos.z);
    }
    avatar.userData.walk.target = null;
  }

  function randomLobbyTarget() {
    const z = lobbyZone || { min: new THREE.Vector3(-6, 0, 6), max: new THREE.Vector3(6, 0, 12) };
    const x = lerp(z.min.x + 0.8, z.max.x - 0.8, Math.random());
    const zz = lerp(z.min.z + 0.8, z.max.z - 0.8, Math.random());
    return new THREE.Vector3(x, 0, zz);
  }

  function updateWalk(bot, dt) {
    const av = bot.avatar;
    const w = av.userData.walk;

    if (!w.target || av.position.distanceTo(w.target) < 0.35) {
      w.target = randomLobbyTarget();
    }

    // Turn toward target
    const dir = new THREE.Vector3().subVectors(w.target, av.position);
    dir.y = 0;
    const desiredYaw = Math.atan2(dir.x, dir.z);

    // Smooth yaw
    let yaw = av.rotation.y;
    let delta = desiredYaw - yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    yaw += delta * clamp(w.turnSpeed * dt, 0, 1);
    av.rotation.y = yaw;

    // Move forward
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    av.position.add(forward.multiplyScalar(w.speed * dt));

    // tiny idle bob
    av.userData.torso.position.y = 0.52 + Math.sin(bot.t * 6.0 + bot.seed) * 0.01;
    av.userData.head.rotation.y = Math.sin(bot.t * 1.2 + bot.seed) * 0.15;
  }

  function updateSit(bot, dt) {
    const av = bot.avatar;
    const u = av.userData;

    // subtle idle motion
    const breathe = Math.sin(bot.t * 1.8 + bot.seed) * 0.015;
    u.torso.position.y = 0.52 + breathe;
    u.head.rotation.y = Math.sin(bot.t * 0.9 + bot.seed) * 0.18;
  }

  return {
    async init({ THREE: _THREE, scene, getSeats: _getSeats, getLobbyZone, metrics }) {
      THREE = _THREE;
      getSeats = _getSeats;
      lobbyZone = getLobbyZone ? getLobbyZone() : null;

      if (metrics?.tableY) METRICS.tableY = metrics.tableY;
      if (metrics?.seatY) METRICS.seatY = metrics.seatY;

      await ensureMaterials();

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      bots = [];

      const seats = (typeof getSeats === "function") ? getSeats() : [];

      // Seat 0 is player.
      // We'll seat 3 bots and make 2 walkers for testing.
      const seatedSeatIndices = [1, 2, 3];
      const walkerSeatIndices = [4, 5];

      // Create seated bots
      for (const idx of seatedSeatIndices) {
        const seat = seats[idx];
        if (!seat) continue;

        const av = makeBotAvatar();
        placeAtSeat(av, seat);
        root.add(av);

        bots.push({ avatar: av, seatIndex: idx, seed: Math.random() * 10, t: 0 });
      }

      // Create walkers (spawn them near lobby center)
      for (const idx of walkerSeatIndices) {
        const av = makeBotAvatar();

        const lobbySpawn = lobbyZone
          ? new THREE.Vector3(
              (lobbyZone.min.x + lobbyZone.max.x) * 0.5 + (Math.random() - 0.5) * 2.0,
              0,
              (lobbyZone.min.z + lobbyZone.max.z) * 0.5 + (Math.random() - 0.5) * 2.0
            )
          : new THREE.Vector3((Math.random() - 0.5) * 4, 0, 9 + Math.random() * 2);

        setWalkMode(av, lobbySpawn);
        root.add(av);

        bots.push({ avatar: av, seatIndex: idx, seed: Math.random() * 10, t: 0 });
      }

      L("[Bots] init ✅ seated=" + seatedSeatIndices.length + " walkers=" + walkerSeatIndices.length);
      L("[Bots] metrics ✅ tableY=" + METRICS.tableY.toFixed(2) + " seatY=" + METRICS.seatY.toFixed(2));
    },

    update(dt) {
      if (!root) return;
      for (const b of bots) {
        b.t += dt;
        if (b.avatar.userData.mode === "walk") updateWalk(b, dt);
        else updateSit(b, dt);
      }
    }
  };
})();
