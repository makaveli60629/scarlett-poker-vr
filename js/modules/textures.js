// /js/modules/textures.js
export function loadTextureSafe(THREE, url){
  try{
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }catch(_){
    return null;
  }
}
