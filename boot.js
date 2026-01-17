const hud = document.getElementById("hud");
const log = (m)=>{ console.log(m); hud.innerHTML+=`<br>${m}`; };
log(`[BOOT] v=${Date.now()}`);

async function load(name,path){
 try{
  log(`[Import] ${name}: ${path}`);
  const m = await import(path);
  log(`[OK] ${name}`);
  return m;
 }catch(e){
  log(`[ERROR] ${name}: ${e.message}`);
  console.error(e);
  return null;
 }
}

(async()=>{
 const main=await load("main","./main.js");
 const world=await load("world","./world.js");
 const table=await load("table","./table.js");
 const chair=await load("chair","./chair.js");
 const ui=await load("ui","./ui.js");
 const controls=await load("controls","./controls.js");
 const teleport=await load("teleport","./teleport.js");
 const interactions=await load("interactions","./interactions.js");
 if(!main){ log("❌ MAIN FAILED"); return; }
 main.start({world,table,chair,ui,controls,teleport,interactions,log});
})();