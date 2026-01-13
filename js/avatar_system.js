// /js/avatar_system.js — AvatarSystem v2 (Humanoid Factory)
// ✅ Player uses SAME mesh style as bots
// ✅ Better hands attached to controllers (not weird blocks)
// ✅ XR-safe: hides head/torso if you want (prevents camera clipping)

import { createHumanoid } from "./humanoid_factory.js";

export const AvatarSystem = (() => {
  function init(ctx, opt = {}) {
    const { THREE, player, controllers, renderer, log } = ctx;

    const root = new THREE.Group();
    root.name = "AVATAR_ROOT";
    player.add(root);

    // Materials tuned for "player"
    const mats = {
      skin: new THREE.MeshStandardMaterial({ color: 0xd9c7b3, roughness: 0.82, metalness: 0.02 }),
      cloth: new THREE.MeshStandardMaterial({ color: 0x141c2a, roughness: 0.95, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({
        color: 0x66ccff, roughness: 0.30, metalness: 0.60,
        emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.10
      })
    };

    const humanoid = createHumanoid(THREE, { scale: 1.0, materials: mats });
    humanoid.root.position.set(0, 0, 0);
    root.add(humanoid.root);

    // In first-person XR, body can clip camera. Default: hide head (and optionally torso).
    const settings = {
      hideHeadInXR: opt.hideHeadInXR ?? true,
      hideTorsoInXR: opt.hideTorsoInXR ?? false
    };

    // Hands: attach small faceted “glove” to controller so lasers still feel right
    const leftHand = makeControllerHand(THREE, mats.cloth, mats.accent, true);
    const rightHand = makeControllerHand(THREE, mats.cloth, mats.accent, false);
    controllers?.c0?.add(leftHand);
    controllers?.c1?.add(rightHand);

    // Nice placement relative to controller
    leftHand.position.set(-0.01, -0.015, -0.03);
    rightHand.position.set(0.01, -0.015, -0.03);
    leftHand.rotation.set(-0.25, 0.0, 0.0);
    rightHand.rotation.set(-0.25, 0.0, 0.0);

    log?.("[avatar] AvatarSystem v2 init ✅ (humanoid factory)");

    return {
      setVisible(v) { root.visible = !!v; },
      update(dt, t) {
        // Gentle breathing
        humanoid.parts.body.position.y = Math.sin(t * 1.6) * 0.01;

        // XR visibility rules
        const inXR = !!renderer?.xr?.isPresenting;
        if (settings.hideHeadInXR) humanoid.parts.head.visible = !inXR;
        if (settings.hideTorsoInXR) {
          humanoid.parts.chest.visible = !inXR;
          humanoid.parts.abs.visible = !inXR;
          humanoid.parts.hips.visible = !inXR;
        }
      }
    };
  }

  function makeControllerHand(THREE, matCloth, matAccent, isLeft) {
    const g = new THREE.Group();
    g.name = isLeft ? "CTRL_HAND_L" : "CTRL_HAND_R";

    const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), matCloth);
    palm.scale.set(1.2, 0.65, 1.35);
    palm.position.set(0, -0.005, -0.02);
    g.add(palm);

    const kn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), matAccent);
    kn.scale.set(1.4, 0.55, 1.0);
    kn.position.set(0, 0.015, -0.045);
    g.add(kn);

    const thumb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), matCloth);
    thumb.scale.set(1.0, 0.7, 1.2);
    thumb.position.set(isLeft ? -0.05 : 0.05, 0.0, -0.03);
    thumb.rotation.y = isLeft ? 0.6 : -0.6;
    g.add(thumb);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.038, 0.04, 7), matCloth);
    cuff.position.set(0, -0.03, -0.01);
    g.add(cuff);

    return g;
  }

  return { init };
})();
