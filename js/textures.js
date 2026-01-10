// /js/textures.js — Scarlett TextureKit v5 DEBUG (PRINTS URLS)
// Purpose: prove the exact URL being attempted on device + fix GitHub Pages root reliably.

export const TextureBank = {
  // We'll fill this in dynamically below
  base: "",
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

// Robust “repo root” for GitHub Pages:
// location.pathname is usually: /scarlett-poker-vr/ or /scarlett-poker-vr/index.html
function getRepoRootURL() {
  const parts = (location.pathname || "/").split("/").filter(Boolean);
  // If served from a repo pages site, first segment is repo name
  // e.g. ["scarlett-poker-vr"]
  const repo = parts.length ? parts[0] : "";
  const rootPath = repo ? `/${repo}/` : "/";
  return location.origin + rootPath;
}

TextureBank.base = getRepoRootURL() + "assets/textures/";

// Startup signature (so we KNOW you deployed this file)
console.log("[textures] ✅ v5 DEBUG loaded");
console.log("[textures] repoRoot =", getRepoRootURL());
console.log("[textures] base     =", TextureBank.base);

function safeJoin(base, rel) {
  return new URL(rel, base).toString();
}

function loadWithCandidates({ THREE, loader, base, candidates, log, label }) {
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
      const finalUrl = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();

      // IMPORTANT: print every attempt (first 2 attempts per texture to keep log readable)
      if (i <= 2) log?.(`[tex] trying ${label || ""} -> ${finalUrl}`);

      L.load(
        finalUrl,
        (tex) => {
          try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
          log?.(`[tex] ✅ ${rel}`);
          resolve(tex);
        },
        undefined,
        () => {
          tryNext();
        }
      );
    };

    tryNext();
  });
}

export async function loadTextureAny({ THREE, loader, base, candidates, log, label }) {
  return loadWithCandidates({ THREE, loader, base, candidates, log, label });
}

export function createTextureKit({ THREE, renderer, base, log = console.log }) {
  const loader = new THREE.TextureLoader();
  const resolvedBase = base ? new URL(base, location.href).toString() : TextureBank.base;

  const kit = {
    base: resolvedBase,
    loader,
    async getAvatarFace() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.face, log, label: "face" });
    },
    async getAvatarHands() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.hands, log, label: "hands" });
    },
    async getAvatarWatch() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.watch, log, label: "watch" });
    },
    async getAvatarMenuHand() {
      return loadTextureAny({ THREE, loader, base: resolvedBase, candidates: TextureBank.avatars.menuHand, log, label: "menuHand" });
    }
  };

  if (renderer) renderer.__SCARLETT_TEXTUREKIT = kit;
  return kit;
}
