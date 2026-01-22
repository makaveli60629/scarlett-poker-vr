// js/avatar_loader.js
(function(){
  function ready(){
    return document.getElementById("scene") && document.getElementById("scene").hasLoaded;
  }
  function startWhenReady(fn){
    const scene = document.getElementById("scene");
    const go = ()=>setTimeout(fn, 50);
    if(scene) scene.addEventListener("loaded", go);
    else setTimeout(go, 800);
  }

  startWhenReady(function(){
const D = window.SCARLETT_DIAG;

  function stripPlaceholders(bot){
    Array.from(bot.children).forEach(ch=>{
      if(!ch || !ch.tagName) return;
      const t = ch.tagName.toLowerCase();
      if(t === "a-cylinder" || t === "a-sphere") bot.removeChild(ch);
    });
    const old = bot.querySelector(".botModel");
    if(old) old.remove();
  }

  function applyBotAvatar(bot, url){
    stripPlaceholders(bot);
    const model = document.createElement("a-entity");
    model.classList.add("botModel");
    model.setAttribute("gltf-model", url);
    model.setAttribute("position", "0 0 0.05");
    model.setAttribute("rotation", "0 180 0");
    model.setAttribute("scale", "1 1 1");
    model.addEventListener("model-error", ()=>{
      D && D.warn && D.warn("[avatars] failed to load: " + url);
    });
    bot.appendChild(model);
  }

  function applyBotAvatars(urls){
    const bots = Array.from(document.querySelectorAll(".bot"));
    if(!bots.length) return;
    bots.forEach((bot, i)=>{
      const url = urls[i % urls.length];
      if(url) applyBotAvatar(bot, url);
    });
    D && D.log && D.log("[avatars] applied list ✅ " + urls.join(", "));
  }

  let cycleList = [];
  let cycleIndex = 0;

  function setCycleList(urls){
    cycleList = Array.isArray(urls) ? urls.slice() : [];
    cycleIndex = 0;
  }

  function cycleNext(){
    if(!cycleList.length) return;
    cycleIndex = (cycleIndex + 1) % cycleList.length;
    applyBotAvatars([cycleList[cycleIndex]]);
    D && D.toast && D.toast("Avatar: " + cycleList[cycleIndex]);
  }

  window.SCARLETT_AVATARS_API = { applyBotAvatars, setCycleList, cycleNext };

  (function autoApply(){
    try{
      const m = document.getElementById("avatarManifest");
      if(!m) return;
      const list = JSON.parse(m.textContent || "[]");
      if(Array.isArray(list) && list.length){
        setCycleList(list);
        applyBotAvatars(list);
        D && D.toast && D.toast("Avatars loaded (" + list.length + ")");
      } else {
        D && D.log && D.log("[avatars] manifest empty");
      }
    }catch(e){
      D && D.warn && D.warn("[avatars] manifest parse error");
    }
  })();

  function wireStore(){
    const pedestals = Array.from(document.querySelectorAll(".storePedestal"));
    if(!pedestals.length) return;
    pedestals.forEach(p=>{
      p.classList.add("uiTarget");
      p.addEventListener("click", ()=>cycleNext());
    });
  }
  setTimeout(wireStore, 1200);

  });
})();
