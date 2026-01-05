import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function safeTex(url, repeat = [1, 1]) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return tex;
}

function matTex(url, fallback, rough = 0.9, repeat = [1, 1]) {
  const m = new THREE.MeshStandardMaterial({ color: fallback, roughness: rough });
  try {
    m.map = safeTex(url, repeat);
    m.color.set(0xffffff);
  } catch {}
  return m;
}

export const PokerTable = {
  build(scene, rig, ctx) {
    const TEX = "assets/textures/";

    // Place table in POKER room center
    const pokerCenter = ctx?.rooms?.poker?.pos || new THREE.Vector3(0, 0, -34);

    const group = new THREE.Group();
    group.name = "PokerTable";
    group.position.set(pokerCenter.x, 0, pokerCenter.z);
    scene.add(group);

    // Table dimensions (oval)
    const topY = 0.82;
    const a = 3.0;   // x radius
    const b = 2.05;  // z radius

    // Felt top (oval)
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(a, a, 0.12, 48, 1, false),
      matTex(`${TEX}table_felt_green.jpg`, 0x0f5a35, 0.85, [1, 1])
    );
    felt.scale.z = b / a; // make it oval
    felt.position.y = topY;
    felt.castShadow = true;
    felt.receiveShadow = true;
    group.add(felt);

    // Leather trim ring (slightly larger oval)
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(a + 0.22, a + 0.22, 0.18, 48, 1, false),
      matTex(`${TEX}Table leather trim.jpg`, 0x2b1b10, 0.75, [1, 1])
    );
    trim.scale.z = (b + 0.16) / (a + 0.22);
    trim.position.y = topY - 0.04;
    trim.castShadow = true;
    trim.receiveShadow = true;
    group.add(trim);

    // Table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.8, 0.72, 28),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6, metalness: 0.2 })
    );
    base.position.y = 0.36;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Outer pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.25, 28),
      new THREE.MeshStandardMaterial({ color: 0x0d0f14, roughness: 0.65, metalness: 0.25 })
    );
    pedestal.position.y = 0.12;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    // Seat anchors (6 seats around oval)
    const seats = [];
    const seatCount = 6;
    for (let i = 0; i < seatCount; i++) {
      const ang = (i / seatCount) * Math.PI * 2;
      const x = Math.cos(ang) * (a + 1.05);
      const z = Math.sin(ang) * (b + 0.85);

      const seat = new THREE.Object3D();
      seat.position.set(x, 0, z);
      seat.lookAt(0, 0, 0);
      seats.push(seat);
      group.add(seat);
    }

    // Provide seats to bots/chairs modules
    ctx.table = ctx.table || {};
    ctx.table.group = group;
    ctx.table.seats = seats.map((s) => ({
      position: s.getWorldPosition(new THREE.Vector3()),
      rotationY: s.rotation.y,
    }));

    // Also provide a “safe player spawn” in poker room (in front of table)
    ctx.spawns = ctx.spawns || {};
    ctx.spawns.poker = { x: pokerCenter.x, z: pokerCenter.z + 7.0 };

    return group;
  },
};

export default PokerTable;
