// /js/textures.js — Compatibility + TextureBank
// Fixes: store_kiosk.js importing { TextureBank }
// Also keeps: export createTextureKit (your existing API)

let _THREE = null;
let _renderer = null;

const _cache = new Map(); // name -> THREE.Texture
const _meta = new Map();  // name -> { url }

function _ensureThree(THREE){
  if (!_THREE && THREE) _THREE = THREE;
}

function _applyCommon(tex){
  if (!tex) return tex;
  try {
    tex.colorSpace = _THREE?.SRGBColorSpace ?? tex.colorSpace;
  } catch {}
  tex.wrapS = tex.wrapT = (_THREE?.RepeatWrapping ?? tex.wrapS);
  tex.anisotropy = Math.min(8, _renderer?.capabilities?.getMaxAnisotropy?.() || 8);
  tex.needsUpdate = true;
  return tex;
}

// ✅ NEW: TextureBank export (for store_kiosk.js)
export const TextureBank = {
  init({ THREE, renderer } = {}) {
    _ensureThree(THREE);
    if (renderer) _renderer = renderer;
    return TextureBank;
  },

  has(name){ return _cache.has(name); },
  get(name){ return _cache.get(name) || null; },

  async load(name, url, { THREE, renderer } = {}) {
    _ensureThree(THREE);
    if (renderer) _renderer = renderer;
    if (_cache.has(name)) return _cache.get(name);

    if (!_THREE) throw new Error("TextureBank.load needs THREE (call TextureBank.init({THREE}) first)");
    const loader = new _THREE.TextureLoader();
    const tex = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    _meta.set(name, { url });
    _cache.set(name, _applyCommon(tex));
    return tex;
  },

  register(name, texture, meta = {}) {
    _cache.set(name, _applyCommon(texture));
    _meta.set(name, meta);
    return texture;
  },

  list(){ return Array.from(_cache.keys()); }
};

// ✅ Existing-style API your project uses
export function createTextureKit({ THREE, renderer, base = "" } = {}) {
  _ensureThree(THREE);
  if (renderer) _renderer = renderer;
  TextureBank.init({ THREE, renderer });

  return {
    base,
    bank: TextureBank,
    load: (name, relUrl) => TextureBank.load(name, base + relUrl, { THREE, renderer }),
    get: (name) => TextureBank.get(name),
    has: (name) => TextureBank.has(name),
    list: () => TextureBank.list(),
  };
}
