// /js/nametags.js — Look-at nametags (show when gazed, hide when not)
export const NameTags = (() => {
  let THREE=null, camera=null, scene=null;
  let raycaster=null;
  const targets=[];
  let active=null;

  function init(ctx){
    THREE=ctx.THREE; camera=ctx.camera; scene=ctx.scene;
    raycaster=new THREE.Raycaster();
  }

  function register(obj, name){
    // Create simple floating plane tag
    const tag = makeTagPlane(name);
    tag.visible=false;
    obj.add(tag);
    tag.position.set(0, 1.55, 0.0);
    targets.push({ obj, tag, name });
  }

  function update(){
    if (!raycaster) return;

    // cast forward from camera
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0,0,-1);
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).normalize();

    raycaster.set(origin, dir);
    raycaster.far = 6.0;

    // pick closest by distance to gaze line (cheap)
    let best=null, bestDot=0.0;
    for (const t of targets){
      const wp = new THREE.Vector3();
      t.obj.getWorldPosition(wp);
      const v = wp.clone().sub(origin).normalize();
      const d = v.dot(dir);
      if (d > bestDot && d > 0.985){ // narrow cone
        bestDot = d;
        best = t;
      }
    }

    if (best !== active){
      if (active) active.tag.visible=false;
      active = best;
      if (active) active.tag.visible=true;
    }
  }

  function makeTagPlane(text){
    // canvas texture tag
    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=128;
    const c=canvas.getContext("2d");

    c.clearRect(0,0,512,128);
    // frame
    c.fillStyle="rgba(8,10,18,0.80)";
    roundRect(c, 10, 10, 492, 108, 24); c.fill();

    c.strokeStyle="rgba(127,231,255,0.55)";
    c.lineWidth=6;
    roundRect(c, 10, 10, 492, 108, 24); c.stroke();

    c.fillStyle="rgba(255,45,122,0.22)";
    c.fillRect(26, 26, 18, 72);

    c.fillStyle="#e8ecff";
    c.font="bold 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(text, 60, 78);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 1;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.36), mat);
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
