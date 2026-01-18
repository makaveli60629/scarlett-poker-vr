// /js/modules/bots_idle.js
// Adds subtle idle animation (breathing + small head turns) for any bot groups.
export function installBotsIdle({ THREE, dwrite }, { botGroups }){
  const group = new THREE.Group();
  group.name = "botsIdle";
  const t0 = performance.now();

  function update(){
    const t = (performance.now() - t0) * 0.001;
    for (let i=0;i<botGroups.length;i++){
      const b = botGroups[i];
      if (!b) continue;
      const breathe = Math.sin(t*1.4 + i) * 0.015;
      b.position.y += breathe * 0.002; // tiny
      b.rotation.y += Math.sin(t*0.6 + i*1.7) * 0.0006;
    }
  }

  dwrite?.("[botsIdle] installed");
  return { group, update };
}
