// /js/avatar_basic.js — mannequin avatar (shirt-accurate)
import * as THREE from "./three.js";
import { BODY_DIMS } from "./body_dims.js";

export function buildBasicAvatar({
  shirtLabel = "SCARLETT",
  shirtColor = 0x111111,
  accentColor = 0xff2d7a,
} = {}) {

  const g = new THREE.Group();

  // === TORSO (shirt reference mesh) ===
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      BODY_DIMS.torso.radius,
      BODY_DIMS.torso.height,
      6,
      12
    ),
    new THREE.MeshStandardMaterial({
      color: shirtColor,
      roughness: 0.9,
    })
  );
  torso.position.y = BODY_DIMS.torso.centerY;
  torso.name = "torso";
  g.add(torso);

  // === HEAD ===
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(BODY_DIMS.head.radius, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf1c7a8,
      roughness: 0.7,
    })
  );
  head.position.y = BODY_DIMS.head.centerY;
  head.name = "head";
  g.add(head);

  // === SHIRT LOGO (exact UV match) ===
  const logoTex = makeShirtLogo(shirtLabel, accentColor);
  const logoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(
      BODY_DIMS.shirt.logoWidth,
      BODY_DIMS.shirt.logoHeight
    ),
    new THREE.MeshBasicMaterial({
      map: logoTex,
      transparent: true,
    })
  );
  logoPlane.position.set(
    0,
    BODY_DIMS.shirt.logoY,
    BODY_DIMS.shirt.frontZ
  );
  logoPlane.name = "shirt_logo";
  g.add(logoPlane);

  return g;
}
