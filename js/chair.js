// /js/chair.js — Simple VR Chair w/ texture option (9.0)
import * as THREE from "./three.js";

export function buildChair({ tex, position, rotationY = 0 }) {
  const g = new THREE.Group();
  g.name = "Chair";
  g.position.copy(position);
  g.rotation.y = rotationY;

  const cloth = safeMat(tex, "sofa_02_diff_4k.jpg", {
    color: 0x404050,
    roughness: 0.95,
    metalness: 0.0,
    repeat: [2, 2]
  });

  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.95, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.5 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), cloth);
  seat.position.y = 0.42;
  g.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.12), cloth);
  back.position.set(0, 0.72, -0.22);
  g.add(back);

  // Arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.55), cloth);
  armL.position.set(-0.22, 0.52, 0);
  const armR = armL.clone();
  armR.position.x = 0.22;
  g.add(armL, armR);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.42, 10);
  for (const [x, z] of [[-0.22,-0.22],[0.22,-0.22],[-0.22,0.22],[0.22,0.22]]) {
    const leg = new THREE.Mesh(legGeo, gold);
    leg.position.set(x, 0.21, z);
    g.add(leg);
  }

  // Sit target (where player rig should go)
  const sitTarget = new THREE.Object3D();
  sitTarget.name = "SitTarget";
  sitTarget.position.set(0, 0, 0.15); // slightly forward on chair
  g.add(sitTarget);

  // Interactable hitbox (easy raycast)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.75), dark);
  hit.visible = false;
  hit.position.set(0, 0.55, 0);
  hit.name = "ChairHit";
  g.add(hit);

  g.userData = {
    type: "chair",
    sitTarget,
    hit
  };

  return g;
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
