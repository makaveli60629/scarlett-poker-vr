export async function init({ diagWrite } = {}){
  (diagWrite || window.__scarlettDiagWrite)?.("[scarlett1] boot.js loaded ✅");
}
