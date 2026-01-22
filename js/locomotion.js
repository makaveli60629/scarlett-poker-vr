// js/locomotion.js
(function(){
  const D = window.SCARLETT_DIAG;
  const rig = document.getElementById("rig");
  const cam = document.getElementById("camera");
  if(!rig || !cam) return;

  const dead = 0.15;
  let lastTurn = 0;

  function pads(){
    const gps = (navigator.getGamepads && navigator.getGamepads()) || [];
    return Array.from(gps).filter(g=>g && g.connected && g.axes && g.axes.length);
  }

  function tick(){
    const ps = pads();
    if(!ps.length) return;

    let left = ps[0], right = ps[1] || ps[0];
    for(const p of ps){
      if(p.hand === "left") left = p;
      if(p.hand === "right") right = p;
    }

    const ax = left.axes[2] ?? left.axes[0] ?? 0;
    const ay = left.axes[3] ?? left.axes[1] ?? 0;

    const mx = Math.abs(ax) > dead ? ax : 0;
    const my = Math.abs(ay) > dead ? ay : 0;

    if(mx || my){
      const spd = 0.035;
      const yaw = cam.object3D.rotation.y;
      const dx = (-mx * Math.cos(yaw) + -my * Math.sin(yaw)) * spd;
      const dz = (-my * Math.cos(yaw) +  mx * Math.sin(yaw)) * spd;
      rig.object3D.position.x += dx;
      rig.object3D.position.z += dz;
    }

    const rx = right.axes[2] ?? right.axes[0] ?? 0;
    const now = performance.now();
    if(Math.abs(rx) > 0.65 && (now - lastTurn) > 300){
      rig.object3D.rotation.y += (rx > 0 ? -1 : 1) * (Math.PI/6);
      lastTurn = now;
    }
  }

  setInterval(tick, 16);
  D && D.log && D.log("[locomotion] thumbstick move + snap turn ✅");
})();
