import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function makeCanvasLabel(text, w=512, h=256){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  function draw(alpha=1){
    ctx.clearRect(0,0,w,h);
    ctx.globalAlpha = alpha;

    // background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 18, 18, w-36, h-36, 26);
    ctx.fill();

    // text
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 44px system-ui, Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w/2, h/2 - 6);
  }

  draw(1);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;

  return { canvas:c, ctx, tex, redraw:draw };
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y, x+w,y+h, rr);
  ctx.arcTo(x+w,y+h, x,y+h, rr);
  ctx.arcTo(x,y+h, x,y, rr);
  ctx.arcTo(x,y, x+w,y, rr);
  ctx.closePath();
}

export class GamerTags {
  constructor(scene, camera, opts={}){
    this.scene = scene;
    this.camera = camera;
    this.dwellSeconds = opts.dwellSeconds ?? 5.0;

    this.map = new Map(); // player -> tag group
    this.focus = null;
    this.dwell = 0;

    this.fade = 0; // 0..1 visible
  }

  attachToPlayer(player, anchor){
    const id = player.userData?.identity;
    const name = id?.name || "Player";

    const label = makeCanvasLabel(name);
    const mat = new THREE.MeshBasicMaterial({ map: label.tex, transparent:true, opacity:0.0, depthTest:false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), mat);
    plane.renderOrder = 999;

    const g = new THREE.Group();
    g.add(plane);
    g.userData._plane = plane;
    g.userData._mat = mat;

    anchor.add(g);
    g.position.set(0,0,0);

    this.map.set(player, g);
  }

  update(dt, lookedObject){
    // determine which player is focused
    let focusedPlayer = null;
    if (lookedObject){
      // climb to find player root with identity
      let o = lookedObject;
      while (o){
        if (o.userData?.identity) { focusedPlayer = o; break; }
        o = o.parent;
      }
    }

    if (focusedPlayer !== this.focus){
      this.focus = focusedPlayer;
      this.dwell = 0;
    }

    if (this.focus){
      this.dwell += dt;
      if (this.dwell >= this.dwellSeconds) this.fade = Math.min(1, this.fade + dt*3.0);
      else this.fade = Math.max(0, this.fade - dt*4.0);
    } else {
      this.fade = Math.max(0, this.fade - dt*4.0);
    }

    // apply fade only to focused player tag (others off)
    for (const [player, tag] of this.map.entries()){
      const mat = tag.userData._mat;
      const plane = tag.userData._plane;

      // face camera
      plane.quaternion.copy(this.camera.quaternion);

      if (player === this.focus && this.dwell >= this.dwellSeconds){
        mat.opacity = this.fade;
        tag.visible = true;
      } else {
        mat.opacity = 0;
        tag.visible = false;
      }
    }
  }
}

// 3D Button Panel helper (for store/watch menus)
export function makeButtonPanel(buttons, opts={}){
  // buttons: [{ id, label, onClick }]
  const w = opts.width ?? 1.1;
  const rowH = opts.rowHeight ?? 0.18;
  const pad = 0.04;
  const rows = buttons.length;
  const h = rows*rowH + pad*2;

  const group = new THREE.Group();

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.65, depthTest:false })
  );
  bg.renderOrder = 990;
  group.add(bg);

  const meshes = [];

  for (let i=0;i<rows;i++){
    const b = buttons[i];
    const y = (h/2 - pad - rowH/2) - i*rowH;

    const { tex } = makeCanvasLabel(b.label, 512, 180);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w - pad*2, rowH - 0.02),
      new THREE.MeshBasicMaterial({ map: tex, transparent:true, opacity:0.95, depthTest:false })
    );
    m.position.set(0, y, 0.001);
    m.renderOrder = 995;
    m.userData.onClick = () => b.onClick?.(b.id);
    group.add(m);
    meshes.push(m);
  }

  group.userData._buttons = meshes;
  return group;
                                }
