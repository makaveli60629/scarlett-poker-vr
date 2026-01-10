// /js/scorpion_room.js — Scorpion Room v1 (FULL)
// Round table + 5 chairs (YOU + 4 bots) + guardrail.
// Exposes seat points for player + bots.

export const ScorpionRoom = {
  init(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "ScorpionRoom";
    group.visible = false; // becomes visible only in scorpion mode
    scene.add(group);

    // Room floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Lighting inside room (prevents “black room” issues)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.75);
    group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(3, 6, 2);
    key.castShadow = true;
    group.add(key);

    // Round poker table
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.14, 64),
      new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9, metalness: 0.05 })
    );
    tableTop.position.set(0, 0.78, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // Table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 0.78, 32),
      new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.8, metalness: 0.15 })
    );
    base.position.set(0, 0.39, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Guardrail ring
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.06, 18, 84),
      new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.6, metalness: 0.35 })
    );
    rail.position.set(0, 1.05, 0);
    rail.rotation.x = Math.PI / 2;
    rail.castShadow = true;
    group.add(rail);

    // Posts around guardrail
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.0, 12),
        new THREE.MeshStandardMaterial({ color: 0x1f2028, roughness: 0.7, metalness: 0.25 })
      );
      post.position.set(Math.cos(a) * 3.25, 0.5, Math.sin(a) * 3.25);
      post.castShadow = true;
      group.add(post);
    }

    // Chairs (5 seats total: seat0 = player, seat1..4 = bots)
    const seats = [];
    const chairRadius = 2.05;
    const seatCount = 5;

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const x = Math.cos(a) * chairRadius;
      const z = Math.sin(a) * chairRadius;

      const chair = this._makeChair(THREE);
      chair.position.set(x, 0, z);
      chair.rotation.y = -a + Math.PI; // face table
      group.add(chair);

      const seatPoint = new THREE.Object3D();
      seatPoint.position.set(x, 0, z);
      seatPoint.rotation.y = -a + Math.PI;
      group.add(seatPoint);

      seats.push(seatPoint);
    }

    // Entry point (where teleport lands before seating)
    const entry = new THREE.Object3D();
    entry.name = "scorpion_entry";
    entry.position.set(0, 0, 4.6);
    entry.rotation.y = Math.PI;
    group.add(entry);

    ctx.scorpion = {
      group,
      seats,
      entry,
      tableTop,
    };

    log?.("[scorpion] room built ✅ (round table + 5 chairs + rail)");
  },

  setActive(ctx, on) {
    if (!ctx.scorpion?.group) return;
    ctx.scorpion.group.visible = !!on;
  },

  _makeChair(THREE) {
    const g = new THREE.Group();
    g.name = "Chair";

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x2a2b34, roughness: 0.7, metalness: 0.2 })
    );
    seat.position.y = 0.42;
    seat.castShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x242632, roughness: 0.75, metalness: 0.18 })
    );
    back.position.set(0, 0.73, -0.235);
    back.castShadow = true;
    g.add(back);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.6, metalness: 0.35 });
    const legGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.42, 10);

    const legOffsets = [
      [-0.22, 0.21],
      [0.22, 0.21],
      [-0.22, -0.21],
      [0.22, -0.21],
    ];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.21, lz);
      leg.castShadow = true;
      g.add(leg);
    }

    return g;
  },
};
