// /js/modules/avatars.module.js
// Placeholder avatars around the table (head + hands) (FULL)
// Later: swap meshes with real Meta avatars without touching world core.

export default {
  id: "avatars.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "AVATARS_ROOT";
    anchors.avatars.add(root);

    const seatCount = tableData.seats || 9;
    const seatRadius = (tableData.railRadius || 1.45) + 0.65;

    const avatars = [];

    function makeAvatar(i) {
      const g = new THREE.Group();
      g.name = `AVATAR_${i}`;

      // body (simple capsule-ish: cylinder + sphere)
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.55, 16),
        new THREE.MeshStandardMaterial({ color: 0x202738, roughness: 0.9 })
      );
      body.position.y = 1.05;
      g.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0x3a3f55, roughness: 0.7 })
      );
      head.position.y = 1.45;
      head.name = "HEAD";
      g.add(head);

      const lh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      lh.position.set(-0.18, 1.15, 0.10);
      lh.name = "LEFT_HAND";
      g.add(lh);

      const rh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      rh.position.set(0.18, 1.15, 0.10);
      rh.name = "RIGHT_HAND";
      g.add(rh);

      return { g, head, lh, rh };
    }

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const x = tableData.center.x + Math.cos(t) * seatRadius;
      const z = tableData.center.z + Math.sin(t) * seatRadius;

      const av = makeAvatar(i);
      av.g.position.set(x, 0, z);

      // face the table center
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);

      root.add(av.g);
      avatars.push(av);
    }

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatars = { root, avatars };

    log?.("avatars.module ✅ (placeholders)");
  },

  update(dt, { tableData }) {
    // Tiny idle motion so they feel alive
    const pack = window.SCARLETT?.avatars;
    if (!pack?.avatars) return;

    const t = performance.now() * 0.001;
    for (let i = 0; i < pack.avatars.length; i++) {
      const av = pack.avatars[i];
      if (!av?.head) continue;

      av.head.position.y = 1.45 + Math.sin(t * 0.8 + i) * 0.01;
      // keep facing table center
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatars?.avatars?.length;
    return { ok, note: ok ? "avatars present" : "avatars missing" };
  }
};
