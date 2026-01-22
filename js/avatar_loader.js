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
  scene.addEventListener("loaded", ()=>{
    const bots = Array.from(document.querySelectorAll(".bot"));
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
      holder.setAttribute("position", "0 0 0");
      holder.setAttribute("rotation", "0 180 0");
      holder.setAttribute("scale", "0.9 0.9 0.9");

      Array.from(bot.children).forEach(ch=>{
        if (ch.classList && (ch.classList.contains("actionPanel") || ch.classList.contains("holeCards") || ch.classList.contains("nameTag"))) return;
        if (ch.tagName === "A-CYLINDER" || ch.tagName === "A-SPHERE") bot.removeChild(ch);
      });
      bot.appendChild(holder);
    });

    D.log("[avatars] applied list ✅");
    D.log(list.join(",\n"));
  });
})();
