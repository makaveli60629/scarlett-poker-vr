// /js/textures.js — Scarlett TextureKit v4 (NO-FETCH, ROCK SOLID)
// - Exports: createTextureKit, TextureBank
// - Fix: no HEAD/GET probing (mobile/GitHub can misbehave). We just try to load.
// - Fix: absolute base computed from import.meta.url -> /assets/textures/

export const TextureBank = {
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
      "avatars/Menu hand.jpg",
      "avatars/Menu_hand.jpg",
      "avatars/menu_hand.jpg",
      "avatars/menuhand.jpg",
      "avatars/MenuHand.jpg",
      "avatars/MenuHand.png"
    ]
  }
};

function safeJoin(base, rel) {
  return new URL(rel, base).toString();
}

function loadWithCandidates({ THREE, loader, base, candidates, log }) {
  const L = loader || new THREE.TextureLoader();
  const b = base || TextureBank.base;

  return new Promise((resolve) => {
    let i = 0;

    const tryNext = () => {
      if (i >= candidates.length) {
        log?.(`[tex] ❌ no candidate found: ${candidates.join(" | ")}`);
        resolve(null);
        return;
      }

      const rel = candidates[i++];
      const url = safeJoin(b, rel);

      // Cache-bust textures too (important on mobile GH Pages)
      const bust = (url.includes("?") ? "&" : "?") + "v=" + Date.now();
      const finalUrl = url + bust;

      L.load(
        finalUrl,
        (tex) => {
          try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
          log?.(`[tex] ✅ ${rel}`);
          resolve(tex);
        },
        undefined,
        () => {
          // try next candidate
          tryNext();
        }
      );
    };

    tryNext();
  });
}

export async function loadTextureAny({ THREE, loader, base, candidates, log }) {
  return loadWithCandidates({ THREE, loader, base, candidates, log });
}

export function createTextureKit({ THREE, renderer, base, log = console.log }) {
  const loader = new THREE.TextureLoader();

  // Prefer explicit base if passed, else bank base
  const resolvedBase = base ? new URL(base, location.href).toString() : TextureBank.base;

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

  if (renderer) renderer.__SCARLETT_TEXTUREKIT = kit;
  return kit;
}
