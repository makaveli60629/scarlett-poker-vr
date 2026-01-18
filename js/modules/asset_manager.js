// /js/modules/asset_manager.js
// Android debug-safe asset applier: no texture work during module import.
// Call after world build and after renderer is attached.

export function applyAssets({ THREE, dwrite }, { targets } = {}){
  try{
    const loader = new THREE.TextureLoader();
    const felt = loader.load("./assets/textures/felt.png");
    felt.wrapS = felt.wrapT = THREE.RepeatWrapping;
    felt.repeat.set(2,2);

    const cardBack = loader.load("./assets/textures/card_back.png");
    const chipRed = loader.load("./assets/textures/chip_red.png");

    // Apply felt to known targets
    if (targets?.tableMats){
      for (const m of targets.tableMats){
        try{
          m.map = felt;
          m.needsUpdate = true;
        }catch(_){}
      }
    }
    // Apply card back texture
    if (targets?.cardBackMats){
      for (const m of targets.cardBackMats){
        try{
          m.map = cardBack;
          m.needsUpdate = true;
        }catch(_){}
      }
    }
    // Chip texture
    if (targets?.chipMats){
      for (const m of targets.chipMats){
        try{
          m.map = chipRed;
          m.transparent = true;
          m.needsUpdate = true;
        }catch(_){}
      }
    }

    dwrite?.("[assets] applied ✅");
  }catch(err){
    dwrite?.("[assets] apply failed: " + (err?.message || err));
  }
}
