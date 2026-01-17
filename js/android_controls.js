import * as THREE from "three";

function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function makeEl(tag, css, parent=document.body) {
  const el = document.createElement(tag);
  if (css) el.style.cssText = css;
  parent.appendChild(el);
  return el;
}

export function setupAndroidControls(ctx) {
  const { rig, camera, log } = ctx;
  if (!isMobile()) return null;

  const root = makeEl("div","position:fixed;left:0;top:0;right:0;bottom:0;z-index:9998;pointer-events:none;");

  const joy = makeEl("div",
    "position:absolute;left:18px;bottom:18px;width:140px;height:140px;border-radius:70px;" +
    "background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);pointer-events:auto;touch-action:none;",
    root);
  const nub = makeEl("div",
    "position:absolute;left:50%;top:50%;width:56px;height:56px;margin-left:-28px;margin-top:-28px;border-radius:28px;" +
    "background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);",
    joy);

  const look = makeEl("div","position:absolute;right:0;top:0;bottom:0;width:55%;pointer-events:auto;touch-action:none;",root);

  const btnAct = makeEl("button",
    "position:absolute;right:18px;bottom:18px;width:74px;height:74px;border-radius:37px;border:1px solid rgba(255,255,255,.22);" +
    "background:rgba(120,255,170,.14);color:#fff;font:700 14px system-ui;pointer-events:auto;",
    root);
  btnAct.textContent = "ACT";

  const btnM = makeEl("button",
    "position:absolute;right:18px;bottom:92px;width:74px;height:74px;border-radius:37px;border:1px solid rgba(255,255,255,.22);" +
    "background:rgba(255,255,255,.12);color:#fff;font:700 14px system-ui;pointer-events:auto;",
    root);
  btnM.textContent = "MENU";

  let joyActive=false, joyId=null, joyCenter={x:0,y:0}, joyVec={x:0,y:0};
  let lookActive=false, lookId=null, lastLook={x:0,y:0};
  let yaw = rig.rotation.y, pitch=0;

  const speed = 2.25;
  const lookSpeed = 0.003;

  function setNub(dx, dy){
    const max = 42;
    const len = Math.hypot(dx,dy) || 1;
    const k = Math.min(1, max/len);
    const x = dx*k, y = dy*k;
    nub.style.transform = `translate(${x}px, ${y}px)`;
    joyVec.x = clamp(x/max, -1, 1);
    joyVec.y = clamp(y/max, -1, 1);
  }

  joy.addEventListener("pointerdown",(e)=>{
    joyActive=true; joyId=e.pointerId;
    joy.setPointerCapture(joyId);
    const r=joy.getBoundingClientRect();
    joyCenter={x:r.left+r.width/2,y:r.top+r.height/2};
    setNub(e.clientX-joyCenter.x, e.clientY-joyCenter.y);
  });
  joy.addEventListener("pointermove",(e)=>{
    if(!joyActive||e.pointerId!==joyId) return;
    setNub(e.clientX-joyCenter.x, e.clientY-joyCenter.y);
  });
  const endJoy=()=>{
    joyActive=false; joyId=null;
    nub.style.transform="translate(0px,0px)";
    joyVec.x=0; joyVec.y=0;
  };
  joy.addEventListener("pointerup",endJoy);
  joy.addEventListener("pointercancel",endJoy);

  look.addEventListener("pointerdown",(e)=>{
    lookActive=true; lookId=e.pointerId;
    look.setPointerCapture(lookId);
    lastLook={x:e.clientX,y:e.clientY};
  });
  look.addEventListener("pointermove",(e)=>{
    if(!lookActive||e.pointerId!==lookId) return;
    const dx=e.clientX-lastLook.x;
    const dy=e.clientY-lastLook.y;
    lastLook={x:e.clientX,y:e.clientY};
    yaw -= dx*lookSpeed;
    pitch -= dy*lookSpeed;
    pitch = clamp(pitch, -1.2, 1.2);
    rig.rotation.y = yaw;
    camera.rotation.x = pitch;
  });
  const endLook=()=>{lookActive=false;lookId=null;};
  look.addEventListener("pointerup",endLook);
  look.addEventListener("pointercancel",endLook);

  btnAct.addEventListener("click",()=>{
    window.dispatchEvent(new CustomEvent("scarlett_action",{detail:{source:"android"}}));
    log?.("[android] ACT pressed → event scarlett_action");
  });
  btnM.addEventListener("click",()=>{
    window.dispatchEvent(new CustomEvent("scarlett_menu",{detail:{source:"android"}}));
    log?.("[android] MENU pressed → event scarlett_menu");
  });

  let lastT=performance.now();
  function tick(){
    const now=performance.now();
    const dt=Math.min(0.05,(now-lastT)/1000);
    lastT=now;

    const forward = -joyVec.y;
    const strafe  = joyVec.x;

    if (forward!==0 || strafe!==0){
      const dir = new THREE.Vector3(strafe,0,forward);
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
      dir.multiplyScalar(speed*dt);
      rig.position.add(dir);
    }
    rig.position.y = Math.max(0, rig.position.y);
  }

  log?.("[android] touch controls ready ✓ (joystick + look + ACT/MENU)");
  return { tick, destroy:()=>root.remove() };
}
