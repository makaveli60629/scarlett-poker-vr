function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

export function initAndroidPads(){
  const pads = document.getElementById("androidPads");
  const move = document.getElementById("padMove");
  const turn = document.getElementById("padTurn");
  const knobMove = document.getElementById("knobMove");
  const knobTurn = document.getElementById("knobTurn");
  if (!pads || !move || !turn || !knobMove || !knobTurn) return;

  const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints||0)>0;
  pads.style.display = touch ? "block" : "none";

  const state = window.SCARLETT = window.SCARLETT || {};
  state.pads = state.pads || { move:{x:0,y:0}, turn:{x:0,y:0} };

  function bindPad(el, knob, key){
    let center = null;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      center = { x: r.left + r.width/2, y: r.top + r.height/2, rad: Math.min(r.width,r.height)/2 - 24 };
    });
    el.addEventListener("pointermove", (e) => {
      if (!center) return;
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      const mag = (dx*dx + dy*dy) ** 0.5;
      const m = mag > center.rad ? center.rad / mag : 1.0;
      const x = clamp((dx*m) / center.rad,-1,1);
      const y = clamp((dy*m) / center.rad,-1,1);
      state.pads[key] = { x, y };
      knob.style.left = `${50 + x*35}%`;
      knob.style.top  = `${50 + y*35}%`;
    });
    const up = () => {
      center = null;
      state.pads[key] = { x:0, y:0 };
      knob.style.left = "50%";
      knob.style.top = "50%";
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
  }

  bindPad(move, knobMove, "move");
  bindPad(turn, knobTurn, "turn");
}
