// /js/bots.js — Scarlett Poker VR Bots v1.1 (SEATING FIXED)
// Expects world.js provides getSeats() -> array of { position, yaw, sitY, lookAt }

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let bots = [];
  let getSeats = null;
  let tableFocus = null;
  let lobbyZone = null;

  function L(...a) { try { console.log(...a); } catch {} }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function makeMaterial(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  }

  function makeBotAvatar(color = 0x5ac8fa) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const matBody = makeMaterial(color);
    const matDark = makeMaterial(0x12131a);
    const matSkin = makeMaterial(0xd2b48c);

    // Root sits on floor; we position parts upward via hips group.
    const hips = new THREE.Group();
    hips.name = "Hips";
    g.add(hips);

    // Torso (centered above hips)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), matBody);
    torso.position.set(0, 0.52, 0);
    torso.name = "Torso";
    hips.add(torso);

    // Head (above torso)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), matSkin);
    head.position.set(0, 0.78, 0.02);
    head.name = "Head";
    hips.add(head);

    // Neck accent
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

    // Legs as joints (thigh + shin), so we can “bend knees”
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

    // Hands (simple spheres)
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handL.position.set(-0.25, 0.40, 0.08);
    hips.add(handL);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), matSkin);
    handR.position.set(0.25, 0.40, 0.08);
    hips.add(handR);

    // store refs for animation + pose
    g.userData = {
      hips,
      head,
      torso,
      legL,
      legR,
      baseColor: color,
      sit: 0
    };

    // default standing pose
    setSitAmount(g, 0);

    return g;
  }

  // Smooth sit/stand pose (FIXED: leg forward + better bend)
  function setSitAmount(avatar, amt01) {
    const a = avatar?.userData;
    if (!a) return;

    const t = clamp(amt01, 0, 1);
    a.sit = t;

    // --- Pose tuning constants ---
    // Push legs forward so knees/feet clear chair + table
    const legForward = lerp(0.00, 0.22, t);
    // Small torso lean back when sitting
    const torsoLean = lerp(-0.05, 0.18, t);
    // Hip bend (rotate legs at hip)
    const hipBend = lerp(0.02, -0.85, t);

    // torso + head
    a.torso.rotation.x = torsoLean;
    a.head.rotation.x = lerp(0.02, -0.06, t);

    // Bend legs and move them forward as a whole
    a.legL.rotation.x = hipBend;
    a.legR.rotation.x = hipBend;

    // ✅ shove both leg roots forward so thighs/knees don't clip the chair
    a.legL.position.z = legForward;
    a.legR.position.z = legForward;
  }

  // Place avatar on a given seat (FIXED: hip offset + small forward slide)
  function placeAtSeat(avatar, seat) {
    const p = seat.position.clone();

    // Root at chair XZ
    avatar.position.set(p.x, 0, p.z);

    // Face table / seat direction
    if (typeof seat.yaw === "number") {
      avatar.rotation.y = seat.yaw;
    } else if (seat.lookAt) {
      const t = seat.lookAt.clone();
      t.y = 0;
      avatar.lookAt(t);
    }

    // ✅ Critical: seat.sitY is usually the SEAT SURFACE height (cushion),
    // not the hip joint height. Add offset so butt doesn’t sink into chair.
    const HIP_ABOVE_SEAT = 0.18; // adjust 0.14–0.22 if needed
    const SLIDE_FORWARD = 0.04;  // subtle slide onto the seat

    // Lift hips to seated hip height
    avatar.userData.hips.position.y = (seat.sitY ?? 0.45) + HIP_ABOVE_SEAT;

    // Small forward slide so they don't sit "behind" chair back
    avatar.translateZ(SLIDE_FORWARD);

    // Sitting pose
    setSitAmount(avatar, 1);
  }

  function updateBot(bot, dt, t) {
    const av = bot.avatar;
    const u = av.userData;

    // subtle idle motion
    const breathe = Math.sin(t * 1.8 + bot.seed) * 0.015;
    u.torso.position.y = 0.52 + breathe;

    // head look wobble (small)
    u.head.rotation.y = Math.sin(t * 0.9 + bot.seed) * 0.18;
  }

  return {
    init({ THREE: _THREE, scene, getSeats: _getSeats, getLobbyZone, tableFocus: _tableFocus }) {
      THREE = _THREE;
      getSeats = _getSeats;
      tableFocus = _tableFocus || new THREE.Vector3(0, 0, -6.5);
      lobbyZone = getLobbyZone ? getLobbyZone() : null;

      if (root) {
        try { scene.remove(root); } catch {}
      }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      bots = [];

      const seats = (typeof getSeats === "function") ? getSeats() : [];
      const colors = [0xff6b6b, 0x4cd964, 0x5ac8fa, 0xffcc00, 0xffffff];

      // Seat 0 is player, bots use seats 1..5 (6-seat table)
      for (let i = 1; i < 6; i++) {
        const seat = seats[i];
        if (!seat) continue;

        const av = makeBotAvatar(colors[i - 1]);
        placeAtSeat(av, seat);

        root.add(av);
        bots.push({ avatar: av, seatIndex: i, seed: Math.random() * 10 });
      }

      L("[Bots] init ✅ bots=" + bots.length);
    },

    update(dt) {
      if (!root) return;
      const t = (root.userData.t = (root.userData.t || 0) + dt);
      for (const b of bots) {
        try { updateBot(b, dt, t); } catch {}
      }
    }
  };
})();
