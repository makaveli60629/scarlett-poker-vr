// js/name_tag_focus.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };
  const scene = document.getElementById("scene");
  const cam = document.getElementById("camera");
  if (!scene || !cam) return;

  let lastShown = null;
  function tagOf(bot){ return bot ? bot.querySelector(".nameTag") : null; }
  function setVis(el, v){ if (el) el.setAttribute("visible", v ? "true":"false"); }

  scene.addEventListener("loaded", ()=>{
    scene.addEventListener("tick", ()=>{
      const origin = cam.object3D.getWorldPosition(new THREE.Vector3());
      const dir = cam.object3D.getWorldDirection(new THREE.Vector3());
      const ray = new THREE.Raycaster(origin, dir, 0, 20);

      const bots = Array.from(scene.querySelectorAll(".bot")).map(e=>e.object3D);
      const hits = ray.intersectObjects(bots, true);
      let botEl = null;

      if (hits && hits.length){
        let o = hits[0].object;
        while (o && o.el && o.el !== scene){
          if (o.el.classList && o.el.classList.contains("bot")) { botEl = o.el; break; }
          o = o.parent;
        }
      }

      if (botEl !== lastShown){
        setVis(tagOf(lastShown), false);
        setVis(tagOf(botEl), true);
        lastShown = botEl;
      }
    });
  });

  D.log("[focus] name tags: look-to-show ✅");
})();
