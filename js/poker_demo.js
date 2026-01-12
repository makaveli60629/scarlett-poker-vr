// /js/poker_demo.js — Poker “alive table” demo
// ✅ Spawns seated bots at World seat anchors
// ✅ Hovering cards above heads (2 per player)
// ✅ Chips animate into pot; pot + money updates HUD

export const PokerDemo = (() => {
  let THREE=null, world=null, scene=null, hud=null;
  const state = {
    players: [],
    pot: 0,
    t: 0,
    betTimer: 0,
  };

  function init(ctx){
    THREE=ctx.THREE; world=ctx.world; scene=ctx.scene; hud=ctx.hud;

    const demo = world.getDemo?.();
    if (!demo?.tableAnchor || !demo?.seatAnchors?.length) return;

    // Build player bots + cards
    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.10 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x7fe7ff, emissiveIntensity: 1.8, roughness: 0.35 });

    for (let i=0;i<demo.seatAnchors.length;i++){
      const seat = demo.seatAnchors[i];

      const bot = new THREE.Group();
      bot.name = `PlayerBot_${i}`;
      bot.position.copy(seat.position);
      bot.quaternion.copy(seat.quaternion);
      demo.tableAnchor.add(bot);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.55,6,12), botMat);
      body.position.set(0,0.62,0.08);
      bot.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18,18,18), botMat);
      head.position.set(0,1.12,0.12);
      bot.add(head);

      // “hood” panel above head (like a player HUD)
      const hood = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.18), hoodMat);
      hood.position.set(0, 1.45, 0.15);
      hood.rotation.y = Math.PI;
      bot.add(hood);

      // Cards hover above head
      const cards = makeCardPair(i);
      cards.position.set(0, 1.70, 0.10);
      bot.add(cards);

      state.players.push({
        bot,
        money: 100000,
        cards,
      });
    }

    hud?.setPot?.(0);
    hud?.setMoney?.(state.players[0]?.money ?? 100000);
    hud?.setRank?.("VIP");
  }

  function update(dt){
    state.t += dt;
    state.betTimer += dt;

    // Keep cards gently hovering (stable small motion)
    for (let i=0;i<state.players.length;i++){
      const p = state.players[i];
      const y = 1.70 + Math.sin(state.t*1.3 + i)*0.01;
      p.cards.position.y = y;
      p.cards.rotation.z = Math.sin(state.t*0.9 + i)*0.03;
    }

    // Every few seconds: “bet” into pot
    if (state.betTimer > 2.4){
      state.betTimer = 0;
      doBet();
    }
  }

  function doBet(){
    if (!state.players.length) return;

    // pick a random player to bet
    const i = Math.floor(Math.random()*state.players.length);
    const p = state.players[i];
    const bet = 250 + Math.floor(Math.random()*750);
    p.money = Math.max(0, p.money - bet);
    state.pot += bet;

    // animate chip to center pot
    const chip = makeChip(i);
    const start = new THREE.Vector3();
    p.bot.getWorldPosition(start);
    chip.position.copy(start).add(new THREE.Vector3(0, 1.05, 0));
    scene.add(chip);

    const end = new THREE.Vector3(0, world.getDemo().tableAnchor.position.y + 0.95, 0);
    const dur = 0.55;
    let t = 0;

    const tick = () => {
      t += 1/60;
      const k = Math.min(1, t/dur);
      chip.position.lerpVectors(chip.userData.start, chip.userData.end, easeInOut(k));
      chip.position.y += Math.sin(k*Math.PI)*0.10;
      if (k < 1) requestAnimationFrame(tick);
      else {
        scene.remove(chip);
      }
    };

    chip.userData.start = chip.position.clone();
    chip.userData.end = end;
    requestAnimationFrame(tick);

    // update HUD (player 0 is “you” for now)
    hud?.setPot?.(state.pot);
    hud?.setMoney?.(state.players[0]?.money ?? 100000);
  }

  function makeChip(seed){
    const mats = [
      new THREE.MeshStandardMaterial({ color: 0xd62b2b, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x2a6bff, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x22aa55, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05 }),
    ];
    return new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.08,18), mats[seed % mats.length]);
  }

  function makeCardPair(seed){
    const g = new THREE.Group();
    const matA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.15 });
    const matB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.15 });

    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), matA);
    c1.position.set(-0.10, 0.0, 0.0);
    c1.rotation.y = Math.PI;

    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), matB);
    c2.position.set(0.10, 0.0, 0.0);
    c2.rotation.y = Math.PI;

    g.add(c1, c2);
    g.rotation.x = -0.35;
    g.rotation.y = Math.PI;
    return g;
  }

  function easeInOut(x){
    return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2)/2;
  }

  return { init, update, state };
})();
