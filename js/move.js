(function(){
  const DEADZONE = 0.12;

  function getWorldYaw(obj3d){
    const q = new THREE.Quaternion();
    obj3d.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return e.y;
  }

  function readStickFromTracked(el){
    try{
      const tc = el?.components?.["tracked-controls"];
      const ctrl = tc?.controller;
      const gp = ctrl?.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) return null;

      let best = [0,1], bestMag = -1;
      for (let i=0;i+1<gp.axes.length;i+=2){
        const x = gp.axes[i]||0, y = gp.axes[i+1]||0;
        const mag = Math.hypot(x,y);
        if (mag > bestMag){ bestMag = mag; best = [i,i+1]; }
      }
      if (gp.axes.length >= 4){
        const mag23 = Math.hypot(gp.axes[2]||0, gp.axes[3]||0);
        if (mag23 >= bestMag*0.8) best = [2,3];
      }

      let x = gp.axes[best[0]]||0;
      let y = gp.axes[best[1]]||0;
      x = Math.abs(x) < DEADZONE ? 0 : x;
      y = Math.abs(y) < DEADZONE ? 0 : y;
      if (!x && !y) return null;
      return { x, y };
    }catch(_){ return null; }
  }

  AFRAME.registerComponent("smooth-locomotion", {
    init: function(){
      this.rig = document.getElementById("rig");
      this.head = document.getElementById("head");
      this.leftHand = document.getElementById("leftHand");
      this.rightHand = document.getElementById("rightHand");
      this._snapCooldown = 0;
      this._lastErr = 0;
    },
    tick: function(time, dt){
      try{
        const rig3 = this.rig?.object3D;
        const head3 = this.head?.object3D;
        if (!rig3 || !head3) return;

        const dtS = Math.min(0.05, (dt||0)/1000);
        const spd = 2.4;

        const yaw = getWorldYaw(head3);
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        let mv = null;
        const ls = readStickFromTracked(this.leftHand);
        if (ls) mv = { x: ls.x, y: ls.y };
        if (!mv){
          const pads = window.SCARLETT?.pads;
          if (pads?.move) mv = { x: pads.move.x, y: pads.move.y };
        }
        if (mv){
          const forward = -mv.y;
          const strafe = mv.x;
          const dx = (strafe*cos + forward*sin) * spd * dtS;
          const dz = (forward*cos - strafe*sin) * spd * dtS;
          rig3.position.x += dx;
          rig3.position.z += dz;
        }

        let tx = 0;
        const rs = readStickFromTracked(this.rightHand);
        if (rs) tx = rs.x;
        else {
          const pads = window.SCARLETT?.pads;
          if (pads?.turn) tx = pads.turn.x;
        }
        if (this._snapCooldown > 0) this._snapCooldown -= dt;
        if (this._snapCooldown <= 0 && Math.abs(tx) > 0.65){
          rig3.rotation.y += (tx > 0 ? -1 : 1) * (Math.PI/6);
          this._snapCooldown = 250;
        }
      }catch(e){
        const now = performance.now();
        if ((now - this._lastErr) > 1000){
          this._lastErr = now;
          window.__scarlettDiagWrite?.(`[move] tick error: ${e?.message||e}`);
        }
      }
    }
  });
})();
