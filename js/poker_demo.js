// js/poker_demo.js
(function(){
  const D = window.SCARLETT_DIAG;

  const suits = ["♠","♥","♦","♣"];
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

  function buildDeck(){
    const d = [];
    for(const s of suits) for(const r of ranks) d.push(r+s);
    for(let i=d.length-1;i>0;i--){
      const j = (Math.random()*(i+1))|0;
      const t=d[i]; d[i]=d[j]; d[j]=t;
    }
    return d;
  }

  const game = {
    deck: [],
    hand: 1,
    stage: 0,
    pot: 0,
    active: [true,true,true,true,true,true],
    stacks: [10000,10000,10000,10000,10000,10000],
    dealer: 0,
    cur: 0,
    lastLines: [],
    timer: null
  };

  function pushLine(s){
    game.lastLines.unshift(s);
    game.lastLines = game.lastLines.slice(0, 3);
    const el = document.getElementById("actionHudText");
    if(el) el.setAttribute("value", game.lastLines.join("\n"));
  }

  function setPot(v){
    game.pot = v;
    const t = document.getElementById("potText");
    if(t) t.setAttribute("value", "POT $" + v.toLocaleString());
  }

  function setNameTags(){
    const bots = Array.from(document.querySelectorAll(".bot"));
    bots.forEach((bot,i)=>{
      const t = bot.querySelector(".nameTag a-text");
      if(t) t.setAttribute("value", `Bot_${i+1}\n$${game.stacks[i].toLocaleString()}`);
    });
  }

  function setAction(i, action){
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;
    const t = bot.querySelector(".actionText");
    if(t) t.setAttribute("value", action);
  }

  function cardTexture(text, faceUp=true){
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 356;
    const ctx = canvas.getContext("2d");

    if(!faceUp){
      ctx.fillStyle = "#061019"; ctx.fillRect(0,0,256,356);
      ctx.fillStyle = "#4aa6ff";
      for(let y=18;y<356;y+=36){
        for(let x=18;x<256;x+=36){
          ctx.globalAlpha = 0.25 + ((x+y)%72===0 ? 0.15 : 0);
          ctx.fillRect(x,y,18,18);
        }
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#bfe1ff"; ctx.lineWidth = 10; ctx.strokeRect(10,10,236,336);
    }else{
      ctx.fillStyle = "#f8fbff"; ctx.fillRect(0,0,256,356);
      ctx.strokeStyle = "#0c1118"; ctx.lineWidth = 10; ctx.strokeRect(10,10,236,336);
      const isRed = (text.includes("♥") || text.includes("♦"));
      ctx.fillStyle = isRed ? "#b0122b" : "#0c1118";
      ctx.font = "bold 72px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.fillText(text, 28, 92);
      ctx.font = "bold 160px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(text.slice(-1), 128, 240);
    }
    return new THREE.CanvasTexture(canvas);
  }

  function applyPlaneTexture(planeEl, tex){
    const mesh = planeEl.getObject3D("mesh");
    if(mesh){
      mesh.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0, transparent:true });
      mesh.material.needsUpdate = true;
    }
    planeEl.setAttribute("material","opacity: 1");
  }

  function getCommunityPlanes(){ return Array.from(document.querySelectorAll(".communityCard")); }
  function getBotHolePlanes(i){
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return [];
    return Array.from(bot.querySelectorAll(".holeCard"));
  }

  function dealToBots(){
    for(let i=0;i<6;i++){
      if(!game.active[i]) continue;
      const planes = getBotHolePlanes(i);
      if(planes.length<2) continue;

      const c1 = game.deck.pop();
      const c2 = game.deck.pop();

      planes[0].object3D.position.set(-0.19, -0.85, -0.9);
      planes[1].object3D.position.set( 0.19, -0.85, -0.9);
      applyPlaneTexture(planes[0], cardTexture("", false));
      applyPlaneTexture(planes[1], cardTexture("", false));

      const start0 = planes[0].object3D.position.clone();
      const start1 = planes[1].object3D.position.clone();
      const end0 = new THREE.Vector3(-0.19, 0, 0);
      const end1 = new THREE.Vector3( 0.19, 0, 0);

      const t0 = performance.now();
      const dur = 900 + (i*80);

      (function anim(){
        const p = Math.min(1, (performance.now()-t0)/dur);
        planes[0].object3D.position.lerpVectors(start0, end0, p);
        planes[1].object3D.position.lerpVectors(start1, end1, p);
        if(p<1) requestAnimationFrame(anim);
        else{
          applyPlaneTexture(planes[0], cardTexture(c1, true));
          applyPlaneTexture(planes[1], cardTexture(c2, true));
        }
      })();
    }
  }

  function revealCommunity(n){
    const planes = getCommunityPlanes();
    for(let i=0;i<planes.length;i++){
      if(i<n){
        const c = game.deck.pop();
        applyPlaneTexture(planes[i], cardTexture(c,true));
      }else{
        planes[i].setAttribute("material","color:#ffffff; opacity: 0.12");
      }
    }
  }

  function nextPlayerAlive(from){
    for(let k=0;k<6;k++){
      const i = (from + k) % 6;
      if(game.active[i]) return i;
    }
    return 0;
  }

  function doAction(i){
    const r = Math.random();
    let a = "CHECK";
    if(game.stage === 1 && r < 0.30) a = "CALL";
    if(r > 0.62 && r <= 0.82) a = "BET";
    if(r > 0.82) a = "RAISE";
    if(r < 0.12) a = "FOLD";

    if(a==="FOLD"){
      game.active[i] = false;
      setAction(i,"FOLD");
      pushLine(`Seat ${i+1} folds`);
      return;
    }

    if(a==="BET" || a==="RAISE"){
      const amt = Math.max(50, Math.floor((Math.random()*0.05 + 0.02) * game.stacks[i]));
      game.stacks[i] -= amt;
      setPot(game.pot + amt);
      setAction(i, a + " $" + amt);
      pushLine(`Seat ${i+1} ${a.toLowerCase()}s $${amt} • Pot $${game.pot.toLocaleString()}`);
      setNameTags();
      return;
    }

    setAction(i,a);
    pushLine(`Seat ${i+1} ${a.toLowerCase()}s • Pot $${game.pot.toLocaleString()}`);
  }

  function crownWinner(i){
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;

    const existing = bot.querySelector(".crown");
    if(existing) existing.remove();

    const crown = document.createElement("a-torus");
    crown.classList.add("crown");
    crown.setAttribute("radius","0.20");
    crown.setAttribute("radiusTubular","0.06");
    crown.setAttribute("rotation","90 0 0");
    crown.setAttribute("position","0 2.95 0");
    crown.setAttribute("material","color:#d5b45b; metalness:0.85; roughness:0.35; emissive:#d5b45b; emissiveIntensity:0.35");
    bot.appendChild(crown);

    D.toast(`Winner: Seat ${i+1} 👑`);
    const r=5.8, t0=performance.now(), dur=60000;
    (function walk(){
      const t=performance.now()-t0; const a=(t/1000)*0.7;
      bot.object3D.position.set(Math.sin(a)*r, bot.object3D.position.y, Math.cos(a)*r);
      bot.object3D.rotation.y = Math.atan2(bot.object3D.position.x, bot.object3D.position.z) + Math.PI;
      if(t<dur) requestAnimationFrame(walk);
    })();
  }

  function endHand(){
    const alive = game.active.map((v,i)=>v?i:null).filter(v=>v!==null);
    const winner = alive[(Math.random()*alive.length)|0] ?? 0;
    game.stacks[winner] += game.pot;
    pushLine(`Winner: Seat ${winner+1} +$${game.pot.toLocaleString()}`);
    D.toast(`Hand ${game.hand} winner: Seat ${winner+1}`);
    setPot(0);
    setNameTags();

    if(game.hand % 2 === 0){
      const alive2 = game.active.map((v,i)=>v?i:null).filter(v=>v!==null);
      if(alive2.length > 1){
        let worst = alive2[0];
        for(const i of alive2){ if(game.stacks[i] < game.stacks[worst]) worst=i; }
        game.active[worst] = false;
        pushLine(`Seat ${worst+1} busted • leaves table`);
        const bot = document.querySelector(`.bot[data-seat="${worst+1}"]`);
        if(bot){
          const start = bot.object3D.position.clone();
          const out = start.clone().multiplyScalar(2.2); out.y = start.y;
          const t0 = performance.now(), dur=2500;
          (function anim(){
            const p = Math.min(1,(performance.now()-t0)/dur);
            bot.object3D.position.lerpVectors(start,out,p);
            if(p<1) requestAnimationFrame(anim);
          })();
        }
      }
    }

    const aliveFinal = game.active.filter(Boolean).length;
    if(aliveFinal <= 1){
      const w = game.active.findIndex(Boolean);
      crownWinner(w >= 0 ? w : 0);
      stop();
      return;
    }

    game.hand += 1;
    game.dealer = (game.dealer + 1) % 6;
    game.stage = 0;
    game.cur = nextPlayerAlive(game.dealer+1);
    pushLine(`--- Hand ${game.hand} ---`);
    setTimeout(startHand, 1400);
  }

  function startHand(){
    setPot(0);
    for(let i=0;i<6;i++) setAction(i, game.active[i] ? "WAIT" : "OUT");

    game.deck = buildDeck();
    game.deck.pop(); // burn
    revealCommunity(0);
    dealToBots();

    pushLine(`Dealer: Seat ${game.dealer+1} • Dealing…`);
    game.stage = 1;
    game.cur = nextPlayerAlive(game.dealer+1);
  }

  function step(){
    const alive = game.active.filter(Boolean).length;
    if(alive <= 1){
      const w = game.active.findIndex(Boolean);
      crownWinner(w>=0?w:0);
      stop();
      return;
    }

    const i = game.cur;
    if(game.active[i]) doAction(i);
    game.cur = nextPlayerAlive(i+1);

    if(game.cur === nextPlayerAlive(game.dealer+1)){
      if(game.stage === 1){ revealCommunity(3); pushLine("Flop dealt"); game.stage = 2; }
      else if(game.stage === 2){ revealCommunity(4); pushLine("Turn dealt"); game.stage = 3; }
      else if(game.stage === 3){ revealCommunity(5); pushLine("River dealt"); game.stage = 4; }
      else if(game.stage === 4){ game.stage = 5; pushLine("Showdown…"); setTimeout(endHand, 1600); }
    }
  }

  function start(){
    if(game.timer) return;
    pushLine(`--- Hand ${game.hand} ---`);
    setNameTags();
    startHand();
    game.timer = setInterval(step, 2600); // slow
    D.log("[pokerDemo] slow play + real 52-card deck ✅");
  }
  function stop(){
    if(game.timer){ clearInterval(game.timer); game.timer=null; }
    D.log("[pokerDemo] stopped");
  }

  start();
  window.SCARLETT_POKER_DEMO = { start, stop };
})();
