const hud=document.getElementById('hud');
const add=(m,c='ok')=>{const d=document.createElement('div');d.className=c;d.textContent=m;hud.appendChild(d);hud.scrollTop=hud.scrollHeight;console.log(m)};
export const Boot={start:async({basePaths=['./js/','./']}={})=>{
  hud.textContent='';const v=Date.now();add(`[BOOT] v=${v}`,'ok');
  const tryImport=async(name,rel)=>{
    for(const b of basePaths){const p=b+rel;
      try{add(`[Import] ${name}: ${p}`);const m=await import(p+`?v=${v}`);add(`[OK] ${name}`,'ok');return m}
      catch(e){add(`[TryFail] ${name}: ${p} → ${e.message}`,'warn')}
    }
    add(`[ERROR] ${name}: could not load`,'err');return null
  };
  const mods={
    main:await tryImport('main','main.js'),
    world:await tryImport('world','world.js'),
    table:await tryImport('table','table.js'),
    chair:await tryImport('chair','chair.js'),
    ui:await tryImport('ui','ui.js'),
    controls:await tryImport('controls','controls.js'),
    teleport:await tryImport('teleport','teleport.js'),
    interactions:await tryImport('interactions','interactions.js'),
  };
  if(!mods.main?.start){add('❌ main.start missing','err');return}
  add('▶ main.start()','ok');
  await mods.main.start({modules:mods,log:add});
}};