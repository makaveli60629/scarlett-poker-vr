// js/locomotion.js
(function(){
  const D = window.SCARLETT_DIAG;
  const rig = document.getElementById("rig");
  const cam = document.getElementById("camera");
  if(!rig){ console.warn("locomotion: #rig missing"); return; }

  if(!rig.hasAttribute("wasd-controls")){
    rig.setAttribute("wasd-controls", "acceleration: 30");
  }

  let enabled = true;
  let speed = 1.6; // m/s
  let lastT = performance.now();

  function getGamepad(){
    const gps = (navigator.getGamepads && navigator.getGamepads()) || [];
    for(const g of gps){ if(g && g.connected) return g; }
    return null;
  }

  function tick(){
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT)/1000);
    lastT = now;

    if(enabled){
      const g = getGamepad();
      if(g && g.axes && g.axes.length >= 2){
        const x = g.axes[0] || 0;
        const y = g.axes[1] || 0;
        const dz = 0.18;
        const ax = Math.abs(x) < dz ? 0 : x;
        const ay = Math.abs(y) < dz ? 0 : y;

        if(ax || ay){
          const camObj = cam && cam.object3D ? cam.object3D : rig.object3D;
          const yaw = camObj.rotation.y;

          const forward = -ay;
          const strafe = ax;

          const vx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed * dt;
          const vz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed * dt;

          rig.object3D.position.x += vx;
          rig.object3D.position.z += vz;
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.SCARLETT_LOCOMOTION = {
    setEnabled(v){ enabled = !!v; D && D.toast && D.toast("Move: " + (enabled?"ON":"OFF")); },
    setSpeed(v){ speed = Math.max(0.2, Number(v)||1.6); }
  };
  D && D.log && D.log("[locomotion] thumbstick + WASD enabled ✅");
})();
