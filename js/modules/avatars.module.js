// /js/modules/avatars.module.js
// Bots + showcase (SOUPED) (FULL)

export default {
  id: 'avatars.module.js',

  async init({ THREE, anchors, log }) {
    const tableData = window.SCARLETT?.table?.data;
    const root = new THREE.Group();
    root.name = 'AVATARS_ROOT';
    anchors.avatars.add(root);

    const seatCount = tableData?.seats || 6;
    const seatRadius = (tableData?.railRadius || 1.42) + 0.70;
    const cx = tableData?.center?.x ?? 0;
    const cz = tableData?.center?.z ?? -2.0;

    const bodyMats = [
      new THREE.MeshStandardMaterial({ color: 0x2a2f44, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x1f3a52, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x3a2a44, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x253a2a, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x3a2f20, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x2a3a3a, roughness: 0.95 })
    ];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.55 });

    const avatars = [];

    function makeBot(i) {
      const g = new THREE.Group();
      const mat = bodyMats[i % bodyMats.length];

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 8, 16), mat);
      torso.position.y = 1.15;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skinMat);
      head.position.y = 1.55;
      head.name = 'HEAD';
      g.add(head);

      const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.18), mat);
      shoulders.position.y = 1.35;
      g.add(shoulders);

      const upperGeo = new THREE.CapsuleGeometry(0.06, 0.18, 6, 12);
      const lowerGeo = new THREE.CapsuleGeometry(0.05, 0.18, 6, 12);
      const handGeo  = new THREE.SphereGeometry(0.05, 14, 12);

      const lUpper = new THREE.Mesh(upperGeo, mat);
      const lLower = new THREE.Mesh(lowerGeo, mat);
      const lHand  = new THREE.Mesh(handGeo, skinMat);
      const rUpper = new THREE.Mesh(upperGeo, mat);
      const rLower = new THREE.Mesh(lowerGeo, mat);
      const rHand  = new THREE.Mesh(handGeo, skinMat);

      lUpper.position.set(-0.24, 1.30, 0.02);
      rUpper.position.set( 0.24, 1.30, 0.02);
      lLower.position.set(-0.28, 1.12, 0.10);
      rLower.position.set( 0.28, 1.12, 0.10);
      lHand.position.set(-0.30, 0.98, 0.18);
      rHand.position.set( 0.30, 0.98, 0.18);
      lUpper.rotation.z =  0.35;
      rUpper.rotation.z = -0.35;

      g.add(lUpper, lLower, lHand, rUpper, rLower, rHand);

      return { g, head, lHand, rHand };
    }

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const x = cx + Math.cos(t) * seatRadius;
      const z = cz + Math.sin(t) * seatRadius;

      const bot = makeBot(i);
      bot.g.name = `BOT_${i}`;
      bot.g.position.set(x, 0, z);
      bot.g.lookAt(cx, 1.3, cz);
      root.add(bot.g);
      avatars.push(bot);
    }

    // showcase
    const show = makeBot(999);
    show.g.name = 'SHOWCASE_BOT';
    show.g.scale.set(1.25, 1.25, 1.25);
    show.g.position.set(0.55, 0, -0.55);
    show.g.lookAt(0, 1.2, -1.2);
    anchors.room.add(show.g);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatars = { root, avatars, showcase: show.g };

    this._rt = { avatars };
    log?.('avatars.module ✅');
  },

  update(dt) {
    const r = this._rt;
    if (!r?.avatars) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < r.avatars.length; i++) {
      const av = r.avatars[i];
      if (!av?.head) continue;
      av.head.position.y = 1.55 + Math.sin(t * 0.9 + i) * 0.012;
      av.g.rotation.y += Math.sin(t * 0.25 + i) * 0.0003;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatars?.avatars?.length;
    return { ok, note: ok ? 'avatars present' : 'avatars missing' };
  }
};
