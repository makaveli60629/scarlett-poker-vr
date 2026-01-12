// /js/poker_demo.js — Poker ALIVE 2.0 (big/high hole cards + big community cards + chip throws + proper seated bots)
export const PokerDemo = (() => {
  let THREE=null, world=null, scene=null;
  const state = { players: [], pot: 0, t: 0, betTimer: 0, community: null };

  function init(ctx){
    THREE=ctx.THREE; world=ctx.world; scene=ctx.scene;

    const demo = world.getDemo?.();
    if (!demo?.tableAnchor || !demo?.seatAnchors?.length) return;

    // Community cards (hover above table)
    state.community = makeCommunityRow();
    state.community.position.set(0, 1.55, 0.25); // ✅ visible above table
    demo.tableAnchor.add(state.community);

    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.10 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x7fe7ff, emissiveIntensity: 2.0, roughness: 0.35 });

    state.players = [];
    for (let i=0;i<demo.seatAnchors.length;i++){
      const seat = demo.seatAnchors[i];

      const bot = new THREE.Group();
      bot.name = `PlayerBot_${i+1}`;
      bot.position.copy(seat.position);
      bot.quaternion.copy(seat.quaternion);
      demo.tableAnchor.add(bot);

      // seated body (lowered to match chair)
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.55,6,12), botMat);
      body.position.set(0, 0.52, 0.08);
      bot.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18,18,18), botMat);
      head.position.set(0, 1.00, 0.12);
      bot.add(head);

      // “hood” plate (small)
      const hood = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.22), hoodMat);
      hood.position.set(0, 1.35, 0.18);
      hood.rotation.y = Math.PI;
      bot.add(hood);

      // ✅ BIGGER + HIGHER hole cards
      const cards = makeCardPair(i);
      cards.position.set(0, 2.15, 0.20);
      cards.scale.set(1.9, 1.9, 1.9);
      bot.add(cards);

      state.players.push({ bot, money: 100000, cards });
    }
  }

  function update(dt){
    state.t += dt;
    state.betTimer += dt;

    // gentle hover to make cards readable
    for (let i=0;i<state.players.length;i++){
      const p = state.players[i];
      p.cards.position.y = 2.15 + Math.sin(state.t*1.1 + i)*0.03;
      p.cards.rotation.z = Math.sin(state.t*0.8 + i)*0.04;
    }

    // community cards hover slightly
    if (state.community) {
      state.community.position.y = 1.55 + Math.sin(state.t*0.9)*0.02;
    }

    // chip throws into pot
    if (state.betTimer > 2.0){
      state.betTimer = 0;
      doBet();
    }
  }

  function doBet(){
    if (!state.players.length) return;
    const demo = world.getDemo();

    const i = Math.floor(Math.random()*state.players.length);
    const p = state.players[i];
    const bet = 250 + Math.floor(Math.random()*750);
    p.money = Math.max(0, p.money - bet);
    state.pot += bet;

    // ✅ visible chip toss
    const chip = makeChip(i);
    const start = new THREE.Vector3();
    p.bot.getWorldPosition(start);
    chip.position.copy(start).add(new THREE.Vector3(0, 1.05, 0));
    scene.add(chip);

    const end = new THREE.Vector3(0, demo.tableAnchor.position.y + 1.10, 0);
    const dur = 0.55;
    const startPos = chip.position.clone();

    let t = 0;
    const tick = () => {
      t += 1/60;
      const k = Math.min(1, t/dur);
      chip.position.lerpVectors(startPos, end, easeInOut(k));
      chip.position.y += Math.sin(k*Math.PI)*0.14;
      if (k < 1) requestAnimationFrame(tick);
      else scene.remove(chip);
    };
    requestAnimationFrame(tick);
  }

  function makeCommunityRow(){
    const g = new THREE.Group();
    for (let i=0;i<5;i++){
      const c = new THREE.Mesh(
        new THREE.PlaneGeometry(0.30, 0.42), // ✅ big community cards
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.12 })
      );
      c.position.set((i-2)*0.36, 0, 0);
      c.rotation.y = Math.PI;
      g.add(c);
    }
    g.rotation.x = -0.35;
    g.rotation.y = Math.PI;
    return g;
  }

  function makeChip(seed){
    const mats = [
      new THREE.MeshStandardMaterial({ color: 0xd62b2b, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x2a6bff, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x22aa55, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05 }),
    ];
    return new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.09,20), mats[seed % mats.length]);
  }

  function makeCardPair(seed){
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.18 });

    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), mat);
    c1.position.set(-0.13, 0.0, 0.0);
    c1.rotation.y = Math.PI;

    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), mat);
    c2.position.set(0.13, 0.0, 0.0);
    c2.rotation.y = Math.PI;

    g.add(c1, c2);
    g.rotation.x = -0.35;
    g.rotation.y = Math.PI;
    return g;
  }

  function easeInOut(x){ return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2)/2; }

  return { init, update, state };
})();
