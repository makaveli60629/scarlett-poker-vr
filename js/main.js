import { startWorldOrchestra } from "./world_orchestra.js";

window.addEventListener("DOMContentLoaded", ()=>{
  try { window.__SCARLETT_EARLY_DIAG__?.write?.("loading js/main.js…"); } catch(_) {}
  startWorldOrchestra();
});
