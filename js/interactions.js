import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Interactions {
  constructor(camera, scene, renderer, rig){
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.rig = rig;

    this.raycaster = new THREE.Raycaster();
    this.clickables = new Set();
    this.controllers = [];

    this._setupPointer();
    this._setupControllers();
  }

  registerClickable(obj){ this.clickables.add(obj); }
  unregisterClickable(obj){ this.clickables.delete(obj); }

  _setupPointer(){
    const dom = this.renderer.domElement;

    const tap = (clientX, clientY) => {
      const r = dom.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 2 - 1;
      const y = -(((clientY - r.top) / r.height) * 2 - 1);

      this.raycaster.setFromCamera({x,y}, this.camera);
      const hit = this._hit(this.raycaster);
      if (hit) this._click(hit.object);
    };

    dom.addEventListener('pointerup', (e)=> tap(e.clientX, e.clientY), { passive:true });
  }

  _setupControllers(){
    const r = this.renderer;

    const c0 = r.xr.getController(0);
    const c1 = r.xr.getController(1);

    // ✅ FIX: parent controllers to rig so hands follow player locomotion
    this.rig.add(c0);
    this.rig.add(c1);

    const laserGeom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
    const laserMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });

    const l0 = new THREE.Line(laserGeom, laserMat); l0.scale.z = 8; c0.add(l0);
    const l1 = new THREE.Line(laserGeom, laserMat); l1.scale.z = 8; c1.add(l1);

    this.controllers = [c0, c1];

    const onSelect = (ctrl) => {
      const rc = new THREE.Raycaster();
      const origin = new THREE.Vector3();
      const dir = new THREE.Vector3(0,0,-1);

      ctrl.getWorldPosition(origin);
      dir.applyQuaternion(ctrl.getWorldQuaternion(new THREE.Quaternion())).normalize();

      rc.set(origin, dir);
      const hit = this._hit(rc);
      if (hit) this._click(hit.object);
    };

    c0.addEventListener('select', ()=> onSelect(c0));
    c1.addEventListener('select', ()=> onSelect(c1));
  }

  _hit(raycaster){
    const arr = Array.from(this.clickables);
    if (!arr.length) return null;

    const targets = [];
    for (const o of arr) targets.push(o, ...o.children);

    const hits = raycaster.intersectObjects(targets, true);
    return hits?.[0] || null;
  }

  _click(obj){
    let o = obj;
    while (o){
      if (typeof o.userData?.onClick === 'function'){
        o.userData.onClick(o);
        return;
      }
      o = o.parent;
    }
  }

  getXRGamepads(){
    const s = this.renderer.xr.getSession?.();
    if (!s) return [];
    const pads = [];
    for (const src of s.inputSources){
      if (src?.gamepad) pads.push(src.gamepad);
    }
    return pads;
  }
}
