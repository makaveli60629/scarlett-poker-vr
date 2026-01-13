// /js/world.js — Scarlett MASTER WORLD v4.9.2 (Souped + Clean Lasers/Halo)
// ✅ One teleport halo only (unique name)
// ✅ Floors added in halls + rooms
// ✅ Door labels + wall “display panels”
// ✅ Bots and chairs face table properly
// ✅ Teleport works anywhere (global ground)
// ✅ Uses ctx.sticks for teleport button

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null,
    lobby:null,
    floorMain:null, floorPit:null, ground:null,
    ray:null,
    aimRing:null,
    _teleLatch:false,
    refs:{ stream:null }
  };

  const log = (...a)=>{ try{ S.log?.(...a);}catch{} };

  function ensureRoot(){
    const THREE=S.THREE;
    if(S.root && S.root.parent===S.scene) return S.root;
    const g=new THREE.Group(); g.name="WorldRoot";
    S.scene.add(g); S.root=g;
    return g;
  }

  function killByName(name){
    const o = S.scene.getObjectByName(name);
    if(o && o.parent) o.parent.remove(o);
  }

  function ensureAimRing(){
    const THREE=S.THREE;
    // ensure single ring
    const existing = S.scene.getObjectByName("TeleportAimRing");
    if(existing){ S.aimRing = existing; return; }

    const geo=new THREE.RingGeometry(0.22,0.32,128);
    const mat=new THREE.MeshBasicMaterial({ color:0x00ff7f, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    const ring=new THREE.Mesh(geo, mat);
    ring.name="TeleportAimRing";
    ring.rotation.x=-Math.PI/2;
    ring.visible=false;
    S.scene.add(ring);
    S.aimRing=ring;
  }

  function wallMat(){
    const THREE=S.THREE;
    const tex=new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy=16;
    return new THREE.MeshStandardMaterial({ map:tex, roughness:0.18, metalness:0.55, color:0xffffff, side:THREE.BackSide });
  }

  const matFloor = ()=> new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.92, metalness:0.05 });
  const matGold  = ()=> new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matFelt  = ()=> new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });
  const matHall  = ()=> new S.THREE.MeshStandardMaterial({ color:0x090a12, roughness:0.9, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55 });
  const matRoom  = ()=> new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.86, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55 });

  function dirFromYaw(yaw){
    const THREE=S.THREE;
    return new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  }

  function initStream(){
    const THREE=S.THREE;
    const video=document.createElement("video");
    video.crossOrigin="anonymous";
    video.playsInline=true;
    video.loop=true;
    video.preload="auto";
    video.muted=false;

    const url="https://hls.somafm.com/hls/groovesalad/128k/program.m3u8";
    const HlsGlobal=(typeof window!=="undefined")?window.Hls:undefined;
    if(HlsGlobal && HlsGlobal.isSupported && HlsGlobal.isSupported()){
      const hls=new HlsGlobal();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src=url;
    }

    const tex=new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    S.refs.stream = { video, texture: tex };
    return tex;
  }

  function addLabel(text, pos, yaw){
    const THREE=S.THREE;
    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=256;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="rgba(10,12,18,0.75)";
    ctx.fillRect(0,0,512,256);
    ctx.strokeStyle="rgba(127,231,255,0.55)";
    ctx.lineWidth=8;
    ctx.strokeRect(12,12,488,232);

    ctx.fillStyle="#e8ecff";
    ctx.font="bold 72px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(text, 256, 128);

    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7), mat);
    plane.position.copy(pos);
    plane.rotation.y = yaw + Math.PI;
    plane.position.y += 2.6;
    S.lobby.add(plane);
  }

  function addWallDisplays(lobbyRadius){
    const THREE=S.THREE;
    const dispMat=new THREE.MeshStandardMaterial({
      color:0x0d0f16,
      roughness:0.6,
      metalness:0.25,
      emissive:0x7fe7ff,
      emissiveIntensity:0.06
    });

    const geo=new THREE.PlaneGeometry(2.2,1.4);

    // 8 “frames” around the wall
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const p=new THREE.Vector3(Math.cos(a)*(lobbyRadius-0.25), 3.2, Math.sin(a)*(lobbyRadius-0.25));
      const m=new THREE.Mesh(geo, dispMat);
      m.position.copy(p);
      m.lookAt(0,3.2,0);
      S.lobby.add(m);
    }
  }

  function buildWorld(){
    const THREE=S.THREE;
    const root=ensureRoot();

    const old=root.getObjectByName("ScarlettLobbyWorld");
    if(old) root.remove(old);

    const W=new THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.lobby=W;

    // Lighting
    W.add(new THREE.AmbientLight(0xffffff, 0.18));
    const key=new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(7,14,5);
    W.add(key);

    const cyan=new THREE.PointLight(0x7fe7ff, 0.22, 60);
    cyan.position.set(0,6,0);
    W.add(cyan);

    const warm=new THREE.PointLight(0xffc890, 0.14, 50);
    warm.position.set(0,4.3,0);
    W.add(warm);

    // Dimensions
    const lobbyRadius=12.0, wallHeight=8.0, doorGap=THREE.MathUtils.degToRad(30);
    const pitRadius=4.2, pitDepth=0.85;

    const hallLen=10.0, hallW=4.2, hallH=4.8;
    const roomW=13.0, roomD=13.0, roomH=6.6;

    // Walls arcs (4 openings)
    const q=(Math.PI*2)/4;
    for(let i=0;i<4;i++){
      const thetaStart=i*q + doorGap/2;
      const thetaLen=q - doorGap;
      const geo=new THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 160, 1, true, thetaStart, thetaLen);
      const wall=new THREE.Mesh(geo, wallMat());
      wall.position.y=wallHeight/2;
      W.add(wall);
    }

    // Trim ring
    const trim=new THREE.Mesh(
      new THREE.TorusGeometry(lobbyRadius-0.05, 0.03, 12, 240),
      new THREE.MeshStandardMaterial({ color:0x111122, emissive:0x7fe7ff, emissiveIntensity:0.16, roughness:0.7, metalness:0.2 })
    );
    trim.rotation.x=Math.PI/2;
    trim.position.y=0.02;
    W.add(trim);

    // Floors
    const ring=new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 256), matFloor());
    ring.rotation.x=-Math.PI/2;
    W.add(ring);
    S.floorMain=ring;

    const pitFloor=new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 160), matFloor());
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-pitDepth;
    W.add(pitFloor);
    S.floorPit=pitFloor;

    // Global invisible ground
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 }));
    ground.rotation.x=-Math.PI/2;
    ground.position.y=0.0;
    ground.visible=false;
    W.add(ground);
    S.ground=ground;

    // Pit wall + rail
    const pitWall=new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 160, 1, true),
      new THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:THREE.DoubleSide })
    );
    pitWall.position.y=-pitDepth/2;
    W.add(pitWall);

    const rail=new THREE.Mesh(new THREE.TorusGeometry(pitRadius+0.25, 0.085, 16, 260), matGold());
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.95;
    W.add(rail);

    // Table group
    const table=new THREE.Group();
    table.name="CenterTable";
    table.position.set(0, -pitDepth + 0.02, 0);

    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.7,0.32,80),
      new THREE.MeshStandardMaterial({ color:0x0d0d14, roughness:0.65, metalness:0.18 })
    );
    base.position.y=0.16;
    table.add(base);

    const top=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,0.2,120), matFelt());
    top.position.y=0.42;
    table.add(top);

    const edge=new THREE.Mesh(new THREE.TorusGeometry(2.15,0.05,16,220), matGold());
    edge.rotation.x=Math.PI/2;
    edge.position.y=0.50;
    table.add(edge);

    // Chairs + bots facing center
    const seatMat=new THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.84, metalness:0.12 });
    const bodyMat=new THREE.MeshStandardMaterial({ color:0x181827, roughness:0.85, metalness:0.08 });
    const headMat=new THREE.MeshStandardMaterial({ color:0x232336, roughness:0.78, metalness:0.08 });

    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const r=3.05;

      const chair=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.8,0.58), seatMat);
      chair.position.set(Math.cos(a)*r, 0.40, Math.sin(a)*r);
      chair.lookAt(0,0.40,0);
      table.add(chair);

      const bot=new THREE.Group();
      bot.position.set(Math.cos(a)*(r+0.35), 0.02, Math.sin(a)*(r+0.35));
      bot.lookAt(0,0.02,0);

      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.16,0.45,6,12), bodyMat);
      body.position.y=0.60; bot.add(body);

      const head=new THREE.Mesh(new THREE.SphereGeometry(0.14,18,14), headMat);
      head.position.y=1.00; bot.add(head);

      table.add(bot);
    }

    // Cards
    const cardMat=new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.65, metalness:0.0, side:THREE.DoubleSide });
    for(let i=0;i<5;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.34), cardMat);
      c.rotation.x=-Math.PI/2;
      c.position.set((i-2)*0.28, 0.52, 0);
      table.add(c);
    }

    W.add(table);

    // Halls + rooms + floors + labels
    const defs=[
      { key:"north", yaw:0,            label:"POKER" },
      { key:"east",  yaw:Math.PI/2,    label:"STORE" },
      { key:"south", yaw:Math.PI,      label:"EVENT" },
      { key:"west",  yaw:-Math.PI/2,   label:"VIP" }
    ];

    for(const d of defs){
      const dir=dirFromYaw(d.yaw);
      const hallCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen/2);
      const roomCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD/2);

      // hall shell
      const hall=new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.position.set(hallCenter.x, hallH/2, hallCenter.z);
      hall.rotation.y=d.yaw;
      W.add(hall);

      // hall floor
      const hallFloor=new THREE.Mesh(new THREE.PlaneGeometry(hallW-0.2, hallLen-0.2), matFloor());
      hallFloor.rotation.x=-Math.PI/2;
      hallFloor.position.set(hallCenter.x, 0.01, hallCenter.z);
      hallFloor.rotation.y=d.yaw;
      W.add(hallFloor);

      // room shell
      const room=new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.position.set(roomCenter.x, roomH/2, roomCenter.z);
      room.rotation.y=d.yaw;
      W.add(room);

      // room floor
      const roomFloor=new THREE.Mesh(new THREE.PlaneGeometry(roomW-0.2, roomD-0.2), matFloor());
      roomFloor.rotation.x=-Math.PI/2;
      roomFloor.position.set(roomCenter.x, 0.01, roomCenter.z);
      roomFloor.rotation.y=d.yaw;
      W.add(roomFloor);

      // label at doorway
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      addLabel(d.label, doorPos, d.yaw);

      // neon doorway frame
      const door=new THREE.Mesh(
        new THREE.BoxGeometry(hallW+0.6, 3.2, 0.08),
        new THREE.MeshStandardMaterial({ color:0x0b0b16, emissive:0x7fe7ff, emissiveIntensity:0.18, roughness:0.6, metalness:0.2 })
      );
      door.position.set(doorPos.x, 2.10, doorPos.z);
      door.rotation.y=d.yaw;
      W.add(door);
    }

    // Wall displays/pictures
    addWallDisplays(lobbyRadius);

    // Jumbotrons (these are the “blue screens” = video texture)
    const streamTex=initStream();
    const jumboMat=new THREE.MeshStandardMaterial({ map:streamTex, emissive:0xffffff, emissiveIntensity:0.35, roughness:0.6, metalness:0.1, side:THREE.DoubleSide });
    const jumboGeo=new THREE.PlaneGeometry(7.8, 4.4);

    for(const d of defs){
      const dir=dirFromYaw(d.yaw);
      const doorPos=dir.clone().multiplyScalar(lobbyRadius - 0.15);
      const j=new THREE.Mesh(jumboGeo, jumboMat);
      j.position.set(doorPos.x*0.98, 5.85, doorPos.z*0.98);
      j.rotation.y=d.yaw + Math.PI;
      W.add(j);
    }

    // Spawn in lobby (no box trap)
    S.player.position.set(0,0.02,7.5);
    S.player.rotation.y = Math.PI;

    log("[world] built ✅ v4.9.2");
  }

  function rayFrom(obj){
    const THREE=S.THREE;
    obj.updateMatrixWorld(true);
    const pos=new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
    const rot=new THREE.Matrix4().extractRotation(obj.matrixWorld);
    const dir=new THREE.Vector3(0,0,-1).applyMatrix4(rot).normalize();
    return { pos, dir };
  }

  function pressedFromSticks(sticks){
    try{
      const a = sticks?.left?.gamepad?.buttons?.[0]?.pressed;
      const b = sticks?.right?.gamepad?.buttons?.[0]?.pressed;
      return !!(a || b);
    } catch { return false; }
  }

  function updateTeleport(sticks){
    if(!S.ray) return;
    ensureAimRing();

    const targets=[S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if(!targets.length) return;

    let best=null;

    // controller rays
    const cands=[];
    if(S.controllers?.[0]) cands.push(S.controllers[0]);
    if(S.controllers?.[1]) cands.push(S.controllers[1]);

    for(const c of cands){
      const {pos,dir}=rayFrom(c);
      S.ray.set(pos,dir);
      const hits=S.ray.intersectObjects(targets,false);
      if(hits.length && (!best || hits[0].distance < best.distance)) best=hits[0];
    }

    // camera fallback
    if(!best){
      S.camera.updateMatrixWorld(true);
      const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
      const camDir=new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();
      S.ray.set(camPos, camDir);
      const hits=S.ray.intersectObjects(targets,false);
      if(hits.length) best=hits[0];
    }

    if(!best){ S.aimRing.visible=false; S._teleLatch=false; return; }

    const p=best.point;
    S.aimRing.visible=true;
    S.aimRing.position.set(p.x, 0.01, p.z);

    const press = pressedFromSticks(sticks);
    if(press && !S._teleLatch){
      S._teleLatch=true;
      S.player.position.set(p.x,0.02,p.z);

      const v=S.refs.stream?.video;
      if(v && v.paused) v.play().catch(()=>{});
    }
    if(!press) S._teleLatch=false;
  }

  function updateAudio(){
    const v=S.refs.stream?.video;
    if(!v || !S.player) return;
    const dist=S.player.position.length();
    v.volume = Math.max(0, Math.min(1, 1 - dist/24));
  }

  return {
    async build(ctx){
      Object.assign(S, ctx);
      log("[world] build() start…");
      ensureRoot();
      S.ray = new S.THREE.Raycaster();
      killByName("TeleportAimRing"); // clean stale ring if any
      buildWorld();
      ensureAimRing();
      log("[world] build complete ✅");
    },
    frame(ctx, dt){
      updateTeleport(ctx?.sticks);
      updateAudio();
    }
  };
})();
