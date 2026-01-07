// /js/avatar.js — Scarlett Poker VR — AVATAR v1 (Open Slots for Clothing / Face)
// GitHub-safe, no external deps besides three.module.js

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * createAvatar(options)
 * Returns: {
 *   group,
 *   setName(text),
 *   setColors({ skin, shirt, pants, shoes }),
 *   setOutfit({ shirtTex, pantsTex, logoTex }), // placeholder hooks
 *   setMood(moodName), // placeholder hook for later emotes
 * }
 */
export function createAvatar(options = {}) {
  const {
    name = "Bot",
    height = 1.70,
    skin = 0xd8b9a4,
    shirt = 0x2bd7ff,
    pants = 0x2a2a2a,
    shoes = 0x111111,
    accent = 0x00ffaa,
  } = options;

  const group = new THREE.Group();
  group.name = `Avatar_${name}`;

  // ---------- Materials ----------
  const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75, metalness: 0.02 });
  const matShirt = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85, metalness: 0.02 });
  const matPants = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9, metalness: 0.01 });
  const matShoes = new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.95, metalness: 0.01 });
  const matAccent = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6, roughness: 0.3 });

  // ---------- Simple Humanoid (placeholder) ----------
  // Scale body by height
  const s = height / 1.70;

  const root = new THREE.Group();
  root.name = "avatar_root";
  root.scale.setScalar(s);
  group.add(root);

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.40, 6, 14), matShirt);
  torso.name = "torso";
  torso.position.set(0, 1.15, 0);
  root.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 18), matSkin);
  head.name = "head";
  head.position.set(0, 1.55, 0);
  root.add(head);

  // Face placeholder (later: texture / mesh)
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.35
  }));
  face.name = "face";
  face.position.set(0, 1.55, 0.145);
  root.add(face);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.34, 6, 12);

  const armL = new THREE.Mesh(armGeo, matShirt);
  armL.name = "arm_L";
  armL.position.set(-0.26, 1.18, 0);
  armL.rotation.z = 0.1;
  root.add(armL);

  const armR = new THREE.Mesh(armGeo, matShirt);
  armR.name = "arm_R";
  armR.position.set(0.26, 1.18, 0);
  armR.rotation.z = -0.1;
  root.add(armR);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.45, 6, 12);

  const legL = new THREE.Mesh(legGeo, matPants);
  legL.name = "leg_L";
  legL.position.set(-0.10, 0.63, 0);
  root.add(legL);

  const legR = new THREE.Mesh(legGeo, matPants);
  legR.name = "leg_R";
  legR.position.set(0.10, 0.63, 0);
  root.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.14, 0.06, 0.24);
  const shoeL = new THREE.Mesh(shoeGeo, matShoes);
  shoeL.name = "shoe_L";
  shoeL.position.set(-0.10, 0.28, 0.06);
  root.add(shoeL);

  const shoeR = new THREE.Mesh(shoeGeo, matShoes);
  shoeR.name = "shoe_R";
  shoeR.position.set(0.10, 0.28, 0.06);
  root.add(shoeR);

  // Shirt overlay “panel” (later: logo texture)
  const shirtPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.18), matAccent);
  shirtPanel.name = "shirt_panel";
  shirtPanel.position.set(0, 1.18, 0.19);
  root.add(shirtPanel);

  // ---------- Name tag (super safe, no fonts; just a glowing bar) ----------
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.05, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 })
  );
  tag.name = "name_tag";
  tag.position.set(0, 1.78, 0);
  root.add(tag);

  const tagGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.01),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.2 })
  );
  tagGlow.name = "name_glow";
  tagGlow.position.set(0, 1.78, 0.012);
  root.add(tagGlow);

  // ---------- Public API ----------
  function setName(_text) {
    group.name = `Avatar_${_text}`;
  }

  function setColors(c = {}) {
    if (c.skin != null) matSkin.color.setHex(asHex(c.skin));
    if (c.shirt != null) matShirt.color.setHex(asHex(c.shirt));
    if (c.pants != null) matPants.color.setHex(asHex(c.pants));
    if (c.shoes != null) matShoes.color.setHex(asHex(c.shoes));
  }

  // Hooks for future textures (no-op for now)
  function setOutfit(_o = {}) { /* reserved */ }
  function setMood(_mood) { /* reserved */ }

  return { group, setName, setColors, setOutfit, setMood };
}

function asHex(v) {
  if (typeof v === "number") return v;
  // allow "#rrggbb"
  if (typeof v === "string" && v.startsWith("#")) return parseInt(v.slice(1), 16);
  return 0xffffff;
}
