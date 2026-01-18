// /js/modules/poker_demo.js
// Simple demo flow: deal -> reveal community over time (pure visuals).
export function installPokerDemo({ THREE, dwrite }, { center, tableY }){
  const group = new THREE.Group();
  group.name = "pokerDemo";

  const cardW = 0.20, cardH = 0.28;
  const backMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.7 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x111111, emissiveIntensity: 0.25, roughness: 0.75 });

  // Deck position (dealer)
  const deckPos = new THREE.Vector3(center.x, tableY + 0.18, center.z - 1.15);

  // Community cards
  const comm = [];
  for (let i=0;i<5;i++){
    const c = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), backMat);
    c.rotation.x = -Math.PI/2;
    c.position.set(center.x + (i-2)*0.23, tableY + 0.142, center.z + 0.05);
    c.userData.state = "back";
    group.add(c);
    comm.push(c);
  }

  let phase = 0;
  let nextAt = performance.now() + 1200;

  function flip(mesh){
    // quick flip animation by scaling X to 0 then swapping material
    mesh.userData.flipping = true;
    mesh.userData.flipT = 0;
  }

  function update(){
    const now = performance.now();

    // flip animation
    for (const c of comm){
      if (c.userData.flipping){
        c.userData.flipT += 0.08;
        const t = c.userData.flipT;
        const s = Math.max(0.001, Math.abs(Math.cos(t)));
        c.scale.x = s;
        if (t > Math.PI/2 && c.material === backMat){
          c.material = faceMat;
        }
        if (t >= Math.PI){
          c.userData.flipping = false;
          c.scale.x = 1;
        }
      }
    }

    if (now < nextAt) return;

    // timeline: flop(3), turn(1), river(1), reset
    if (phase === 0){
      dwrite?.("[poker] flop");
      flip(comm[0]); flip(comm[1]); flip(comm[2]);
      nextAt = now + 2500;
      phase = 1;
    } else if (phase === 1){
      dwrite?.("[poker] turn");
      flip(comm[3]);
      nextAt = now + 2500;
      phase = 2;
    } else if (phase === 2){
      dwrite?.("[poker] river");
      flip(comm[4]);
      nextAt = now + 3500;
      phase = 3;
    } else {
      // reset to backs
      dwrite?.("[poker] reset");
      for (const c of comm){
        c.material = backMat;
        c.userData.flipping = false;
        c.scale.x = 1;
      }
      nextAt = now + 1800;
      phase = 0;
    }
  }

  dwrite?.("[poker] demo loop installed");
  return { group, update };
}
