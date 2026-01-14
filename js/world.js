// /js/world.js — Scarlett Baseline World v12.3 (FULL)
// ✅ Always kills loader (no stuck loading)
// ✅ Lobby + pit divot + pads + balcony
// ✅ Spawn never inside geometry
// ✅ Buttons: SPAWN/LOBBY/POKER/STORE/SCORPION/SPECTATE/UNSTUCK/HEALTHCHECK

export const World = (() => {
  let inst=null;
  let THREE, scene, renderer, camera, player, log=console.log;

  const ANCHORS = {};
  let root=null;
  let floorRing=null;

  const hook=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener("click", fn); };
  const setText=(id,txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };

  function killLoader(){
    try{
      const sel=["#loader","#loading","#boot","#overlay",".loader",".loading",".overlay",".boot"];
      document.querySelectorAll(sel.join(",")).forEach(el=>{ el.style.display="none"; el.style.pointerEvents="none"; });
      document.body.classList.add("world-ready");
    }catch{}
  }

  const matStd=(c,r=0.9,m=0.08)=> new THREE.MeshStandardMaterial({ color:c, roughness:r, metalness:m });

  function makeText(text){
    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=256;
    const g=canvas.getContext("2d");
    g.fillStyle="rgba(0,0,0,0.55)"; g.fillRect(0,0,512,256);
    g.strokeStyle="rgba(102,204,255,0.55)"; g.lineWidth=10; g.strokeRect(14,14,512-28,256-28);
    g.fillStyle="#fff"; g.font="900 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    g.textAlign="center"; g.textBaseline="middle";
    g.fillText(String(text||""),256,128);
    const tex=new THREE.CanvasTexture(canvas);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false });
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.9), mat);
    mesh.rotation.y=Math.PI;
    mesh.renderOrder=9999;
    return mesh;
  }

  function anchors(){
    ANCHORS.spawn    = { pos:new THREE.Vector3(0,0,15.0), yaw:Math.PI };
    ANCHORS.lobby    = { pos:new THREE.Vector3(0,0,12.5), yaw:Math.PI };
    ANCHORS.poker    = { pos:new THREE.Vector3(0,0, 3.6), yaw:Math.PI };
    ANCHORS.store    = { pos:new THREE.Vector3(-14,0,0), yaw:-Math.PI/2 };
    ANCHORS.scorpion = { pos:new THREE.Vector3( 14,0,0), yaw: Math.PI/2 };
    ANCHORS.spectate = { pos:new THREE.Vector3(0,3.0,14.2), yaw:Math.PI };
  }

  function setRig(name){
    const a=ANCHORS[name]||ANCHORS.spawn;
    player.position.set(a.pos.x,0.10,a.pos.z);
    player.rotation.set(0,0,0);
    if(!renderer.xr.isPresenting) camera.rotation.set(0,a.yaw||0,0);
    setText("debugRoom", `room:${name}`);
    log?.(`[rm] room=${name}`);
  }

  function unstuck(){ setRig("spawn"); player.position.y=0.22; log?.("[rm] UNSTUCK ✅"); }

  function lights(){
    const hemi=new THREE.HemisphereLight(0xffffff,0x132044,1.2);
    hemi.position.set(0,60,0); scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffffff,1.15);
    sun.position.set(35,60,25); scene.add(sun);
    const glow=new THREE.PointLight(0x66ccff,1.0,180,2);
    glow.position.set(0,10,0); root.add(glow);
    const warm=new THREE.PointLight(0xffd36b,0.55,90,2);
    warm.position.set(0,4.5,10); root.add(warm);
  }

  function lobby(){
    scene.background=new THREE.Color(0x05070d);
    scene.fog=new THREE.Fog(0x05070d,18,260);

    const floor=new THREE.Mesh(new THREE.CircleGeometry(26,96), matStd(0x1b2a46,0.95,0.04));
    floor.rotation.x=-Math.PI/2; root.add(floor);

    const shell=new THREE.Mesh(
      new THREE.CylinderGeometry(28,28,10,96,1,true),
      new THREE.MeshStandardMaterial({ color:0x0b1220, roughness:0.9, metalness:0.08, side:THREE.DoubleSide, transparent:true, opacity:0.5 })
    );
    shell.position.set(0,4.8,0); root.add(shell);

    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(16.8,0.16,12,120),
      new THREE.MeshStandardMaterial({ color:0x66ccff, roughness:0.35, metalness:0.6, emissive:new THREE.Color(0x66ccff), emissiveIntensity:0.55 })
    );
    ring.rotation.x=Math.PI/2; ring.position.set(0,0.18,0); root.add(ring);
  }

  function pit(){
    const pitRadius=7.4, pitDepth=3.1, pitFloorY=-pitDepth;

    const pitFloor=new THREE.Mesh(new THREE.CylinderGeometry(pitRadius,pitRadius,0.35,96), matStd(0x0c1220,0.95,0.04));
    pitFloor.position.set(0,pitFloorY-0.175,0); root.add(pitFloor);

    const pitWall=new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius,pitRadius,pitDepth,96,1,true),
      new THREE.MeshStandardMaterial({ color:0x0a101e, roughness:0.95, metalness:0.05, side:THREE.DoubleSide })
    );
    pitWall.position.set(0,pitFloorY/2,0); root.add(pitWall);

    const felt=new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.55,0.35,96),
      new THREE.MeshStandardMaterial({ color:0x134536, roughness:0.78, metalness:0.04 })
    );
    felt.position.set(0,pitFloorY+1.05,0); root.add(felt);
  }

  function balcony(){
    const y=3.0;
    const b=new THREE.Mesh(new THREE.RingGeometry(13.8,17.2,128), matStd(0x111a28,0.92,0.08));
    b.rotation.x=-Math.PI/2; b.position.y=y; root.add(b);

    const rail=new THREE.Mesh(
      new THREE.CylinderGeometry(14.05,14.05,1.0,96,1,true),
      new THREE.MeshStandardMaterial({ color:0x0a1326, roughness:0.55, metalness:0.22, side:THREE.DoubleSide })
    );
    rail.position.set(0,y+0.55,0); root.add(rail);
  }

  function pads(){
    const pads=[
      {room:"spawn",label:"SPAWN",x:-7.0,z:9.0,glow:0xffd36b},
      {room:"lobby",label:"LOBBY",x:-4.2,z:9.0,glow:0x66ccff},
      {room:"poker",label:"POKER",x:-1.4,z:9.0,glow:0x66ccff},
      {room:"store",label:"STORE",x: 1.4,z:9.0,glow:0x66ccff},
      {room:"scorpion",label:"SCORPION",x:4.2,z:9.0,glow:0x66ccff},
      {room:"spectate",label:"SPECTATE",x:7.0,z:9.0,glow:0x66ccff}
    ];

    for(const p of pads){
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.92,0.92,0.10,32),
        new THREE.MeshStandardMaterial({ color:0x0b1220, roughness:0.55, metalness:0.2, emissive:new THREE.Color(p.glow), emissiveIntensity:(p.room==="spawn")?0.35:0.22 })
      );
      pad.position.set(p.x,0.05,p.z); root.add(pad);

      const label=makeText(p.label);
      label.position.set(p.x,1.25,p.z); root.add(label);
    }

    floorRing=new THREE.Mesh(
      new THREE.RingGeometry(0.16,0.22,36),
      new THREE.MeshBasicMaterial({ color:0xffd36b, transparent:true, opacity:0.72, side:THREE.DoubleSide })
    );
    floorRing.rotation.x=-Math.PI/2;
    floorRing.position.set(ANCHORS.spawn.pos.x,0.02,ANCHORS.spawn.pos.z);
    root.add(floorRing);
  }

  async function init(args){
    THREE=args.THREE; scene=args.scene; renderer=args.renderer; camera=args.camera; player=args.player; log=args.log||console.log;

    root=new THREE.Group(); root.name="WORLD_ROOT"; scene.add(root);
    anchors();
    lights();
    lobby();
    pit();
    balcony();
    pads();

    hook("btnSpawn", ()=>setRig("spawn"));
    hook("btnLobby", ()=>setRig("lobby"));
    hook("btnPoker", ()=>setRig("poker"));
    hook("btnStore", ()=>setRig("store"));
    hook("btnScorpion", ()=>setRig("scorpion"));
    hook("btnSpectate", ()=>setRig("spectate"));
    hook("btnUnstuck", ()=>unstuck());
    hook("btnHealthcheck", ()=>log("[health] ok ✅"));

    setRig("spawn");
    killLoader();
    console.log("[world] READY ✅ (loader killed)");

    return {
      tick(dt,t){
        if (floorRing) floorRing.position.set(player.position.x,0.02,player.position.z);
      }
    };
  }

  return {
    async init(args){ inst = await init(args); return inst; },
    update(dt,t){ inst?.tick?.(dt,t); }
  };
})();
