// /js/avatar1.js — Scarlett Avatar v1.0 (Low-Poly Humanoid + Simple Rig + Walk Cycle)
// Exports:
//   - Avatar1.create({ THREE, gender, height, outfit, skinTone, name }) -> { root, bones, parts, setPose, setLookAt, setScaleToHeight, update }
// Notes:
// - Procedural low-poly human-like mesh built from primitives.
// - Rig is a hierarchy of Object3Ds ("bones") you can rotate for animation.
// - Clothing is basic geometry + materials; swap textures later by replacing materials/maps.

export const Avatar1 = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function makeMat(THREE, { color = 0xffffff, roughness = 0.85, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  }

  // Simple face texture (procedural). Replace later with real textures if you want.
  function makeFaceTexture(THREE, { skin = "#d2b48c" } = {}) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 256, 256);

    // subtle shading
    const grd = ctx.createRadialGradient(128, 120, 20, 128, 128, 140);
    grd.addColorStop(0, "rgba(0,0,0,0.00)");
    grd.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);

    // eyes
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath(); ctx.arc(90, 110, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(166, 110, 10, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(127,231,255,0.65)";
    ctx.beginPath(); ctx.arc(92, 110, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(168, 110, 4, 0, Math.PI * 2); ctx.fill();

    // brows
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(76, 92); ctx.lineTo(104, 88); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(152, 88); ctx.lineTo(180, 92); ctx.stroke();

    // nose
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(128, 115); ctx.lineTo(124, 148); ctx.stroke();

    // mouth
    ctx.strokeStyle = "rgba(120,0,20,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(108, 172); ctx.quadraticCurveTo(128, 182, 148, 172); ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function createBones(THREE) {
    const b = {};

    // Root at feet level (Y=0 ground)
    b.root = new THREE.Group();
    b.root.name = "AvatarRoot";

    // Pelvis / hips at body center
    b.hips = new THREE.Object3D();
    b.hips.name = "hips";
    b.hips.position.set(0, 0.95, 0);
    b.root.add(b.hips);

    b.spine = new THREE.Object3D();
    b.spine.name = "spine";
    b.spine.position.set(0, 0.20, 0);
    b.hips.add(b.spine);

    b.chest = new THREE.Object3D();
    b.chest.name = "chest";
    b.chest.position.set(0, 0.30, 0);
    b.spine.add(b.chest);

    b.neck = new THREE.Object3D();
    b.neck.name = "neck";
    b.neck.position.set(0, 0.28, 0.02);
    b.chest.add(b.neck);

    b.head = new THREE.Object3D();
    b.head.name = "head";
    b.head.position.set(0, 0.12, 0.02);
    b.neck.add(b.head);

    // Arms
    b.shoulderL = new THREE.Object3D();
    b.shoulderR = new THREE.Object3D();
    b.shoulderL.name = "shoulderL";
    b.shoulderR.name = "shoulderR";
    b.shoulderL.position.set(-0.22, 0.23, 0.02);
    b.shoulderR.position.set( 0.22, 0.23, 0.02);
    b.chest.add(b.shoulderL, b.shoulderR);

    b.upperArmL = new THREE.Object3D();
    b.upperArmR = new THREE.Object3D();
    b.upperArmL.name = "upperArmL";
    b.upperArmR.name = "upperArmR";
    b.upperArmL.position.set(-0.10, 0.00, 0);
    b.upperArmR.position.set( 0.10, 0.00, 0);
    b.shoulderL.add(b.upperArmL);
    b.shoulderR.add(b.upperArmR);

    b.elbowL = new THREE.Object3D();
    b.elbowR = new THREE.Object3D();
    b.elbowL.name = "elbowL";
    b.elbowR.name = "elbowR";
    b.elbowL.position.set(-0.18, -0.18, 0.00);
    b.elbowR.position.set( 0.18, -0.18, 0.00);
    b.upperArmL.add(b.elbowL);
    b.upperArmR.add(b.elbowR);

    b.forearmL = new THREE.Object3D();
    b.forearmR = new THREE.Object3D();
    b.forearmL.name = "forearmL";
    b.forearmR.name = "forearmR";
    b.forearmL.position.set(-0.02, -0.02, 0);
    b.forearmR.position.set( 0.02, -0.02, 0);
    b.elbowL.add(b.forearmL);
    b.elbowR.add(b.forearmR);

    b.wristL = new THREE.Object3D();
    b.wristR = new THREE.Object3D();
    b.wristL.name = "wristL";
    b.wristR.name = "wristR";
    b.wristL.position.set(-0.16, -0.18, 0.02);
    b.wristR.position.set( 0.16, -0.18, 0.02);
    b.forearmL.add(b.wristL);
    b.forearmR.add(b.wristR);

    // Legs
    b.hipL = new THREE.Object3D();
    b.hipR = new THREE.Object3D();
    b.hipL.name = "hipL";
    b.hipR.name = "hipR";
    b.hipL.position.set(-0.12, -0.08, 0.02);
    b.hipR.position.set( 0.12, -0.08, 0.02);
    b.hips.add(b.hipL, b.hipR);

    b.kneeL = new THREE.Object3D();
    b.kneeR = new THREE.Object3D();
    b.kneeL.name = "kneeL";
    b.kneeR.name = "kneeR";
    b.kneeL.position.set(0, -0.42, 0);
    b.kneeR.position.set(0, -0.42, 0);
    b.hipL.add(b.kneeL);
    b.hipR.add(b.kneeR);

    b.ankleL = new THREE.Object3D();
    b.ankleR = new THREE.Object3D();
    b.ankleL.name = "ankleL";
    b.ankleR.name = "ankleR";
    b.ankleL.position.set(0, -0.44, 0.02);
    b.ankleR.position.set(0, -0.44, 0.02);
    b.kneeL.add(b.ankleL);
    b.kneeR.add(b.ankleR);

    b.footL = new THREE.Object3D();
    b.footR = new THREE.Object3D();
    b.footL.name = "footL";
    b.footR.name = "footR";
    b.footL.position.set(0, -0.05, 0.08);
    b.footR.position.set(0, -0.05, 0.08);
    b.ankleL.add(b.footL);
    b.ankleR.add(b.footR);

    return b;
  }

  function buildMesh(THREE, bones, opts) {
    const parts = {};
    const gender = opts.gender || "male";

    // proportions (low poly but human-like)
    const body = {
      shoulderWidth: gender === "female" ? 0.44 : 0.48,
      chestDepth:    gender === "female" ? 0.22 : 0.24,
      waistWidth:    gender === "female" ? 0.30 : 0.32,
      hipWidth:      gender === "female" ? 0.34 : 0.33,
      legThickness:  gender === "female" ? 0.105 : 0.115,
      armThickness:  gender === "female" ? 0.085 : 0.090,
      headSize:      0.16
    };

    const skinTone = opts.skinTone ?? 0xd2b48c;

    const mats = {
      skin: makeMat(THREE, { color: skinTone, roughness: 0.65, metalness: 0.03 }),
      hair: makeMat(THREE, { color: 0x1a1412, roughness: 0.85, metalness: 0.02 }),
      shirt: makeMat(THREE, { color: opts.outfit?.shirt ?? 0x141826, roughness: 0.85, metalness: 0.03 }),
      pants: makeMat(THREE, { color: opts.outfit?.pants ?? 0x0f121a, roughness: 0.92, metalness: 0.02 }),
      shoes: makeMat(THREE, { color: opts.outfit?.shoes ?? 0x0b0d14, roughness: 0.55, metalness: 0.15 }),
      accent: makeMat(THREE, { color: opts.outfit?.accent ?? 0x7fe7ff, roughness: 0.35, metalness: 0.15, emissive: opts.outfit?.accent ?? 0x7fe7ff, emissiveIntensity: 0.12 })
    };

    // --- Torso (on chest) ---
    const chestGeo = new THREE.BoxGeometry(body.shoulderWidth, 0.38, body.chestDepth);
    const chest = new THREE.Mesh(chestGeo, mats.shirt);
    chest.position.set(0, 0.18, 0.02);
    chest.castShadow = true;
    bones.chest.add(chest);
    parts.chest = chest;

    // --- Abdomen (on spine) ---
    const bellyGeo = new THREE.BoxGeometry(body.waistWidth, 0.28, body.chestDepth * 0.95);
    const belly = new THREE.Mesh(bellyGeo, mats.shirt);
    belly.position.set(0, 0.02, 0.02);
    bones.spine.add(belly);
    parts.belly = belly;

    // --- Hips / pelvis (on hips) ---
    const hipGeo = new THREE.BoxGeometry(body.hipWidth, 0.22, body.chestDepth * 0.95);
    const hips = new THREE.Mesh(hipGeo, mats.pants);
    hips.position.set(0, -0.12, 0.02);
    bones.hips.add(hips);
    parts.hips = hips;

    // --- Head (on head bone) ---
    const faceTex = makeFaceTexture(THREE, { skin: "#d2b48c" }); // you can swap later
    const headMat = new THREE.MeshStandardMaterial({
      color: skinTone,
      roughness: 0.55,
      metalness: 0.02,
      map: faceTex
    });

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(body.headSize, 1), headMat);
    head.position.set(0, body.headSize, 0.02);
    bones.head.add(head);
    parts.head = head;

    // hair cap
    const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(body.headSize * 1.02, 0), mats.hair);
    hair.scale.set(1.02, 0.85, 1.02);
    hair.position.set(0, body.headSize * 1.10, 0.0);
    bones.head.add(hair);
    parts.hair = hair;

    // --- Arms ---
    function arm(side /* -1 left, +1 right */) {
      const s = side;

      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(body.armThickness, 0.24, 6, 10),
        mats.shirt
      );
      upper.rotation.z = Math.PI / 2;
      upper.position.set(s * 0.12, -0.10, 0.0);
      (s < 0 ? bones.upperArmL : bones.upperArmR).add(upper);

      const fore = new THREE.Mesh(
        new THREE.CapsuleGeometry(body.armThickness * 0.92, 0.22, 6, 10),
        mats.shirt
      );
      fore.rotation.z = Math.PI / 2;
      fore.position.set(s * 0.10, -0.08, 0.0);
      (s < 0 ? bones.forearmL : bones.forearmR).add(fore);

      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.05, 0.10),
        mats.skin
      );
      hand.position.set(s * 0.02, -0.02, 0.05);
      (s < 0 ? bones.wristL : bones.wristR).add(hand);

      // glove accent strip
      const glove = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.018, 0.085),
        mats.accent
      );
      glove.position.set(s * 0.02, 0.01, 0.02);
      (s < 0 ? bones.wristL : bones.wristR).add(glove);

      return { upper, fore, hand, glove };
    }
    parts.armL = arm(-1);
    parts.armR = arm(+1);

    // --- Legs ---
    function leg(side /* -1 left, +1 right */) {
      const s = side;
      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(body.legThickness, 0.34, 6, 10),
        mats.pants
      );
      upper.position.set(0, -0.18, 0);
      (s < 0 ? bones.hipL : bones.hipR).add(upper);

      const lower = new THREE.Mesh(
        new THREE.CapsuleGeometry(body.legThickness * 0.95, 0.32, 6, 10),
        mats.pants
      );
      lower.position.set(0, -0.18, 0);
      (s < 0 ? bones.kneeL : bones.kneeR).add(lower);

      // shoe
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.06, 0.28),
        mats.shoes
      );
      shoe.position.set(0, -0.02, 0.10);
      (s < 0 ? bones.footL : bones.footR).add(shoe);

      // toe cap
      const toe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.035, 0.10),
        mats.accent
      );
      toe.position.set(0, 0.01, 0.20);
      (s < 0 ? bones.footL : bones.footR).add(toe);

      return { upper, lower, shoe, toe };
    }
    parts.legL = leg(-1);
    parts.legR = leg(+1);

    // --- Neck detail ---
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.06, 10), mats.shirt);
    collar.position.set(0, 0.02, 0.02);
    bones.neck.add(collar);
    parts.collar = collar;

    // --- Simple “name plate” anchor point (optional for your tags) ---
    const tagAnchor = new THREE.Object3D();
    tagAnchor.name = "TagAnchor";
    tagAnchor.position.set(0, 1.85, 0);
    bones.root.add(tagAnchor);
    parts.tagAnchor = tagAnchor;

    // Slight “A-pose” baseline
    bones.shoulderL.rotation.z = 0.10;
    bones.shoulderR.rotation.z = -0.10;
    bones.upperArmL.rotation.x = -0.15;
    bones.upperArmR.rotation.x = -0.15;

    return { parts, materials: mats };
  }

  function setScaleToHeight(root, desiredHeightMeters = 1.70) {
    // Our default procedural rig is roughly ~1.75m
    const current = 1.75;
    const s = desiredHeightMeters / current;
    root.scale.setScalar(s);
    return s;
  }

  function create({ THREE, gender = "male", height = 1.72, outfit = {}, skinTone = 0xd2b48c, name = "BOT" } = {}) {
    if (!THREE) throw new Error("Avatar1.create requires THREE");

    const bones = createBones(THREE);
    const { parts, materials } = buildMesh(THREE, bones, { gender, outfit, skinTone, name });

    // Root convenience: place feet on ground
    bones.root.position.set(0, 0, 0);

    // Scale to requested height
    setScaleToHeight(bones.root, height);

    const state = {
      t: 0,
      locomotion: 0,     // 0..1
      walkSpeed: 1.0,    // animation multiplier
      turn: 0,           // radians
      lookYaw: 0,
      lookPitch: 0,
      mood: "neutral"
    };

    function setPose(p = {}) {
      // You can override key bones quickly
      if (p.hips)  bones.hips.rotation.set(p.hips.x || 0, p.hips.y || 0, p.hips.z || 0);
      if (p.chest) bones.chest.rotation.set(p.chest.x || 0, p.chest.y || 0, p.chest.z || 0);
      if (p.head)  bones.head.rotation.set(p.head.x || 0, p.head.y || 0, p.head.z || 0);

      if (p.armL) bones.upperArmL.rotation.x = p.armL.x ?? bones.upperArmL.rotation.x;
      if (p.armR) bones.upperArmR.rotation.x = p.armR.x ?? bones.upperArmR.rotation.x;
      if (p.legL) bones.hipL.rotation.x = p.legL.x ?? bones.hipL.rotation.x;
      if (p.legR) bones.hipR.rotation.x = p.legR.x ?? bones.hipR.rotation.x;
    }

    function setLookAt(targetVec3) {
      if (!targetVec3) return;
      const headWorld = new THREE.Vector3();
      parts.head.getWorldPosition(headWorld);
      const dir = new THREE.Vector3().subVectors(targetVec3, headWorld);
      dir.y = clamp(dir.y, -0.8, 0.8);

      const yaw = Math.atan2(dir.x, dir.z);
      const pitch = -Math.atan2(dir.y, Math.max(0.001, Math.hypot(dir.x, dir.z)));

      state.lookYaw = yaw;
      state.lookPitch = clamp(pitch, -0.45, 0.45);
    }

    function update(dt, params = {}) {
      state.t += dt;

      // Locomotion intensity can be fed by your bot speed
      if (typeof params.locomotion === "number") state.locomotion = clamp(params.locomotion, 0, 1);
      if (typeof params.walkSpeed === "number") state.walkSpeed = clamp(params.walkSpeed, 0.2, 3.0);

      const loc = state.locomotion;
      const w = state.walkSpeed;

      // Walk cycle
      const cycle = state.t * (3.8 * w);
      const s = Math.sin(cycle);
      const c = Math.cos(cycle);

      // Subtle full-body bob
      const bob = (0.012 * loc) * Math.abs(s);
      bones.hips.position.y = 0.95 + bob;

      // Hips sway + counter-rotate chest (more human-like)
      bones.hips.rotation.y = 0.10 * loc * s;
      bones.chest.rotation.y = -0.06 * loc * s;
      bones.chest.rotation.x = 0.03 * loc * Math.abs(s);

      // Legs
      const legFwd = 0.75 * loc;
      bones.hipL.rotation.x =  legFwd * s;
      bones.hipR.rotation.x = -legFwd * s;

      // knees bend when leg comes forward
      bones.kneeL.rotation.x = 0.55 * loc * Math.max(0, -s);
      bones.kneeR.rotation.x = 0.55 * loc * Math.max(0,  s);

      // ankles / feet
      bones.ankleL.rotation.x = -0.20 * loc * Math.max(0, -s);
      bones.ankleR.rotation.x = -0.20 * loc * Math.max(0,  s);

      // Arms swing opposite legs
      const armSwing = 0.55 * loc;
      bones.upperArmL.rotation.x = -0.15 + (-armSwing * s);
      bones.upperArmR.rotation.x = -0.15 + ( armSwing * s);

      // elbows soften
      bones.elbowL.rotation.x = 0.25 + 0.35 * loc * Math.max(0,  s);
      bones.elbowR.rotation.x = 0.25 + 0.35 * loc * Math.max(0, -s);

      // wrists subtle
      bones.wristL.rotation.x = 0.08 * loc * c;
      bones.wristR.rotation.x = -0.08 * loc * c;

      // Head look (blend toward target look if you use setLookAt)
      bones.neck.rotation.y = lerp(bones.neck.rotation.y, state.lookYaw * 0.20, 0.10);
      bones.neck.rotation.x = lerp(bones.neck.rotation.x, state.lookPitch * 0.35, 0.10);

      // Idle breathing even when standing
      const breath = 0.02 * Math.sin(state.t * 1.6);
      bones.chest.rotation.z = 0.02 * breath;
    }

    // A clean “handle” object you can attach into world/bots
    return {
      root: bones.root,
      bones,
      parts,
      materials,
      setPose,
      setLookAt,
      setScaleToHeight: (h) => setScaleToHeight(bones.root, h),
      update
    };
  }

  return { create };
})();
