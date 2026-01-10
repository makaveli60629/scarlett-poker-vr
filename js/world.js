export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    raycaster: null,
    tmpMat: null,
    lasers: [],
    clickables: [],
    hovered: null,

    teleport: { aiming:false, marker:null, arc:null, hit:null, lastValid:false, cooldown:0 },
    move: { speed:2.0, snap:Math.PI/6, snapCooldown:0 },

    poker: { bots:[], t:0 },
    ready:false
  };

  async function init(ctx){
    ({ THREE, scene, renderer, camera, player, controllers, log } = ctx);
    log("✅ LOADER SIGNATURE: WORLD.JS (NO-FALLBACK) ACTIVE");

    state.raycaster = new THREE.Raycaster();
    state.tmpMat = new THREE.Matrix4();

    addLights();
    buildRoom();
    buildPoker();
    buildLasers();
    buildTeleport();
    wireControllerEvents();
    forceSpawn();

    state.ready = true;
    log("ready ✅");
  }

  function addLights(){
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6,10,4);
    scene.add(key);
    const fill = new THREE.PointLight(0x88ccff, 0.8, 30);
    fill.position.set(-6,3,-6);
    scene.add(fill);
    const warm = new THREE.PointLight(0xff88cc, 0.55, 30);
    warm.position.set(6,3,-6);
    scene.add(warm);
  }

  function buildRoom(){
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18,64),
      new THREE.MeshStandardMaterial({ color:0x111218, roughness:0.95 })
    );
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(18,18,6,64,1,true),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.9 })
    );
    walls.position.y = 3;
    scene.add(walls);
  }

  function buildPoker(){
    const table = new THREE.Group();
    table.position.set(0,0,-2);
    scene.add(table);

    const felt = new THREE.Mesh(
      new THREE.CapsuleGeometry(2.1,1.2,8,28),
      new THREE.MeshStandardMaterial({ color:0x0e5a3a, roughness:0.9 })
    );
    felt.rotation.x = Math.PI/2;
    felt.position.y = 1.02;
    table.add(felt);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.35,0.18,18,96),
      new THREE.MeshStandardMaterial({ color:0x241c16, roughness:0.8, metalness:0.1 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = 1.03;
    table.add(rail);

    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45,0.6,1.0,28),
      new THREE.MeshStandardMaterial({ color:0x101019, roughness:0.8, metalness:0.2 })
    );
    ped.position.y = 0.5;
    table.add(ped);

    const botCount = 8;
    const radius = 2.95;

    for(let i=0;i<botCount;i++){
      const ang = (i/botCount)*Math.PI*2;
      const bot = makeBot(i);
      bot.position.set(Math.cos(ang)*(radius-0.35), 0, -2 + Math.sin(ang)*(radius-0.35));
      bot.lookAt(0,1.3,-2);
      scene.add(bot);
      state.poker.bots.push(bot);
    }

    const btn = makeButton("START HAND");
    btn.position.set(0,1.2,1.0);
    btn.userData.onClick = () => {
      log("START HAND clicked ✅");
      felt.material.color.setHex(0x138a56);
      setTimeout(()=>felt.material.color.setHex(0x0e5a3a),180);
    };
    scene.add(btn);
    state.clickables.push(btn);
  }

  function makeBot(i){
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16,0.65,6,14),
      new THREE.MeshStandardMaterial({ color:0x1b1c26, roughness:0.9 })
    );
    body.position.y = 1.05; g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14,22,22),
      new THREE.MeshStandardMaterial({ color:0x222433, roughness:0.65 })
    );
    head.position.y = 1.55; g.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color:0x7fe7ff });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.015,10,10), eyeMat);
    e1.position.set(0.05,1.56,0.13);
    const e2 = e1.clone(); e2.position.x = -0.05;
    g.add(e1,e2);
    return g;
  }

  function makeButton(label){
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.9,0.12,0.22),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.6, metalness:0.2, emissive:0x000000 })
    );
    base.position.y = 0.06; g.add(base);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.86,0.05,0.20),
      new THREE.MeshStandardMaterial({ color:0xff2d7a, roughness:0.4, metalness:0.1, emissive:0x1a0010 })
    );
    top.position.y = 0.12; g.add(top);

    g.userData.onClick = () => {};
    return g;
  }

  function buildLasers(){
    for(const c of controllers){
      const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
      const mat = new THREE.LineBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      c.add(line);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012,16,16),
        new THREE.MeshBasicMaterial({ color:0xff2d7a })
      );
      dot.visible = false;
      scene.add(dot);

      state.lasers.push({ controller:c, line, dot });
    }
    log("lasers ready ✅");
  }

  function buildTeleport(){
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25,0.38,48),
      new THREE.MeshBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.85 })
    );
    marker.rotation.x = -Math.PI/2;
    marker.visible = false;
    scene.add(marker);
    state.teleport.marker = marker;

    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3*40), 3));
    const arc = new THREE.Line(arcGeom, new THREE.LineBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.65 }));
    arc.visible = false;
    scene.add(arc);
    state.teleport.arc = arc;

    log("teleport ready ✅");
  }

  function wireControllerEvents(){
    for(const c of controllers){
      c.addEventListener("selectstart", () => {
        if (state.teleport.aiming && state.teleport.lastValid && state.teleport.cooldown <= 0) {
          doTeleport();
          state.teleport.cooldown = 0.25;
          return;
        }
        clickRay(c);
      });

      c.addEventListener("squeezestart", () => { state.teleport.aiming = true; });
      c.addEventListener("squeezeend", () => {
        state.teleport.aiming = false;
        state.teleport.marker.visible = false;
        state.teleport.arc.visible = false;
        state.teleport.lastValid = false;
      });
    }
  }

  function forceSpawn(){
    player.position.set(0,0,4.0);
    player.rotation.set(0,0,0);
    log("spawn forced ✅ pos=(0,0,4)");
  }

  function update(dt){
    if(!state.ready) return;
    state.move.snapCooldown = Math.max(0, state.move.snapCooldown - dt);
    state.teleport.cooldown = Math.max(0, state.teleport.cooldown - dt);

    locomotion(dt);
    updateRays();

    if(state.teleport.aiming) updateTeleportAim();

    state.poker.t += dt;
    for(let i=0;i<state.poker.bots.length;i++){
      const b = state.poker.bots[i];
      b.position.y = 0.02 * Math.sin(state.poker.t*1.2 + i);
    }
  }

  function locomotion(dt){
    const left = controllers[0];
    const right = controllers[1];
    const la = left?.userData?.axes || [0,0,0,0];
    const ra = right?.userData?.axes || [0,0,0,0];

    const mx = la[2] ?? la[0] ?? 0;
    const my = la[3] ?? la[1] ?? 0;

    const dead = 0.15;
    const ax = Math.abs(mx)>dead ? mx : 0;
    const ay = Math.abs(my)>dead ? my : 0;

    if(ax || ay){
      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion); forward.y=0; forward.normalize();
      const rightV  = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion); rightV.y=0; rightV.normalize();
      const v = new THREE.Vector3().addScaledVector(rightV, ax).addScaledVector(forward, ay).normalize();
      player.position.addScaledVector(v, dt*state.move.speed);
    }

    const turnX = ra[2] ?? ra[0] ?? 0;
    if(state.move.snapCooldown<=0 && Math.abs(turnX)>0.65){
      player.rotation.y -= Math.sign(turnX) * state.move.snap;
      state.move.snapCooldown = 0.28;
    }
  }

  function updateRays(){
    const objs = state.clickables;

    for(const laser of state.lasers){
      const c = laser.controller;

      state.tmpMat.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0,0,-1).applyMatrix4(state.tmpMat).normalize();

      state.raycaster.set(origin, dir);
      state.raycaster.far = 20;

      const hits = state.raycaster.intersectObjects(objs, true);
      if(hits.length){
        const h = hits[0];
        laser.dot.visible = true;
        laser.dot.position.copy(h.point);
        laser.line.scale.z = origin.distanceTo(h.point);
      } else {
        laser.dot.visible = false;
        laser.line.scale.z = 10;
      }
    }
  }

  function clickRay(controller){
    const objs = state.clickables;

    state.tmpMat.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(state.tmpMat).normalize();

    state.raycaster.set(origin, dir);
    state.raycaster.far = 20;

    const hits = state.raycaster.intersectObjects(objs, true);
    if(!hits.length) return;

    let o = hits[0].object;
    while(o && !o.userData?.onClick && o.parent) o = o.parent;

    if(o?.userData?.onClick) o.userData.onClick();
  }

  function updateTeleportAim(){
    const c = controllers[1] || controllers[0];
    if(!c) return;

    state.tmpMat.identity().extractRotation(c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const forward = new THREE.Vector3(0,0,-1).applyMatrix4(state.tmpMat).normalize();

    const g = new THREE.Vector3(0,-9.8,0);
    const v0 = forward.clone().multiplyScalar(7.5);

    const pts = [];
    let last = origin.clone();
    let hit = null;

    for(let i=0;i<40;i++){
      const t = i*0.04;
      const p = origin.clone().add(v0.clone().multiplyScalar(t)).add(g.clone().multiplyScalar(0.5*t*t));
      pts.push(p);
      if(p.y <= 0.02){ hit = p.clone(); hit.y = 0.01; break; }
      last = p;
    }

    const arc = state.teleport.arc;
    const pos = arc.geometry.attributes.position.array;
    for(let i=0;i<40;i++){
      const p = pts[Math.min(i, pts.length-1)] || last;
      pos[i*3+0]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
    }
    arc.geometry.attributes.position.needsUpdate = true;
    arc.visible = true;

    if(hit){
      state.teleport.marker.position.copy(hit);
      state.teleport.marker.visible = true;
      state.teleport.hit = hit;
      state.teleport.lastValid = true;
    } else {
      state.teleport.marker.visible = false;
      state.teleport.hit = null;
      state.teleport.lastValid = false;
    }
  }

  function doTeleport(){
    const p = state.teleport.hit;
    if(!p) return;
    player.position.set(p.x,0,p.z);
    log("teleported ✅", p.x.toFixed(2), p.z.toFixed(2));
  }

  return { init, update };
})();
