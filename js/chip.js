// /js/chips.js — ChipSystem v1.0
// Simple chip stacks + pot. Supports "bet(seatId, amount)" animation.

export const ChipSystem = (() => {
  const S = {
    THREE:null, root:null, log:console.log,
    stacks: new Map(),
    pot: null,
    moving: [],
    tmp: null
  };

  function safeLog(...a){ try{ S.log?.(...a); }catch(e){} }

  function makeChip(color=0xff2d7a) {
    const THREE = S.THREE;
    const geo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  function makeStack(pos, count=12, palette=[0xff2d7a,0x7fe7ff,0xffcc00]) {
    const THREE = S.THREE;
    const g = new THREE.Group();
    g.position.copy(pos);
    for (let i=0; i<count; i++){
      const c = makeChip(palette[i % palette.length]);
      c.position.y = i * 0.0125;
      g.add(c);
    }
    return g;
  }

  function init({ THREE, root, log, seatPositions=[], potPos }) {
    S.THREE = THREE; S.root = root; S.log = log || console.log;
    S.tmp = new THREE.Vector3();

    // Pot
    S.pot = makeStack(potPos || new THREE.Vector3(0,1.02,0), 20, [0x4cd964,0xffcc00,0xffffff]);
    S.pot.name = "PotStack";
    S.root.add(S.pot);

    // Seats
    seatPositions.forEach((p, i) => {
      const id = `P${i+1}`;
      const st = makeStack(new THREE.Vector3(p.x, 1.01, p.z), 12);
      st.name = `ChipStack_${id}`;
      S.root.add(st);
      S.stacks.set(id, st);
    });

    safeLog("[chips] init ✅ seats=", seatPositions.length);
    return {
      bet(seatId="P1", amount=1){
        const from = S.stacks.get(seatId);
        if (!from || !S.pot) return;

        // Spawn a moving chip group (3 chips per "amount" for visuals)
        const n = Math.max(1, Math.min(6, amount));
        const g = new THREE.Group();
        for (let i=0; i<n; i++){
          const c = makeChip(i%2?0xffcc00:0xff2d7a);
          c.position.y = i * 0.0125;
          g.add(c);
        }

        // start at seat stack top
        const w = new THREE.Vector3();
        from.getWorldPosition(w);
        g.position.copy(w).add(new THREE.Vector3(0, 0.18, 0));
        S.root.add(g);

        // target pot top
        const t = new THREE.Vector3();
        S.pot.getWorldPosition(t);
        t.add(new THREE.Vector3((Math.random()-0.5)*0.18, 0.20, (Math.random()-0.5)*0.18));

        S.moving.push({ obj:g, a:g.position.clone(), b:t, t:0 });
      },
      update(dt){
        // animate moving chips
        for (let i=S.moving.length-1; i>=0; i--){
          const m = S.moving[i];
          m.t = Math.min(1, m.t + dt*1.8);
          // smoothstep
          const k = m.t*m.t*(3-2*m.t);
          m.obj.position.lerpVectors(m.a, m.b, k);
          if (m.t >= 1) {
            // land in pot: add a chip to pot stack visually
            const c = makeChip(0xffcc00);
            c.position.y = S.pot.children.length * 0.0125;
            S.pot.add(c);

            if (m.obj.parent) m.obj.parent.remove(m.obj);
            S.moving.splice(i,1);
          }
        }
      },
      dispose(){
        try{
          for (const st of S.stacks.values()) S.root.remove(st);
          S.stacks.clear();
          if (S.pot) S.root.remove(S.pot);
          S.pot = null;
        }catch(e){}
      }
    };
  }

  return { init };
})();
