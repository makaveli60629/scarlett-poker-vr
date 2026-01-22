// js/walkers.js
// Lightweight lobby walkers (NPCs) using your uploaded GLBs.
// Spawns a few walkers that circle the lobby and never enter the pit.
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };

  function safeParseJSON(id){
    try{
      const el = document.getElementById(id);
      if (!el) return null;
      return JSON.parse(el.textContent.trim());
    }catch(_){ return null; }
  }

  if (!window.AFRAME) { D.log('[walkers] AFRAME missing ❌'); return; }

  AFRAME.registerComponent('scarlett-walker', {
    schema: {
      center: { type: 'vec3', default: {x:0,y:0,z:0} },
      radius: { type: 'number', default: 22 },
      speed:  { type: 'number', default: 0.45 },
      phase:  { type: 'number', default: 0 }
    },
    tick: function(time, dt){
      const dts = (dt || 16) / 1000;
      const data = this.data;
      data.phase += data.speed * dts;
      const a = data.phase;
      const x = data.center.x + Math.cos(a) * data.radius;
      const z = data.center.z + Math.sin(a) * data.radius;
      // Keep walkers on lobby floor, outside the pit.
      this.el.object3D.position.set(x, 0, z);
      // Face direction of travel.
      this.el.object3D.rotation.y = -a + Math.PI/2;
    }
  });

  function ensureAsset(assets, id, src){
    let it = assets.querySelector('#'+id);
    if (it) return it;
    it = document.createElement('a-asset-item');
    it.setAttribute('id', id);
    it.setAttribute('src', src);
    assets.appendChild(it);
    return it;
  }

  function spawn(){
    const scene = document.getElementById('scene');
    if (!scene) return;
    const assets = scene.querySelector('a-assets');
    if (!assets) return;

    const manifest = safeParseJSON('avatarManifest') || [];
    const urls = manifest.length ? manifest : ["assets/avatars/ninja.glb"]; 

    // Prefer ninja + then reuse other uploaded GLBs as ambient walkers.
    const walkerUrls = [];
    const ninja = urls.find(u => /ninja\.glb$/i.test(u));
    if (ninja) walkerUrls.push(ninja);
    urls.forEach(u => { if (walkerUrls.length < 4 && u !== ninja) walkerUrls.push(u); });

    const root = document.createElement('a-entity');
    root.setAttribute('id', 'walkers');
    scene.appendChild(root);

    const count = Math.min(4, walkerUrls.length);
    for (let i=0;i<count;i++){
      const src = walkerUrls[i];
      const id = 'walkerAsset_' + i;
      ensureAsset(assets, id, src);

      const w = document.createElement('a-entity');
      w.setAttribute('class', 'walker');
      w.setAttribute('gltf-model', '#'+id);
      w.setAttribute('position', '0 0 0');
      w.setAttribute('rotation', '0 0 0');
      w.setAttribute('scale', '0.9 0.9 0.9');
      w.setAttribute('animation-mixer', 'clip:*; timeScale:1.0');

      // Stagger phases so they don't overlap.
      w.setAttribute('scarlett-walker', `center: 0 0 0; radius: ${22 - i*2.2}; speed: ${0.38 + i*0.08}; phase: ${i*1.6}`);

      // Make sure these do not become teleport targets.
      w.setAttribute('data-nonteleportable', 'true');
      root.appendChild(w);
    }

    D.log('[walkers] spawned ✅');
  }

  const scene = document.getElementById('scene');
  if (scene) {
    scene.addEventListener('loaded', ()=>setTimeout(spawn, 50), { once: true });
    if (scene.hasLoaded) setTimeout(spawn, 50);
  }
})();
