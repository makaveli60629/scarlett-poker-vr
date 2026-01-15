// /js/scarlett1/spine_android.js — Android / Mobile locomotion + look
// - One-finger drag: look (yaw/pitch)
// - Two-finger drag: move (forward/back/strafe)
// - Provides a small on-screen toggle to disable touch capture if needed

export function installAndroidControls({ THREE, world, diag }) {
  const { camera, rig, addTick } = world;

  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) {
    diag?.log?.("[android] touch not detected — skipping mobile controls");
    return;
  }

  const state = {
    enabled: true,
    look: { yaw: 0, pitch: 0 },
    vel: new THREE.Vector3(),
    touch: {
      active:false,
      mode:"look",
      id1:null, id2:null,
      x1:0, y1:0, x2:0, y2:0,
      lx1:0, ly1:0, lx2:0, ly2:0
    }
  };

  // UI toggle
  const btn = document.createElement("button");
  btn.textContent = "Touch: ON";
  btn.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:999999;padding:10px 12px;border-radius:12px;border:1px solid rgba(120,160,255,0.25);background:rgba(255,255,255,0.06);color:#eaf0ff;font-weight:800;";
  btn.addEventListener("click", () => {
    state.enabled = !state.enabled;
    btn.textContent = state.enabled ? "Touch: ON" : "Touch: OFF";
  });
  document.body.appendChild(btn);

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function onTouchStart(e){
    if(!state.enabled) return;
    if(e.touches.length>=1){
      state.touch.active=true;
      const t1=e.touches[0];
      state.touch.id1=t1.identifier;
      state.touch.x1=state.touch.lx1=t1.clientX;
      state.touch.y1=state.touch.ly1=t1.clientY;
      state.touch.mode = (e.touches.length>=2) ? "move" : "look";
    }
    if(e.touches.length>=2){
      const t2=e.touches[1];
      state.touch.id2=t2.identifier;
      state.touch.x2=state.touch.lx2=t2.clientX;
      state.touch.y2=state.touch.ly2=t2.clientY;
      state.touch.mode="move";
    }
  }

  function onTouchMove(e){
    if(!state.enabled || !state.touch.active) return;
    if(e.touches.length===1){
      const t=e.touches[0];
      const dx=t.clientX - state.touch.lx1;
      const dy=t.clientY - state.touch.ly1;
      state.touch.lx1=t.clientX; state.touch.ly1=t.clientY;

      // look
      state.look.yaw   -= dx * 0.0032;
      state.look.pitch -= dy * 0.0026;
      state.look.pitch = clamp(state.look.pitch, -1.1, 1.1);
      rig.rotation.y = state.look.yaw;
      camera.rotation.x = state.look.pitch;
    } else if(e.touches.length>=2){
      const t1=e.touches[0], t2=e.touches[1];
      const cx=(t1.clientX+t2.clientX)/2;
      const cy=(t1.clientY+t2.clientY)/2;
      const lcx=(state.touch.lx1+state.touch.lx2)/2;
      const lcy=(state.touch.ly1+state.touch.ly2)/2;
      const dx=cx-lcx;
      const dy=cy-lcy;
      state.touch.lx1=t1.clientX; state.touch.ly1=t1.clientY;
      state.touch.lx2=t2.clientX; state.touch.ly2=t2.clientY;

      // move vector relative to rig yaw
      const speed = 0.0065;
      const forward = -dy * speed; // up drag => forward
      const strafe  = dx * speed;

      state.vel.set(strafe, 0, forward);
    }

    // prevent page scroll
    e.preventDefault();
  }

  function onTouchEnd(e){
    if(e.touches.length===0){
      state.touch.active=false;
      state.vel.set(0,0,0);
    }
  }

  window.addEventListener("touchstart", onTouchStart, { passive:false });
  window.addEventListener("touchmove", onTouchMove, { passive:false });
  window.addEventListener("touchend", onTouchEnd, { passive:true });
  window.addEventListener("touchcancel", onTouchEnd, { passive:true });

  addTick(({dt}) => {
    // smooth stop
    const damp = Math.pow(0.001, dt);
    state.vel.multiplyScalar(damp);

    // apply movement in rig local space
    const yaw = rig.rotation.y;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const vx = state.vel.x, vz = state.vel.z;
    const dx = vx * cos - vz * sin;
    const dz = vx * sin + vz * cos;

    rig.position.x += dx;
    rig.position.z += dz;
  });

  diag?.log?.("[android] mobile look+move installed ✅ (1 finger look, 2 finger move)");
}
