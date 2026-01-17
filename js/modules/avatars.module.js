// /js/modules/avatars.module.js
// Placeholder avatars around table + local "showcase" near spawn (FULL) 6-MAX

export default {
  id: "avatars.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "AVATARS_ROOT";
    anchors.avatars.add(root);

    const seatCount = tableData.seats || 6;
    const seatRadius = (tableData.railRadius || 1.45) + 0.65;

    const avatars = [];

    function makeAvatar(i, color = 0x202738) {
      const g = new THREE.Group();
      g.name = `AVATAR_${i}`;

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.55, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
      );
      body.position.y = 1.05;
      body.name = "BODY";
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

    // Table avatars
    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const x = tableData.center.x + Math.cos(t) * seatRadius;
      const z = tableData.center.z + Math.sin(t) * seatRadius;

      const av = makeAvatar(i, 0x202738);
      av.g.position.set(x, 0, z);
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);

      root.add(av.g);
      avatars.push(av);
    }

    // Showcase avatar near spawn (close by for inspection)
    const showcase = makeAvatar("SHOWCASE", 0x2b3a55);
    showcase.g.name = "AVATAR_SHOWCASE";
    showcase.g.position.set(0.9, 0, -0.9); // near you
    showcase.g.lookAt(0, 1.3, -2);
    root.add(showcase.g);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatars = { root, avatars, showcase };

    log?.("avatars.module ✅ (6-max + showcase)");
  },

  update(dt, { tableData }) {
    const pack = window.SCARLETT?.avatars;
    if (!pack) return;

    const t = performance.now() * 0.001;

    // idle motion on table avatars
    for (let i = 0; i < (pack.avatars?.length || 0); i++) {
      const av = pack.avatars[i];
      if (!av?.head) continue;
      av.head.position.y = 1.45 + Math.sin(t * 0.8 + i) * 0.01;
      av.g.lookAt(tableData.center.x, 1.3, tableData.center.z);
    }

    // showroom slightly animated too
    const s = pack.showcase;
    if (s?.head) {
      s.head.position.y = 1.45 + Math.sin(t * 0.9) * 0.012;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatars?.avatars?.length && !!window.SCARLETT?.avatars?.showcase;
    return { ok, note: ok ? "avatars+showcase present" : "avatars missing" };
  }
};
