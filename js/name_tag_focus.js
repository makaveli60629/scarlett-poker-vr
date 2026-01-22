// js/name_tag_focus.js
(function(){
  const D = window.SCARLETT_DIAG || { log: () => {} };

  function getCamera(){ return document.getElementById("camera"); }
  function getBots(){ return document.querySelectorAll(".bot"); }

  function hideAll(){
    getBots().forEach(b=>{
      const t = b.querySelector(".nameTag");
      if (t) t.setAttribute("visible","false");
    });
  }

  function tick(){
    const cam = getCamera();
    if(!cam || !cam.object3D) return;

    const bots = [...getBots()];
    if(!bots.length) return;

    const camPos = new THREE.Vector3();
    cam.object3D.getWorldPosition(camPos);

    const camDir = new THREE.Vector3(0,0,-1).applyQuaternion(cam.object3D.quaternion).normalize();

    let best = null;
    let bestScore = -1;

    for(const b of bots){
      const p = new THREE.Vector3();
      b.object3D.getWorldPosition(p);
      const v = p.clone().sub(camPos);
      const dist = v.length();
      if (dist > 8) continue;
      v.normalize();
      const dot = camDir.dot(v);
      const score = dot - dist*0.06;
      if(score > bestScore){
        bestScore = score;
        best = b;
      }
    }

    hideAll();
    if(best && bestScore > 0.55){
      const t = best.querySelector(".nameTag");
      if(t) t.setAttribute("visible","true");
    }
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    D.log("[focus] name tags: look-to-show ✅");
    setInterval(tick, 120);
  });
})();
