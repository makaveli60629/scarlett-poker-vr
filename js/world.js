// /js/world.js — Scarlett MASTER WORLD v5.4 (FULL)
// ✅ Real playing cards (rank+suit drawn to CanvasTexture)
// ✅ Community + Hole cards show actual card identities
// ✅ HUD includes Turn + Last Action + Amounts (call/raise)
// ✅ Storefront returned + extra signage + better lighting
// ✅ Teleport ring stabilized + clamp safe
// ✅ A/X teleport only (no trigger/grip teleport)

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null, lobby:null,
    floorMain:null, floorPit:null, ground:null,
    ray:null, aimRing:null, _teleLatch:false,
    refs:{ stream:null, jumbotrons:[] },
    rooms:{},
    bots:{ seated:[], guard:null },
    poker:{
      t:0, phase:"deal", hand:0, pot:0,
      table:null, community:[], communityIds:[],
      potStack:null,
      hud:null, winner:"", winText:"",
      actionTile:null,
      chipKit:null,
      activeIdx:0,
      lastAction:"", lastAmount:0,
      minCall:10,
      turnName:""
    },
    audio:{ muted:false },
    tp:null,
    dust:{ points:null },
    cardTexCache:new Map() // key => CanvasTexture
  };

  const log=(...a)=>{ try{S.log?.(...a);}catch{} };

  // ----------------- helpers -----------------
  function ensureRoot(){
    const THREE=S.THREE;
    if(S.root && S.root.parent===S.scene) return S.root;
    S.root=new THREE.Group(); S.root.name="WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }
  function dirFromYaw(yaw){ return new S.THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  // ----------------- materials -----------------
  function wallMat(){
    const THREE=S.THREE;
    const tex=new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS=THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy=16;
    return new THREE.MeshStandardMaterial({
      map:tex, roughness:0.16, metalness:0.55, color:0xffffff,
      side:THREE.BackSide
    });
  }
  const matFloor=()=>new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.92, metalness:0.05 });
  const matGold =()=>new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matFelt =()=>new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });
  const matDark =()=>new S.THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:S.THREE.DoubleSide });
  const matHall =()=>new S.THREE.MeshStandardMaterial({ color:0x090a12, roughness:0.9, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });
  const matRoom =()=>new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.86, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });

  // ----------------- text canvases -----------------
  function makeCanvasTex(lines, big=false){
    const THREE=S.THREE;
    const canvas=document.createElement("canvas");
    canvas.width=1024; canvas.height=512;
    const ctx=canvas.getContext("2d");

    ctx.fillStyle="rgba(8,10,16,0.78)";
    ctx.fillRect(0,0,1024,512);

    ctx.strokeStyle="rgba(127,231,255,0.65)";
    ctx.lineWidth=10;
    ctx.strokeRect(18,18,988,476);

    ctx.strokeStyle="rgba(212,175,55,0.35)";
    ctx.lineWidth=6;
    ctx.strokeRect(28,28,968,456);

    ctx.fillStyle="#e8ecff";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font = big ? "bold 96px system-ui,Segoe UI,Roboto,Arial" : "bold 82px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[0]||"", 512, 175);

    ctx.font = "700 58px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillStyle="rgba(232,236,255,0.92)";
    ctx.fillText(lines[1]||"", 512, 300);

    ctx.font = "600 46px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillStyle="rgba(152,160,199,0.95)";
    ctx.fillText(lines[2]||"", 512, 410);

    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }

  function addDoorLabel(text, pos, yaw){
    const THREE=S.THREE;
    const tex=makeCanvasTex([text,"ENTER",""], true);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.96, side:THREE.DoubleSide });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.8), mat);
    plane.position.copy(pos);
    plane.position.y += 2.75;
    plane.rotation.y = yaw + Math.PI;
    S.lobby.add(plane);
  }

  function addSign(text1, text2, pos, yaw, scale=1){
    const tex=makeCanvasTex([text1, text2||"", ""], true);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(4.4*scale, 2.2*scale), mat);
    plane.position.copy(pos);
    plane.rotation.y = yaw;
    plane.renderOrder=9999;
    S.lobby.add(plane);
    return plane;
  }

  function addNameTag(parent, name){
    const tex=makeCanvasTex([name,"",""], false);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.92, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(1.35,0.66), mat);
    plane.position.set(0, 1.45, 0);
    plane.userData._tag = true;
    plane.renderOrder = 9999;
    parent.add(plane);
    return plane;
  }

  // ----------------- CARD TEXTURES (rank/suit) -----------------
  const SUITS = ["♠","♥","♦","♣"];
  const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  function cardKey(rank, suit){ return `${rank}${suit}`; }

  function makeCardTexture(rank, suit){
    const THREE=S.THREE;
    const key=cardKey(rank, suit);
    if(S.cardTexCache.has(key)) return S.cardTexCache.get(key);

    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=768;
    const ctx=canvas.getContext("2d");

    // base
    ctx.fillStyle="#f7f7fb";
    ctx.fillRect(0,0,512,768);

    // border
    ctx.strokeStyle="rgba(0,0,0,0.25)";
    ctx.lineWidth=10;
    ctx.strokeRect(14,14,484,740);

    // inner gold accent
    ctx.strokeStyle="rgba(212,175,55,0.55)";
    ctx.lineWidth=6;
    ctx.strokeRect(28,28,456,712);

    const red = (suit==="♥" || suit==="♦");
    const ink = red ? "#d3173a" : "#10131c";

    // corner text
    ctx.fillStyle=ink;
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.font="900 82px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 44, 40);
    ctx.font="900 88px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit, 44, 130);

    // mirrored corner
    ctx.save();
    ctx.translate(512,768);
    ctx.rotate(Math.PI);
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.font="900 82px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 44, 40);
    ctx.font="900 88px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit, 44, 130);
    ctx.restore();

    // center suit
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font="900 260px system-ui,Segoe UI,Roboto,Arial";
    ctx.globalAlpha=0.88;
    ctx.fillText(suit, 256, 396);
    ctx.globalAlpha=1;

    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    S.cardTexCache.set(key, tex);
    return tex;
  }

  function makeCardMaterials(rank, suit){
    const tex = makeCardTexture(rank, suit);
    const backTex = makeCardBackTexture();
    const THREE=S.THREE;

    const front = new THREE.MeshStandardMaterial({
      map:tex, roughness:0.55, metalness:0.0, side:THREE.DoubleSide
    });
    const back = new THREE.MeshStandardMaterial({
      map:backTex, roughness:0.6, metalness:0.05, side:THREE.DoubleSide
    });

    // We’ll apply “front” only for simplicity (DoubleSide shows both).
    // If later you want true front/back, we can use an array material + UV layout.
    return { front, back };
  }

  function makeCardBackTexture(){
    const THREE=S.THREE;
    if(S.cardTexCache.has("__BACK__")) return S.cardTexCache.get("__BACK__");

    const c=document.createElement("canvas");
    c.width=512; c.height=768;
    const ctx=c.getContext("2d");

    ctx.fillStyle="#0b0d14";
    ctx.fillRect(0,0,512,768);

    // neon lattice
    ctx.strokeStyle="rgba(127,231,255,0.35)";
    ctx.lineWidth=6;
    for(let y=40;y<768;y+=70){
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(472,y); ctx.stroke();
    }
    for(let x=40;x<512;x+=70){
      ctx.beginPath(); ctx.moveTo(x,40); ctx.lineTo(x,728); ctx.stroke();
    }

    // gold border
    ctx.strokeStyle="rgba(212,175,55,0.65)";
    ctx.lineWidth=10;
    ctx.strokeRect(16,16,480,736);

    ctx.fillStyle="rgba(127,231,255,0.55)";
    ctx.font="900 92px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("SCARLETT", 256, 370);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    S.cardTexCache.set("__BACK__", tex);
    return tex;
  }

  // Make a random card id like {r:"K", s:"♦"}
  function randCard(){
    const r = RANKS[Math.floor(Math.random()*RANKS.length)];
    const s = SUITS[Math.floor(Math.random()*SUITS.length)];
    return { r, s };
  }

  // ----------------- stream (music + jumbotrons) -----------------
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

  // ----------------- teleport -----------------
  function ensureAimRing(){
    const THREE=S.THREE;
    const existing=S.scene.getObjectByName("TeleportAimRing");
    if(existing){ S.aimRing=existing; return; }

    const geo=new THREE.RingGeometry(0.22,0.32,160);
    const mat=new THREE.MeshBasicMaterial({
      color:0x00ff7f,
      transparent:true,
      opacity:0.95,
      side:THREE.DoubleSide,
      depthTest:false
    });

    const ring=new THREE.Mesh(geo, mat);
    ring.name="TeleportAimRing";
    ring.rotation.x=-Math.PI/2;
    ring.visible=false;
    ring.renderOrder=9999;
    S.scene.add(ring);
    S.aimRing=ring;
  }

  // A/X only (no trigger/grip)
  function teleportPressed(ctx){
    try{
      const lgp = ctx?.pads?.lgp;
      const rgp = ctx?.pads?.rgp;
      const pressedAX=(gp)=>!!gp?.buttons?.[0]?.pressed;
      return pressedAX(lgp) || pressedAX(rgp);
    } catch { return false; }
  }

  function updateTeleport(ctx, dt){
    if(!S.ray) return;
    ensureAimRing();

    if (S.tp.cooldown > 0) S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    const targets=[S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if(!targets.length) return;

    S.camera.updateMatrixWorld(true);
    const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir = new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();

    camDir.y *= 0.15;
    camDir.normalize();

    S.ray.set(camPos, camDir);
    const hits = S.ray.intersectObjects(targets, false);

    if(!hits.length){
      S.aimRing.visible=false;
      S._teleLatch=false;
      return;
    }

    const p = hits[0].point;
    p.y = 0.01;

    const alpha = 1 - Math.pow(0.0008, dt);
    S.tp.smooth.lerp(p, alpha);

    const dead=0.02;
    if(S.tp.smooth.distanceTo(S.tp.lastValid) > dead){
      S.tp.lastValid.copy(S.tp.smooth);
    }

    S.aimRing.visible=true;
    S.aimRing.position.copy(S.tp.lastValid);

    const press = teleportPressed(ctx);
    if(press && !S._teleLatch && S.tp.cooldown === 0){
      S._teleLatch = true;
      S.tp.cooldown = 0.25;

      const dest = S.tp.lastValid;

      const clampR = 26;
      const r = Math.hypot(dest.x, dest.z);
      if(!Number.isFinite(r) || r > clampR){
        log("[tp] blocked invalid dest", dest.x, dest.z);
        S._teleLatch = false;
        return;
      }

      S.player.position.set(dest.x, 0.02, dest.z);

      const v=S.refs.stream?.video;
      if(v && v.paused && !S.audio.muted) v.play().catch(()=>{});
    }
    if(!press) S._teleLatch=false;
  }

  function updateAudio(){
    const v=S.refs.stream?.video;
    if(!v) return;
    v.muted = !!S.audio.muted;
    if(S.audio.muted) return;
    const dist=S.player.position.length();
    v.volume = Math.max(0, Math.min(1, 1 - dist/24));
  }

  // ----------------- ambience / beauty -----------------
  function buildVelvetGoldRibs(root, radius, height){
    const THREE=S.THREE;
    const velvet = new THREE.MeshStandardMaterial({
      color:0x060612, roughness:0.95, metalness:0.1,
      emissive:0x05060a, emissiveIntensity:0.55
    });
    const gold = matGold();

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(radius+0.06, radius+0.06, height, 120, 1, true), velvet);
    inner.position.y = height/2;
    root.add(inner);

    for(let i=0;i<28;i++){
      const a=(i/28)*Math.PI*2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, height*0.92, 0.12), gold);
      rib.position.set(Math.cos(a)*(radius+0.02), height/2, Math.sin(a)*(radius+0.02));
      rib.lookAt(0, height/2, 0);
      root.add(rib);
    }
  }

  function buildDust(root){
    const THREE=S.THREE;
    const count=700;
    const geo=new THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      arr[i*3+0] = (Math.random()-0.5)*24;
      arr[i*3+1] = 0.6 + Math.random()*7.0;
      arr[i*3+2] = (Math.random()-0.5)*24;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr,3));
    const mat=new THREE.PointsMaterial({ size:0.03, transparent:true, opacity:0.32 });
    const pts=new THREE.Points(geo, mat);
    pts.name="DustMotes";
    root.add(pts);
    S.dust.points = pts;
  }

  function updateDust(dt){
    const pts=S.dust.points;
    if(!pts) return;
    pts.rotation.y += dt*0.05;
  }

  function buildNeonRail(root, radius){
    const THREE=S.THREE;
    const railMat=new THREE.MeshStandardMaterial({
      color:0x1a1b25, roughness:0.35, metalness:0.75,
      emissive:0x00ff7f, emissiveIntensity:0.28
    });
    const rail=new THREE.Mesh(new THREE.TorusGeometry(radius, 0.095, 18, 280), railMat);
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.95;
    root.add(rail);

    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2;
      const p=new THREE.PointLight(0x00ff7f, 0.09, 3.0);
      p.position.set(Math.cos(a)*radius, 0.95, Math.sin(a)*radius);
      root.add(p);
    }
  }

  function buildStairs(root, startZ, steps, totalDrop, width){
    const THREE=S.THREE;
    const g=new THREE.Group(); g.name="PitStairs";
    const mat=new THREE.MeshStandardMaterial({ color:0x141622, roughness:0.9, metalness:0.12 });

    for(let i=0;i<steps;i++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.85), mat);
      const y = 0.07 - (totalDrop/(steps-1))*i;
      step.position.set(0, y, startZ - 0.85*i);
      g.add(step);
    }
    root.add(g);
    return g;
  }

  // ----------------- table + hud -----------------
  function buildTable(root, y){
    const THREE=S.THREE;
    const table=new THREE.Group();
    table.name="CenterTable";
    table.position.set(0,y,0);

    const base=new THREE.Mesh(
      new THREE.CylinderGeometry(1.5,1.85,0.34,96),
      new THREE.MeshStandardMaterial({ color:0x0d0d14, roughness:0.65, metalness:0.22 })
    );
    base.position.y=0.16;
    table.add(base);

    const top=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,0.22,140), matFelt());
    top.position.y=0.44;
    table.add(top);

    const edge=new THREE.Mesh(new THREE.TorusGeometry(2.55,0.06,16,260), matGold());
    edge.rotation.x=Math.PI/2;
    edge.position.y=0.54;
    table.add(edge);

    root.add(table);
    return table;
  }

  function buildPokerHUD(root){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="PokerHUD";
    g.position.set(0, 3.65, -1.6);

    const tex=makeCanvasTex(["POT: 0","TURN: —","ACTION: —"], false);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.DoubleSide, depthTest:false });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.75), mat);
    plane.renderOrder=9999;
    g.add(plane);

    root.add(g);
    S.poker.hud = { group:g, plane };
  }

  function updatePokerHUD(){
    const hud=S.poker.hud;
    if(!hud) return;

    const turn = S.poker.turnName || "—";
    const act = S.poker.lastAction ? `${S.poker.lastAction}${S.poker.lastAmount?` ${S.poker.lastAmount}`:""}` : "—";

    const lines = [
      `POT: ${S.poker.pot}`,
      `TURN: ${turn}`,
      `ACTION: ${act}`
    ];

    const newTex = makeCanvasTex(lines, false);
    hud.plane.material.map?.dispose?.();
    hud.plane.material.map = newTex;
    hud.plane.material.needsUpdate = true;
  }

  // ----------------- bots + name tags -----------------
  function buildSeatedBots(table){
    const THREE=S.THREE;
    const seatMat=new THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.84, metalness:0.12 });
    const bodyMat=new THREE.MeshStandardMaterial({ color:0x181827, roughness:0.85, metalness:0.08 });
    const headMat=new THREE.MeshStandardMaterial({ color:0x232336, roughness:0.78, metalness:0.08 });
    const handMat=new THREE.MeshStandardMaterial({ color:0x2b2b40, roughness:0.7, metalness:0.1 });

    const names=["Kabwe","Zola","Mya","Tasha","Rafi","Nina","Jett","Omar"];
    const seated=[];
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const r=3.35;

      const chair=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.86,0.62), seatMat);
      chair.position.set(Math.cos(a)*r, 0.43, Math.sin(a)*r);
      chair.lookAt(0,0.43,0);
      table.add(chair);

      const bot=new THREE.Group();
      bot.name=`SeatedBot_${names[i]}`;
      bot.position.set(Math.cos(a)*(r+0.38), 0.02, Math.sin(a)*(r+0.38));
      bot.lookAt(0,0.02,0);

      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.5,6,12), bodyMat);
      body.position.y=0.68; bot.add(body);

      const head=new THREE.Mesh(new THREE.SphereGeometry(0.16,18,14), headMat);
      head.position.y=1.14; bot.add(head);

      const hL=new THREE.Mesh(new THREE.SphereGeometry(0.055,14,12), handMat);
      const hR=new THREE.Mesh(new THREE.SphereGeometry(0.055,14,12), handMat);
      hL.position.set(-0.14, 0.70, -0.22);
      hR.position.set( 0.14, 0.70, -0.22);
      bot.add(hL); bot.add(hR);

      addNameTag(bot, names[i]);
      table.add(bot);

      seated.push({
        name:names[i],
        group:bot,
        seatAngle:a,
        chips:[],
        hole:[],
        holeIds:[]
      });
    }
    S.bots.seated = seated;
  }

  function setActivePlayer(idx){
    for(let i=0;i<S.bots.seated.length;i++){
      const bot = S.bots.seated[i].group;
      bot.traverse((o)=>{
        if(o.userData?._tag){
          o.material.opacity = (i===idx) ? 1.0 : 0.90;
        }
      });
      bot.userData.active = (i===idx);
    }
    S.poker.activeIdx = idx;
    S.poker.turnName = S.bots.seated[idx]?.name || "—";
  }

  // ----------------- action tile -----------------
  function ensureActionTile(){
    if(S.poker.actionTile) return;
    const tex = makeCanvasTex(["YOUR TURN","CHECK / BET / RAISE",""], true);
    const mat = new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:S.THREE.DoubleSide, depthTest:false });
    const plane = new S.THREE.Mesh(new S.THREE.PlaneGeometry(1.8, 0.9), mat);
    plane.renderOrder = 9999;
    plane.visible = false;
    S.lobby.add(plane);
    S.poker.actionTile = plane;
  }

  function updateActionTile(activeIdx){
    ensureActionTile();
    const b = S.bots.seated[activeIdx];
    if(!b) { S.poker.actionTile.visible=false; return; }

    const p = b.group.getWorldPosition(new S.THREE.Vector3());
    S.poker.actionTile.position.set(p.x*0.78, 1.05, p.z*0.78);

    const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    S.poker.actionTile.lookAt(camPos.x, S.poker.actionTile.position.y, camPos.z);
    S.poker.actionTile.visible = true;
  }

  // ----------------- chips -----------------
  function buildChipKit(){
    const THREE=S.THREE;
    const chipGeo=new THREE.CylinderGeometry(0.06,0.06,0.018,28);
    const mats=[
      new THREE.MeshStandardMaterial({ color:0xff2d7a, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0x00ff7f, roughness:0.35, metalness:0.2 }),
    ];
    return { chipGeo, mats };
  }

  function spawnChipMover(fromBot, amount){
    const { chipGeo, mats } = S.poker.chipKit;
    const chip = new S.THREE.Mesh(chipGeo, mats[Math.floor(Math.random()*mats.length)]);
    chip.rotation.x = Math.PI/2;

    const a=fromBot.seatAngle;
    chip.position.set(Math.cos(a)*2.5, -0.95 + 1.03, Math.sin(a)*2.5);

    chip.userData.mode="toPot";
    chip.userData.t=0;
    chip.userData.from = chip.position.clone();
    chip.userData.to = new S.THREE.Vector3(0, -0.95 + 1.03, 0);
    chip.userData.amount = amount;

    S.lobby.add(chip);
    fromBot.chips.push(chip);
    return chip;
  }

  function addChipToPotStack(){
    const { chipGeo, mats } = S.poker.chipKit;
    const chip = new S.THREE.Mesh(chipGeo, mats[Math.floor(Math.random()*mats.length)]);
    chip.rotation.x = Math.PI/2;
    const k = S.poker.potStack.children.length;
    chip.position.set(0, k*0.02, 0);
    S.poker.potStack.add(chip);
  }

  function updateChipAnimations(dt){
    for(const b of S.bots.seated){
      for(const chip of b.chips){
        chip.userData.t += dt;
        const t = Math.min(1, chip.userData.t * 1.35);
        chip.position.lerpVectors(chip.userData.from, chip.userData.to, t);
        chip.rotation.x = Math.PI/2;

        if(t>=1 && chip.userData.mode==="toPot"){
          const amt = chip.userData.amount || 10;
          if(chip.parent) chip.parent.remove(chip);
          chip.userData.mode="done";
          S.poker.pot += amt;
          addChipToPotStack();
          updatePokerHUD();
        }
      }
      b.chips = b.chips.filter(c=>c.userData.mode!=="done");
    }
  }

  // ----------------- cards placement -----------------
  function clearHand(){
    for(const c of S.poker.community) c.visible=false;
    S.poker.communityIds = [];

    for(const b of S.bots.seated){
      for(const card of b.hole){ if(card.parent) card.parent.remove(card); }
      b.hole.length=0;
      b.holeIds = [];

      for(const chip of b.chips){ if(chip.parent) chip.parent.remove(chip); }
      b.chips.length=0;
    }

    const pot=S.poker.potStack;
    if(pot){
      while(pot.children.length) pot.remove(pot.children[0]);
      pot.position.set(0, -0.95 + 0.56, 0);
    }

    S.poker.pot=0;
    S.poker.lastAction="";
    S.poker.lastAmount=0;
    updatePokerHUD();
  }

  function spawnHoleCards(){
    const THREE=S.THREE;

    for(const b of S.bots.seated){
      const a = b.seatAngle;

      // pick 2 random cards (demo)
      const id1 = randCard();
      const id2 = randCard();
      b.holeIds = [id1, id2];

      const mats1 = makeCardMaterials(id1.r, id1.s);
      const mats2 = makeCardMaterials(id2.r, id2.s);

      const r = 3.55;
      const x = Math.cos(a)*r;
      const z = Math.sin(a)*r;
      const y = 2.18; // above head

      const c1=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.60), mats1.front);
      const c2=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.60), mats2.front);

      c1.position.set(x-0.28, y, z);
      c2.position.set(x+0.28, y, z);

      // face camera
      const camPos=new THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
      c1.lookAt(camPos.x, y, camPos.z);
      c2.lookAt(camPos.x, y, camPos.z);

      c1.rotateX(0.08);
      c2.rotateX(0.08);

      S.lobby.add(c1); S.lobby.add(c2);
      b.hole.push(c1,c2);
    }
  }

  function setCommunityCards(n){
    // create IDs if not set
    while(S.poker.communityIds.length < 5) S.poker.communityIds.push(randCard());

    const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);

    for(let i=0;i<5;i++){
      const c = S.poker.community[i];
      const id = S.poker.communityIds[i];
      c.material.map?.dispose?.();
      c.material = makeCardMaterials(id.r, id.s).front;

      c.visible = i < n;
      if(!c.visible) continue;

      c.position.y = -0.95 + 1.55;
      c.position.z = -0.25;

      c.lookAt(camPos.x, c.position.y, camPos.z);
      c.rotateY(Math.PI);
      c.rotateX(0.12);
    }
  }

  // ----------------- store front / room content -----------------
  function buildStoreFront(doorPos, yaw){
    const THREE=S.THREE;

    // storefront wall panel just inside the lobby by the store door
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 3.2, 0.18),
      new THREE.MeshStandardMaterial({
        color:0x0b0b16, roughness:0.5, metalness:0.25,
        emissive:0x7fe7ff, emissiveIntensity:0.12
      })
    );
    const inward = dirFromYaw(yaw).multiplyScalar(-1);
    wall.position.set(doorPos.x + inward.x*0.9, 1.65, doorPos.z + inward.z*0.9);
    wall.rotation.y = yaw;
    S.lobby.add(wall);

    // neon sign
    const signPos = wall.position.clone();
    signPos.y = 3.25;
    addSign("SCARLETT STORE","Skins • Chips • Gear", signPos, yaw, 0.95);

    // kiosks
    const kioskMat=new THREE.MeshStandardMaterial({
      color:0x0c0d14, roughness:0.55, metalness:0.25,
      emissive:0x7fe7ff, emissiveIntensity:0.08
    });
    for(let i=0;i<2;i++){
      const kiosk=new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.0), kioskMat);
      kiosk.position.copy(wall.position).add(new THREE.Vector3( (i?1:-1)*1.3, -0.4, -1.2 ));
      kiosk.rotation.y = yaw;
      S.lobby.add(kiosk);
    }
  }

  function buildStoreShell(roomGroup){
    const THREE=S.THREE;

    const kioskMat=new THREE.MeshStandardMaterial({
      color:0x0c0d14, roughness:0.55, metalness:0.25,
      emissive:0x7fe7ff, emissiveIntensity:0.08
    });
    const kiosk=new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 1.2), kioskMat);
    kiosk.position.set(0,0.6,2.0);
    roomGroup.add(kiosk);

    const manMat=new THREE.MeshStandardMaterial({ color:0x1a1a25, roughness:0.6, metalness:0.1 });
    for(let i=0;i<4;i++){
      const m=new THREE.Group();
      m.position.set(-3 + i*2, 0, -1.5);
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.65,6,12), manMat);
      body.position.y=0.95;
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.18,18,14), manMat);
      head.position.y=1.55;
      m.add(body); m.add(head);
      roomGroup.add(m);
    }

    const signTex=makeCanvasTex(["SCARLETT STORE","Mannequins • Skins • Chips",""], true);
    const signMat=new THREE.MeshBasicMaterial({ map:signTex, transparent:true, opacity:0.95, side:THREE.DoubleSide, depthTest:false });
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.4), signMat);
    sign.position.set(0,3.6,-5.8);
    roomGroup.add(sign);
  }

  // ----------------- chips + actions feed (fold/call/raise) -----------------
  function doRandomAction(bot){
    const r = Math.random();
    if(r < 0.25) return { act:"FOLD", amt:0 };
    if(r < 0.75){
      const call = S.poker.minCall + Math.floor(Math.random()*5)*10;
      return { act:"CALL", amt:call };
    }
    const raise = S.poker.minCall + 40 + Math.floor(Math.random()*8)*10;
    return { act:"RAISE", amt:raise };
  }

  // ----------------- poker loop -----------------
  function stepPoker(dt){
    S.poker.t += dt;

    // active player cycling (visual)
    const active = Math.floor((S.poker.t*0.8) % S.bots.seated.length);
    setActivePlayer(active);
    updateActionTile(active);

    // every ~1.1s: new action
    S.poker._actT = (S.poker._actT || 0) + dt;
    if(S.poker._actT > 1.1){
      S.poker._actT = 0;

      const bot = S.bots.seated[active];
      const a = doRandomAction(bot);
      S.poker.lastAction = a.act;
      S.poker.lastAmount = a.amt;
      updatePokerHUD();

      if(a.act === "CALL" || a.act === "RAISE"){
        spawnChipMover(bot, a.amt || 10);
      }
    }

    updateChipAnimations(dt);

    if(S.poker.phase==="deal"){
      if(S.poker.t>1.1){
        S.poker.t=0;
        clearHand();
        spawnHoleCards();
        setCommunityCards(3);
        S.poker.phase="bet";
        updatePokerHUD();
      }
    } else if(S.poker.phase==="bet"){
      if(S.poker.t>6.2){
        S.poker.t=0;
        S.poker.phase="turn";
        setCommunityCards(4);
        updatePokerHUD();
      }
    } else if(S.poker.phase==="turn"){
      if(S.poker.t>4.3){
        S.poker.t=0;
        S.poker.phase="river";
        setCommunityCards(5);
        updatePokerHUD();
      }
    } else if(S.poker.phase==="river"){
      if(S.poker.t>4.0){
        S.poker.t=0;
        S.poker.phase="showdown";
        // (winner logic later)
        updatePokerHUD();
      }
    } else if(S.poker.phase==="showdown"){
      if(S.poker.t>6.0){
        S.poker.t=0;
        S.poker.phase="deal";
        S.poker.hand += 1;
        updatePokerHUD();
      }
    }
  }

  function faceTags(){
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    S.lobby?.traverse?.((o)=>{ if(o.userData?._tag) o.lookAt(camPos); });
  }

  // ----------------- world build -----------------
  function buildWorld(){
    const THREE=S.THREE;
    const root=ensureRoot();

    const old=root.getObjectByName("ScarlettLobbyWorld");
    if(old) root.remove(old);

    const W=new THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.lobby=W;

    // richer lighting
    W.add(new THREE.AmbientLight(0xffffff, 0.18));

    const key=new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(7,15,6);
    W.add(key);

    const rim=new THREE.DirectionalLight(0x7fe7ff, 0.35);
    rim.position.set(-9, 10, -8);
    W.add(rim);

    const centerGlow=new THREE.PointLight(0x7fe7ff, 0.28, 80);
    centerGlow.position.set(0,6.2,0);
    W.add(centerGlow);

    const warm=new THREE.PointLight(0xffc890, 0.18, 60);
    warm.position.set(0,4.2,0);
    W.add(warm);

    const lobbyRadius=12.0, wallHeight=8.0, doorGap=THREE.MathUtils.degToRad(30);
    const pitRadius=4.6, pitDepth=0.95;
    const hallLen=10.0, hallW=4.2, hallH=4.8;
    const roomW=13.0, roomD=13.0, roomH=6.6;

    // segmented wall with 4 door gaps
    const q=(Math.PI*2)/4;
    for(let i=0;i<4;i++){
      const thetaStart=i*q + doorGap/2;
      const thetaLen=q - doorGap;
      const geo=new THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 180, 1, true, thetaStart, thetaLen);
      const wall=new THREE.Mesh(geo, wallMat());
      wall.position.y=wallHeight/2;
      W.add(wall);
    }
    buildVelvetGoldRibs(W, lobbyRadius, wallHeight);

    // floors
    const ring=new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 256), matFloor());
    ring.rotation.x=-Math.PI/2;
    W.add(ring);
    S.floorMain=ring;

    const pitFloor=new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 180), matFloor());
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-pitDepth;
    W.add(pitFloor);
    S.floorPit=pitFloor;

    // invisible plane target
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(320,320), new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 }));
    ground.rotation.x=-Math.PI/2;
    ground.position.y=0;
    ground.visible=false;
    W.add(ground);
    S.ground=ground;

    // pit wall
    const pitWall=new THREE.Mesh(new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 180, 1, true), matDark());
    pitWall.position.y=-pitDepth/2;
    W.add(pitWall);

    buildNeonRail(W, pitRadius+0.35);
    buildStairs(W, 18.0, 11, pitDepth, 3.4);

    // table + hood + hud
    const table = buildTable(W, -pitDepth + 0.02);
    S.poker.table = table;
    buildPokerHUD(W);

    // pot stack
    S.poker.chipKit = buildChipKit();
    const potStack=new THREE.Group();
    potStack.name="PotStack";
    potStack.position.set(0, -pitDepth + 0.56, 0);
    W.add(potStack);
    S.poker.potStack = potStack;

    // bots
    buildSeatedBots(table);

    // community cards (start blank, will assign textures in setCommunityCards)
    for(let i=0;i<5;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(0.58,0.84), new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.6, metalness:0.0, side:THREE.DoubleSide }));
      c.position.set((i-2)*0.70, -pitDepth + 1.55, -0.25);
      c.visible=false;
      W.add(c);
      S.poker.community.push(c);
    }

    // rooms + halls
    const defs=[
      { key:"poker", yaw:0,            label:"POKER" },
      { key:"store", yaw:Math.PI/2,    label:"STORE" },
      { key:"event", yaw:Math.PI,      label:"EVENT" },
      { key:"vip",   yaw:-Math.PI/2,   label:"VIP" }
    ];

    for(const d of defs){
      const dir=dirFromYaw(d.yaw);
      const hallCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen/2);
      const roomCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD/2);

      const hall=new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.position.set(hallCenter.x, hallH/2, hallCenter.z);
      hall.rotation.y=d.yaw;
      W.add(hall);

      const hallFloor=new THREE.Mesh(new THREE.PlaneGeometry(hallW-0.2, hallLen-0.2), matFloor());
      hallFloor.rotation.x=-Math.PI/2;
      hallFloor.position.set(hallCenter.x, 0.01, hallCenter.z);
      hallFloor.rotation.y=d.yaw;
      W.add(hallFloor);

      const room=new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.position.set(roomCenter.x, roomH/2, roomCenter.z);
      room.rotation.y=d.yaw;
      W.add(room);

      const roomFloor=new THREE.Mesh(new THREE.PlaneGeometry(roomW-0.2, roomD-0.2), matFloor());
      roomFloor.rotation.x=-Math.PI/2;
      roomFloor.position.set(roomCenter.x, 0.01, roomCenter.z);
      roomFloor.rotation.y=d.yaw;
      W.add(roomFloor);

      const roomAnchor=new THREE.Group();
      roomAnchor.name=`Room_${d.key}`;
      roomAnchor.position.copy(roomCenter);
      roomAnchor.rotation.y=d.yaw;
      W.add(roomAnchor);
      S.rooms[d.key] = roomAnchor;

      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      addDoorLabel(d.label, doorPos, d.yaw);

      // frame
      const frame=new THREE.Mesh(
        new THREE.BoxGeometry(hallW+0.6, 3.2, 0.08),
        new THREE.MeshStandardMaterial({ color:0x0b0b16, emissive:0x7fe7ff, emissiveIntensity:0.22, roughness:0.6, metalness:0.2 })
      );
      frame.position.set(doorPos.x, 2.1, doorPos.z);
      frame.rotation.y=d.yaw;
      W.add(frame);

      // extra sign above hallway entry
      addSign(`${d.label} HALL`, "WELCOME", new THREE.Vector3(doorPos.x, 6.6, doorPos.z), d.yaw + Math.PI, 0.62);

      // store front added at store door
      if(d.key === "store"){
        buildStoreFront(doorPos, d.yaw);
      }
    }

    // store room interior props
    buildStoreShell(S.rooms.store);

    // center banner sign
    addSign("SCARLETT CASINO", "MIDNIGHT • GOLD • VIP", new THREE.Vector3(0, 7.3, 0), 0, 1.05);

    // jumbotrons (music texture)
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
      S.refs.jumbotrons.push(j);
    }

    // dust
    buildDust(W);

    // spawn in lobby facing table
    S.player.position.set(0,0.02,7.5);
    S.player.rotation.y = Math.PI;

    ensureActionTile();
    updatePokerHUD();
    log("[world] built ✅ v5.4");
  }

  function teleportTo(key){
    const p = S.rooms[key]?.position;
    if(!p) return;
    S.player.position.set(p.x, 0.02, p.z + 2.5);
  }

  return {
    async build(ctx){
      Object.assign(S, ctx);
      ensureRoot();

      S.ray = new S.THREE.Raycaster();
      ensureAimRing();

      S.tp = {
        smooth: new S.THREE.Vector3(0, 0.01, 0),
        lastValid: new S.THREE.Vector3(0, 0.01, 0),
        cooldown: 0
      };

      buildWorld();
      log("[world] build complete ✅ v5.4");
    },

    frame(ctx, dt){
      updateTeleport(ctx, dt);
      updateAudio();
      faceTags();
      stepPoker(dt);
      updateDust(dt);
    },

    setMuted(v){
      S.audio.muted = !!v;
      const vid=S.refs.stream?.video;
      if(vid){
        vid.muted = !!v;
        if(!v && vid.paused) vid.play().catch(()=>{});
      }
    },

    admin:{
      teleportTo,
      resetHand: ()=>{ S.poker.phase="deal"; S.poker.t=0; clearHand(); updatePokerHUD(); }
    }
  };
})();
