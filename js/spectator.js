// /js/spectator.js — SpectatorRail v1.0

export const SpectatorRail = {
  init({ THREE, root, log }) {
    const safeLog=(...a)=>{ try{log?.(...a);}catch(e){} };
    const g = new THREE.Group();
    g.name = "SpectatorRail";
    root.add(g);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x182047, roughness: 0.6, metalness: 0.25 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.85, metalness: 0.1 });

    const radius = 7.8;
    const segments = 64;

    // posts
    for (let i=0;i<segments;i+=4){
      const a = (i/segments)*Math.PI*2;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.2,10), postMat);
      p.position.set(Math.sin(a)*radius, 0.6, Math.cos(a)*radius);
      g.add(p);
    }

    // top rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.08, 10, 96),
      railMat
    );
    rail.position.set(0, 1.15, 0);
    rail.rotation.x = Math.PI/2;
    g.add(rail);

    safeLog("[spectator] rail ✅");
    return { group:g, dispose(){ try{ if(g.parent) g.parent.remove(g);}catch(e){} } };
  }
};
