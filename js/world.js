import * as THREE from "three";

export function createWorld(scene) {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.98 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Poker table anchor
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.12, 40),
    new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
  );
  table.position.set(0, 0.78, -1.2);
  scene.add(table);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.07, 16, 80),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.12 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(table.position);
  rim.position.y += 0.07;
  scene.add(rim);

  // Dealer position marker (used by deal animation)
  const dealer = new THREE.Object3D();
  dealer.name = "DealerAnchor";
  dealer.position.set(0, 0.92, -0.35);
  scene.add(dealer);

  // Lights (never dark)
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(5, 10, 7.5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x404040, 1.0));
}

export function createLowPolyAvatar() {
  const avatar = new THREE.Group();
  avatar.name = "PlayerAvatar";

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xbfc6d4,
    flatShading: true,
    roughness: 0.85,
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.6, 4, 8), bodyMat);
  torso.name = "Torso";
  torso.position.y = 1.30;
  avatar.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), bodyMat);
  head.name = "Head";
  head.position.y = 0.50;
  torso.add(head);

  // Hands (driven by WebXR)
  const handGeo = new THREE.IcosahedronGeometry(0.06, 0);
  avatar.leftHand = new THREE.Mesh(handGeo, bodyMat);
  avatar.rightHand = new THREE.Mesh(handGeo, bodyMat);
  avatar.leftHand.name = "LeftHand";
  avatar.rightHand.name = "RightHand";
  avatar.add(avatar.leftHand, avatar.rightHand);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.08, 0.5, 4, 6);
  const LLeg = new THREE.Mesh(legGeo, bodyMat);
  const RLeg = new THREE.Mesh(legGeo, bodyMat);
  LLeg.position.set(-0.15, -0.6, 0);
  RLeg.position.set(0.15, -0.6, 0);
  torso.add(LLeg, RLeg);

  // Head anchor for nametags
  avatar.headAnchor = new THREE.Object3D();
  avatar.headAnchor.position.set(0, 0.30, 0);
  head.add(avatar.headAnchor);

  return avatar;
}

export function applyClothing(avatar, texturePath) {
  const torso = avatar.getObjectByName("Torso");
  if (!torso) return;

  const loader = new THREE.TextureLoader();
  const tex = loader.load(texturePath);
  tex.colorSpace = THREE.SRGBColorSpace;

  const clothMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    roughness: 0.9,
  });

  const clothOverlay = new THREE.Mesh(torso.geometry, clothMat);
  clothOverlay.scale.setScalar(1.01);
  torso.add(clothOverlay);
}
