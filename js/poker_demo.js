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

  const hudLines = [];
  function pushHud(line){
    hudLines.unshift(line);
    while(hudLines.length > 3) hudLines.pop();
    const hudText = document.getElementById("hudText");
    if(hudText) hudText.setAttribute("value", hudLines.join("\n"));
  }

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
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0.0, transparent: true });
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
      setCardPlane(cards[0], pickCard());
      setCardPlane(cards[1], pickCard());
      const hc = bot.querySelector(".holeCards"); if(hc) billboardToCamera(hc);
    });
  }

  function dealToBots(){
    const table = document.getElementById("mainTable");
    if(!table) { updateHoleCards(); return; }

    const bots = Array.from(document.querySelectorAll(".bot"));
    bots.forEach((bot, i)=>{
      if(!game.active[i]) return;

      const start = new THREE.Vector3(0, 0.95, 0.0);
      const botPos = bot.object3D.position.clone(); botPos.y = 0.95;
      const dir = botPos.clone().sub(start).normalize();
      const mid = start.clone().add(dir.multiplyScalar(1.35)); mid.y = 1.05;

      for(let c=0;c<2;c++){
        const card = document.createElement("a-plane");
        card.setAttribute("width","0.28");
        card.setAttribute("height","0.40");
        card.setAttribute("material","color:#ffffff; opacity:0.25");
        card.object3D.position.copy(start);
        card.object3D.position.x += (c===0?-0.10:0.10);
        card.object3D.position.z += 0.05;
        table.appendChild(card);

        const t0 = performance.now();
        const dur = 600 + c*120;
        const from = card.object3D.position.clone();
        const to = mid.clone(); to.x += (c===0?-0.10:0.10);

        (function anim(){
          const p = Math.min(1,(performance.now()-t0)/dur);
          card.object3D.position.lerpVectors(from,to,p);
          card.object3D.rotation.y = bot.object3D.rotation.y + Math.PI;
          if(p<1) requestAnimationFrame(anim);
          else setTimeout(()=>{ if(card.parentNode) card.parentNode.removeChild(card); }, 150);
        })();
      }
    });

    setTimeout(updateHoleCards, 750);
  }

  function setAction(i, action){
    game.lastAction[i] = action;
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;
    const t = bot.querySelector(".actionText");
    if(t) t.setAttribute("value", action);
  }

  function updateNameTags(){
    const bots = Array.from(document.querySelectorAll(".bot"));
    bots.forEach((bot, i)=>{
      const tagText = bot.querySelector(".nameTag a-text");
      if(tagText) tagText.setAttribute("value", `Bot_${i+1}\n$${game.stacks[i].toLocaleString()}`);
    });
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

  function updateBillboards(){
    ["communityBoard","potHud","tableHud"].forEach(id=>{
      const e = document.getElementById(id);
      if(e) billboardToCamera(e);
    });
    Array.from(document.querySelectorAll(".holeCards")).forEach(billboardToCamera);
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
      const out = start.clone().multiplyScalar(1.55); out.y=0;
      const dur = 2200, t0 = performance.now();
      (function anim(){
        const p = Math.min(1,(performance.now()-t0)/dur);
        bot.object3D.position.lerpVectors(start,out,p);
        if(p<1) requestAnimationFrame(anim);
      })();
    }
    pushHud(`Seat ${worst+1} eliminated.`);
  }

  function crownWinner(i){
    const bot = document.querySelector(`.bot[data-seat="${i+1}"]`);
    if(!bot) return;

    Array.from(bot.children).forEach(ch=>{
      if(ch && ch.classList && ch.classList.contains("winnerMarker")) bot.removeChild(ch);
    });

    const crown = document.createElement("a-torus");
    crown.classList.add("winnerMarker");
    crown.setAttribute("radius","0.18");
    crown.setAttribute("radiusTubular","0.05");
    crown.setAttribute("rotation","90 0 0");
    crown.setAttribute("position","0 2.95 0");
    crown.setAttribute("material","color:#d5b45b; metalness:0.8; roughness:0.35; emissive:#d5b45b; emissiveIntensity:0.25");
    bot.appendChild(crown);

    D.toast(`Winner: Bot_${i+1} 👑`);
    pushHud(`Winner: Seat ${i+1}.`);

    const r=5.2, t0=performance.now(), dur=60000;
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
        pushHud(`Seat ${i+1} ${a.toLowerCase()}s $${amt}.  Pot $${game.pot}.`);
      } else {
        pushHud(`Seat ${i+1} ${a.toLowerCase()}.  Pot $${game.pot}.`);
      }
    });

    if(game.turn===4){
      game.hand += 1;
      game.dealer = (game.dealer + 1) % 6;
      const w = alive[(Math.random()*alive.length)|0];
      game.stacks[w] += game.pot;
      D.toast(`Hand ${game.hand} winner: Seat ${w+1} (+$${game.pot.toLocaleString()})`);
      pushHud(`Hand ends. Seat ${w+1} wins pot $${game.pot}.`);
      game.pot=0;

      if(game.hand % 2 === 0) eliminateOne();
      for(let i=0;i<6;i++) if(game.active[i]) setAction(i,"WAIT");

      dealToBots();
    }

    updatePotHud(); updateNameTags(); updateBillboards();
  }

  function stop(){ if(game.timer){ clearInterval(game.timer); game.timer=null; } }

  function start(){
    hudLines.length = 0;
    pushHud("VIP Table HUD");
    pushHud("Peeking mode: all cards visible.");
    pushHud("New hand starting…");

    updateCommunity(0);
    dealToBots();
    updatePotHud();
    updateNameTags();
    updateBillboards();

    if(!game.timer){
      game.timer = setInterval(step, 1900);
      (function raf(){ updateDealerBlink(); updateBillboards(); requestAnimationFrame(raf); })();
      D.log("[pokerDemo] started v1.2 ✅");
    }
  }

  // Name tags appear only when you look at a player
  function setupGazeNameTags(){
    const cam = document.getElementById("camera");
    if(!cam || !cam.object3D) return;
    const dir = new THREE.Vector3();
    const origin = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    function tick(){
      const bots = Array.from(document.querySelectorAll(".bot"));
      cam.object3D.getWorldPosition(origin);
      cam.object3D.getWorldDirection(dir);

      let closest = null;
      let minD = Infinity;
      bots.forEach(bot=>{
        const pos = bot.object3D.getWorldPosition(tmp);
        const d = origin.distanceTo(pos);
        if(d < minD){ minD = d; closest = bot; }
      });

      bots.forEach(bot=>{
        const tag = bot.querySelector(".nameTag");
        if(!tag) return;
        const pos = bot.object3D.getWorldPosition(tmp);
        const to = tmp.clone().sub(origin).normalize();
        const dot = dir.dot(to);
        const should = (bot === closest) && dot > 0.985 && minD < 9.5;
        tag.setAttribute("visible", should ? "true" : "false");
        if(should) billboardToCamera(tag);
      });

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Wall jumbotrons: keep in sync with HUD prev/next
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
      screens.forEach(s=>s.setAttribute("material", `color:${ch.color}; emissive:${ch.color}; emissiveIntensity:0.45`));
      D.toast("Jumbotrons: " + ch.title);
    }
    prev.addEventListener("click", ()=>{ c=(c-1+channels.length)%channels.length; apply(); });
    next.addEventListener("click", ()=>{ c=(c+1)%channels.length; apply(); });
    apply();
  }

  wireJumbos();
  setupGazeNameTags();
  start();

  window.SCARLETT_POKER_DEMO = { start, stop };
})();
