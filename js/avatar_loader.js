// js/avatar_loader.js
(function(){
  const D = window.SCARLETT_DIAG;
  function applyBotAvatars(urls){
    const bots = Array.from(document.querySelectorAll(".bot"));
    if(!bots.length) return;
    bots.forEach((bot, i)=>{
      const url = urls[i % urls.length];
      Array.from(bot.children).forEach(ch=>{
        if(!ch || !ch.tagName) return;
        const t = ch.tagName.toLowerCase();
        if(t === "a-cylinder" || t === "a-sphere") bot.removeChild(ch);
      });
      const model = document.createElement("a-entity");
      model.setAttribute("gltf-model", url);
      model.setAttribute("position", "0 0 0.05");
      model.setAttribute("rotation", "0 180 0");
      model.setAttribute("scale", "1 1 1");
      model.classList.add("botModel");
      bot.appendChild(model);
    });
    D.log("[avatars] applied " + urls.length + " GLB(s) ✅");
  }
  window.SCARLETT_AVATARS_API = { applyBotAvatars };
})();
