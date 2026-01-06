// /js/table.js — Textured Poker Table Builder (9.0)
import * as THREE from "./three.js";

export function buildPokerTable({ tex, center }) {
  const group = new THREE.Group();
  group.name = "PokerTable";
  group.position.copy(center);

  const feltMat = safeMat(tex, "table_felt_green.jpg", {
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    repeat: [2, 2]
  });

  const leatherMat = safeMat(tex, "Table leather trim.jpg", {
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.05,
    repeat: [6, 1]
  });

  const woodMat = safeMat(tex, "rosewood_veneer1_4k.jpg", {
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.05,
    repeat: [2, 2]
  });

  // Dimensions
  const R_OUT = 2.2;
  const R_IN  = 1.75;
  const H_TOP = 0.12;

  // Base pedestal
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 0.55, 24),
    new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.95, metalness: 0.1 })
  );
  base.position.y = 0.275;
  group.add(base);

  // Table body (wood ring)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R_OUT, R_OUT, 0.16, 64),
    woodMat
  );
  body.position.y = 0.62;
  group.add(body);

  // Felt top (disc)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(R_IN, R_IN, H_TOP, 64),
    feltMat
  );
  felt.position.y = 0.70;
  group.add(felt);

  // Leather trim ring (torus)
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry((R_IN + R_OUT) * 0.5, 0.10, 16, 128),
    leatherMat
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.74;
  group.add(trim);

  // Dealer button marker (for visuals)
  const dealerDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.10, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xffd27a,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.4
    })
  );
  dealerDot.rotation.x = -Math.PI / 2;
  dealerDot.position.set(0, 0.76, -0.7);
  group.add(dealerDot);

  // Convenience anchor points (community + pot)
  const anchors = {
    community: new THREE.Object3D(),
    pot: new THREE.Object3D(),
    banner: new THREE.Object3D()
  };
  anchors.community.position.set(0, 0.90, 0.10);
  anchors.pot.position.set(0, 0.98, -0.10);
  anchors.banner.position.set(0, 1.18, -0.10);

  group.add(anchors.community, anchors.pot, anchors.banner);

  return { group, anchors, radii: { outer: R_OUT, inner: R_IN } };
}

function safeMat(tex, file, opts) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.0
  });

  try {
    const t = tex.load(
      `assets/textures/${file}`,
      (tt) => {
        tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
        const r = opts.repeat || [1, 1];
        tt.repeat.set(r[0], r[1]);
        tt.colorSpace = THREE.SRGBColorSpace;
      },
      undefined,
      () => {}
    );
    mat.map = t;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
  } catch (e) {}

  return mat;
    }
