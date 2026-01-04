import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Interactions {
  constructor(camera, scene, renderer, rig){
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.rig = rig;

    this.raycaster = new THREE.Raycaster();
    this.tmpVec = new THREE.Vector2();

    this.clickables = new Set(); // Meshes (or groups) with userData.onClick
    this.players = [];
    this.controllers = [];

    this._setupPointer();
    this._setupControllers();
  }

  registerClickable(obj){
    this.clickables.add(obj);
  }

  unregisterClickable(obj){
    this.clickables.delete(obj);
  }

  setPlayers(arr){ this.players = arr || []; }

  // -------- Touch / mouse to click 3D UI ----------
  _setupPointer(){
    const dom = this.renderer.domElement;

    const onTap = (clientX, clientY) => {
      const rect = dom.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      this.raycaster.setFromCamera({x,y}, this.camera);
      const hits = this._intersectClickables(this.raycaster);
      if (hits.length){
        const obj = hits[0].object;
        const fn = this._findOnClick(obj);
        if (fn) fn(obj);
      }
    };

    dom.addEventListener('pointerup', (e)=> onTap(e.clientX, e.clientY), { passive:true });
  }

  // -------- VR Controllers: right-hand laser clicks ----------
  _setupControllers(){
    const r = this.renderer;

    const c0 = r.xr.getController(0);
    const c1 = r.xr.getController(1);

    this.scene.add(c0);
    this.scene.add(c1);

    // Laser visuals
    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const laserMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });
    const line0 = new THREE.Line(laserGeom, laserMat);
    line0.name = "laser";
    line0.scale.z = 8;
    c0.add(line0);

    const line1 = new THREE.Line(laserGeom, laserMat);
    line1.name = "laser";
    line1.scale.z = 8;
    c1.add(line1);

    this.controllers = [c0, c1];

    // Select = click
    const onSelect = (ctrl) => {
      const rc = new THREE.Raycaster();
      const origin = new THREE.Vector3();
      const dir = new THREE.Vector3(0,0,-1);

      ctrl.getWorldPosition(origin);
      dir.applyQuaternion(ctrl.getWorldQuaternion(new THREE.Quaternion())).normalize();

      rc.set(origin, dir);
      const hits = this._intersectClickables(rc);
      if (hits.length){
        const obj = hits[0].object;
        const fn = this._findOnClick(obj);
        if (fn) fn(obj);
      }
    };

    c0.addEventListener('select', ()=> onSelect(c0));
    c1.addEventListener('select', ()=> onSelect(c1));
  }

  _intersectClickables(raycaster){
    const arr = Array.from(this.clickables);
    if (!arr.length) return [];
    // include children
    const targets = [];
    for (const o of arr) targets.push(o, ...o.children);
    return raycaster.intersectObjects(targets, true);
  }

  _findOnClick(obj){
    let o = obj;
    while (o){
      if (typeof o.userData?.onClick === 'function') return o.userData.onClick;
      o = o.parent;
    }
    return null;
  }

  // -------- Used by gamer tags (look dwell) ----------
  raycastPlayers(players){
    if (!players?.length) return null;
    this.raycaster.setFromCamera({x:0,y:0}, this.camera);
    const hits = this.raycaster.intersectObjects(players, true);
    return hits[0] || null;
  }

  // -------- Gamepad axis for VR movement ----------
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
