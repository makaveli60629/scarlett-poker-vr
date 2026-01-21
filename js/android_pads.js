// /js/android_pads.js — dual virtual sticks (movement + turn) for mobile browsers
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

export function initAndroidPads(){
  const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (!touch) return false;

  const pads = document.getElementById("androidPads");
  if (!pads) return false;

  const scene = document.getElementById("scene");
  const updateVis = () => {
    const inVR = !!scene?.is?.("vr-mode");
    pads.style.display = inVR ? "none" : "block";
  };
  scene?.addEventListener?.("enter-vr", updateVis);
  scene?.addEventListener?.("exit-vr", updateVis);
  updateVis();

  const state = { mx:0, my:0, tx:0 };
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.touchAxes = state;

  function makeStick(rootId, knobId, out){
    const root = document.getElementById(rootId);
    const knob = document.getElementById(knobId);
    if (!root || !knob) return;

    let activeId = null;
    let cx=0, cy=0, r=1;

    function layout(){
      const rect = root.getBoundingClientRect();
      cx = rect.left + rect.width/2;
      cy = rect.top + rect.height/2;
      r = Math.min(rect.width, rect.height) * 0.35;
    }
    window.addEventListener("resize", layout);
    layout();

    function setKnob(dx, dy){
      const nx = clamp(dx / r, -1, 1);
      const ny = clamp(dy / r, -1, 1);
      knob.style.transform = `translate(${nx*r}px, ${ny*r}px)`;
      out(nx, ny);
    }
    function reset(){
      knob.style.transform = "translate(0px, 0px)";
      out(0, 0);
    }

    root.addEventListener("pointerdown", (e) => {
      activeId = e.pointerId;
      root.setPointerCapture(activeId);
      layout();
      setKnob(e.clientX - cx, e.clientY - cy);
    });
    root.addEventListener("pointermove", (e) => {
      if (activeId !== e.pointerId) return;
      setKnob(e.clientX - cx, e.clientY - cy);
    });
    root.addEventListener("pointerup", (e) => {
      if (activeId !== e.pointerId) return;
      activeId = null;
      reset();
    });
    root.addEventListener("pointercancel", () => { activeId = null; reset(); });
    root.addEventListener("lostpointercapture", () => { activeId = null; reset(); });
  }

  makeStick("padMove", "knobMove", (x,y)=>{ state.mx = x; state.my = y; });
  makeStick("padTurn", "knobTurn", (x,y)=>{ state.tx = x; });

  return true;
}
