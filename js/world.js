// /js/world.js — Scarlett MASTER WORLD v5.6 LUX (FULL)
// ✅ Circular lobby + sunken poker pit + neon rail + stairs
// ✅ 4 hallways + 4 rooms (POKER / STORE / EVENT / VIP) + door signage
// ✅ Storefront inside lobby + store interior shell + mannequins
// ✅ 4 jumbotrons fed by HLS stream (SomaFM Groove Salad) + positional volume
// ✅ Teleport aim ring ALWAYS visible + smoothed (stable, less jitter)
// ✅ Bots seated + small clean tags + hole cards under tags (readable)
// ✅ Big card rank/suit textures (CanvasTexture) + community cards readable
// ✅ Poker HUD: POT / TURN / ACTION (with amounts) + action tile + table marker
// ✅ Clean lighting: midnight velvet + gold ribs + soft cyan accents + dust motes
// ✅ Exposes World.setMuted(true/false) and World.admin.teleportTo(roomKey)

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null, lobby:null,

    floorMain:null, floorPit:null, ground:null,
    ray:null,

    aimRing:null,
    tp:{ smooth:null, lastValid:null, cooldown:0 },
    _teleLatch:false,

    refs:{ stream:null, jumbotrons:[] },
    rooms:{},
    dust:{ points:null },

    cardTexCache:new Map(),

    bots:{ seated:[] },

    poker:{
      t:0, phase:"deal", hand:0, pot:0,
      table:null,
      community:[], communityIds:[],
      potStack:null,
      hud:null,
      chipKit:null,
      activeIdx:0,
      lastAction:"", lastAmount:0,
      turnName:"",
      actionTile:null,
      turnMarker:null
    },

    audio:{ muted:false }
  };

  const log=(...a)=>{ try{S.log?.(...a);}catch{} };

  // ---------- utils ----------
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dirFromYaw=(yaw)=>new S.THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  const lerpAlpha=(dt,halfLife)=> 1 - Math.pow(0.5, dt/halfLife);

  function ensureRoot(){
    if(S.root && S.root.parent===S.scene) return S.root;
    const g=new S.THREE.Group();
    g.name="WorldRoot";
    S.scene.add(g);
    S.root=g;
    return g;
  }

  // ---------- textures / materials ----------
  function casinoWallMaterial(){
    const THREE=S.THREE;
    const tex=new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy = 16;
    return new THREE.MeshStandardMaterial({
      map:tex,
      roughness:0.18,
      metalness:0.55,
      color:0xffffff,
      side:THREE.BackSide
    });
  }

  const matFloor = ()=> new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.93, metalness:0.05 });
  const matVelvet= ()=> new S.THREE.MeshStandardMaterial({ color:0x060612, roughness:0.95, metalness:0.1, emissive:0x05060a, emissiveIntensity:0.55 });
  const matGold  = ()=> new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matDark  = ()=> new S.THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:S.THREE.DoubleSide });
  const matHall  = ()=> new S.THREE.MeshStandardMaterial({ color:0x090a12, roughness:0.9, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });
  const matRoom  = ()=> new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.86, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });
  const matFelt  = ()=> new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });

  // ---------- signage canvases ----------
  function makePanelTex(lines, big=false){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=1024; c.height=512;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(8,10,16,0.78)";
    ctx.fillRect(0,0,1024,512);

    ctx.strokeStyle="rgba(127,231,255,0.55)";
    ctx.lineWidth=10;
    ctx.strokeRect(18,18,988,476);

    ctx.strokeStyle="rgba(212,175,55,0.35)";
    ctx.lineWidth=6;
    ctx.strokeRect(28,28,968,456);

    ctx.textAlign="center";
    ctx.textBaseline="middle";

    ctx.fillStyle="#e8ecff";
    ctx.font = big ? "900 96px system-ui,Segoe UI,Roboto,Arial" : "900 78px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[0]||"", 512, 170);

    ctx.fillStyle="rgba(232,236,255,0.92)";
    ctx.font="800 56px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[1]||"", 512, 300);

    ctx.fillStyle="rgba(152,160,199,0.95)";
    ctx.font="700 44px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[2]||"", 512, 410);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }

  function addSign(text1, text2, pos, yaw, scale=1){
    const tex=makePanelTex([text1, text2||"", ""], true);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(4.4*scale, 2.2*scale), mat);
    plane.position.copy(pos);
    plane.rotation.y=yaw;
    plane.renderOrder=9999;
    S.lobby.add(plane);
    return plane;
  }

  function addDoorLabel(text, pos, yaw){
    const tex=makePanelTex([text,"ENTER",""], true);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.96, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(3.4,1.7), mat);
    plane.position.copy(pos);
    plane.position.y += 2.65;
    plane.rotation.y = yaw + Math.PI;
    plane.renderOrder=9999;
    S.lobby.add(plane);
  }

  function addNameTag(parent, name){
    const tex=makePanelTex([name,"",""], false);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.92, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.92,0.40), mat);
    plane.position.set(0,1.36,0);
    plane.userData._tag = true;
    plane.renderOrder=9999;
    parent.add(plane);
    return plane;
  }

  // ---------- CARD textures (large readable) ----------
  const SUITS=["♠","♥","♦","♣"];
  const RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  function randCard(){ return { r:RANKS[(Math.random()*RANKS.length)|0], s:SUITS[(Math.random()*SUITS.length)|0] }; }

  function makeCardBackTexture(){
    const THREE=S.THREE;
    if(S.cardTexCache.has("__BACK__")) return S.cardTexCache.get("__BACK__");
    const c=document.createElement("canvas");
    c.width=512; c.height=768;
    const ctx=c.getContext("2d");

    ctx.fillStyle="#0b0d14"; ctx.fillRect(0,0,512,768);

    ctx.strokeStyle="rgba(127,231,255,0.35)";
    ctx.lineWidth=6;
    for(let y=40;y<768;y+=72){ ctx.beginPath(); ctx.moveTo(42,y); ctx.lineTo(470,y); ctx.stroke(); }
    for(let x=40;x<512;x+=72){ ctx.beginPath(); ctx.moveTo(x,42); ctx.lineTo(x,726); ctx.stroke(); }

    ctx.strokeStyle="rgba(212,175,55,0.65)";
    ctx.lineWidth=10;
    ctx.strokeRect(16,16,480,736);

    ctx.fillStyle="rgba(127,231,255,0.62)";
    ctx.font="900 92px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("SCARLETT", 256, 380);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    S.cardTexCache.set("__BACK__", tex);
    return tex;
  }

  function makeCardTexture(rank, suit){
    const THREE=S.THREE;
    const key=`${rank}${suit}`;
    if(S.cardTexCache.has(key)) return S.cardTexCache.get(key);

    const c=document.createElement("canvas");
    c.width=512; c.height=768;
    const ctx=c.getContext("2d");

    ctx.fillStyle="#f7f7fb";
    ctx.fillRect(0,0,512,768);

    ctx.strokeStyle="rgba(0,0,0,0.22)";
    ctx.lineWidth=10;
    ctx.strokeRect(14,14,484,740);

    ctx.strokeStyle="rgba(212,175,55,0.55)";
    ctx.lineWidth=6;
    ctx.strokeRect(28,28,456,712);

    const red=(suit==="♥"||suit==="♦");
    const ink=red?"#d3173a":"#10131c";

    // TOP-LEFT (BIG)
    ctx.fillStyle=ink;
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.font="900 118px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 42, 28);
    ctx.font="900 122px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit, 42, 150);

    // BOTTOM-RIGHT mirrored
    ctx.save();
    ctx.translate(512,768);
    ctx.rotate(Math.PI);
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.font="900 118px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 42, 28);
    ctx.font="900 122px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit, 42, 150);
    ctx.restore();

    // center suit HUGE
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.globalAlpha=0.88;
    ctx.font="900 360px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit, 256, 408);
    ctx.globalAlpha=1;

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    S.cardTexCache.set(key, tex);
    return tex;
  }

  function cardFrontMat(rank, suit){
    return new S.THREE.MeshStandardMaterial({
      map:makeCardTexture(rank,suit),
      roughness:0.55, metalness:0.0, side:S.THREE.DoubleSide
    });
  }

  // ---------- HLS stream for jumbotrons + music ----------
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
    tex.colorSpace=THREE.SRGBColorSpace;
    S.refs.stream={ video, texture:tex };
    return tex;
  }

  function updateAudio(){
    const v=S.refs.stream?.video;
    if(!v) return;
    v.muted = !!S.audio.muted;
    if(S.audio.muted) return;

    const dist = Math.hypot(S.player.position.x, S.player.position.z);
    v.volume = clamp(1 - dist/24, 0, 1);

    if(v.paused) v.play().catch(()=>{});
  }

  // ---------- beauty: ribs, dust, neon rail, stairs ----------
  function buildVelvetGoldRibs(root, radius, height){
    const inner=new S.THREE.Mesh(new S.THREE.CylinderGeometry(radius+0.06, radius+0.06, height, 120, 1, true), matVelvet());
    inner.position.y = height/2;
    root.add(inner);

    const gold=matGold();
    for(let i=0;i<28;i++){
      const a=(i/28)*Math.PI*2;
      const rib=new S.THREE.Mesh(new S.THREE.BoxGeometry(0.09, height*0.92, 0.12), gold);
      rib.position.set(Math.cos(a)*(radius+0.02), height/2, Math.sin(a)*(radius+0.02));
      rib.lookAt(0, height/2, 0);
      root.add(rib);
    }
  }

  function buildDust(root){
    const count=680;
    const geo=new S.THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      arr[i*3+0]=(Math.random()-0.5)*24;
      arr[i*3+1]=0.7+Math.random()*6.5;
      arr[i*3+2]=(Math.random()-0.5)*24;
    }
    geo.setAttribute("position", new S.THREE.BufferAttribute(arr,3));
    const mat=new S.THREE.PointsMaterial({ size:0.03, transparent:true, opacity:0.26 });
    const pts=new S.THREE.Points(geo, mat);
    pts.name="DustMotes";
    root.add(pts);
    S.dust.points=pts;
  }
  function updateDust(dt){ if(S.dust.points) S.dust.points.rotation.y += dt*0.05; }

  function buildNeonRail(root, radius){
    const railMat=new S.THREE.MeshStandardMaterial({
      color:0x1a1b25, roughness:0.35, metalness:0.75,
      emissive:0x00ff7f, emissiveIntensity:0.28
    });
    const rail=new S.THREE.Mesh(new S.THREE.TorusGeometry(radius, 0.095, 18, 280), railMat);
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.95;
    root.add(rail);

    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2;
      const p=new S.THREE.PointLight(0x00ff7f, 0.09, 3.0);
      p.position.set(Math.cos(a)*radius, 0.95, Math.sin(a)*radius);
      root.add(p);
    }
  }

  function buildStairs(root, startZ, steps, totalDrop, width){
    const g=new S.THREE.Group();
    g.name="PitStairs";
    const m=new S.THREE.MeshStandardMaterial({ color:0x141622, roughness:0.9, metalness:0.12 });
    for(let i=0;i<steps;i++){
      const step=new S.THREE.Mesh(new S.THREE.BoxGeometry(width, 0.14, 0.85), m);
      const y=0.07 - (totalDrop/(steps-1))*i;
      step.position.set(0, y, startZ - 0.85*i);
      g.add(step);
    }
    root.add(g);
    return g;
  }

  // ---------- teleport aim ring (always visible & smooth) ----------
  function ensureAimRing(){
    if(S.aimRing && S.aimRing.parent) return;
    const geo=new S.THREE.RingGeometry(0.22,0.32,180);
    const mat=new S.THREE.MeshBasicMaterial({ color:0x00ff7f, transparent:true, opacity:0.93, side:S.THREE.DoubleSide, depthTest:false });
    const ring=new S.THREE.Mesh(geo, mat);
    ring.name="TeleportAimRing";
    ring.rotation.x=-Math.PI/2;
    ring.visible=true;
    ring.renderOrder=9999;
    S.scene.add(ring);
    S.aimRing=ring;
  }

  function teleportPressed(ctx){
    try{
      const lgp=ctx?.pads?.lgp;
      const rgp=ctx?.pads?.rgp;
      const ax=(gp)=>!!gp?.buttons?.[0]?.pressed; // A/X
      return ax(lgp)||ax(rgp);
    }catch{ return false; }
  }

  function updateTeleport(ctx, dt){
    if(!S.ray) return;
    ensureAimRing();

    // cooldown
    if(S.tp.cooldown>0) S.tp.cooldown=Math.max(0, S.tp.cooldown-dt);

    // ray from camera (stable)
    S.camera.updateMatrixWorld(true);
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir=new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();

    // slight downward bias so you hit floor more often
    camDir.y = clamp(camDir.y - 0.10, -0.6, 0.25);
    camDir.normalize();

    S.ray.set(camPos, camDir);

    const targets=[S.floorMain,S.floorPit,S.ground].filter(Boolean);
    let hit=null;
    if(targets.length){
      const hits=S.ray.intersectObjects(targets,false);
      if(hits.length) hit=hits[0].point.clone();
    }

    // fallback plane at y=0.01 if no hit
    if(!hit){
      const planeY=0.01;
      const dir=S.ray.ray.direction;
      const org=S.ray.ray.origin;
      if(Math.abs(dir.y)>0.0001){
        const t=(planeY-org.y)/dir.y;
        if(t>0) hit=org.clone().add(dir.clone().multiplyScalar(t));
      }
    }

    if(!hit){
      S.aimRing.visible=false;
      S._teleLatch=false;
      return;
    }

    hit.y=0.01;

    // smooth & stabilize
    const a=lerpAlpha(dt, 0.08); // 80ms half-life ~ stable
    S.tp.smooth.lerp(hit, a);

    // deadband clamp to reduce micro jitter
    if(S.tp.smooth.distanceTo(S.tp.lastValid) > 0.01){
      S.tp.lastValid.copy(S.tp.smooth);
    }

    S.aimRing.visible=true;
    S.aimRing.position.copy(S.tp.lastValid);

    const press=teleportPressed(ctx);
    if(press && !S._teleLatch && S.tp.cooldown===0){
      S._teleLatch=true;
      S.tp.cooldown=0.25;

      const dest=S.tp.lastValid;
      const r=Math.hypot(dest.x,dest.z);
      if(!Number.isFinite(r) || r>28){
        log("[tp] blocked dest", dest.x, dest.z);
        S._teleLatch=false;
        return;
      }

      S.player.position.set(dest.x, 0.02, dest.z);
      const v=S.refs.stream?.video;
      if(v && v.paused && !S.audio.muted) v.play().catch(()=>{});
    }
    if(!press) S._teleLatch=false;
  }

  // ---------- table & poker HUD ----------
  function buildTable(root, y){
    const table=new S.THREE.Group();
    table.name="CenterTable";
    table.position.set(0,y,0);

    const base=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(1.5,1.85,0.34,96),
      new S.THREE.MeshStandardMaterial({ color:0x0d0d14, roughness:0.65, metalness:0.22 })
    );
    base.position.y=0.16; table.add(base);

    const top=new S.THREE.Mesh(new S.THREE.CylinderGeometry(2.6,2.6,0.22,140), matFelt());
    top.position.y=0.44; table.add(top);

    const edge=new S.THREE.Mesh(new S.THREE.TorusGeometry(2.55,0.06,16,260), matGold());
    edge.rotation.x=Math.PI/2;
    edge.position.y=0.54;
    table.add(edge);

    root.add(table);
    return table;
  }

  function buildPokerHUD(root){
    const g=new S.THREE.Group();
    g.name="PokerHUD";
    g.position.set(0, 3.55, -1.55);

    const tex=makePanelTex(["POT: 0","TURN: —","ACTION: —"], false);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(3.2,1.55), mat);
    plane.renderOrder=9999;
    g.add(plane);

    root.add(g);
    S.poker.hud={ group:g, plane };
  }

  function updatePokerHUD(){
    const hud=S.poker.hud;
    if(!hud) return;
    const turn=S.poker.turnName||"—";
    const act=S.poker.lastAction ? `${S.poker.lastAction}${S.poker.lastAmount?` ${S.poker.lastAmount}`:""}` : "—";
    const tex=makePanelTex([`POT: ${S.poker.pot}`,`TURN: ${turn}`,`ACTION: ${act}`], false);
    hud.plane.material.map?.dispose?.();
    hud.plane.material.map=tex;
    hud.plane.material.needsUpdate=true;
  }

  function ensureActionTile(){
    if(S.poker.actionTile) return;
    const tex=makePanelTex(["TURN","CHECK / CALL / RAISE",""], false);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.92, side:S.THREE.DoubleSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(1.25,0.62), mat);
    plane.visible=false;
    plane.renderOrder=9999;
    S.lobby.add(plane);
    S.poker.actionTile=plane;
  }

  function ensureTurnMarker(){
    if(S.poker.turnMarker) return;
    const m=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(0.34,0.22),
      new S.THREE.MeshBasicMaterial({ color:0xffd36a, transparent:true, opacity:0.85, side:S.THREE.DoubleSide, depthTest:false })
    );
    m.rotation.x=-Math.PI/2;
    m.position.set(0, 0.14, 0);
    m.renderOrder=9999;
    S.lobby.add(m);
    S.poker.turnMarker=m;
  }

  // ---------- bots ----------
  function buildSeatedBots(table){
    const seatMat=new S.THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.84, metalness:0.12 });
    const bodyMat=new S.THREE.MeshStandardMaterial({ color:0x181827, roughness:0.85, metalness:0.08 });
    const headMat=new S.THREE.MeshStandardMaterial({ color:0x232336, roughness:0.78, metalness:0.08 });
    const handMat=new S.THREE.MeshStandardMaterial({ color:0x2b2b40, roughness:0.7, metalness:0.1 });

    const names=["Kabwe","Zola","Mya","Tasha","Rafi","Nina","Jett","Omar"];
    const seated=[];

    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const r=3.35;

      const chair=new S.THREE.Mesh(new S.THREE.BoxGeometry(0.62,0.86,0.62), seatMat);
      chair.position.set(Math.cos(a)*r, 0.43, Math.sin(a)*r);
      chair.lookAt(0,0.43,0);
      table.add(chair);

      const bot=new S.THREE.Group();
      bot.name=`SeatedBot_${names[i]}`;
      bot.position.set(Math.cos(a)*(r+0.38), 0.02, Math.sin(a)*(r+0.38));
      bot.lookAt(0,0.02,0);

      const body=new S.THREE.Mesh(new S.THREE.CapsuleGeometry(0.18,0.5,6,12), bodyMat);
      body.position.y=0.68; bot.add(body);

      const head=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.16,18,14), headMat);
      head.position.y=1.12; bot.add(head);

      const hL=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.055,14,12), handMat);
      const hR=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.055,14,12), handMat);
      hL.position.set(-0.14, 0.70, -0.22);
      hR.position.set( 0.14, 0.70, -0.22);
      bot.add(hL); bot.add(hR);

      addNameTag(bot, names[i]);
      table.add(bot);

      seated.push({ name:names[i], group:bot, seatAngle:a, chips:[], hole:[], holeIds:[] });
    }
    S.bots.seated=seated;
  }

  function faceTags(){
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    S.lobby?.traverse?.((o)=>{ if(o.userData?._tag) o.lookAt(camPos); });
  }

  function setActivePlayer(idx){
    S.poker.activeIdx=idx;
    S.poker.turnName=S.bots.seated[idx]?.name || "—";
  }

  // ---------- chips ----------
  function buildChipKit(){
    const chipGeo=new S.THREE.CylinderGeometry(0.06,0.06,0.018,28);
    const mats=[
      new S.THREE.MeshStandardMaterial({ color:0xff2d7a, roughness:0.35, metalness:0.2 }),
      new S.THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.35, metalness:0.2 }),
      new S.THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.35, metalness:0.2 }),
      new S.THREE.MeshStandardMaterial({ color:0x00ff7f, roughness:0.35, metalness:0.2 }),
    ];
    return { chipGeo, mats };
  }

  function addChipToPotStack(){
    const { chipGeo, mats }=S.poker.chipKit;
    const chip=new S.THREE.Mesh(chipGeo, mats[(Math.random()*mats.length)|0]);
    chip.rotation.x=Math.PI/2;
    const k=S.poker.potStack.children.length;
    chip.position.set(0,k*0.02,0);
    S.poker.potStack.add(chip);
  }

  function spawnChipMover(fromBot, amount){
    const { chipGeo, mats }=S.poker.chipKit;
    const chip=new S.THREE.Mesh(chipGeo, mats[(Math.random()*mats.length)|0]);
    chip.rotation.x=Math.PI/2;

    const a=fromBot.seatAngle;
    chip.position.set(Math.cos(a)*2.5, 0.14, Math.sin(a)*2.5);

    chip.userData.mode="toPot";
    chip.userData.t=0;
    chip.userData.from=chip.position.clone();
    chip.userData.to=new S.THREE.Vector3(0,0.14,0);
    chip.userData.amount=amount;

    S.lobby.add(chip);
    fromBot.chips.push(chip);
  }

  function updateChipAnimations(dt){
    for(const b of S.bots.seated){
      for(const chip of b.chips){
        chip.userData.t += dt;
        const t=Math.min(1, chip.userData.t*1.35);
        chip.position.lerpVectors(chip.userData.from, chip.userData.to, t);
        chip.rotation.x=Math.PI/2;

        if(t>=1 && chip.userData.mode==="toPot"){
          const amt=chip.userData.amount||10;
          if(chip.parent) chip.parent.remove(chip);
          chip.userData.mode="done";
          S.poker.pot += amt;
          addChipToPotStack();
          updatePokerHUD();
        }
      }
      b.chips=b.chips.filter(c=>c.userData.mode!=="done");
    }
  }

  // ---------- cards ----------
  function clearHand(){
    for(const c of S.poker.community) c.visible=false;
    S.poker.communityIds=[];

    for(const b of S.bots.seated){
      for(const card of b.hole){ if(card.parent) card.parent.remove(card); }
      b.hole.length=0; b.holeIds=[];
      for(const chip of b.chips){ if(chip.parent) chip.parent.remove(chip); }
      b.chips.length=0;
    }

    if(S.poker.potStack){
      while(S.poker.potStack.children.length) S.poker.potStack.remove(S.poker.potStack.children[0]);
    }

    S.poker.pot=0;
    S.poker.lastAction="";
    S.poker.lastAmount=0;
    updatePokerHUD();
  }

  function spawnHoleCards(){
    for(const b of S.bots.seated){
      const a=b.seatAngle;
      const r=3.55;

      const id1=randCard();
      const id2=randCard();
      b.holeIds=[id1,id2];

      const x=Math.cos(a)*r;
      const z=Math.sin(a)*r;
      const y=0.98; // under tag

      const c1=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.44,0.64), cardFrontMat(id1.r,id1.s));
      const c2=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.44,0.64), cardFrontMat(id2.r,id2.s));

      c1.position.set(x-0.22,y,z);
      c2.position.set(x+0.22,y,z);

      const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
      c1.lookAt(camPos.x,y,camPos.z);
      c2.lookAt(camPos.x,y,camPos.z);
      c1.rotateX(0.06); c2.rotateX(0.06);

      S.lobby.add(c1); S.lobby.add(c2);
      b.hole.push(c1,c2);
    }
  }

  function setCommunityCards(n){
    while(S.poker.communityIds.length<5) S.poker.communityIds.push(randCard());
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);

    for(let i=0;i<5;i++){
      const c=S.poker.community[i];
      const id=S.poker.communityIds[i];

      c.material?.map?.dispose?.();
      c.material = cardFrontMat(id.r,id.s);

      c.visible = i < n;
      if(!c.visible) continue;

      c.position.y = 0.18;
      c.position.z = -0.15;

      c.lookAt(camPos.x, c.position.y, camPos.z);
      c.rotateY(Math.PI);
      c.rotateX(0.12);
    }
  }

  // ---------- action tile + marker ----------
  function updateActionUI(activeIdx){
    ensureActionTile();
    ensureTurnMarker();

    const b=S.bots.seated[activeIdx];
    if(!b){ S.poker.actionTile.visible=false; return; }

    // small tile floats near the active player's spot
    const p=b.group.getWorldPosition(new S.THREE.Vector3());
    S.poker.actionTile.position.set(p.x*0.78, 1.00, p.z*0.78);
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    S.poker.actionTile.lookAt(camPos.x, S.poker.actionTile.position.y, camPos.z);
    S.poker.actionTile.visible=true;

    // marker sits on table in front of active player
    const a=b.seatAngle;
    const rr=1.85;
    S.poker.turnMarker.position.set(Math.cos(a)*rr, 0.14, Math.sin(a)*rr);
  }

  // ---------- simple demo poker engine ----------
  function doRandomAction(){
    const r=Math.random();
    if(r<0.25) return { act:"FOLD", amt:0 };
    if(r<0.75){
      const call=10+((Math.random()*5)|0)*10;
      return { act:"CALL", amt:call };
    }
    const raise=50+((Math.random()*8)|0)*10;
    return { act:"RAISE", amt:raise };
  }

  function stepPoker(dt){
    S.poker.t += dt;

    const active = ((S.poker.t*0.75)|0) % S.bots.seated.length;
    setActivePlayer(active);
    updateActionUI(active);

    S.poker._actT = (S.poker._actT||0) + dt;
    if(S.poker._actT > 1.15){
      S.poker._actT = 0;
      const b=S.bots.seated[active];
      const a=doRandomAction();

      S.poker.lastAction=a.act;
      S.poker.lastAmount=a.amt;
      updatePokerHUD();

      if(a.act==="CALL" || a.act==="RAISE"){
        spawnChipMover(b, a.amt || 10);
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
      if(S.poker.t>4.2){
        S.poker.t=0;
        S.poker.phase="showdown";
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

  // ---------- storefront + store interior ----------
  function buildStoreFront(doorPos, yaw){
    // storefront wall panel
    const wall=new S.THREE.Mesh(
      new S.THREE.BoxGeometry(5.4, 3.2, 0.18),
      new S.THREE.MeshStandardMaterial({
        color:0x0b0b16, roughness:0.5, metalness:0.25,
        emissive:0x7fe7ff, emissiveIntensity:0.12
      })
    );
    const inward=dirFromYaw(yaw).multiplyScalar(-1);
    wall.position.set(doorPos.x+inward.x*0.9, 1.65, doorPos.z+inward.z*0.9);
    wall.rotation.y=yaw;
    S.lobby.add(wall);

    addSign("SCARLETT STORE","Skins • Chips • Gear", wall.position.clone().add(new S.THREE.Vector3(0,1.75,0)), yaw, 0.95);

    // kiosks
    const kioskMat=new S.THREE.MeshStandardMaterial({
      color:0x0c0d14, roughness:0.55, metalness:0.25,
      emissive:0x7fe7ff, emissiveIntensity:0.08
    });
    for(let i=0;i<2;i++){
      const kiosk=new S.THREE.Mesh(new S.THREE.BoxGeometry(1.8, 1.0, 1.0), kioskMat);
      kiosk.position.copy(wall.position).add(new S.THREE.Vector3((i?1:-1)*1.3, -0.4, -1.2));
      kiosk.rotation.y=yaw;
      S.lobby.add(kiosk);
    }
  }

  function buildStoreInterior(roomAnchor){
    const kioskMat=new S.THREE.MeshStandardMaterial({
      color:0x0c0d14, roughness:0.55, metalness:0.25,
      emissive:0x7fe7ff, emissiveIntensity:0.08
    });
    const kiosk=new S.THREE.Mesh(new S.THREE.BoxGeometry(2.8, 1.2, 1.2), kioskMat);
    kiosk.position.set(0,0.6,2.0);
    roomAnchor.add(kiosk);

    const manMat=new S.THREE.MeshStandardMaterial({ color:0x1a1a25, roughness:0.6, metalness:0.1 });
    for(let i=0;i<4;i++){
      const m=new S.THREE.Group();
      m.position.set(-3 + i*2, 0, -1.5);
      const body=new S.THREE.Mesh(new S.THREE.CapsuleGeometry(0.22,0.65,6,12), manMat);
      body.position.y=0.95;
      const head=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.18,18,14), manMat);
      head.position.y=1.55;
      m.add(body); m.add(head);
      roomAnchor.add(m);
    }

    const signTex=makePanelTex(["SCARLETT STORE","Mannequins • Skins • Chips",""], true);
    const signMat=new S.THREE.MeshBasicMaterial({ map:signTex, transparent:true, opacity:0.95, side:S.THREE.DoubleSide, depthTest:false });
    const sign=new S.THREE.Mesh(new S.THREE.PlaneGeometry(4.8,2.4), signMat);
    sign.position.set(0,3.6,-5.8);
    roomAnchor.add(sign);
  }

  // ---------- world build ----------
  function buildWorld(){
    const root=ensureRoot();

    const old=root.getObjectByName("ScarlettLobbyWorld");
    if(old) root.remove(old);

    const W=new S.THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.lobby=W;

    // lighting (lux)
    W.add(new S.THREE.AmbientLight(0xffffff, 0.18));

    const key=new S.THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(7,15,6);
    W.add(key);

    const rim=new S.THREE.DirectionalLight(0x7fe7ff, 0.35);
    rim.position.set(-9,10,-8);
    W.add(rim);

    const centerGlow=new S.THREE.PointLight(0x7fe7ff, 0.28, 80);
    centerGlow.position.set(0,6.2,0);
    W.add(centerGlow);

    const warm=new S.THREE.PointLight(0xffc890, 0.18, 60);
    warm.position.set(0,4.2,0);
    W.add(warm);

    // geometry parameters
    const lobbyRadius=12.0, wallHeight=8.0;
    const pitRadius=4.6, pitDepth=0.95;
    const hallLen=10.0, hallW=4.2, hallH=4.8;
    const roomW=13.0, roomD=13.0, roomH=6.6;

    // segmented wall with door gaps
    const q=(Math.PI*2)/4;
    const doorGap=S.THREE.MathUtils.degToRad(30);
    for(let i=0;i<4;i++){
      const thetaStart=i*q + doorGap/2;
      const thetaLen=q - doorGap;
      const geo=new S.THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 180, 1, true, thetaStart, thetaLen);
      const wall=new S.THREE.Mesh(geo, casinoWallMaterial());
      wall.position.y=wallHeight/2;
      W.add(wall);
    }
    buildVelvetGoldRibs(W, lobbyRadius, wallHeight);

    // floors + pit
    const ring=new S.THREE.Mesh(new S.THREE.RingGeometry(pitRadius, lobbyRadius, 256), matFloor());
    ring.rotation.x=-Math.PI/2;
    W.add(ring);
    S.floorMain=ring;

    const pitFloor=new S.THREE.Mesh(new S.THREE.CircleGeometry(pitRadius, 180), matFloor());
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-pitDepth;
    W.add(pitFloor);
    S.floorPit=pitFloor;

    const pitWall=new S.THREE.Mesh(new S.THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 180, 1, true), matDark());
    pitWall.position.y=-pitDepth/2;
    W.add(pitWall);

    // invisible ground plane (ray fallback)
    const ground=new S.THREE.Mesh(new S.THREE.PlaneGeometry(340,340), new S.THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 }));
    ground.rotation.x=-Math.PI/2;
    ground.position.y=0;
    ground.visible=false;
    W.add(ground);
    S.ground=ground;

    buildNeonRail(W, pitRadius+0.35);
    buildStairs(W, 18.0, 11, pitDepth, 3.4);

    // table + HUD
    const table=buildTable(W, -pitDepth + 0.02);
    S.poker.table=table;

    buildPokerHUD(W);

    // pot stack
    S.poker.chipKit=buildChipKit();
    const potStack=new S.THREE.Group();
    potStack.name="PotStack";
    potStack.position.set(0, 0.14, 0);
    W.add(potStack);
    S.poker.potStack=potStack;

    // bots
    buildSeatedBots(table);

    // community cards (5)
    S.poker.community.length=0;
    for(let i=0;i<5;i++){
      const c=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.62,0.90), new S.THREE.MeshStandardMaterial({ map:makeCardBackTexture(), roughness:0.6, metalness:0.0, side:S.THREE.DoubleSide }));
      c.position.set((i-2)*0.72, 0.18, -0.15);
      c.visible=false;
      W.add(c);
      S.poker.community.push(c);
    }

    // rooms
    const defs=[
      { key:"poker", yaw:0,          label:"POKER" },
      { key:"store", yaw:Math.PI/2,  label:"STORE" },
      { key:"event", yaw:Math.PI,    label:"EVENT" },
      { key:"vip",   yaw:-Math.PI/2, label:"VIP" }
    ];

    for(const d of defs){
      const dir=dirFromYaw(d.yaw);
      const hallCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen/2);
      const roomCenter=dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD/2);

      // hall
      const hall=new S.THREE.Mesh(new S.THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.position.set(hallCenter.x, hallH/2, hallCenter.z);
      hall.rotation.y=d.yaw;
      W.add(hall);

      const hallFloor=new S.THREE.Mesh(new S.THREE.PlaneGeometry(hallW-0.2, hallLen-0.2), matFloor());
      hallFloor.rotation.x=-Math.PI/2;
      hallFloor.position.set(hallCenter.x, 0.01, hallCenter.z);
      hallFloor.rotation.y=d.yaw;
      W.add(hallFloor);

      // room box
      const room=new S.THREE.Mesh(new S.THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.position.set(roomCenter.x, roomH/2, roomCenter.z);
      room.rotation.y=d.yaw;
      W.add(room);

      const roomFloor=new S.THREE.Mesh(new S.THREE.PlaneGeometry(roomW-0.2, roomD-0.2), matFloor());
      roomFloor.rotation.x=-Math.PI/2;
      roomFloor.position.set(roomCenter.x, 0.01, roomCenter.z);
      roomFloor.rotation.y=d.yaw;
      W.add(roomFloor);

      const anchor=new S.THREE.Group();
      anchor.name=`Room_${d.key}`;
      anchor.position.copy(roomCenter);
      anchor.rotation.y=d.yaw;
      W.add(anchor);
      S.rooms[d.key]=anchor;

      // doorway signs
      const doorPos=dir.clone().multiplyScalar(lobbyRadius - 0.15);
      addDoorLabel(d.label, doorPos, d.yaw);

      // hall header sign
      addSign(`${d.label} HALL`, "WELCOME", new S.THREE.Vector3(doorPos.x, 6.6, doorPos.z), d.yaw + Math.PI, 0.62);

      // store front
      if(d.key==="store") buildStoreFront(doorPos, d.yaw);
    }

    // store interior
    if(S.rooms.store) buildStoreInterior(S.rooms.store);

    // center banner
    addSign("SCARLETT CASINO","MIDNIGHT • GOLD • VIP", new S.THREE.Vector3(0,7.3,0), 0, 1.02);

    // jumbotrons
    const streamTex=initStream();
    const jumboMat=new S.THREE.MeshStandardMaterial({ map:streamTex, emissive:0xffffff, emissiveIntensity:0.35, roughness:0.6, metalness:0.1, side:S.THREE.DoubleSide });
    const jumboGeo=new S.THREE.PlaneGeometry(7.8, 4.4);

    for(const d of defs){
      const dir=dirFromYaw(d.yaw);
      const doorPos=dir.clone().multiplyScalar(lobbyRadius - 0.15);
      const j=new S.THREE.Mesh(jumboGeo, jumboMat);
      j.position.set(doorPos.x*0.98, 5.85, doorPos.z*0.98);
      j.rotation.y=d.yaw + Math.PI;
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    buildDust(W);

    // teleport UI objects
    ensureAimRing();
    ensureActionTile();
    ensureTurnMarker();
    updatePokerHUD();

    // spawn: face the table (toward center)
    S.player.position.set(0, 0.02, 7.5);
    S.player.rotation.y = Math.PI; // facing inward

    log("[world] built ✅ v5.6 LUX");
  }

  function teleportTo(key){
    const p=S.rooms[key]?.position;
    if(!p) return;
    S.player.position.set(p.x, 0.02, p.z + 2.5);
  }

  return {
    async build(ctx){
      Object.assign(S, ctx);
      ensureRoot();

      S.ray=new S.THREE.Raycaster();
      S.tp.smooth=new S.THREE.Vector3(0,0.01,0);
      S.tp.lastValid=new S.THREE.Vector3(0,0.01,0);

      buildWorld();
      log("[world] build complete ✅ v5.6 LUX");
    },

    frame(ctx, dt){
      updateTeleport(ctx, dt);
      updateAudio();
      faceTags();
      stepPoker(dt);
      updateDust(dt);
    },

    setMuted(v){
      S.audio.muted=!!v;
      const vid=S.refs.stream?.video;
      if(vid){
        vid.muted=!!v;
        if(!v && vid.paused) vid.play().catch(()=>{});
      }
    },

    admin:{
      teleportTo,
      resetHand: ()=>{ S.poker.phase="deal"; S.poker.t=0; clearHand(); updatePokerHUD(); }
    }
  };
})();
