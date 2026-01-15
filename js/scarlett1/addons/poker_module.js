// /js/scarlett1/addons/poker_module.js — Scarlett Poker Module v1.0
// ✅ Safe add-on module. If anything fails, it won't crash world.
// ✅ Adds: dealer button, chip stacks, turn indicator, simple dealing animation.

export async function init(ctx = {}) {
  const { THREE, scene, log = console.log, registerUpdate, table } = ctx;
  if (!THREE || !scene) {
    log("[poker_module] missing THREE/scene (skip)");
    return;
  }
  if (typeof registerUpdate !== "function") {
    log("[poker_module] missing registerUpdate (skip)");
    return;
  }

  const group = new THREE.Group();
  group.name = "PokerModule";
  scene.add(group);

  const MAT_CHIP = new THREE.MeshStandardMaterial({ color: 0xff3b3b, roughness: 0.4, metalness: 0.25, emissive: 0x220000 });
  const MAT_CHIP2 = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.4, metalness: 0.25, emissive: 0x071030 });
  const MAT_DEALER = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.2, emissive: 0x111111 });
  const MAT_TURN = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.25, metalness: 0.2, emissive: 0x2b6cff, emissiveIntensity: 1.0 });

  const feltY = (table?.feltY ?? 0.82);

  // Seat ring around table
  const SEATS = 8;
  const seatR = 7.6;
  const seatPos = [];
  for (let i=0;i<SEATS;i++) {
    const a = (i/SEATS)*Math.PI*2;
    seatPos.push(new THREE.Vector3(Math.cos(a)*seatR, feltY+0.02, Math.sin(a)*seatR));
  }

  // Dealer button
  const dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24), MAT_DEALER);
  dealerBtn.position.set(seatPos[0].x*0.72, feltY+0.05, seatPos[0].z*0.72);
  group.add(dealerBtn);

  // Chip stacks near each seat
  function chipStack(x,z,mat) {
    const stack = new THREE.Group();
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.03,20), mat);
    for (let i=0;i<10;i++) {
      const c = chip.clone();
      c.position.set(0, i*0.03, 0);
      stack.add(c);
    }
    stack.position.set(x, feltY+0.02, z);
    group.add(stack);
    return stack;
  }

  const stacks = [];
  for (let i=0;i<SEATS;i++) {
    const p = seatPos[i].clone().multiplyScalar(0.86);
    stacks.push(chipStack(p.x, p.z, (i%2===0)?MAT_CHIP:MAT_CHIP2));
  }

  // Turn indicator (hovering arrow/disk)
  const turn = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.06,28), MAT_TURN);
  turn.position.set(seatPos[0].x*0.85, feltY+0.22, seatPos[0].z*0.85);
  group.add(turn);

  // Cards (simple planes) + dealing animation
  const cardGeo = new THREE.PlaneGeometry(0.62, 0.88);
  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.35, metalness: 0.05,
    emissive: 0x111111, side: THREE.DoubleSide
  });

  const deckPos = new THREE.Vector3(0.0, feltY+0.10, -0.4);
  const cards = []; // active moving cards

  function spawnDeal(toSeatIdx) {
    const c = new THREE.Mesh(cardGeo, cardMat);
    c.rotation.x = -Math.PI/2;
    c.position.copy(deckPos);
    c.userData = {
      from: deckPos.clone(),
      to: seatPos[toSeatIdx].clone().multiplyScalar(0.62).add(new THREE.Vector3(0, 0.06, 0)),
      t: 0
    };
    group.add(c);
    cards.push(c);
  }

  let currentSeat = 0;
  let dealTimer = 0;

  log("[poker_module] init ✅");

  registerUpdate((dt, time) => {
    // pulse turn
    turn.position.y = feltY + 0.22 + Math.sin(time*6)*0.03;
    dealerBtn.rotation.y = time * 0.7;

    // move dealer button + turn marker slowly per “hand”
    // (advance every ~8s)
    if ((time % 8.0) < dt) {
      currentSeat = (currentSeat + 1) % SEATS;
      dealerBtn.position.set(seatPos[currentSeat].x*0.72, feltY+0.05, seatPos[currentSeat].z*0.72);
    }
    turn.position.set(seatPos[currentSeat].x*0.85, turn.position.y, seatPos[currentSeat].z*0.85);

    // deal cards every ~0.6s
    dealTimer -= dt;
    if (dealTimer <= 0) {
      dealTimer = 0.6;
      spawnDeal(currentSeat);
    }

    // animate card movement
    for (let i=cards.length-1; i>=0; i--) {
      const c = cards[i];
      c.userData.t += dt * 1.6;
      const tt = Math.min(1, c.userData.t);

      // curved path
      const mid = c.userData.from.clone().lerp(c.userData.to, 0.5);
      mid.y += 0.7;

      const p = bezier(c.userData.from, mid, c.userData.to, tt);
      c.position.copy(p);
      c.rotation.z = Math.sin((1-tt)*3.14) * 0.25;

      if (tt >= 1) {
        // land & keep some on table (limit)
        c.rotation.z = 0;
        c.position.y = c.userData.to.y;
        if (cards.length > 18) {
          group.remove(c);
          cards.splice(i,1);
        }
      }
    }
  });

  function bezier(a,b,c,t) {
    const ab = a.clone().lerp(b, t);
    const bc = b.clone().lerp(c, t);
    return ab.lerp(bc, t);
  }
}
