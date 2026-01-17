// /js/modules/avatars.module.js
// SOUPED placeholder avatars (6-max) + showcase avatar near spawn (FULL)

export default {
  id: "avatars.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "AVATARS_ROOT";
    anchors.avatars.add(root);

    const seatCount = tableData.seats || 6;
    const seatRadius = (tableData.railRadius || 1.45) + 0.65;

    const avatars = [];

    function makeAvatar(i, colorHex) {
      const g = new THREE.Group();
      g.name = `AVATAR_${i}`;

      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.92 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 6, 14), bodyMat);
      torso.position.y = 1.10;
      torso.name = "TORSO";
      g.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), skinMat);
      head.position.y = 1.55;
      head.name = "HEAD";
      g.add(head);

      // arms
      const armGeo = new THREE.CapsuleGeometry(0.05, 0.22, 4, 10);
      const la = new THREE.Mesh(armGeo, bodyMat);
      la.position.set(-0.24, 1.18, 0.05);
      la.rotation.z = 0.35;
      la.name = "L_ARM";
      g.add(la);

      const ra = new THREE.Mesh(armGeo, bodyMat);
      ra.position.set(0.24, 1.18, 0.05);
      ra.rotation.z = -0.35;
      ra.name = "R_ARM";
      g.add(ra);

      const handMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
      const lh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), handMat);
      lh.position.set(-0.34, 1.05, 0.10);
      lh.name = "LEFT_HAND";
      g.add(lh);

      const rh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), handMat);
      rh.position.set(0.34, 1.05, 0.10);
      rh.name = "RIGHT_HAND";
      g.add(rh);

      g.userData = { head, lh, rh, baseY: 0 };
      return { g, head, lh, rh };
    }

    const palette = [0x202738, 0x2a2f44, 0x2f3a55, 0x1f2a3a, 0x33425a, 0x26324a];

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const x = tableData.center.x + Math.cos(t) * seatRadius;
      const z = tableData.center.z + Math.sin(t) * seatRadius;

      const av = makeAvatar(i, palette[i % palette.length]);
      av.g.position.set(x, 0, z);
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);
      root.add(av.g);
      avatars.push(av);
    }

    // Showcase avatar (bigger, closer)
    const showcase = makeAvatar(999, 0x3a3f55);
    showcase.g.name = "AVATAR_SHOWCASE";
    showcase.g.position.set(1.2, 0, -0.6);
    showcase.g.scale.setScalar(1.35);
    root.add(showcase.g);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatars = { root, avatars, showcase: showcase.g };

    log?.("avatars.module ✅ (SOUPED + showcase)");
  },

  update(dt, { tableData }) {
    const pack = window.SCARLETT?.avatars;
    if (!pack?.avatars) return;

    const t = performance.now() * 0.001;
    for (let i = 0; i < pack.avatars.length; i++) {
      const av = pack.avatars[i];
      if (!av?.head) continue;
      av.head.position.y = 1.55 + Math.sin(t * 0.8 + i) * 0.012;
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);
    }

    if (pack.showcase) {
      pack.showcase.rotation.y = Math.sin(t * 0.4) * 0.25 + Math.PI * 0.15;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatars?.avatars?.length && !!window.SCARLETT?.avatars?.showcase;
    return { ok, note: ok ? "avatars SOUPED + showcase" : "avatars missing" };
  }
};
