// /js/humanoids.js — Low-Poly Humanoids v0.6 (Elegant placeholders)
// ✅ Lightweight, VR-safe
// ✅ No skinning; fake life with lerp + idle motion

export const Humanoids = (() => {
  const S = {
    THREE: null,
    root: null,
    bots: [],
    t: 0
  };

  function init({ THREE, root }) {
    S.THREE = THREE;
    S.root = root;
    return api();
  }

  function api() {
    return { spawnBots, update, state: S };
  }

  function makeBot({ color = 0xe6e6e6 } = {}) {
    const THREE = S.THREE;
    const g = new THREE.Group();
    g.userData.isBot = true;

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.08 });

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat);
    head.position.y = 1.62;

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.10, 10), mat);
    neck.position.y = 1.47;

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 10), mat);
    torso.position.y = 1.15;

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.16), mat);
    hips.position.y = 0.86;

    const legGeo = new THREE.CapsuleGeometry(0.07, 0.46, 6, 10);
    const lLeg = new THREE.Mesh(legGeo, mat);
    const rLeg = new THREE.Mesh(legGeo, mat);
    lLeg.position.set(-0.09, 0.48, 0);
    rLeg.position.set( 0.09, 0.48, 0);

    const armGeo = new THREE.CapsuleGeometry(0.055, 0.38, 6, 10);
    const lArm = new THREE.Mesh(armGeo, mat);
    const rArm = new THREE.Mesh(armGeo, mat);
    lArm.position.set(-0.30, 1.22, 0);
    rArm.position.set( 0.30, 1.22, 0);

    g.add(head, neck, torso, hips, lLeg, rLeg, lArm, rArm);

    // store refs
    g.userData.parts = { head, lArm, rArm, torso };
    g.userData.baseY = 0;
    g.userData.phase = Math.random() * 10;

    return g;
  }

  function spawnBots({ count = 6, center = null, radius = 2.2, y = 0, lookAt = null } = {}) {
    const THREE = S.THREE;
    const c = center || new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < count; i++) {
      const bot = makeBot({ color: 0xe6e6e6 });
      const a = (i / count) * Math.PI * 2;
      bot.position.set(c.x + Math.cos(a) * radius, y, c.z + Math.sin(a) * radius);
      bot.userData.baseY = bot.position.y;
      if (lookAt) bot.lookAt(lookAt);
      S.root.add(bot);
      S.bots.push(bot);
    }
    return S.bots;
  }

  function update(dt, t) {
    S.t = t;
    for (const b of S.bots) {
      const p = b.userData.parts;
      const ph = b.userData.phase;

      // idle breathing + subtle sway
      b.position.y = b.userData.baseY + Math.sin((t + ph) * 1.4) * 0.01;

      if (p?.head) p.head.rotation.y = Math.sin((t + ph) * 0.9) * 0.35;
      if (p?.lArm) p.lArm.rotation.x = Math.sin((t + ph) * 1.1) * 0.25 - 0.25;
      if (p?.rArm) p.rArm.rotation.x = Math.sin((t + ph + 1.5) * 1.1) * 0.25 - 0.25;
      if (p?.torso) p.torso.scale.y = 1 + Math.sin((t + ph) * 1.4) * 0.015;
    }
  }

  return { init };
})();
