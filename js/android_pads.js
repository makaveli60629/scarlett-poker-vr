// js/android_pads.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };
  const pads = document.getElementById("pads");
  const padL = document.getElementById("padL");
  const padR = document.getElementById("padR");
  if (!pads || !padL || !padR){ return; }

  const state = window.SCARLETT_PADS = { moveX:0, moveY:0, turnX:0, activeL:false, activeR:false };

  function bindPad(padEl, type){
    const stick = padEl.querySelector(".stick");
    let pid = null, cx=0, cy=0;

    function setStick(nx, ny){
      const max = 70;
      const x = Math.max(-1, Math.min(1, nx)) * max;
      const y = Math.max(-1, Math.min(1, ny)) * max;
      stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    padEl.addEventListener("pointerdown", (e)=>{
      padEl.setPointerCapture(e.pointerId);
      pid = e.pointerId;
      const r = padEl.getBoundingClientRect();
      cx = r.left + r.width/2;
      cy = r.top + r.height/2;
      if (type==="L") state.activeL=true;
      if (type==="R") state.activeR=true;
      setStick(0,0);
      e.preventDefault();
    }, {passive:false});

    padEl.addEventListener("pointermove", (e)=>{
      if (pid !== e.pointerId) return;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const max = 80;
      const nx = Math.max(-1, Math.min(1, dx / max));
      const ny = Math.max(-1, Math.min(1, dy / max));
      if (type==="L"){ state.moveX = nx; state.moveY = ny; setStick(nx, ny); }
      else { state.turnX = nx; setStick(nx, 0); }
      e.preventDefault();
    }, {passive:false});

    function end(e){
      if (pid !== e.pointerId) return;
      pid = null;
      if (type==="L"){ state.activeL=false; state.moveX=0; state.moveY=0; }
      else { state.activeR=false; state.turnX=0; }
      setStick(0,0);
      e.preventDefault();
    }
    padEl.addEventListener("pointerup", end, {passive:false});
    padEl.addEventListener("pointercancel", end, {passive:false});
  }

  bindPad(padL, "L");
  bindPad(padR, "R");
  D.log("[androidPads] armed ✅");

  const scene = document.getElementById("scene");
  scene.addEventListener("enter-vr", ()=>{ pads.style.display="none"; });
  scene.addEventListener("exit-vr", ()=>{ pads.style.display="block"; });
})();
