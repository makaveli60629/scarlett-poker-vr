// /js/bots.js — Scarlett Poker VR Bots v1.2 (SeatAnchor snap + Outfit textures)
// No external imports. world.js passes THREE in.
// Expects getSeats() -> array of { position, yaw, sitY, lookAt, anchor? }

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let bots = [];
  let getSeats = null;

  function L(...a) { try { console.log(...a); } catch {} }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ✅ Outfit texture (change this path if needed)
  const BOT_SHIRT_TEX_URL = "assets/textures/avatars/bot_shirt_futuristic_blue.png";

  // cached materials so we don't load 5 times
  const Mats = {
    shirt: null,
    dark: null,
    skin: null,
    loaded: false
  };

  async function ensureMaterials() {
    if (Mats.loaded) return;
    Mats.loaded = true;

    Mats.dark = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.9, metalness: 0.08 });
    Mats.skin = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.85, metalness: 0.0 });

    // load shirt texture
    const loader = new THREE.TextureLoader();
    const tex = await new Promise((resolve) => {
      loader.load(
        BOT_SHIRT_TEX_URL,
        (t) => {
          try { t.colorSpace = THREE.SRGBColorSpace; } catch {}
          resolve(t);
        },
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
      // fallback color if missing
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

    // Torso (with outfit texture)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), matBody);
    torso.position.set(0, 0.52, 0);
    torso.name = "Torso";
    hips.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), matSkin);
    head.position.set(0, 0.78, 0.02);
    head.name = "Head";
    hips.add(head);

    // Neck accent
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 10), matDark);
    neck.position.set(0, 0.70, 0.02);
    hips.add(neck);

    // Arms (outfit texture)
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

    // store refs for animation + pose
    g.userData = { hips, head, torso, legL, legR, sit: 0 };

    // default standing pose
    setSitAmount(g, 0);

    return g;
  }

  // Smooth sit/stand pose (leg forward + better bend)
  function setSitAmount(avatar, amt01) {
    const a = avatar?.userData;
    if (!a) return;

    const t = clamp(amt01, 0, 1);
    a.sit = t;

    const legForward = lerp(0.00, 0.22, t);
    const torsoLean = lerp(-0.05, 0.18, t);
    const hipBend = lerp(0.02, -0.85, t);

    a.torso.rotation.x = torsoLean;
    a.head.rotation.x = lerp(0.02, -0.06, t);

    a.legL.rotation.x = hipBend;
    a.legR.rotation.x = hipBend;

    a.legL.position.z = legForward;
    a.legR.position.z = legForward;
  }

  // Place avatar on a given seat (SeatAnchor snap if available)
  function placeAtSeat(avatar, seat) {
    // Prefer authoritative anchor
    if (seat.anchor && seat.anchor.getWorldPosition) {
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      seat.anchor.getWorldPosition(wp);
      seat.anchor.getWorldQuaternion(wq);

      avatar.position.set(wp.x, 0, wp.z); // root stays on floor
      avatar.quaternion.copy(wq);

      const HIP_ABOVE_SEAT = 0.18; // tune 0.14–0.22
      avatar.userData.hips.position.y = (seat.sitY ?? 0.52) + HIP_ABOVE_SEAT;

      // tiny forward slide onto seat
      avatar.translateZ(0.04);

      setSitAmount(avatar, 1);
      return;
    }

    // Fallback
    const p = seat.position.clone();
    avatar.position.set(p.x, 0, p.z);

    if (typeof seat.yaw === "number") avatar.rotation.y = seat.yaw;
    else if (seat.lookAt) { const t = seat.lookAt.clone(); t.y = 0; avatar.lookAt(t); }

    const HIP_ABOVE_SEAT = 0.18;
    avatar.userData.hips.position.y = (seat.sitY ?? 0.52) + HIP_ABOVE_SEAT;
    avatar.translateZ(0.04);
    setSitAmount(avatar, 1);
  }

  function updateBot(bot, dt, t) {
    const av = bot.avatar;
    const u = av.userData;

    const breathe = Math.sin(t * 1.8 + bot.seed) * 0.015;
    u.torso.position.y = 0.52 + breathe;

    u.head.rotation.y = Math.sin(t * 0.9 + bot.seed) * 0.18;
  }

  return {
    async init({ THREE: _THREE, scene, getSeats: _getSeats }) {
      THREE = _THREE;
      getSeats = _getSeats;

      await ensureMaterials();

      if (root) {
        try { scene.remove(root); } catch {}
      }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      bots = [];

      const seats = (typeof getSeats === "function") ? getSeats() : [];

      // Seat 0 is player, bots use seats 1..5 (6-seat table)
      for (let i = 1; i < 6; i++) {
        const seat = seats[i];
        if (!seat) continue;

        const av = makeBotAvatar();
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
