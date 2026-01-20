export function installMovement({ rig, camera, diag }) {
  let enabled = true;
  const btnMove = document.getElementById("btnMove");
  const setBtn = () => btnMove && (btnMove.textContent = `Move: ${enabled ? "ON" : "OFF"}`);
  setBtn();
  btnMove?.addEventListener("click", () => { enabled=!enabled; setBtn(); diag.write(`[move] ${enabled?"ON":"OFF"}`); });

  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  let jx=0, jy=0, jactive=false, sx=0, sy=0;
  let joy=null, style=null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  if (isTouch) {
    joy=document.createElement("div");
    joy.id="joy";
    joy.innerHTML='<div id="joyBase"><div id="joyKnob"></div></div>';
    document.body.appendChild(joy);
    style=document.createElement("style");
    style.textContent='#joy{position:fixed;left:14px;bottom:14px;width:160px;height:160px;z-index:10001;pointer-events:auto}#joyBase{width:160px;height:160px;border-radius:80px;background:rgba(17,24,39,.45);border:1px solid rgba(255,255,255,.18);position:relative}#joyKnob{width:70px;height:70px;border-radius:35px;background:rgba(229,231,235,.75);position:absolute;left:45px;top:45px}';
    document.head.appendChild(style);
    const base=joy.querySelector("#joyBase");
    const knob=joy.querySelector("#joyKnob");
    base.addEventListener("touchstart",(e)=>{jactive=true;const t=e.touches[0];sx=t.clientX;sy=t.clientY;e.preventDefault()},{passive:false});
    window.addEventListener("touchmove",(e)=>{if(!jactive)return;const t=e.touches[0];const mx=t.clientX-sx,my=t.clientY-sy;const max=50;jx=clamp(mx/max,-1,1);jy=clamp(my/max,-1,1);knob.style.left=`${45+jx*45}px`;knob.style.top=`${45+jy*45}px`;e.preventDefault()},{passive:false});
    const end=()=>{jactive=false;jx=0;jy=0;knob.style.left="45px";knob.style.top="45px"};
    window.addEventListener("touchend",end,{passive:true}); window.addEventListener("touchcancel",end,{passive:true});
    diag.write("[move] mobile joystick installed ✅");
  }

  let axX=0, axY=0;
  const onAxis=(e)=>{const a=e?.detail?.axis; if(!a||a.length<2) return; axX=a[0]||0; axY=a[1]||0;};
  document.getElementById("leftHand")?.addEventListener("axismove", onAxis);
  document.getElementById("rightHand")?.addEventListener("axismove", onAxis);
  diag.write("[move] listening for axismove ✅");

  const getPads = () => (navigator.getGamepads ? navigator.getGamepads() : []);
  const speed = 0.085, dead = 0.18;

  let raf=0;
  const tick=()=>{
    try{
      if(enabled){
        let strafe=0, forward=0;
        if(Math.abs(axX)>dead||Math.abs(axY)>dead){ strafe=axX; forward=-axY; }
        else{
          const pads=getPads(); let best=[0,0];
          for(const gp of pads){
            if(!gp||!gp.axes) continue;
            const cand=[[gp.axes[2],gp.axes[3]],[gp.axes[0],gp.axes[1]]];
            for(const c of cand){
              if((Math.abs(c[0]||0)+Math.abs(c[1]||0))>(Math.abs(best[0])+Math.abs(best[1]))) best=c;
            }
          }
          if(Math.abs(best[0])>dead) strafe=best[0];
          if(Math.abs(best[1])>dead) forward=-best[1];
        }
        if(isTouch){
          if(Math.abs(jx)>0.05) strafe=jx;
          if(Math.abs(jy)>0.05) forward=-jy;
        }
        const yaw=camera.object3D.rotation.y;
        const vx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed;
        const vz=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed;
        if(Math.abs(vx)+Math.abs(vz)>0.0005){
          const p=rig.object3D.position;
          rig.object3D.position.set(p.x+vx,p.y,p.z+vz);
        }
      }
    }catch(_){}
    raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
  diag.write("[move] locomotion loop running ✅");
  return { destroy(){ cancelAnimationFrame(raf); joy?.remove(); style?.remove(); } };
}
