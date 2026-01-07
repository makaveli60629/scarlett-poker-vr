// /js/avatar.js — Scarlett Poker VR — Avatar v2 (Equip-ready)
// createAvatar({ name, height, shirt, accent })

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createAvatar({ name="Bot", height=1.74, shirt=0x2bd7ff, accent=0x00ffaa } = {}) {
  const group = new THREE.Group();
  group.name = name;

  const body = new THREE.Group();
  group.add(body);

  // simple proportions
  const headY = height * 0.92;
  const torsoY = height * 0.62;
  const hipY = height * 0.42;

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.9 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85, metalness: 0.05, emissive: 0x000000 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), skinMat);
  head.position.y = headY;
  body.add(head);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.14), shirtMat);
  torso.position.y = torsoY;
  body.add(torso);

  // Hips/legs (simple)
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), pantsMat);
  hips.position.y = hipY;
  body.add(hips);

  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 12);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.06, hipY - 0.24, 0);
  legR.position.set( 0.06, hipY - 0.24, 0);
  body.add(legL, legR);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.28, 12);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.16, torsoY + 0.02, 0);
  armR.position.set( 0.16, torsoY + 0.02, 0);
  armL.rotation.z = 0.15;
  armR.rotation.z = -0.15;
  body.add(armL, armR);

  // Name tag “plate” (safe)
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.06, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x0b0d12, emissive: accent, emissiveIntensity: 0.15, roughness: 0.9 })
  );
  tag.position.set(0, headY + 0.18, 0);
  body.add(tag);

  // Attach points for gear
  const gear = new THREE.Group();
  gear.name = "gear";
  body.add(gear);

  const hatMount = new THREE.Object3D();
  hatMount.name = "hatMount";
  hatMount.position.set(0, headY + 0.08, 0);
  body.add(hatMount);

  const faceMount = new THREE.Object3D();
  faceMount.name = "faceMount";
  faceMount.position.set(0, headY, 0.105);
  body.add(faceMount);

  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.01, 10, 64),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.25, transparent: true, opacity: 0.75 })
  );
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.02;
  aura.visible = false;
  group.add(aura);

  const api = {
    group,
    setShirtColor(hex) {
      shirtMat.color.setHex(hex);
      shirtMat.needsUpdate = true;
    },
    setAura(hexOrNull) {
      if (!hexOrNull) { aura.visible = false; return; }
      aura.material.color.setHex(hexOrNull);
      aura.material.emissive.setHex(hexOrNull);
      aura.visible = true;
    },
    clearGear() {
      while (gear.children.length) gear.remove(gear.children[0]);
    },
    equipHat({ color=0x111111 }={}) {
      // simple cap
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 18, 18, 0, Math.PI*2, 0, Math.PI/1.8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
      );
      cap.position.y = 0.0;
      hatMount.add(cap);
      gear.add(cap);
    },
    equipGlasses({ color=0x111111 }={}) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 0.02),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 })
      );
      frame.position.set(0, 0.0, 0.0);
      faceMount.add(frame);
      gear.add(frame);
    }
  };

  // Store references
  group.userData.avatar = api;
  group.userData._hatMount = hatMount;
  group.userData._faceMount = faceMount;
  group.userData._gear = gear;

  return api;
}
