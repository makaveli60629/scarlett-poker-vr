// /js/avatar_rig.js — lightweight rigged "pill body" (GitHub Pages safe)
// ✅ No imports; caller passes THREE.

export async function createAvatarRig({ THREE, textureUrl }) {
  const root = new THREE.Group();
  root.name = "AvatarRigRoot";

  const loader = new THREE.TextureLoader();
  const tex = await new Promise((resolve) => {
    loader.load(textureUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; resolve(t); }, undefined, () => resolve(null));
  });

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex || null,
    roughness: 0.85,
    metalness: 0.05,
  });

  // bones
  const hip = new THREE.Bone(); hip.position.y = 0.98;
  const spine = new THREE.Bone(); spine.position.y = 0.28;
  const chest = new THREE.Bone(); chest.position.y = 0.22;

  const shoulderL = new THREE.Bone(); shoulderL.position.set(-0.22, 0.14, 0);
  const shoulderR = new THREE.Bone(); shoulderR.position.set( 0.22, 0.14, 0);

  const thighL = new THREE.Bone(); thighL.position.set(-0.12, -0.22, 0);
  const thighR = new THREE.Bone(); thighR.position.set( 0.12, -0.22, 0);

  hip.add(spine); spine.add(chest);
  chest.add(shoulderL); chest.add(shoulderR);
  hip.add(thighL); hip.add(thighR);

  // geometry (capsule with shoulder width)
  const geo = new THREE.CapsuleGeometry(0.25, 0.84, 10, 18);
  geo.translate(0, 0.92, 0);

  // simple skin to hip/spine/chest
  const pos = geo.attributes.position;
  const skinIndex = [];
  const skinWeight = [];
  const bones = [hip, spine, chest];

  const yMin = 0.50, yMax = 1.80;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y - yMin) / (yMax - yMin), 0, 1);
    const a = t * (bones.length - 1);
    const i0 = Math.floor(a);
    const i1 = Math.min(bones.length - 1, i0 + 1);
    const w1 = a - i0;
    const w0 = 1 - w1;
    skinIndex.push(i0, i1, 0, 0);
    skinWeight.push(w0, w1, 0, 0);
  }

  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));

  const skinned = new THREE.SkinnedMesh(geo, mat);
  skinned.frustumCulled = false;

  const skeleton = new THREE.Skeleton([hip, spine, chest, shoulderL, shoulderR, thighL, thighR]);
  skinned.add(hip);
  skinned.bind(skeleton);

  // initial pose shoulders slightly out (so shirts fill better)
  shoulderL.rotation.z = 0.35;
  shoulderR.rotation.z = -0.35;

  root.add(skinned);

  // animation
  let t = Math.random() * 10;
  function update(dt, speed = 1.0) {
    t += dt;
    const phase = t * (2.4 + speed * 0.8);

    thighL.rotation.x = Math.sin(phase) * 0.55;
    thighR.rotation.x = Math.sin(phase + Math.PI) * 0.55;

    shoulderL.rotation.x = Math.sin(phase + Math.PI) * 0.28;
    shoulderR.rotation.x = Math.sin(phase) * 0.28;

    spine.rotation.x = Math.sin(t * 1.6) * 0.03;
    chest.rotation.x = Math.sin(t * 1.8) * 0.03;
  }

  return { root, skinned, update };
}
