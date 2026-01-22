// js/controls_android.js
// Touch joysticks for mobile + basic WASD fallback.
(function(){
  const D = window.SCARLETT_DIAG;
  const rig = () => document.getElementById("rig");
  const cam = () => document.getElementById("camera");

  const leftStick = document.getElementById("leftStick");
  const rightStick = document.getElementById("rightStick");
  const leftNub = leftStick.querySelector(".nub");
  const rightNub = rightStick.querySelector(".nub");

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints||0) > 0;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const state = {
    moveX: 0, moveY: 0, // left stick: x strafe, y forward
    turnX: 0, // right stick: x yaw
    keys: {},
    enabled: true
  };

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function setNub(nub, dx, dy){
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  function resetNub(nub){ nub.style.transform = "translate(-50%,-50%)"; }

  function stickBind(stickEl, nubEl, onMove){
    let pid = null;
    let center = {x:0,y:0};
    const radius = 60;

    function start(e){
      if(!state.enabled) return;
      if(pid!==null) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      pid = t.identifier ?? "mouse";
      const r = stickEl.getBoundingClientRect();
      center = { x: r.left + r.width/2, y: r.top + r.height/2 };
      move(e);
    }

    function move(e){
      if(pid===null) return;
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = touches.find(tt => (tt.identifier ?? "mouse") === pid);
      if(!t) return;

      const x = t.clientX - center.x;
      const y = t.clientY - center.y;
      const mag = Math.hypot(x,y);
      const nx = mag > radius ? x/mag*radius : x;
      const ny = mag > radius ? y/mag*radius : y;
      setNub(nubEl, nx, ny);
      onMove(nx/radius, ny/radius);
      e.preventDefault();
    }

    function end(e){
      if(pid===null) return;
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = touches.find(tt => (tt.identifier ?? "mouse") === pid);
      if(!t) return;
      pid = null;
      resetNub(nubEl);
      onMove(0,0);
    }

    stickEl.addEventListener("touchstart", start, {passive:false});
    stickEl.addEventListener("touchmove", move, {passive:false});
    stickEl.addEventListener("touchend", end, {passive:false});
    stickEl.addEventListener("touchcancel", end, {passive:false});

    // mouse fallback (desktop)
    stickEl.addEventListener("mousedown", (e)=>{ start(e); window.addEventListener("mousemove", move, {passive:false}); window.addEventListener("mouseup", (ev)=>{ end(ev); window.removeEventListener("mousemove", move); }, {once:true}); });
  }

  function showSticks(show){
    leftStick.style.display = show ? "block" : "none";
    rightStick.style.display = show ? "block" : "none";
  }

  function tick(){
    const r = rig();
    if(!r) return requestAnimationFrame(tick);

    const dt = 1/60;
    const speed = 2.1;          // m/s
    const strafe = 1.75;        // m/s
    const turnSpeed = 1.8;      // rad/s

    // yaw
    const yaw = state.turnX + ((state.keys["ArrowLeft"]||state.keys["KeyQ"]) ? -1 : 0) + ((state.keys["ArrowRight"]||state.keys["KeyE"]) ? 1 : 0);
    r.object3D.rotation.y += yaw * turnSpeed * dt;

    // forward/strafe relative to yaw
    const fwd = (-state.moveY) + ((state.keys["KeyW"]||state.keys["ArrowUp"]) ? 1 : 0) + ((state.keys["KeyS"]||state.keys["ArrowDown"]) ? -1 : 0);
    const sx = (state.moveX) + ((state.keys["KeyD"]) ? 1 : 0) + ((state.keys["KeyA"]) ? -1 : 0);

    const dirY = r.object3D.rotation.y;
    const cos = Math.cos(dirY), sin = Math.sin(dirY);

    const dx = (sin * fwd * speed + cos * sx * strafe) * dt;
    const dz = (cos * fwd * speed - sin * sx * strafe) * dt;

    // prevent moving while seated
    if(!(window.SCARLETT_STATE && window.SCARLETT_STATE.seated)){
      r.object3D.position.x += dx;
      r.object3D.position.z += dz;
    }

    requestAnimationFrame(tick);
  }

  // bindings
  stickBind(leftStick, leftNub, (nx, ny)=>{ state.moveX = clamp(nx,-1,1); state.moveY = clamp(ny,-1,1); });
  stickBind(rightStick, rightNub, (nx, ny)=>{ state.turnX = clamp(nx,-1,1); });

  window.addEventListener("keydown", (e)=>{ state.keys[e.code]=true; });
  window.addEventListener("keyup", (e)=>{ state.keys[e.code]=false; });

  // show sticks on touch devices (especially Android)
  if (isTouch && isMobile) {
    showSticks(true);
    D.log("[androidPads] armed ✅");
  } else {
    showSticks(false);
    D.log("[androidPads] hidden (non-touch or desktop)");
  }

  requestAnimationFrame(tick);
})();
