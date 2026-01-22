// js/avatar_loader.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };

  function safeParseJSON(id){
    try{
      const el = document.getElementById(id);
      if (!el) return null;
      return JSON.parse(el.textContent.trim());
    }catch(e){ return null; }
  }

  const list = safeParseJSON("avatarManifest") || [];
  if (!list.length){ D.log("[avatars] no manifest found (ok)"); return; }

  const scene = document.getElementById("scene");

  function apply(){
    const bots = Array.from(document.querySelectorAll(".bot"));
    if (!bots.length){
      D.log("[avatars] no .bot entities found yet (ok)");
      return;
    }
    bots.forEach((bot, i)=>{
      const url = list[i % list.length];
      const assets = scene.querySelector("a-assets");
      const itemId = "av_" + i;
      if (!assets.querySelector("#"+itemId)){
        const it = document.createElement("a-asset-item");
        it.setAttribute("id", itemId);
        it.setAttribute("src", url);
        assets.appendChild(it);
      }
      const holder = document.createElement("a-entity");
      holder.setAttribute("gltf-model", "#"+itemId);
      // Many GLBs are not authored with feet at Y=0. Lift slightly for visibility.
      holder.setAttribute("position", "0 0.05 0");
      holder.setAttribute("rotation", "0 180 0");
      holder.setAttribute("scale", "1.15 1.15 1.15");

      // If the project includes the animation-mixer component, enable it.
      // (Safe: if not present, A-Frame ignores unknown components.)
      holder.setAttribute("animation-mixer", "clip: *; timeScale: 1.0");

      // Keep interaction/callouts/name tags and keep the old placeholder body as a fallback.
      // Hide placeholder geometry instead of removing, so a failed GLB load is still visible.
      Array.from(bot.children).forEach(ch=>{
        if (ch.classList && (ch.classList.contains("actionPanel") || ch.classList.contains("holeCards") || ch.classList.contains("nameTag"))) return;
        if (ch.tagName === "A-CYLINDER" || ch.tagName === "A-SPHERE") ch.setAttribute("visible", "false");
      });
      bot.appendChild(holder);
    });

    D.log("[avatars] applied list ✅");
    D.log(list.join(",\n"));
  }

  // Run on scene load + whenever the world rebuilds.
  if (scene) {
    scene.addEventListener("loaded", apply);
    scene.addEventListener("scarlett-world-built", apply);
    // If scene is already loaded by the time this file executes, apply on next tick.
    if (scene.hasLoaded) setTimeout(apply, 0);
  }
})();
