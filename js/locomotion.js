// js/locomotion.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };
  const rig = document.getElementById("rig");
  const scene = document.getElementById("scene");
  if (!rig || !scene) return;

  const keys = {};
  window.addEventListener("keydown", (e)=>{ keys[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup",   (e)=>{ keys[e.key.toLowerCase()] = false; });

  let inVR = false;
  scene.addEventListener("enter-vr", ()=>{ inVR = true; });
  scene.addEventListener("exit-vr",  ()=>{ inVR = false; });

  function getVec(el, name){
    const v = el.getAttribute(name);
    return (typeof v === "string") ? AFRAME.utils.coordinates.parse(v) : (v||{x:0,y:0,z:0});
  }

  const LOBBY_R = 36.0;
  function clampToLobby(p){
    const r = Math.hypot(p.x, p.z);
    const max = LOBBY_R - 2.0;
    if (r > max){
      const s = max / r;
      p.x *= s; p.z *= s;
    }
    return p;
  }

  let last = performance.now();
  function tick(){
    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;

    const pos = getVec(rig, "position");
    const rot = getVec(rig, "rotation");
    const yaw = (rot.y||0) * Math.PI/180;
    const fwd = {x:-Math.sin(yaw), z:-Math.cos(yaw)};
    const right = {x:fwd.z, z:-fwd.x};

    let mx=0, mz=0, turn=0;
    if (keys["w"]||keys["arrowup"]) mz += 1;
    if (keys["s"]||keys["arrowdown"]) mz -= 1;
    if (keys["a"]||keys["arrowleft"]) mx -= 1;
    if (keys["d"]||keys["arrowright"]) mx += 1;
    if (keys["q"]) turn -= 1;
    if (keys["e"]) turn += 1;

    const pads = window.SCARLETT_PADS;
    if (pads){
      mx += pads.moveX || 0;
      mz += -(pads.moveY || 0);
      turn += (pads.turnX || 0);
    }

    if (inVR && scene.renderer && scene.renderer.xr){
      const session = scene.renderer.xr.getSession?.();
      if (session){
        for (const src of session.inputSources){
          const gp = src.gamepad;
          if (!gp || !gp.axes) continue;
          mx += gp.axes[0] || 0;
          mz += -(gp.axes[1] || 0);
          turn += gp.axes[2] || 0;
          break;
        }
      }
    }

    const len = Math.hypot(mx, mz);
    if (len>1){ mx/=len; mz/=len; }

    const speed = inVR ? 2.2 : 3.4;
    const turnSpeed = inVR ? 55 : 85;

    pos.x += (right.x*mx + fwd.x*mz) * speed * dt;
    pos.z += (right.z*mx + fwd.z*mz) * speed * dt;
    pos.y = 0;

    rot.y = (rot.y||0) + turn * turnSpeed * dt;

    clampToLobby(pos);

    rig.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
    rig.setAttribute("rotation", `${rot.x||0} ${rot.y} ${rot.z||0}`);

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  D.log("[locomotion] ready ✅");
})();
