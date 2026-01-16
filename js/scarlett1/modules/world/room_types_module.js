// /js/scarlett1/modules/world/room_types_module.js
// ROOM TYPES MODULE (FULL) — ROOT PATCHED

export function createRoomTypesModule({
  devilsIndex = 1,
  storeIndex = 2,
  vipIndex = 3,
} = {}) {
  let built = false;

  function roomGroup(ctx, index) {
    return ctx.rooms?.get?.(index)?.group || null;
  }

  function mat(ctx, color, rough = 0.9, metal = 0.06) {
    return new ctx.THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }
  function matGlow(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }
  function ringLine(ctx, radius, y, color = 0x33ffff, seg = 160) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pts.push(new ctx.THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
    }
    const geo = new ctx.THREE.BufferGeometry().setFromPoints(pts);
    return new ctx.THREE.Line(geo, new ctx.THREE.LineBasicMaterial({ color }));
  }

  function buildDevils(ctx, room) {
    const THREE = ctx.THREE;

    const root = new THREE.Group();
    root.name = "room_types_ROOT";
    room.add(root);

    const g = new THREE.Group();
    g.name = "RoomType_Devils";
    root.add(g);

    const lightA = new THREE.PointLight(0x8833ff, 0.6, 18, 2.0);
    lightA.position.set(3.5, 2.6, 0);
    g.add(lightA);

    const lightB = new THREE.PointLight(0x3355ff, 0.55, 18, 2.0);
    lightB.position.set(-3.5, 2.6, 0);
    g.add(lightB);

    g.add(ringLine(ctx, 7.2, 0.08, 0x8833ff));
    g.add(ringLine(ctx, 7.0, 2.9, 0x3355ff));

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.0),
      matGlow(ctx, 0x101020, 0x8833ff, 0.65)
    );
    panel.position.set(0, 2.5, -7.2);
    g.add(panel);

    const tableMat = mat(ctx, 0x11111a, 0.9, 0.08);
    const feltMat = mat(ctx, 0x101a12, 0.95, 0.05);

    function makeMiniTable() {
      const tg = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32), feltMat);
      top.position.y = 0.78;
      tg.add(top);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 0.78, 18), tableMat);
      base.position.y = 0.39;
      tg.add(base);

      return tg;
    }

    const rows = 3, cols = 4;
    const spacingX = 2.4, spacingZ = 2.1;
    const startX = -((cols - 1) * spacingX) * 0.5;
    const startZ = -((rows - 1) * spacingZ) * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = makeMiniTable();
        t.position.set(startX + c * spacingX, 0, startZ + r * spacingZ);
        g.add(t);
      }
    }
  }

  function buildStore(ctx, room) {
    const THREE = ctx.THREE;

    const root = new THREE.Group();
    root.name = "room_types_ROOT";
    room.add(root);

    const g = new THREE.Group();
    g.name = "RoomType_Store";
    root.add(g);

    const light = new THREE.PointLight(0x33ffff, 0.6, 18, 2.0);
    light.position.set(0, 2.8, 0);
    g.add(light);

    g.add(ringLine(ctx, 7.2, 0.08, 0x33ffff));
    g.add(ringLine(ctx, 7.0, 2.9, 0xff66ff));

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.9, 1.0),
      mat(ctx, 0x0b0b12, 0.9, 0.08)
    );
    counter.position.set(0, 0.45, -2.4);
    g.add(counter);

    const counterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.07, 1.08),
      matGlow(ctx, 0x0f0f18, 0x33ffff, 0.65)
    );
    counterTrim.position.set(0, 0.95, -2.4);
    g.add(counterTrim);

    function mannequin() {
      const m = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.75, 6, 18),
        mat(ctx, 0x1a1a26, 0.85, 0.08)
      );
      body.position.y = 1.05;
      m.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 18, 18),
        mat(ctx, 0x252535, 0.75, 0.12)
      );
      head.position.y = 1.62;
      m.add(head);

      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.06, 18),
        matGlow(ctx, 0x101020, 0xff66ff, 0.45)
      );
      stand.position.y = 0.03;
      m.add(stand);

      return m;
    }

    const positions = [
      [-2.2, 1.8], [-0.8, 2.2], [0.8, 2.2], [2.2, 1.8],
      [-2.2, 0.2], [2.2, 0.2]
    ];

    for (let i = 0; i < positions.length; i++) {
      const [x, z] = positions[i];
      const man = mannequin();
      man.position.set(x, 0, z);
      man.rotation.y = (i % 2 === 0) ? 0.4 : -0.4;
      g.add(man);
    }

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.0),
      matGlow(ctx, 0x101020, 0x33ffff, 0.6)
    );
    sign.position.set(0, 2.5, -7.2);
    g.add(sign);
  }

  function buildVIP(ctx, room) {
    const THREE = ctx.THREE;

    const root = new THREE.Group();
    root.name = "room_types_ROOT";
    room.add(root);

    const g = new THREE.Group();
    g.name = "RoomType_VIP";
    root.add(g);

    const lightA = new THREE.PointLight(0xffcc33, 0.55, 18, 2.0);
    lightA.position.set(2.8, 2.6, 0);
    g.add(lightA);

    const lightB = new THREE.PointLight(0x66aaff, 0.45, 18, 2.0);
    lightB.position.set(-2.8, 2.6, 0);
    g.add(lightB);

    g.add(ringLine(ctx, 7.2, 0.08, 0xffcc33));
    g.add(ringLine(ctx, 7.0, 2.9, 0x66aaff));

    const couchMat = mat(ctx, 0x141424, 0.75, 0.12);

    function couch(x, z, yaw) {
      const c = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.9), couchMat);
      seat.position.y = 0.35;
      c.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.18), couchMat);
      back.position.set(0, 0.75, -0.36);
      c.add(back);

      c.position.set(x, 0, z);
      c.rotation.y = yaw;
      g.add(c);
    }

    couch(0, 2.6, Math.PI);
    couch(-2.8, 0.6, Math.PI * 0.5);
    couch(2.8, 0.6, -Math.PI * 0.5);

    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.10, 32),
      mat(ctx, 0x0b0b12, 0.85, 0.12)
    );
    t.position.set(0, 0.55, 0);
    g.add(t);

    const tGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.03, 12, 72),
      matGlow(ctx, 0x0f0f18, 0xffcc33, 0.5)
    );
    tGlow.rotation.x = Math.PI / 2;
    tGlow.position.set(0, 0.61, 0);
    g.add(tGlow);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.0),
      matGlow(ctx, 0x101020, 0xffcc33, 0.55)
    );
    sign.position.set(0, 2.5, -7.2);
    g.add(sign);
  }

  return {
    name: "room_types",

    onEnable(ctx) {
      if (built) return;
      built = true;

      ctx.rooms?.ensure?.(4);

      const dev = roomGroup(ctx, devilsIndex);
      const store = roomGroup(ctx, storeIndex);
      const vip = roomGroup(ctx, vipIndex);

      if (dev) buildDevils(ctx, dev);
      if (store) buildStore(ctx, store);
      if (vip) buildVIP(ctx, vip);

      console.log("[room_types] ready ✅");
    },
  };
                }
