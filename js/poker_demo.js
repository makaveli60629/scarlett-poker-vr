// js/poker_demo.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };

  const SUITS = ["♠","♥","♦","♣"];
  const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

  function makeDeck(){
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({r,s});
    for (let i=deck.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function setText(id, v){
    const el = document.getElementById(id);
    if (el) el.setAttribute("value", v);
  }
  function setAction(seat, v){
    const bot = document.querySelector(`.bot[data-seat="${seat}"]`);
    const t = bot && bot.querySelector(".actionText");
    if (t) t.setAttribute("value", v);
  }
  function setHole(seat, idx, card){
    const bot = document.querySelector(`.bot[data-seat="${seat}"]`);
    const labels = bot && bot.querySelectorAll(".holeCards .cardLabel");
    if (labels && labels[idx]) labels[idx].setAttribute("value", `${card.r}${card.s}`);
  }
  function setCommunity(idx, card){
    const comm = document.getElementById("communityCards");
    if (!comm) return;
    const labels = comm.querySelectorAll(".cardLabel");
    if (labels && labels[idx]) labels[idx].setAttribute("value", `${card.r}${card.s}`);
  }
  function clearCards(){
    document.querySelectorAll(".holeCards .cardLabel").forEach(l=>l.setAttribute("value",""));
    const comm = document.getElementById("communityCards");
    if (comm) comm.querySelectorAll(".cardLabel").forEach(l=>l.setAttribute("value",""));
  }
  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

  async function run(){
    while(true){
      if (!window.SCARLETT_FLAGS || !window.SCARLETT_FLAGS.demo){
        await sleep(400);
        continue;
      }
      clearCards();
      const deck = makeDeck();
      let pot = 0;
      setText("potText", `POT $${pot}`);
      setText("actionHudText", "New hand… shuffling");

      for (let seat=1; seat<=6; seat++){
        setHole(seat,0,deck.pop());
        setHole(seat,1,deck.pop());
        setText("actionHudText", `Dealing Seat ${seat}`);
        await sleep(600);
      }

      for (let seat=1; seat<=6; seat++){
        const action = (Math.random()<0.55) ? "CHECK" : (Math.random()<0.5 ? "BET $200" : "FOLD");
        setAction(seat, action);
        if (action.startsWith("BET")) pot += 200;
        setText("potText", `POT $${pot}`);
        setText("actionHudText", `Seat ${seat} ${action} • Pot $${pot}`);
        await sleep(750);
      }

      const streets = [{name:"FLOP", n:3},{name:"TURN", n:1},{name:"RIVER", n:1}];
      let ci=0;
      for (const st of streets){
        setText("actionHudText", `${st.name}…`);
        await sleep(650);
        for(let i=0;i<st.n;i++) setCommunity(ci++, deck.pop());
        await sleep(550);
        for (let seat=1; seat<=6; seat++){
          const action = (Math.random()<0.6) ? "CHECK" : (Math.random()<0.6 ? "BET $300" : "FOLD");
          setAction(seat, action);
          if (action.startsWith("BET")) pot += 300;
          setText("potText", `POT $${pot}`);
          setText("actionHudText", `${st.name}: Seat ${seat} ${action} • Pot $${pot}`);
          await sleep(650);
        }
      }

      const winner = 1 + Math.floor(Math.random()*6);
      setText("actionHudText", `Seat ${winner} WINS $${pot}!`);
      await sleep(1800);
      for (let seat=1; seat<=6; seat++) setAction(seat, "WAIT");
      await sleep(900);
    }
  }

  window.addEventListener("load", ()=>{
    D.log("[pokerDemo] slow play + real 52-card deck ✅");
    run();
  });
})();
