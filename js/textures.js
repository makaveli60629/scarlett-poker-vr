// /js/textures.js — safe texture loading (never crashes)

export function createTextureKit(THREE, { log = console.log } = {}) {
  const loader = new THREE.TextureLoader();

  function load(path, opts = {}) {
    return new Promise((resolve) => {
      try {
        loader.load(
          path,
          (t) => {
            try {
              t.colorSpace = THREE.SRGBColorSpace;
              if (opts.repeat) {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(opts.repeat[0], opts.repeat[1]);
              }
            } catch {}
            resolve(t);
          },
          undefined,
          () => {
            log(`[tex] missing: ${path} (using null)`);
            resolve(null);
          }
        );
      } catch {
        resolve(null);
      }
    });
  }

  return { load };
}
