// /js/avatar_rig.js — Scarlett Avatar Rig (GitHub Pages SAFE: no bare "three" import)
//
// Exports:
// - createAvatarRig({ THREE, textureUrl, gender })
//   returns { root, skinned, skeleton, bones, mixer, actions, setPose(), playWalk() }

export function createAvatarRig({ THREE, textureUrl = null, gender = "male" } = {}) {
  // --- Basic proportions (meters) ---
  const H = 1.68; // overall height baseline
  const shoulderW = gender === "female" ? 0.34 : 0.40;
  const hipW = gender === "female" ? 0.30 : 0.34;

  // --- Bones ---
  const root = new THREE.Group();
  root.name = "AvatarRoot";

  const bones = {};
  const mkBone = (name) => {
    const b = new THREE.Bone();
    b.name = name;
    bones[name] = b;
    return b;
  };

  const hips = mkBone("Hips");
  hips.position.set(0, 0.95, 0);

  const spine = mkBone("Spine");
  spine.position.set(0, 0.12, 0);

  const chest = mkBone("Chest");
  chest.position.set(0, 0.18, 0);

  const neck = mkBone("Neck");
  neck.position.set(0, 0.16, 0);

  const head = mkBone("Head");
  head.position.set(0, 0.12, 0);

  const lUpperArm = mkBone("LeftUpperArm");
  lUpperArm.position.set(-shoulderW * 0.5, 0.14, 0);

  const lLowerArm = mkBone("LeftLowerArm");
  lLowerArm.position.set(-0.25, 0, 0);

  const lHand = mkBone("LeftHand");
  lHand.position.set(-0.24, 0, 0);

  const rUpperArm = mkBone("RightUpperArm");
  rUpperArm.position.set(shoulderW * 0.5, 0.14, 0);

  const rLowerArm = mkBone("RightLowerArm");
  rLowerArm.position.set(0.25, 0, 0);

  const rHand = mkBone("RightHand");
  rHand.position.set(0.24, 0, 0);

  const lUpperLeg = mkBone("LeftUpperLeg");
  lUpperLeg.position.set(-hipW * 0.5, -0.05, 0);

  const lLowerLeg = mkBone("LeftLowerLeg");
  lLowerLeg.position.set(0, -0.42, 0);

  const lFoot = mkBone("LeftFoot");
  lFoot.position.set(0, -0.41, 0.05);

  const rUpperLeg = mkBone("RightUpperLeg");
  rUpperLeg.position.set(hipW * 0.5, -0.05, 0);

  const rLowerLeg = mkBone("RightLowerLeg");
  rLowerLeg.position.set(0, -0.42, 0);

  const rFoot = mkBone("RightFoot");
  rFoot.position.set(0, -0.41, 0.05);

  // hierarchy
  root.add(hips);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  chest.add(lUpperArm);
  lUpperArm.add(lLowerArm);
  lLowerArm.add(lHand);

  chest.add(rUpperArm);
  rUpperArm.add(rLowerArm);
  rLowerArm.add(rHand);

  hips.add(lUpperLeg);
  lUpperLeg.add(lLowerLeg);
  lLowerLeg.add(lFoot);

  hips.add(rUpperLeg);
  rUpperLeg.add(rLowerLeg);
  rLowerLeg.add(rFoot);

  // --- Skinned Mesh (simple “pill body” but skinned so it animates) ---
  const geom = buildPillBodyGeometry(THREE, {
    height: H,
    shoulderW,
    hipW,
    chestDepth: 0.22,
    hipDepth: 0.22
  });

  // load texture (optional)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x10121a,
    roughness: 0.72,
    metalness: 0.12
  });

  if (textureUrl) {
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        mat.map = t;
        mat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
  }

  const skinned = new THREE.SkinnedMesh(geom, mat);
  skinned.name = "AvatarSkinnedBody";

  // bind skeleton
  const boneList = [
    hips, spine, chest, neck, head,
    lUpperArm, lLowerArm, lHand,
    rUpperArm, rLowerArm, rHand,
    lUpperLeg, lLowerLeg, lFoot,
    rUpperLeg, rLowerLeg, rFoot
  ];

  const skeleton = new THREE.Skeleton(boneList);
  skinned.add(hips);
  skinned.bind(skeleton);

  // helper pose controls + mixer
  const mixer = new THREE.AnimationMixer(skinned);

  const api = {
    root,
    skinned,
    skeleton,
    bones,
    mixer,
    actions: {},
    setPose,
    playWalk
  };

  // attach mesh under root
  root.add(skinned);

  // default pose
  setPose("idle");

  // build a simple “walk” clip so bots can move without extra assets
  api.actions.walk = mixer.clipAction(makeWalkClip(THREE, bones));
  api.actions.idle = mixer.clipAction(makeIdleClip(THREE, bones));
  api.actions.idle.play();

  return api;

  // ---- functions ----
  function setPose(mode = "idle") {
    // mild “natural” arms
    bones.LeftUpperArm.rotation.z = 0.10;
    bones.RightUpperArm.rotation.z = -0.10;
    bones.LeftLowerArm.rotation.z = 0.05;
    bones.RightLowerArm.rotation.z = -0.05;

    if (mode === "sit") {
      // sit: rotate legs forward + lower hips slightly
      bones.Hips.position.y = 0.88;
      bones.LeftUpperLeg.rotation.x = -1.10;
      bones.RightUpperLeg.rotation.x = -1.10;
      bones.LeftLowerLeg.rotation.x = 1.35;
      bones.RightLowerLeg.rotation.x = 1.35;
      bones.LeftFoot.rotation.x = -0.25;
      bones.RightFoot.rotation.x = -0.25;
    } else {
      // stand
      bones.Hips.position.y = 0.95;
      bones.LeftUpperLeg.rotation.x = 0;
      bones.RightUpperLeg.rotation.x = 0;
      bones.LeftLowerLeg.rotation.x = 0;
      bones.RightLowerLeg.rotation.x = 0;
      bones.LeftFoot.rotation.x = 0;
      bones.RightFoot.rotation.x = 0;
    }
  }

  function playWalk(on = true) {
    const walk = api.actions.walk;
    const idle = api.actions.idle;
    if (!walk || !idle) return;

    if (on) {
      idle.fadeOut(0.15);
      walk.reset().fadeIn(0.15).play();
    } else {
      walk.fadeOut(0.15);
      idle.reset().fadeIn(0.15).play();
    }
  }
}

// ---------- Geometry: pill-ish torso + limbs ----------
function buildPillBodyGeometry(THREE, opts) {
  const {
    height = 1.68,
    shoulderW = 0.40,
    hipW = 0.34,
    chestDepth = 0.22,
    hipDepth = 0.22
  } = opts || {};

  // A single geometry that looks like a fitted suit body.
  // We skin it with basic weights (hips/chest/legs/arms) so it animates.
  const segmentsH = 18;
  const segmentsR = 20;

  // Use lathe profile for a smooth “suit” silhouette
  const pts = [];
  const y0 = 0.05;
  const y1 = height - 0.15;

  for (let i = 0; i <= segmentsH; i++) {
    const t = i / segmentsH;
    const y = THREE.MathUtils.lerp(y0, y1, t);

    // radius curve: hips -> waist -> chest
    const waist = 0.14;
    const hip = hipW * 0.23;
    const chest = shoulderW * 0.23;

    let r;
    if (t < 0.35) {
      r = THREE.MathUtils.lerp(hip, waist, t / 0.35);
    } else if (t < 0.70) {
      r = waist;
    } else {
      r = THREE.MathUtils.lerp(waist, chest, (t - 0.70) / 0.30);
    }

    pts.push(new THREE.Vector2(r, y));
  }

  const geom = new THREE.LatheGeometry(pts, segmentsR);
  geom.computeVertexNormals();

  // add UVs that behave like a suit texture
  // LatheGeometry already has UVs, but we’ll keep them as-is.

  // Skin attributes
  const pos = geom.attributes.position;
  const skinIndices = [];
  const skinWeights = [];

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);

    // bone index map in createAvatarRig() order:
    // 0 Hips, 1 Spine, 2 Chest, 3 Neck, 4 Head,
    // 5 LUA, 6 LLA, 7 LH, 8 RUA, 9 RLA, 10 RH,
    // 11 LUL, 12 LLL, 13 LF, 14 RUL, 15 RLL, 16 RF

    // weights by height (simple but good enough to animate)
    let i0 = 0, i1 = 1;
    let w0 = 1, w1 = 0;

    if (y < 0.55) {
      i0 = 0; i1 = 1;
      w0 = 0.85; w1 = 0.15;
    } else if (y < 1.05) {
      i0 = 1; i1 = 2;
      w0 = 0.45; w1 = 0.55;
    } else if (y < 1.30) {
      i0 = 2; i1 = 3;
      w0 = 0.75; w1 = 0.25;
    } else {
      i0 = 3; i1 = 4;
      w0 = 0.85; w1 = 0.15;
    }

    skinIndices.push(i0, i1, 0, 0);
    skinWeights.push(w0, w1, 0, 0);
  }

  geom.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geom.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  return geom;
}

// ---------- Procedural “walk” animation ----------
function makeWalkClip(THREE, bones) {
  const times = [0, 0.25, 0.5, 0.75, 1.0];

  // legs swing
  const legSwing = [0, 0.55, 0, -0.55, 0];
  const invSwing = [0, -0.55, 0, 0.55, 0];

  const tracks = [
    new THREE.NumberKeyframeTrack("Hips.position[y]", times, [0.95, 0.955, 0.95, 0.945, 0.95]),

    new THREE.NumberKeyframeTrack("LeftUpperLeg.rotation[x]", times, legSwing),
    new THREE.NumberKeyframeTrack("RightUpperLeg.rotation[x]", times, invSwing),

    new THREE.NumberKeyframeTrack("LeftLowerLeg.rotation[x]", times, [0.05, 0.25, 0.05, 0.15, 0.05]),
    new THREE.NumberKeyframeTrack("RightLowerLeg.rotation[x]", times, [0.05, 0.15, 0.05, 0.25, 0.05]),

    // arms opposite
    new THREE.NumberKeyframeTrack("LeftUpperArm.rotation[x]", times, invSwing.map(v => v * 0.45)),
    new THREE.NumberKeyframeTrack("RightUpperArm.rotation[x]", times, legSwing.map(v => v * 0.45)),
  ];

  const clip = new THREE.AnimationClip("walk", 1.0, tracks);
  clip.optimize();
  return clip;
}

function makeIdleClip(THREE, bones) {
  const times = [0, 1.0, 2.0];
  const tracks = [
    new THREE.NumberKeyframeTrack("Chest.rotation[x]", times, [0.01, -0.01, 0.01]),
    new THREE.NumberKeyframeTrack("Hips.position[y]", times, [0.95, 0.952, 0.95]),
  ];
  const clip = new THREE.AnimationClip("idle", 2.0, tracks);
  clip.optimize();
  return clip;
        }
