// js/name_tag_focus.js
// Show a bot's name tag only when the player is looking at that bot.
// (Delayed init to avoid Quest/Android early-THREE issues)
(function(){
  function ready(){
    return window.THREE && document.getElementById("scene") && document.getElementById("scene").hasLoaded;
  }

  function init(){
    const D = window.SCARLETT_DIAG;

    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const origin = new THREE.Vector3();

    function setVisible(bot, v){
      const tag = bot.querySelector(".nameTag");
      if(tag) tag.setAttribute("visible", v ? "true" : "false");
    }

    function tick(){
      const camEl = document.getElementById("camera");
      if(!camEl || !camEl.object3D) return;

      const bots = Array.from(document.querySelectorAll(".bot"));
      if(!bots.length) return;

      camEl.object3D.getWorldPosition(origin);
      camEl.object3D.getWorldDirection(dir);
      ray.set(origin, dir);

      const meshes = [];
      const meshToBot = new Map();
      bots.forEach(bot=>{
        bot.object3D.traverse(n=>{
          if(n && n.isMesh){
            meshes.push(n);
            meshToBot.set(n, bot);
          }
        });
      });

      let hitBot = null;
      const hits = ray.intersectObjects(meshes, true);
      if(hits && hits.length){
        for(const h of hits){
          const b = meshToBot.get(h.object);
          if(b){ hitBot = b; break; }
        }
      }
      bots.forEach(b=>setVisible(b, b === hitBot));
    }

    setInterval(tick, 120);
    D && D.log && D.log("[focus] name tags: look-to-show ✅");
  }

  const scene = document.getElementById("scene");
  if(scene){
    scene.addEventListener("loaded", ()=>{
      const t0 = performance.now();
      (function wait(){
        if(ready()) return init();
        if(performance.now() - t0 < 4000) return setTimeout(wait, 50);
      })();
    });
  } else {
    // fallback
    setTimeout(()=>{ if(window.THREE) init(); }, 800);
  }
})();
