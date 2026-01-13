// /js/humanoid_factory.js — HumanoidFactory v1 (Faceted Low-Poly, Segmented Joints)
// ✅ Shared builder for BOTH Avatar + Bots (consistent style)
// ✅ Pure geometry (Quest-friendly), no external assets
// ✅ Returns { root, parts } so systems can animate joints

export function createHumanoid(THREE, opt = {}) {
  const {
    scale = 1,
    materials = {},
    style = "humanoid", // reserved
    proportions = {}
  } = opt;

  const matSkin = materials.skin || new THREE.MeshStandardMaterial({ color: 0xd9c7b3, roughness: 0.85, metalness: 0.02 });
  const matCloth = materials.cloth || new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.95, metalness: 0.04 });
  const matAccent = materials.accent || new THREE.MeshStandardMaterial({
    color: 0xc8d3ff, roughness: 0.35, metalness: 0.55,
    emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.08
  });

  // Proportions (tweak here to match your reference)
  const P = {
    height: proportions.height ?? 1.75,
    shoulderW: proportions.shoulderW ?? 0.44,
    hipW: proportions.hipW ?? 0.28,
    torsoH: proportions.torsoH ?? 0.55,
    headR: proportions.headR ?? 0.16,
    armLen: proportions.armLen ?? 0.56,
    legLen: proportions.legLen ?? 0.78,
    ...proportions
  };

  const root = new THREE.Group();
  root.name = "HUMANOID";
  root.scale.setScalar(scale);

  // --- Core body group ---
  const body = new THREE.Group();
  body.name = "BODY";
  root.add(body);

  // Faceted torso (use low-detail icosahedrons for the clean planar look)
  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 0), matCloth);
  chest.name = "CHEST";
  chest.scale.set(1.25, 1.65, 0.95);
  chest.position.set(0, 1.32, 0.03);
  body.add(chest);

  const abs = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 0), matCloth);
  abs.name = "ABS";
  abs.scale.set(1.10, 1.25, 0.90);
  abs.position.set(0, 1.12, 0.03);
  body.add(abs);

  const hips = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), matCloth);
  hips.name = "HIPS";
  hips.scale.set(1.15, 0.85, 0.95);
  hips.position.set(0, 0.96, 0.02);
  body.add(hips);

  // Neck + head (faceted)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.11, 7), matSkin);
  neck.name = "NECK";
  neck.position.set(0, 1.58, 0.03);
  body.add(neck);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(P.headR, 0), matSkin);
  head.name = "HEAD";
  head.scale.set(1.0, 1.1, 0.95);
  head.position.set(0, 1.78, 0.03);
  body.add(head);

  // Shoulder cap piece (gives that clean shoulder segmentation)
  const shoulderCapGeo = new THREE.IcosahedronGeometry(0.12, 0);

  // --- Arms (segmented joints) ---
  const armL = makeArm(THREE, matCloth, matSkin, matAccent, true);
  const armR = makeArm(THREE, matCloth, matSkin, matAccent, false);

  armL.root.position.set(-P.shoulderW / 2, 1.50, 0.02);
  armR.root.position.set( P.shoulderW / 2, 1.50, 0.02);

  // Shoulder caps
  const capL = new THREE.Mesh(shoulderCapGeo, matCloth);
  capL.scale.set(1.25, 1.05, 1.10);
  capL.position.set(-P.shoulderW / 2, 1.52, 0.02);
  body.add(capL);

  const capR = new THREE.Mesh(shoulderCapGeo, matCloth);
  capR.scale.set(1.25, 1.05, 1.10);
  capR.position.set( P.shoulderW / 2, 1.52, 0.02);
  body.add(capR);

  body.add(armL.root, armR.root);

  // --- Legs ---
  const legL = makeLeg(THREE, matCloth, matAccent, true);
  const legR = makeLeg(THREE, matCloth, matAccent, false);

  legL.root.position.set(-P.hipW / 2, 0.92, 0);
  legR.root.position.set( P.hipW / 2, 0.92, 0);

  body.add(legL.root, legR.root);

  // Optional subtle “belt” accent ring (looks nice in low poly)
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 16), matAccent);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 1.02, 0.04);
  belt.scale.set(1.6, 1.1, 1.0);
  body.add(belt);

  // Position entire humanoid so feet near y=0
  root.position.y = 0;

  return {
    root,
    parts: {
      body, chest, abs, hips, neck, head,
      armL, armR,
      legL, legR
    }
  };
}

function makeArm(THREE, matCloth, matSkin, matAccent, isLeft) {
  const root = new THREE.Group();
  root.name = isLeft ? "ARM_L" : "ARM_R";

  // Upper arm (faceted cylinder)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.26, 7), matCloth);
  upper.position.set(0, -0.14, 0);
  root.add(upper);

  // Elbow joint ring
  const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 14), matAccent);
  elbow.rotation.x = Math.PI / 2;
  elbow.position.set(0, -0.28, 0.02);
  root.add(elbow);

  // Forearm
  const foreRoot = new THREE.Group();
  foreRoot.name = "FORE_ROOT";
  foreRoot.position.set(0, -0.28, 0);
  root.add(foreRoot);

  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.24, 7), matCloth);
  fore.position.set(0, -0.14, 0.02);
  foreRoot.add(fore);

  // Wrist ring
  const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.010, 6, 14), matAccent);
  wrist.rotation.x = Math.PI / 2;
  wrist.position.set(0, -0.25, 0.03);
  foreRoot.add(wrist);

  // Hand (faceted mitt)
  const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matSkin);
  hand.scale.set(0.90, 0.65, 1.25);
  hand.position.set(0, -0.30, 0.06);
  foreRoot.add(hand);

  // slight outward angle
  root.rotation.z = isLeft ? 0.08 : -0.08;

  return { root, upper, foreRoot, fore, elbow, wrist, hand };
}

function makeLeg(THREE, matCloth, matAccent, isLeft) {
  const root = new THREE.Group();
  root.name = isLeft ? "LEG_L" : "LEG_R";

  // Upper leg
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.33, 7), matCloth);
  upper.position.set(0, -0.17, 0);
  root.add(upper);

  // Knee ring
  const knee = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14), matAccent);
  knee.rotation.x = Math.PI / 2;
  knee.position.set(0, -0.34, 0.02);
  root.add(knee);

  // Lower leg root
  const shinRoot = new THREE.Group();
  shinRoot.name = "SHIN_ROOT";
  shinRoot.position.set(0, -0.34, 0);
  root.add(shinRoot);

  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.050, 0.30, 7), matCloth);
  shin.position.set(0, -0.16, 0.02);
  shinRoot.add(shin);

  // Foot (faceted)
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), matCloth);
  foot.position.set(0, -0.34, 0.10);
  shinRoot.add(foot);

  return { root, upper, shinRoot, shin, knee, foot };
}
