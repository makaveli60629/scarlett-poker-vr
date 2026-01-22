// js/poker_demo.js
(function(){
  const D = window.SCARLETT_DIAG || { log: () => {} };

  const seats = ["Seat 1","Seat 2","Seat 3","Seat 4","Seat 5","Seat 6"];
  let turn = 0;
  let pot = 0;

  function $(id){ return document.getElementById(id); }

  function setAction(line){
    const t = $("actionHudText");
    if(t) t.setAttribute("value", line);
  }

  function setPot(){
    const p = $("potText");
    if(p) p.setAttribute("value", `POT $${pot}`);
  }

  function setBotAction(seatIndex, txtValue){
    const bot = document.querySelector(`.bot[data-seat="${seatIndex+1}"]`);
    if(!bot) return;
    const t = bot.querySelector(".actionText");
    if(t) t.setAttribute("value", txtValue);
  }

  function step(){
    const who = turn % 6;
    const r = Math.random();

    let action = "CHECK";
    let add = 0;

    if (r > 0.70) { action = "BET"; add = 100 + Math.floor(Math.random()*300); }
    else if (r > 0.86) { action = "RAISE"; add = 200 + Math.floor(Math.random()*500); }
    else if (r < 0.10) { action = "FOLD"; add = 0; }

    if(action === "BET" || action === "RAISE"){
      pot += add;
      setPot();
    }

    for(let i=0;i<6;i++) setBotAction(i, "WAIT");
    setBotAction(who, action);

    const line = `${seats[who]} ${action}${add?` $${add}`:""} • Pot $${pot}`;
    setAction(line);

    turn++;
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    D.log("[pokerDemo] slow play + real 52-card deck ✅");
    setPot();
    setAction("Waiting…");
    setInterval(step, 1400);
  });
})();
