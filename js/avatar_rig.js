// /js/avatar_rig.js — Scarlett VR Poker (Procedural skinned "pill" bot body)
// GitHub Pages SAFE: no imports. main.js/world.js pass THREE in.
//
// What this gives you:
// - createBotAvatar({THREE, variant:"male"|"female", textureUrl})
// - Returns a THREE.Group with:
//   - skinned torso+legs (one SkinnedMesh) + head mesh + simple hands
// - Simple skeleton + idle/walk animation via avatar.update(dt)
//
// NOTE: This is a lightweight "starter body" so you can swap textures/outfits later.

export function createBotAvatar({
  THREE,
  variant = "male",
  textureUrl = "assets/textures/avatars/suit_male_albedo.png",
  skinTone = 0xf2d6c9,
} = {}) {
  const root = new THREE.Group();
  root.name = "BotAvatar";

  // ---------- texture ----------
  const tex = new THREE.TextureLoader().load(textureUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;

  const suitMat = new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.08,
    skinning: true,
  });

  // ---------- proportions ----------
  const P = variant === "female"
    ? { height: 1.62, shoulder: 0.44, hip: 0.36, chest: 0.40 }
    : { height: 1.72, shoulder: 0.48, hip: 0.38, chest: 0.44 };

  // ---------- bones ----------
  const bones = [];
  const hips = new THREE.Bone(); hips.name = "hips"; hips.position.y = 0.86;
  const spine = new THREE.Bone(); spine.name = "spine"; spine.position.y = 0.18;
  const chest = new THREE.Bone(); chest.name = "chest"; chest.position.y = 0.22;
  const neck = new THREE.Bone(); neck.name = "neck"; neck.position.y = 0.14;
  const headB = new THREE.Bone(); headB.name = "head"; headB.position.y = 0.12;

  const lThigh = new THREE.Bone(); lThigh.name="lThigh"; lThigh.position.set(-0.12, -0.20, 0);
  const lShin  = new THREE.Bone(); lShin.name="lShin";  lShin.position.set(0, -0.44, 0);
  const lFoot  = new THREE.Bone(); lFoot.name="lFoot";  lFoot.position.set(0, -0.44, 0.06);

  const rThigh = new THREE.Bone(); rThigh.name="rThigh"; rThigh.position.set( 0.12, -0.20, 0);
  const rShin  = new THREE.Bone(); rShin.name="rShin";  rShin.position.set(0, -0.44, 0);
  const rFoot  = new THREE.Bone(); rFoot.name="rFoot";  rFoot.position.set(0, -0.44, 0.06);

  const lUpperArm = new THREE.Bone(); lUpperArm.name="lUpperArm"; lUpperArm.position.set(-P.shoulder/2, 0.18, 0);
  const lForeArm  = new THREE.Bone(); lForeArm.name="lForeArm";  lForeArm.position.set(-0.24, -0.10, 0);

  const rUpperArm = new THREE.Bone(); rUpperArm.name="rUpperArm"; rUpperArm.position.set( P.shoulder/2, 0.18, 0);
  const rForeArm  = new THREE.Bone(); rForeArm.name="rForeArm";  rForeArm.position.set( 0.24, -0.10, 0);

  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(headB);

  hips.add(lThigh); lThigh.add(lShin); lShin.add(lFoot);
  hips.add(rThigh); rThigh.add(rShin); rShin.add(rFoot);

  chest.add(lUpperArm); lUpperArm.add(lForeArm);
  chest.add(rUpperArm); rUpperArm.add(rForeArm);

  bones.push(hips, spine, chest, neck, headB, lThigh, lShin, lFoot, rThigh, rShin, rFoot, lUpperArm, lForeArm, rUpperArm, rForeArm);

  const skeleton = new THREE.Skeleton(bones);

  // ---------- skinned mesh geometry ----------
  // One "pill" body: cylinder with shoulder bulge + hips, skinned by Y to hips/spine/chest + thighs/shins.
  const height = P.height;
  const geo = new THREE.CylinderGeometry(P.chest*0.55, P.hip*0.62, height*0.92, 18, 26, true);
  // scale a bit for shoulders
  const pos = geo.attributes.position;
  for (let i=0; i<pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = (y / (height*0.46)); // -1..1
    let sx = 1, sz = 1;
    // shoulders
    if (ny > 0.45) { sx = 1.18; sz = 1.10; }
    // chest
    if (ny > 0.15 && ny <= 0.45) { sx = 1.08; sz = 1.06; }
    // hips
    if (ny < -0.10 && ny > -0.55) { sx = 1.05; sz = 1.05; }
    pos.setXYZ(i, x*sx, y, z*sz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // UVs: simple cylindrical wrap
  // (CylinderGeometry already provides uv, good enough for this "all-over suit" texture)

  // Skinning: assign by Y bands
  const skinIndex = [];
  const skinWeight = [];
  const v = new THREE.Vector3();
  for (let i=0; i<pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i) + hips.position.y, pos.getZ(i)); // body sits around hips
    const y = v.y;

    // bone indices:
    // 0 hips, 1 spine, 2 chest, 5 lThigh, 6 lShin, 8 rThigh, 9 rShin
    let a=0, b=1, wa=1, wb=0;

    if (y > hips.position.y + 0.40) { a=2; b=1; wb=0.15; wa=0.85; }
    else if (y > hips.position.y + 0.18) { a=1; b=0; wb=0.25; wa=0.75; }
    else if (y > hips.position.y - 0.05) { a=0; b=1; wb=0.10; wa=0.90; }
    else {
      // legs: split left/right by X
      const isLeft = v.x < 0;
      if (y > hips.position.y - 0.48) { a = isLeft ? 5 : 8; b = 0; wb=0.10; wa=0.90; }
      else { a = isLeft ? 6 : 9; b = isLeft ? 5 : 8; wb=0.20; wa=0.80; }
    }

    skinIndex.push(a, b, 0, 0);
    skinWeight.push(wa, wb, 0, 0);
  }

  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));

  const skinned = new THREE.SkinnedMesh(geo, suitMat);
  skinned.name = "BotBody";
  skinned.add(hips);
  skinned.bind(skeleton);

  root.add(skinned);

  // ---------- head ----------
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.85, metalness: 0.0 })
  );
  head.position.y = headB.getWorldPosition(new THREE.Vector3()).y;
  head.name = "BotHead";
  headB.add(head);

  // ---------- simple hands ----------
  const handMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.9 });
  const handGeo = new THREE.SphereGeometry(0.05, 12, 12);

  const lHand = new THREE.Mesh(handGeo, handMat); lHand.position.set(-0.22, -0.10, 0); lHand.name="lHand";
  const rHand = new THREE.Mesh(handGeo, handMat); rHand.position.set( 0.22, -0.10, 0); rHand.name="rHand";
  lForeArm.add(lHand);
  rForeArm.add(rHand);

  // ---------- shoes (simple) ----------
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.95 });
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.26);

  const lShoe = new THREE.Mesh(shoeGeo, shoeMat); lShoe.position.set(0, -0.02, 0.10); lShoe.name="lShoe";
  const rShoe = new THREE.Mesh(shoeGeo, shoeMat); rShoe.position.set(0, -0.02, 0.10); rShoe.name="rShoe";
  lFoot.add(lShoe);
  rFoot.add(rShoe);

  // ---------- animator ----------
  const state = { t: 0, walking: false, walkPhase: Math.random()*Math.PI*2 };
  root.userData.avatar = {
    skeleton,
    bones: { hips, spine, chest, neck, headB, lThigh, lShin, lFoot, rThigh, rShin, rFoot, lUpperArm, lForeArm, rUpperArm, rForeArm },
    state,
    setWalking(v) { state.walking = !!v; },
    update(dt) {
      state.t += dt;
      const t = state.t;

      // idle breathing
      spine.rotation.x = Math.sin(t*1.6) * 0.03;
      chest.rotation.x = Math.sin(t*1.3+1.0) * 0.02;
      headB.rotation.y = Math.sin(t*0.9) * 0.10;

      // subtle arm sway
      lUpperArm.rotation.z =  Math.sin(t*1.2) * 0.10;
      rUpperArm.rotation.z = -Math.sin(t*1.2) * 0.10;

      // walk cycle
      const w = state.walking ? 1 : 0;
      const phase = t*4.2 + state.walkPhase;

      lThigh.rotation.x =  Math.sin(phase) * 0.55 * w;
      rThigh.rotation.x = -Math.sin(phase) * 0.55 * w;

      lShin.rotation.x  = Math.max(0, -Math.sin(phase)) * 0.55 * w;
      rShin.rotation.x  = Math.max(0,  Math.sin(phase)) * 0.55 * w;

      // slight bounce
      hips.position.y = 0.86 + Math.abs(Math.sin(phase)) * 0.02 * w;
    }
  };

  // scale to game units (match your current bot scale)
  root.scale.set(1, 1, 1);

  return root;
}
