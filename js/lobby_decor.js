// /js/lobby_decor.js — LobbyDecor v1.0 (low-poly casino vibe, Quest-safe)

export const LobbyDecor = {
  init({ THREE, root, log }) {
    const safeLog = (...a)=>{ try{ log?.(...a); }catch(e){} };

    const g = new THREE.Group();
    g.name = "LobbyDecor";
    root.add(g);

    // perimeter walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9, metalness: 0.05 });
    const neonMat = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25, emissive: 0x103040, emissiveIntensity: 1.1 });

    const mkWall = (w,h,d,x,z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
      m.position.set(x, h/2, z);
      g.add(m);
    };

    mkWall(60, 6, 0.8, 0, -26);
    mkWall(60, 6, 0.8, 0,  26);
    mkWall(0.8, 6, 60, -26, 0);
    mkWall(0.8, 6, 60,  26, 0);

    // ceiling glow ring
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.25, 10, 64),
      neonMat
    );
    glow.position.set(0, 5.2, 0);
    glow.rotation.x = Math.PI/2;
    g.add(glow);

    // columns
    const colMat = new THREE.MeshStandardMaterial({ color: 0x12162a, roughness: 0.85, metalness: 0.08 });
    for (let i=0; i<10; i++){
      const a = (i/10)*Math.PI*2;
      const r = 18;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,5.4,16), colMat);
      c.position.set(Math.sin(a)*r, 2.7, Math.cos(a)*r);
      g.add(c);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), neonMat);
      strip.position.set(c.position.x, 2.0, c.position.z);
      g.add(strip);
    }

    // floor pattern decal tiles (cheap)
    const tileMatA = new THREE.MeshStandardMaterial({ color: 0x070812, roughness: 0.95 });
    const tileMatB = new THREE.MeshStandardMaterial({ color: 0x0e1020, roughness: 0.95 });
    for (let x=-10; x<=10; x++){
      for (let z=-10; z<=10; z++){
        const m = ((x+z)&1)?tileMatA:tileMatB;
        const t = new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2), m);
        t.rotation.x = -Math.PI/2;
        t.position.set(x*2.2, 0.002, z*2.2);
        g.add(t);
      }
    }

    safeLog("[decor] lobby ✅");
    return {
      group: g,
      dispose(){ try{ if (g.parent) g.parent.remove(g); }catch(e){} }
    };
  }
};
