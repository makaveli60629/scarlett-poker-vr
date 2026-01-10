// /js/poker_sim.js — Simple visual poker loop (so you can observe while developing)
export const PokerSim = {
  init(ctx){
    const { THREE, scene } = ctx;
    if (!THREE || !scene) return;

    const root = new THREE.Group();
    root.name = "POKER_SIM_VISUAL";
    scene.add(root);

    // chips that animate forward like bets
    const chips = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.35 });

    for (let i=0;i<30;i++){
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.02,18), mat);
      c.position.set((Math.random()-0.5)*2.6, 1.02, (Math.random()-0.5)*2.6);
      c.userData.v = 0.5 + Math.random()*0.8;
      root.add(c);
      chips.push(c);
    }

    let t = 0;
    ctx.__hasDemoGame = true;

    ctx.__tickers.push((dt)=>{
      t += dt;
      for (const c of chips){
        // orbit toward center (looks like betting)
        const a = Math.atan2(c.position.z, c.position.x) + dt*0.6;
        const r = Math.max(0.2, Math.sqrt(c.position.x*c.position.x + c.position.z*c.position.z) - dt*c.userData.v*0.15);
        c.position.x = Math.cos(a)*r;
        c.position.z = Math.sin(a)*r;
        c.rotation.y += dt*2.2;
        c.position.y = 1.02 + Math.sin(t*3 + r)*0.01;
      }
    });

    console.log("[PokerSim] init ✅ visual loop");
  }
};
