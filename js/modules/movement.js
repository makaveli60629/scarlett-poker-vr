export function installMovement({ rig, camera, diag }) {
  let enabled = true;
  const btnMove = document.getElementById("btnMove");
  const setBtn = () => btnMove && (btnMove.textContent = `Move: ${enabled ? "ON" : "OFF"}`);
  setBtn();

  btnMove?.addEventListener("click", () => {
    enabled = !enabled;
    setBtn();
    diag.write(`[move] ${enabled ? "ON" : "OFF"}`);
  });

  // Mobile joystick
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  let jdx=0, jdy=0, jactive=false, sx=0, sy=0;
  let joy=null, style=null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  if (isTouch) {
    joy=document.createElement("div");
    joy.id="joy";
    joy.innerHTML='<div id="joyBase"><div id="joyKnob"></div></div>';
    document.body.appendChild(joy);

    style=document.createElement("style");
    style.textContent=`
      #joy{ position:fixed; left:14px; bottom:14px; width:160px; height:160px; z-index:10001; pointer-events:auto; }
      #joyBase{ width:160px; height:160px; border-radius:80px; background:rgba(17,24,39,0.45); border:1px solid rgba(255,255,255,0.18); position:relative; }
      #joyKnob{ width:70px; height:70px; border-radius:35px; background:rgba(229,231,235,0.75); position:absolute; left:45px; top:45px; }
    `;
    document.head.appendChild(style);

    const base=joy.querySelector("#joyBase");
    const knob=joy.querySelector("#joyKnob");
    const onStart=(e)=>{ jactive=true; const t=e.touches[0]; sx=t.clientX; sy=t.clientY; e.preventDefault(); };
    const onMove=(e)=>{
      if(!jactive) return;
      const t=e.touches[0]; const mx=t.clientX-sx, my=t.clientY-sy;
      const max=50;
      jdx=clamp(mx/max,-1,1);
      jdy=clamp(my/max,-1,1);
      knob.style.left=`${45 + jdx*45}px`;
      knob.style.top =`${45 + jdy*45}px`;
      e.preventDefault();
    };
    const onEnd=()=>{ jactive=false; jdx=0; jdy=0; knob.style.left="45px"; knob.style.top="45px"; };
    base.addEventListener("touchstart", onStart, {passive:false});
    window.addEventListener("touchmove", onMove, {passive:false});
    window.addEventListener("touchend", onEnd, {passive:true});
    window.addEventListener("touchcancel", onEnd, {passive:true});
    diag.write("[move] mobile joystick installed ✅");
  }

  // Quest thumbstick events
  const left = document.getElementById("leftHand");
  const right = document.getElementById("rightHand");
  let evX = 0, evY = 0;
  const onThumb = (e) => { evX = e?.detail?.x ?? 0; evY = e?.detail?.y ?? 0; };
  left?.addEventListener("thumbstickmoved", onThumb);
  right?.addEventListener("thumbstickmoved", onThumb);
  diag.write("[move] listening for thumbstickmoved ✅");

  // Fallback axes
  const getPads = () => (navigator.getGamepads ? navigator.getGamepads() : []);
  const speed = 0.085;
  const dead = 0.18;

  let raf = 0;
  const tick = () => {
    try {
      if (enabled) {
        let strafe = 0, forward = 0;

        if (Math.abs(evX) > dead || Math.abs(evY) > dead) {
          strafe = evX;
          forward = -evY;
        } else {
          const pads = getPads();
          let ax=0, ay=0;
          for (const gp of pads) {
            if (!gp || !gp.axes) continue;
            const cand = [[gp.axes[2], gp.axes[3]], [gp.axes[0], gp.axes[1]]];
            for (const [x,y] of cand) {
              if ((Math.abs(x||0)+Math.abs(y||0)) > (Math.abs(ax)+Math.abs(ay))) { ax=x||0; ay=y||0; }
            }
          }
          if (Math.abs(ax) > dead) strafe = ax;
          if (Math.abs(ay) > dead) forward = -ay;
        }

        if (isTouch) {
          if (Math.abs(jdx) > 0.05) strafe = jdx;
          if (Math.abs(jdy) > 0.05) forward = -jdy;
        }

        const yaw = camera.object3D.rotation.y;
        const vx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
        const vz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;

        if (Math.abs(vx)+Math.abs(vz) > 0.0005) {
          const p = rig.object3D.position;
          rig.object3D.position.set(p.x + vx, p.y, p.z + vz);
        }
      }
    } catch (_) {}
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  diag.write("[move] locomotion loop running ✅");
  return { destroy(){ cancelAnimationFrame(raf); joy?.remove(); style?.remove(); } };
}
