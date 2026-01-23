export function createTouchStick({ baseEl, knobEl }){
  let active = false;
  let cx = 0, cy = 0;
  let x = 0, y = 0;

  function setKnob(dx, dy){
    const max = 46;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(len, max);
    const nx = (dx / len) * k;
    const ny = (dy / len) * k;
    knobEl.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    x = nx / max;
    y = ny / max;
  }

  function reset(){
    knobEl.style.transform = 'translate(-50%,-50%)';
    x = 0; y = 0;
  }

  function getPoint(e){
    const t = e.touches ? e.touches[0] : e;
    return { px: t.clientX, py: t.clientY };
  }

  function onDown(e){
    active = true;
    const r = baseEl.getBoundingClientRect();
    cx = r.left + r.width/2;
    cy = r.top + r.height/2;
    const { px, py } = getPoint(e);
    setKnob(px - cx, py - cy);
    e.preventDefault();
  }
  function onMove(e){
    if (!active) return;
    const { px, py } = getPoint(e);
    setKnob(px - cx, py - cy);
    e.preventDefault();
  }
  function onUp(){
    active = false;
    reset();
  }

  baseEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive:false });
  window.addEventListener('pointerup', onUp);

  baseEl.addEventListener('touchstart', onDown, { passive:false });
  window.addEventListener('touchmove', onMove, { passive:false });
  window.addEventListener('touchend', onUp);

  return {
    get x(){ return x; },
    get y(){ return y; },
  };
}
