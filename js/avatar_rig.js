// /js/avatar_rig.js — Scarlett Avatar Rig (NO THREE import)
// Exports: createAvatarRig()

export function createAvatarRig({ THREE, texLoader, variant = "male", texturePath = null }) {
  const g = new THREE.Group();
  g.name = `AvatarRig_${variant}`;

  // simple skeleton-ish joints (we animate these)
  const hips = new THREE.Group(); hips.name = "hips";
  const spine = new THREE.Group(); spine.name = "spine";
  const chest = new THREE.Group(); chest.name = "chest";
  const neck = new THREE.Group(); neck.name = "neck";
  const head = new THREE.Group(); head.name = "head";
  const armL = new THREE.Group(); armL.name = "armL";
  const armR = new THREE.Group(); armR.name = "armR";
  const legL = new THREE.Group(); legL.name = "legL";
  const legR = new THREE.Group(); legR.name = "legR";

  g.add(hips);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  chest.add(armL);
  chest.add(armR);
  hips.add(legL);
  hips.add(legR);

  // scale + proportions (meters)
  const bodyH = variant === "female" ? 1.62 : 1.70;

  // materials
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.85 });
  let suitMat = baseMat;

  if (texturePath && texLoader) {
    const t = texLoader.load(
      texturePath,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; },
      undefined,
      () => {}
    );
    suitMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.05 });
  }

  // body “pill” (what you described) — torso capsule-ish
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.20, 0.45, 8, 18),
    suitMat
  );
  torso.position.y = 0.95;
  chest.add(torso);

  // hips block
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.15, 6, 16), suitMat);
  pelvis.position.y = 0.65;
  hips.add(pelvis);

  // head (helmet-ish)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), suitMat);
  helmet.position.y = 0.10;
  head.add(helmet);

  // visor
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 14, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x3ad6ff, emissive: 0x0b3a44, emissiveIntensity: 0.6, roughness: 0.25 })
  );
  visor.scale.z = 0.6;
  visor.position.set(0, 0.08, 0.08);
  head.add(visor);

  // arms
  armL.position.set(-0.24, 1.05, 0);
  armR.position.set( 0.24, 1.05, 0);

  const upperArmGeo = new THREE.CapsuleGeometry(0.05, 0.20, 6, 12);
  const foreArmGeo  = new THREE.CapsuleGeometry(0.045, 0.18, 6, 12);

  const upperL = new THREE.Mesh(upperArmGeo, suitMat);
  const foreL  = new THREE.Mesh(foreArmGeo, suitMat);
  upperL.position.y = -0.10;
  foreL.position.y  = -0.35;
  armL.add(upperL); armL.add(foreL);

  const upperR = new THREE.Mesh(upperArmGeo, suitMat);
  const foreR  = new THREE.Mesh(foreArmGeo, suitMat);
  upperR.position.y = -0.10;
  foreR.position.y  = -0.35;
  armR.add(upperR); armR.add(foreR);

  // simple hands (mitts)
  const handGeo = new THREE.SphereGeometry(0.05, 12, 10);
  const handL = new THREE.Mesh(handGeo, suitMat);
  const handR = new THREE.Mesh(handGeo, suitMat);
  handL.position.set(0, -0.52, 0.02);
  handR.position.set(0, -0.52, 0.02);
  armL.add(handL);
  armR.add(handR);

  // legs
  legL.position.set(-0.11, 0.62, 0);
  legR.position.set( 0.11, 0.62, 0);

  const thighGeo = new THREE.CapsuleGeometry(0.06, 0.25, 8, 14);
  const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.25, 8, 14);

  const thighL = new THREE.Mesh(thighGeo, suitMat);
  const shinL  = new THREE.Mesh(shinGeo, suitMat);
  thighL.position.y = -0.18;
  shinL.position.y  = -0.52;
  legL.add(thighL); legL.add(shinL);

  const thighR = new THREE.Mesh(thighGeo, suitMat);
  const shinR  = new THREE.Mesh(shinGeo, suitMat);
  thighR.position.y = -0.18;
  shinR.position.y  = -0.52;
  legR.add(thighR); legR.add(shinR);

  // feet
  const footGeo = new THREE.BoxGeometry(0.10, 0.05, 0.22);
  const footL = new THREE.Mesh(footGeo, suitMat);
  const footR = new THREE.Mesh(footGeo, suitMat);
  footL.position.set(0, -0.78, 0.08);
  footR.position.set(0, -0.78, 0.08);
  legL.add(footL);
  legR.add(footR);

  // overall scale to target height
  g.scale.setScalar(bodyH / 1.70);

  // expose joints for animation
  g.userData.joints = { hips, chest, head, armL, armR, legL, legR };

  return g;
}
