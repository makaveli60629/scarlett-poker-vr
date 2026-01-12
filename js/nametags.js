// /js/nametags.js — Look-at nametags (wider cone, more reliable)
export const NameTags = (() => {
  let THREE=null, camera=null;
  const targets=[];
  let active=null;

  function init(ctx){
    THREE=ctx.THREE;
    camera=ctx.camera;
  }

  function register(obj, name){
    const tag = makeTagPlane(name);
    tag.visible = false;
    obj.add(tag);
    tag.position.set(0, 1.65, 0.0);
    targets.push({ obj, tag, name });
  }

  function update(){
    if (!camera) return;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0,0,-1);
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).normalize();

    let best=null, bestDot=0.0;

    for (const t of targets){
      const wp = new THREE.Vector3();
      t.obj.getWorldPosition(wp);
      const v = wp.clone().sub(origin);
      const dist = v.length();
      if (dist > 9.0) continue;              // ✅ longer range
      v.normalize();
      const d = v.dot(dir);
      if (d > bestDot && d > 0.975){         // ✅ wider cone than before
        bestDot = d;
        best = t;
      }
    }

    if (best !== active){
      if (active) active.tag.visible = false;
      active = best;
      if (active) active.tag.visible = true;
    }
  }

  function makeTagPlane(text){
    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=128;
    const c=canvas.getContext("2d");

    c.clearRect(0,0,512,128);
    c.fillStyle="rgba(8,10,18,0.85)";
    roundRect(c, 10, 10, 492, 108, 24); c.fill();

    c.strokeStyle="rgba(127,231,255,0.60)";
    c.lineWidth=6;
    roundRect(c, 10, 10, 492, 108, 24); c.stroke();

    c.fillStyle="rgba(255,45,122,0.28)";
    c.fillRect(26, 26, 18, 72);

    c.fillStyle="#e8ecff";
    c.font="bold 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(text, 60, 78);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.40), mat);
    plane.renderOrder = 999;
    return plane;
  }

  function roundRect(ctx, x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y, x+w,y+h, r);
    ctx.arcTo(x+w,y+h, x,y+h, r);
    ctx.arcTo(x,y+h, x,y, r);
    ctx.arcTo(x,y, x+w,y, r);
    ctx.closePath();
  }

  return { init, register, update };
})();
