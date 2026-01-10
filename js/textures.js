// /js/textures.js — Scarlett TextureKit v3 (FULL, FIXED PATHS)
// - Exports: createTextureKit, TextureBank
// - Safe loading: tries multiple candidate filenames, handles spaces + casing variants.
// - FIX: Base path is resolved via import.meta.url so it never points to /js/assets/...

export const TextureBank = {
  // Absolute base derived from this module location (/js/textures.js -> /assets/textures/)
  // Example output: https://<host>/<repo>/assets/textures/
  base: new URL("../assets/textures/", import.meta.url).toString(),

  avatars: {
    face: [
      "avatars/Face.jpg", "avatars/face.jpg",
      "avatars/Face.jpeg", "avatars/face.jpeg",
      "avatars/Face.png", "avatars/face.png"
    ],
    hands: [
      "avatars/Hands.jpg", "avatars/hands.jpg",
      "avatars/Hands.png", "avatars/hands.png"
    ],
    watch: [
      "avatars/Watch.jpg", "avatars/watch.jpg",
      "avatars/Watch.png", "avatars/watch.png"
    ],
    menuHand: [
      "avatars/Menu hand.jpg", // space
      "avatars/Menu_hand.jpg",
      "avatars/menu_hand.jpg",
      "avatars/menuhand.jpg",
      "avatars/MenuHand.jpg",
      "avatars/MenuHand.png"   // ✅ you have this one
    ]
  }
};

function safeJoin(base, rel) {
  // base is an absolute URL string ending with /
  return new URL(rel, base).toString();
}

async function exists(url) {
  try {
    // HEAD is lighter; GitHub Pages supports it. If it fails, fall back to GET.
    let r = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (r.ok) return true;

    r = await fetch(url, { method: "GET", cache: "no-store" });
    return r.ok;
  } catch {
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

      // three r150+ uses colorSpace; keep consistent
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

export function createTextureKit({ THREE, renderer, base, log = console.log }) {
  const loader = new THREE.TextureLoader();

  // If caller passes a base, normalize it; otherwise use the bank base.
  // If someone passes "./assets/textures/", this converts it to a safe absolute URL anyway.
  const resolvedBase = (() => {
    if (!base) return TextureBank.base;
    try {
      // Resolve relative bases safely against the page origin (not /js/)
      return new URL(base, location.origin + location.pathname.replace(/\/[^\/]*$/, "/")).toString();
    } catch {
      return TextureBank.base;
    }
  })();

  const kit = {
    base: resolvedBase,
    loader,

    async getAvatarFace() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.face, log });
    },
    async getAvatarHands() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.hands, log });
    },
    async getAvatarWatch() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.watch, log });
    },
    async getAvatarMenuHand() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.menuHand, log });
    }
  };

  // Keep a reference for modules
  if (renderer) renderer.__SCARLETT_TEXTUREKIT = kit;
  return kit;
}
