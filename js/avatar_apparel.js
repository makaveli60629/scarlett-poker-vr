import * as THREE from "three";

let state = {
  isEquipped: false,
  mat: null,
  t0: 0,
  avatar: null
};

function texLoader() {
  return new THREE.TextureLoader();
}

function getOrFallbackTexture(url, fallbackColor=0x00ffff) {
  const loader = texLoader();
  try {
    const t = loader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1,1);
    return t;
  } catch {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0,0,128,128);
    g.fillStyle = "#00ffff"; g.fillRect(0,0,64,64);
    g.fillStyle = "#ff00aa"; g.fillRect(64,64,64,64);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }
}

export async function initAvatarApparel(ctx) {
  const { scene, log } = ctx;

  // Minimal "avatar" mannequin near store pad
  const avatar = new THREE.Group();
  avatar.name = "AVATAR_ROOT";
  avatar.position.set(-12.5, 0, -9.4);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.55, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x222a35, roughness: 0.9, metalness: 0.08 })
  );
  torso.position.y = 1.35;
  torso.name = "Torso_Sleeves";
  avatar.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.85, metalness: 0.10 })
  );
  head.position.y = 1.92;
  avatar.add(head);

  scene.add(avatar);
  state.avatar = avatar;

  // Store button
  const btn = document.getElementById("btn-equip-shirt");
  if (btn) {
    btn.addEventListener("click", () => applyShirtModule(ctx));
  }

  // Also allow triggering from event (so you can wire to 3D kiosk later)
  window.addEventListener("scarlett_equip_shirt", () => applyShirtModule(ctx));

  log?.("[apparel] ready ✓ (avatar mannequin + store button)");
}

function applyShirtModule(ctx) {
  const { log } = ctx;
  const diffuseUrl  = "assets/textures/shirt_neon_diffuse.png";
  const emissiveUrl = "assets/textures/shirt_neon_emissive.png";
  const normalUrl   = "assets/textures/shirt_neon_normal.png";

  const diffuseMap  = getOrFallbackTexture(diffuseUrl);
  const emissiveMap = getOrFallbackTexture(emissiveUrl);
  const normalMap   = getOrFallbackTexture(normalUrl);

  const neonMaterial = new THREE.MeshStandardMaterial({
    map: diffuseMap,
    normalMap,
    emissiveMap,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.98,
    roughness: 0.70,
    metalness: 0.30
  });

  state.mat = neonMaterial;
  state.isEquipped = true;
  state.t0 = performance.now();

  // Target torso mesh
  state.avatar?.traverse((child) => {
    if (child.isMesh && String(child.name).includes("Torso_Sleeves")) {
      child.material = neonMaterial;
    }
  });

  log?.("Update 4.0: Neon Glitch Texture Integrated ✅");
}

export function tick() {
  if (state.isEquipped && state.mat) {
    const t = performance.now() * 0.002;
    state.mat.emissiveIntensity = 1.5 + Math.sin(t) * 1.0;
  }
}
