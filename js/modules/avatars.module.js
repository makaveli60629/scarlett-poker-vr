// /js/modules/avatars.module.js
// SOUPED placeholders: body + head + shoulders + forearms + hands + idle + showcase (FULL)

export default {
  id: "avatars.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "AVATARS_ROOT";
    anchors.avatars.add(root);

    const seatCount = tableData.seats || 6;
    const seatRadius = (tableData.railRadius || 1.45) + 0.70;

    const avatars = [];

    const matBody = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.95 });
    const matHead = new THREE.MeshStandardMaterial({ color: 0x3a3f55, roughness: 0.70 });
    const matHand = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.40 });

    function makeAvatar(name) {
      const g = new THREE.Group();
      g.name = `AVATAR_${name}`;

      // torso
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.60, 18),
        matBody
      );
      torso.position.y = 1.05;
      torso.name = "TORSO";
      g.add(torso);

      // shoulders
      const shoulders = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.14, 0.20),
        matBody
      );
      shoulders.position.set(0, 1.32, 0.02);
      shoulders.name = "SHOULDERS";
      g.add(shoulders);

      // head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 20, 16),
        matHead
      );
      head.position.y = 1.52;
      head.name = "HEAD";
      g.add(head);

      // arms
      const armGeo = new THREE.CylinderGeometry(0.035, 0.040, 0.34, 14);
      const leftArm = new THREE.Mesh(armGeo, matBody);
      const rightArm = new THREE.Mesh(armGeo, matBody);

      leftArm.position.set(-0.23, 1.18, 0.12);
      rightArm.position.set(0.23, 1.18, 0.12);
      leftArm.rotation.z = 0.45;
      rightArm.rotation.z = -0.45;
      leftArm.rotation.x = 0.65;
      rightArm.rotation.x = 0.65;
      leftArm.name = "LEFT_ARM";
      rightArm.name = "RIGHT_ARM";
      g.add(leftArm, rightArm);

      // hands
      const lh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matHand);
      const rh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matHand);
      lh.position.set(-0.34, 1.02, 0.30);
      rh.position.set(0.34, 1.02, 0.30);
      lh.name = "LEFT_HAND";
      rh.name = "RIGHT_HAND";
      g.add(lh, rh);

      return { g, head, lh, rh, torso, leftArm, rightArm };
    }

    // Table avatars
    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const x = tableData.center.x + Math.cos(t) * seatRadius;
      const z = tableData.center.z + Math.sin(t) * seatRadius;

      const av = makeAvatar(i);
      av.g.position.set(x, 0, z);

      // seated lean
      av.g.lookAt(tableData.center.x, 1.25, tableData.center.z);
      av.g.rotateX(-0.08);

      root.add(av.g);
      avatars.push(av);
    }

    // Showcase avatar near spawn (bigger + closer)
    const showcase = makeAvatar("SHOWCASE");
    showcase.g.name = "AVATAR_SHOWCASE";
    showcase.g.position.set(0.75, 0, -0.65);
    showcase.g.scale.setScalar(1.25);
    showcase.g.lookAt(0, 1.35, -2);
    root.add(showcase.g);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatars = { root, avatars, showcase };

    log?.("avatars.module ✅ (SOUPED + showcase)");
  },

  update(dt, { tableData }) {
    const pack = window.SCARLETT?.avatars;
    if (!pack) return;

    const t = performance.now() * 0.001;

    // table avatars idle: breathe + subtle head movement
    for (let i = 0; i < (pack.avatars?.length || 0); i++) {
      const av = pack.avatars[i];
      if (!av) continue;

      const breathe = 0.01 + Math.sin(t * 0.9 + i) * 0.01;
      av.torso.scale.y = 1.0 + breathe * 0.2;
      av.head.position.y = 1.52 + Math.sin(t * 0.8 + i) * 0.012;

      // subtle hand rest wobble
      av.lh.position.y = 1.02 + Math.sin(t * 1.3 + i) * 0.006;
      av.rh.position.y = 1.02 + Math.sin(t * 1.2 + i + 1.7) * 0.006;

      av.g.lookAt(tableData.center.x, 1.25, tableData.center.z);
    }

    // showcase slow turn so you can inspect
    const s = pack.showcase;
    if (s?.g) s.g.rotation.y = Math.sin(t * 0.35) * 0.25;
  },

  test() {
    const ok = !!window.SCARLETT?.avatars?.avatars?.length && !!window.SCARLETT?.avatars?.showcase;
    return { ok, note: ok ? "avatars SOUPED + showcase" : "avatars missing" };
  }
};
