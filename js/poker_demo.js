// js/poker_demo.js
(function(){
  const D = window.SCARLETT_DIAG;
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];

  const game = {
    hand: 1, turn: 0, pot: 0,
    active: [true,true,true,true,true,true],
    stacks: [10000,10000,10000,10000,10000,10000],
    lastAction: ["WAIT","WAIT","WAIT","WAIT","WAIT","WAIT"],
    dealer: 0,
    timer: null
  };

  function pickCard(){ return ranks[(Math.random()*ranks.length)|0] + suits[(Math.random()*suits.length)|0]; }

  function setCardPlane(plane, text){
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 356;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fbff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "#0c1118"; ctx.lineWidth = 10; ctx.strokeRect(10,10,canvas.width-20,canvas.height-20);
    ctx.fillStyle = "#0c1118"; ctx.font = "bold 72px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText(text, 28, 92);
    ctx.font = "bold 160px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(text.slice(-1), canvas.width/2, 240);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0.0 });
    const mesh = plane.getObject3D("mesh");
    if(mesh){ mesh.material = mat; mesh.material.needsUpdate = true; }
    plane.setAttribute("material", "opacity: 1");
  }

  function billboardToCamera(el){
    const camEl = document.getElementById("camera");
    if(!el || !camEl) return;
    const cam = camEl.object3D;
    el.object3D.lookAt(cam.position.x, el.object3D.position.y, cam.position.z);
  }

  function updateCommunity(reveal){
    const cc = Array.from(document.querySelectorAll(".communityCard"));
    for(let i=0;i<cc.length;i++){
      if(i < reveal) setCardPlane(cc[i], pickCard());
      else cc[i].setAttribute("material", "color: #ffffff; opacity: 0.12");
    }
    const commBoard = document.getElementById("communityBoard");
    if(commBoard) billboardToCamera(commBoard);
  }

  function updateHoleCards(){
    const bots = Array.from(document.querySelectorAll(".bot"));
    bots.forEach((bot, i)=>{
      const cards = Array.from(bot.querySelectorAll(".holeCard"));
      if(!cards.length) return;
      if(!game.active[i]){ cards.forEach(c=>c.setAttribute("material","color:#ffffff; opacity:0.05")); return; }
      setCardPlane(cards[0], pickCard()); setCardPlane(cards[1], pickCard());
      const hc = bot.querySelector(".holeCards"); if(hc) billboardToCamera(hc);
    });
  }

  function setAction(i, action){
    game.lastAction[i] = action;
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;
    const t = bot.querySelector(".actionText");
    if(t){ t.setAttribute("value", action); }
  }

  function updateNameTags(){
    const bots = Array.from(document.querySelectorAll(".bot"));
    bots.forEach((bot, i)=>{
      const tag = bot.querySelector(".nameTag a-text");
      if(tag) tag.setAttribute("value", `Bot_${i+1}\n$${game.stacks[i].toLocaleString()}`);
      const nt = bot.querySelector(".nameTag"); if(nt) billboardToCamera(nt);
    });
    Array.from(document.querySelectorAll(".seatLabel")).forEach(lbl=>billboardToCamera(lbl));
  }

  function updatePotHud(){
    const potTxt = document.querySelector("#potHud a-text");
    if(potTxt) potTxt.setAttribute("value", `POT: $${game.pot.toLocaleString()}`);
    const potHud = document.getElementById("potHud"); if(potHud) billboardToCamera(potHud);
  }

  function updateDealerBlink(){
    const dealer = document.querySelector("#mainTable a-circle");
    if(!dealer) return;
    const on = (Math.floor(performance.now()/450) % 2)===0;
    dealer.setAttribute("material", `color:#f7fbff; opacity:${on?0.95:0.55}`);
  }

  function updateBoard(){
    const bt = document.getElementById("boardText");
    const board = document.getElementById("tableBoard");
    if(board) billboardToCamera(board);
    if(!bt) return;
    const alive = game.active.map((a,i)=>a?i+1:null).filter(Boolean);
    const lines = [];
    lines.push(`HAND ${game.hand} • TURN ${game.turn}/4 • DEALER: Seat ${game.dealer+1}`);
    lines.push(`ALIVE: ${alive.join(", ")}`);
    lines.push("");
    for(let i=0;i<6;i++){
      lines.push(`Seat ${i+1} ${game.active[i]?'IN ':'OUT'}  $${game.stacks[i].toLocaleString()}  ${game.lastAction[i]}`);
    }
    bt.setAttribute("value", lines.join("\n"));
  }

  function movePotHud(){
    const potHud = document.getElementById("potHud");
    if(!potHud) return;
    const t = performance.now()/1000;
    potHud.object3D.position.x = Math.sin(t*1.6)*0.04;
    potHud.object3D.position.z = 0.55 + Math.cos(t*1.2)*0.03;
  }

  function eliminateOne(){
    const alive = game.active.map((a,i)=>a?i:null).filter(v=>v!==null);
    if(alive.length<=1) return;
    let worst = alive[0];
    for(const i of alive){ if(game.stacks[i] < game.stacks[worst]) worst = i; }
    game.active[worst]=false;
    const bot = document.querySelector(`.bot[data-seat="${worst+1}"]`);
    if(bot){
      const start = bot.object3D.position.clone();
      const out = start.clone().multiplyScalar(2.2); out.y=0;
      const dur = 2500, t0 = performance.now();
      (function anim(){
        const p = Math.min(1,(performance.now()-t0)/dur);
        bot.object3D.position.lerpVectors(start,out,p);
        if(p<1) requestAnimationFrame(anim);
      })();
    }
  }

  function crownWinner(i){
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;
    const crown = document.createElement("a-torus");
    crown.setAttribute("radius","0.18");
    crown.setAttribute("radiusTubular","0.05");
    crown.setAttribute("rotation","90 0 0");
    crown.setAttribute("position","0 2.95 0");
    crown.setAttribute("material","color:#d5b45b; metalness:0.8; roughness:0.35; emissive:#d5b45b; emissiveIntensity:0.25");
    bot.appendChild(crown);
    D.toast(`Winner: Bot_${i+1} 👑`);
    const r=4.6, t0=performance.now(), dur=60000;
    (function walk(){
      const t=performance.now()-t0; const a=(t/1000)*0.9;
      bot.object3D.position.set(Math.sin(a)*r,0,Math.cos(a)*r);
      bot.object3D.rotation.y = Math.atan2(bot.object3D.position.x, bot.object3D.position.z) + Math.PI;
      if(t<dur) requestAnimationFrame(walk);
    })();
  }

  function step(){
    const alive = game.active.map((a,i)=>a?i:null).filter(v=>v!==null);
    if(alive.length<=1){ crownWinner(alive[0]||0); stop(); return; }

    game.turn = (game.turn % 4) + 1;
    const reveal = (game.turn===2)?3 : (game.turn===3)?4 : (game.turn===4)?5 : 0;
    updateCommunity(reveal);

    const actions = ["CHECK","BET","CALL","RAISE","FOLD"];
    alive.forEach(i=>{
      let a = actions[(Math.random()*actions.length)|0];
      if(game.turn<=2 && Math.random()<0.55) a="CHECK";
      if(game.turn===1 && Math.random()<0.25) a="CALL";
      setAction(i,a);
      if(a==="BET"||a==="RAISE"){
        const amt = Math.max(50, Math.floor((Math.random()*0.06 + 0.02) * game.stacks[i]));
        game.stacks[i]-=amt; game.pot+=amt;
      }
    });

    if(game.turn===4){
      game.hand += 1;
      game.dealer = (game.dealer + 1) % 6;
      const w = alive[(Math.random()*alive.length)|0];
      game.stacks[w] += game.pot;
      D.toast(`Hand ${game.hand} winner: Seat ${w+1} (+$${game.pot.toLocaleString()})`);
      game.pot=0;
      if(game.hand % 2 === 0) eliminateOne();
      for(let i=0;i<6;i++) if(game.active[i]) setAction(i,"WAIT");
      updateHoleCards();
    }

    updatePotHud(); updateNameTags(); updateBoard();
  }

  function start(){
    updateHoleCards(); updateCommunity(0); updatePotHud(); updateNameTags(); updateBoard();
    if(game.timer) return;
    game.timer = setInterval(step, 1800);
    (function raf(){ updateDealerBlink(); movePotHud(); requestAnimationFrame(raf); })();
    D.log("[pokerDemo] started ✅");
  }
  function stop(){ if(game.timer){ clearInterval(game.timer); game.timer=null; } }

  // Sync all wall jumbotrons to the HUD prev/next buttons if present
  function wireJumbos(){
    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    const screens = Array.from(document.querySelectorAll(".jumboScreen"));
    if(!prev || !next || !screens.length) return;
    const channels = [
      {title:"VIP Highlights", color:"#0a0f18"},
      {title:"Scorpion Room Feed", color:"#0b1623"},
      {title:"Store Showcase", color:"#101a26"},
      {title:"Main Events Board", color:"#0e1420"},
    ];
    let c=0;
    function apply(){
      const ch=channels[c];
      screens.forEach(s=>s.setAttribute("material", `color:${ch.color}; emissive:${ch.color}; emissiveIntensity:0.4`));
      D.toast("Jumbotrons: " + ch.title);
    }
    prev.addEventListener("click", ()=>{ c=(c-1+channels.length)%channels.length; apply(); });
    next.addEventListener("click", ()=>{ c=(c+1)%channels.length; apply(); });
    apply();
  }

  wireJumbos();
  start();
  window.SCARLETT_POKER_DEMO = { start, stop };
})();
