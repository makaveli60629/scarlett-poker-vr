// /js/textures.js — Scarlett TextureKit v2 (FULL)
// - Exports: createTextureKit, TextureBank
// - Safe loading: tries multiple candidate filenames, handles spaces, casing variants.

export const TextureBank = {
  base: "./assets/textures/",
  avatars: {
    face: [
      "avatars/Face.jpg", "avatars/face.jpg", "avatars/Face.jpeg", "avatars/face.jpeg", "avatars/Face.png", "avatars/face.png"
    ],
    hands: [
      "avatars/Hands.jpg", "avatars/hands.jpg", "avatars/Hands.png", "avatars/hands.png"
    ],
    watch: [
      "avatars/Watch.jpg", "avatars/watch.jpg", "avatars/Watch.png", "avatars/watch.png"
    ],
    menuHand: [
      "avatars/Menu hand.jpg",     // your current file (space)
      "avatars/Menu_hand.jpg",     // recommended rename
      "avatars/menu_hand.jpg",
      "avatars/menuhand.jpg",
      "avatars/MenuHand.jpg"
    ]
  }
};

function safeJoin(base, rel){
  if (!base.endsWith("/")) base += "/";
  // keep spaces, URL() will encode when used as URL
  return new URL(rel, new URL(base, location.href)).toString();
}

async function exists(url){
  try{
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

export async function loadTextureAny({ THREE, loader, base, candidates, log }) {
  const L = loader || new THREE.TextureLoader();
  const b = base || TextureBank.base;

  for (const rel of candidates) {
    const url = safeJoin(b, rel);
    if (!(await exists(url))) continue;

    try {
      const tex = await new Promise((resolve, reject) => {
        L.load(
          url,
          (t) => resolve(t),
          undefined,
          (e) => reject(e)
        );
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      log?.(`[tex] ✅ ${rel}`);
      return tex;
    } catch (e) {
      log?.(`[tex] ⚠️ load failed ${rel} :: ${e?.message || e}`);
    }
  }

  log?.(`[tex] ❌ no candidate found: ${candidates.join(" | ")}`);
  return null;
}

export function createTextureKit({ THREE, renderer, base = "./assets/textures/", log = console.log }) {
  const loader = new THREE.TextureLoader();

  const kit = {
    base,
    loader,
    async getAvatarFace() {
      return loadTextureAny({ THREE, loader, base, candidates: TextureBank.avatars.face, log });
    },
    async getAvatarHands() {
      return loadTextureAny({ THREE, loader, base, candidates: TextureBank.avatars.hands, log });
    },
    async getAvatarWatch() {
      return loadTextureAny({ THREE, loader, base, candidates: TextureBank.avatars.watch, log });
    },
    async getAvatarMenuHand() {
      return loadTextureAny({ THREE, loader, base, candidates: TextureBank.avatars.menuHand, log });
    }
  };

  // Keep a reference for modules
  if (renderer) renderer.__SCARLETT_TEXTUREKIT = kit;
  return kit;
}
