// js/avatar_loader.js
(function(){
  const D = window.SCARLETT_DIAG || { log: () => {} };

  function readManifest(){
    const el = document.getElementById("avatarManifest");
    if(!el) return [];
    try {
      return JSON.parse(el.textContent.trim());
    } catch (e) {
      return [];
    }
  }

  window.SCARLETT_AVATARS = window.SCARLETT_AVATARS || {};

  window.addEventListener("DOMContentLoaded", ()=>{
    const list = readManifest();
    window.SCARLETT_AVATARS.list = list;
    D.log("[avatars] applied list ✅");
    if(list.length) D.log(list.join(",\n"));
  });
})();
