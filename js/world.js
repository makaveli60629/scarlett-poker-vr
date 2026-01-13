// /js/world.js — Scarlett MASTER WORLD v5.2 (FULL)
// ✅ Stable teleport ring (smooth + deadband + cooldown) — no jitter
// ✅ Beauty pass: velvet/gold ribs, neon rail, dust motes, signage
// ✅ Poker alive: floating cards, chips->pot, vacuum payout, HUD
// ✅ Stairs, guard, store shell, 4 hallways + 4 rooms
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
      table:null, community:[], potStack:null,
      hud:null, winner:"", winText:"",
      chipKit:null
    },
    audio:{ muted:false },
    tp:null, // teleport smoothing state (set in build)
    dust:{ points:null }
  };

  const log=(...a)=>{ try{S.log?.(...a);}catch{} };

  function ensureRoot(){
    const THREE=S.THREE;
    if(S.root && S.root.parent===S.scene) return S.root;
    S.root=new THREE.Group(); S.root.name="WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }

  function dirFromYaw(yaw){
    return new S.THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  }

  // ---------- materials ----------
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
  const matGold=()=>new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matFelt=()=>new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });
  const matDark=()=>new S.THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:S.THREE.DoubleSide });
  const matHall=()=>new S.THREE.MeshStandardMaterial({ color:0x090a12, roughness:0.9, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });
  const matRoom=()=>new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.86, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.65 });

  // ---------- text canvases ----------
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

    // glow line
    ctx.strokeStyle="rgba(212,175,55,0.35)";
    ctx.lineWidth=6;
    ctx.strokeRect(28,28,968,456);

    ctx.fillStyle="#e8ecff";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font = big ? "bold 92px system-ui,Segoe UI,Roboto,Arial" : "bold 72px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[0]||"", 512, 175);

    ctx.font = "600 54px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillStyle="rgba(232,236,255,0.92)";
    ctx.fillText(lines[1]||"", 512, 300);

    ctx.font = "500 46px system-ui,Segoe UI,Roboto,Arial";
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

  function addNameTag(parent, name){
    const THREE=S.THREE;
    const tex=makeCanvasTex([name,"",""], false);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.98, side:THREE.DoubleSide, depthTest:false });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.45), mat);
    plane.position.set(0, 1.38, 0);
    plane.userData._tag = true;
    plane.renderOrder = 9999;
    parent.add(plane);
    return plane;
  }

  // ---------- stream (kept as HLS-compatible “radio feel”) ----------
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

  // ---------- teleport ring (stable) ----------
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

  function pressed(sticks){
    try{
      const lgp=sticks?.left?.gamepad;
      const rgp=sticks?.right?.gamepad;
      const any = (gp)=>{
        if(!gp?.buttons) return false;
        // A/X(0), B/Y(1), Trigger(0 or 1 on some devices), Grip(2/3/4)
        return !!(gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[4]?.pressed || gp.buttons[5]?.pressed);
      };
      return any(lgp) || any(rgp);
    } catch { return false; }
  }

  function updateTeleport(sticks, dt){
    if(!S.ray) return;
    ensureAimRing();

    if (S.tp.cooldown > 0) S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    // floors only (stable)
    const targets=[S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if(!targets.length) return;

    // Aim from headset, but stabilize direction
    S.camera.updateMatrixWorld(true);
    const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir = new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();

    // flatten vertical jitter
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

    // low-pass smoothing (framerate independent)
    const alpha = 1 - Math.pow(0.0008, dt);
    S.tp.smooth.lerp(p, alpha);

    // deadband against shimmer (2cm)
    const dead=0.02;
    if(S.tp.smooth.distanceTo(S.tp.lastValid) > dead){
      S.tp.lastValid.copy(S.tp.smooth);
    }

    S.aimRing.visible=true;
    S.aimRing.position.copy(S.tp.lastValid);

    const press = pressed(sticks);
    if(press && !S._teleLatch && S.tp.cooldown === 0){
      S._teleLatch = true;
      S.tp.cooldown = 0.25;

      const dest = S.tp.lastValid;
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

  // ---------- beauty helpers ----------
  function buildVelvetGoldRibs(root, radius, height){
    const THREE=S.THREE;
    const velvet = new THREE.MeshStandardMaterial({
      color:0x060612, roughness:0.95, metalness:0.1,
      emissive:0x05060a, emissiveIntensity:0.55
    });
    const gold = matGold();

    // inner velvet ring (subtle)
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(radius+0.06, radius+0.06, height, 120, 1, true), velvet);
    inner.position.y = height/2;
    root.add(inner);

    // gold ribs hide seams (vertical bars)
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
    const count=650;
    const geo=new THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      arr[i*3+0] = (Math.random()-0.5)*22;
      arr[i*3+1] = 0.6 + Math.random()*6.5;
      arr[i*3+2] = (Math.random()-0.5)*22;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr,3));
    const mat=new THREE.PointsMaterial({ size:0.03, transparent:true, opacity:0.35 });
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

  // ---------- geometry ----------
  function buildNeonRail(root, radius){
    const THREE=S.THREE;
    const railMat=new THREE.MeshStandardMaterial({
      color:0x1a1b25, roughness:0.35, metalness:0.75,
      emissive:0x00ff7f, emissiveIntensity:0.25
    });
    const rail=new THREE.Mesh(new THREE.TorusGeometry(radius, 0.095, 18, 280), railMat);
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.95;
    root.add(rail);

    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2;
      const p=new THREE.PointLight(0x00ff7f, 0.08, 3.0);
      p.position.set(Math.cos(a)*radius, 0.95, Math.sin(a)*radius);
      root.add(p);
    }

    const postMat=new THREE.MeshStandardMaterial({ color:0x15161d, roughness:0.65, metalness:0.55 });
    for(let i=0;i<24;i++){
      const a=(i/24)*Math.PI*2;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.8,16), postMat);
      post.position.set(Math.cos(a)*(radius-0.02), 0.4, Math.sin(a)*(radius-0.02));
      root.add(post);
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

  function buildTableHood(root){
    const THREE=S.THREE;
    const hood=new THREE.Group();
    hood.name="TableHood";
    hood.position.set(0, 4.9, 0);

    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.08, 16, 300),
      new THREE.MeshStandardMaterial({ color:0x0c0c14, emissive:0x7fe7ff, emissiveIntensity:0.12, roughness:0.6, metalness:0.3 })
    );
    ring.rotation.x=Math.PI/2;
    hood.add(ring);

    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const spot=new THREE.SpotLight(0xffffff, 0.55, 16, Math.PI/7, 0.6, 1.3);
      spot.position.set(Math.cos(a)*2.2, 0.25, Math.sin(a)*2.2);
      spot.target.position.set(0,-3.8,0);
      hood.add(spot);
      hood.add(spot.target);
    }

    root.add(hood);
    return hood;
  }

  function buildPokerHUD(root){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="PokerHUD";
    g.position.set(0, 3.55, -1.6);

    const tex=makeCanvasTex(["POT: 0","PHASE: DEAL",""], false);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.DoubleSide, depthTest:false });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6), mat);
    plane.renderOrder=9999;
    g.add(plane);

    root.add(g);
    S.poker.hud = { group:g, plane };
  }

  function updatePokerHUD(){
    const hud=S.poker.hud;
    if(!hud) return;
    const lines = [
      `POT: ${S.poker.pot}`,
      `PHASE: ${S.poker.phase.toUpperCase()}`,
      S.poker.winner ? `WIN: ${S.poker.winner} (${S.poker.winText})` : ""
    ];
    const newTex = makeCanvasTex(lines, false);
    hud.plane.material.map?.dispose?.();
    hud.plane.material.map = newTex;
    hud.plane.material.needsUpdate = true;
  }

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

      seated.push({ name:names[i], group:bot, seatAngle:a, chips:[], hole:[] });
    }
    S.bots.seated = seated;
  }

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
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.6,2.3), signMat);
    sign.position.set(0,3.6,-5.8);
    roomGroup.add(sign);
  }

  function buildGuard(root, pos, lookAt){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="VIP_Guard";
    g.position.copy(pos);
    g.lookAt(lookAt);

    const bodyMat=new THREE.MeshStandardMaterial({ color:0x111122, roughness:0.65, metalness:0.2 });
    const headMat=new THREE.MeshStandardMaterial({ color:0x1f2030, roughness:0.55, metalness:0.12 });
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.7,6,12), bodyMat);
    body.position.y=0.95;
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.18,18,14), headMat);
    head.position.y=1.65;
    g.add(body); g.add(head);

    addNameTag(g, "GUARD");
    root.add(g);
    S.bots.guard = g;
  }

  // ---------- poker visuals ----------
  function clearHand(){
    for(const c of S.poker.community) c.visible=false;

    for(const b of S.bots.seated){
      for(const card of b.hole){ if(card.parent) card.parent.remove(card); }
      b.hole.length=0;

      for(const chip of b.chips){ if(chip.parent) chip.parent.remove(chip); }
      b.chips.length=0;
    }

    const pot=S.poker.potStack;
    if(pot){
      while(pot.children.length) pot.remove(pot.children[0]);
      pot.userData.vac = null;
      pot.position.set(0, -0.95 + 0.56, 0);
    }

    S.poker.pot=0;
    S.poker.winner="";
    S.poker.winText="";
    updatePokerHUD();
  }

  function spawnHoleCards(){
    const THREE=S.THREE;
    const mat=new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.55, metalness:0.0, side:THREE.DoubleSide });
    for(const b of S.bots.seated){
      const a=b.seatAngle;
      const px = Math.cos(a)*2.15;
      const pz = Math.sin(a)*2.15;

      const c1=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.46), mat);
      const c2=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.46), mat);

      c1.position.set(px-0.18, -0.95 + 1.20, pz-0.18);
      c2.position.set(px+0.18, -0.95 + 1.20, pz-0.18);

      const look = b.group.getWorldPosition(new THREE.Vector3());
      c1.lookAt(look.x, c1.position.y, look.z);
      c2.lookAt(look.x, c2.position.y, look.z);

      c1.rotation.x = -0.35;
      c2.rotation.x = -0.35;

      S.lobby.add(c1); S.lobby.add(c2);
      b.hole.push(c1,c2);
    }
  }

  function showCommunity(n){
    for(let i=0;i<5;i++){
      S.poker.community[i].visible = i < n;
      if(S.poker.community[i].visible){
        S.poker.community[i].rotation.x = -Math.PI/2;
        S.poker.community[i].position.y = -0.95 + 1.40;
      }
    }
  }

  function spawnChipMover(fromBot){
    const { chipGeo, mats } = S.poker.chipKit;
    const chip = new S.THREE.Mesh(chipGeo, mats[Math.floor(Math.random()*mats.length)]);
    chip.rotation.x = Math.PI/2;

    const a=fromBot.seatAngle;
    chip.position.set(Math.cos(a)*2.5, -0.95 + 1.03, Math.sin(a)*2.5);

    chip.userData.mode="toPot";
    chip.userData.t=0;
    chip.userData.from = chip.position.clone();
    chip.userData.to = new S.THREE.Vector3(0, -0.95 + 1.03, 0);

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

  function vacuumPotToWinner(winnerName){
    const winner = S.bots.seated.find(b=>b.name===winnerName);
    if(!winner) return;

    const pot = S.poker.potStack;
    const target = winner.group.getWorldPosition(new S.THREE.Vector3());
    pot.userData.vac = {
      t:0,
      from: pot.position.clone(),
      to: new S.THREE.Vector3(target.x*0.65, pot.position.y, target.z*0.65)
    };
  }

  function updateChipAnimations(dt){
    for(const b of S.bots.seated){
      for(const chip of b.chips){
        chip.userData.t += dt;
        const t = Math.min(1, chip.userData.t * 1.35);
        chip.position.lerpVectors(chip.userData.from, chip.userData.to, t);
        chip.rotation.x = Math.PI/2;

        if(t>=1 && chip.userData.mode==="toPot"){
          if(chip.parent) chip.parent.remove(chip);
          chip.userData.mode="done";
          S.poker.pot += 10;
          addChipToPotStack();
          updatePokerHUD();
        }
      }
      b.chips = b.chips.filter(c=>c.userData.mode!=="done");
    }

    const pot=S.poker.potStack;
    if(pot?.userData?.vac){
      const v=pot.userData.vac;
      v.t += dt;
      const t=Math.min(1, v.t*0.85);
      pot.position.lerpVectors(v.from, v.to, t);
      if(t>=1){
        pot.userData.vac=null;
        pot.position.set(0, -0.95 + 0.56, 0);
        while(pot.children.length) pot.remove(pot.children[0]);
      }
    }
  }

  function randomWinText(){
    const list=["Flush","Straight","Full House","Trips","Two Pair","Top Pair","Set","Rivered Flush"];
    return list[Math.floor(Math.random()*list.length)];
  }

  function stepPoker(dt){
    S.poker.t += dt;

    if(S.poker.phase==="deal"){
      if(S.poker.t>1.2){
        S.poker.t=0;
        clearHand();
        spawnHoleCards();
        showCommunity(3);
        S.poker.phase="bet";
        updatePokerHUD();
      }
    } else if(S.poker.phase==="bet"){
      if(Math.random() < 0.08){
        const b = S.bots.seated[Math.floor(Math.random()*S.bots.seated.length)];
        spawnChipMover(b);
      }
      updateChipAnimations(dt);

      if(S.poker.t>6.5){
        S.poker.t=0;
        S.poker.phase="turn";
        showCommunity(4);
        updatePokerHUD();
      }
    } else if(S.poker.phase==="turn"){
      if(S.poker.t>4.5){
        S.poker.t=0;
        S.poker.phase="river";
        showCommunity(5);
        updatePokerHUD();
      }
    } else if(S.poker.phase==="river"){
      if(S.poker.t>4.0){
        S.poker.t=0;
        S.poker.phase="showdown";
        const winner=S.bots.seated[Math.floor(Math.random()*S.bots.seated.length)];
        S.poker.winner=winner.name;
        S.poker.winText=randomWinText();
        updatePokerHUD();
        vacuumPotToWinner(winner.name);
      }
    } else if(S.poker.phase==="showdown"){
      updateChipAnimations(dt);
      if(S.poker.t>4.2){
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

  // ---------- world build ----------
  function buildWorld(){
    const THREE=S.THREE;
    const root=ensureRoot();

    const old=root.getObjectByName("ScarlettLobbyWorld");
    if(old) root.remove(old);

    const W=new THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.lobby=W;

    // elegant lighting
    W.add(new THREE.AmbientLight(0xffffff, 0.14));
    const key=new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(7,15,6);
    W.add(key);

    const cyan=new THREE.PointLight(0x7fe7ff, 0.24, 80);
    cyan.position.set(0,6.2,0);
    W.add(cyan);

    const warm=new THREE.PointLight(0xffc890, 0.16, 60);
    warm.position.set(0,4.2,0);
    W.add(warm);

    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      const sp=new THREE.SpotLight(0x7fe7ff, 0.22, 40, Math.PI/8, 0.7, 1.4);
      sp.position.set(Math.cos(a)*9.5, 7.2, Math.sin(a)*9.5);
      sp.target.position.set(0,0,0);
      W.add(sp); W.add(sp.target);
    }

    // dimensions
    const lobbyRadius=12.0, wallHeight=8.0, doorGap=THREE.MathUtils.degToRad(30);
    const pitRadius=4.6, pitDepth=0.95;
    const hallLen=10.0, hallW=4.2, hallH=4.8;
    const roomW=13.0, roomD=13.0, roomH=6.6;

    // wall texture arcs (with door gaps)
    const q=(Math.PI*2)/4;
    for(let i=0;i<4;i++){
      const thetaStart=i*q + doorGap/2;
      const thetaLen=q - doorGap;
      const geo=new THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 180, 1, true, thetaStart, thetaLen);
      const wall=new THREE.Mesh(geo, wallMat());
      wall.position.y=wallHeight/2;
      W.add(wall);
    }

    // velvet + gold ribs (beauty)
    buildVelvetGoldRibs(W, lobbyRadius, wallHeight);

    // lobby floors
    const ring=new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 256), matFloor());
    ring.rotation.x=-Math.PI/2;
    W.add(ring);
    S.floorMain=ring;

    const pitFloor=new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 180), matFloor());
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-pitDepth;
    W.add(pitFloor);
    S.floorPit=pitFloor;

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

    // neon rail + stairs
    buildNeonRail(W, pitRadius+0.35);
    buildStairs(W, 18.0, 11, pitDepth, 3.4);

    // table, hood, HUD
    const table = buildTable(W, -pitDepth + 0.02);
    S.poker.table = table;
    buildTableHood(W);
    buildPokerHUD(W);

    // chips + pot stack
    S.poker.chipKit = buildChipKit();
    const potStack=new THREE.Group();
    potStack.name="PotStack";
    potStack.position.set(0, -pitDepth + 0.56, 0);
    W.add(potStack);
    S.poker.potStack = potStack;

    // seated bots
    buildSeatedBots(table);

    // community cards (big + floating)
    const cardMat=new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.55, metalness:0.0, side:THREE.DoubleSide });
    for(let i=0;i<5;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(0.58,0.84), cardMat);
      c.position.set((i-2)*0.70, -pitDepth + 1.40, 0);
      c.rotation.x = -Math.PI/2;
      c.visible=false;
      W.add(c);
      S.poker.community.push(c);
    }

    // halls + rooms + labels
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

      const frame=new THREE.Mesh(
        new THREE.BoxGeometry(hallW+0.6, 3.2, 0.08),
        new THREE.MeshStandardMaterial({ color:0x0b0b16, emissive:0x7fe7ff, emissiveIntensity:0.22, roughness:0.6, metalness:0.2 })
      );
      frame.position.set(doorPos.x, 2.1, doorPos.z);
      frame.rotation.y=d.yaw;
      W.add(frame);
    }

    // store shell
    buildStoreShell(S.rooms.store);

    // guard near VIP doorway
    const vipDoor = dirFromYaw(-Math.PI/2).multiplyScalar(lobbyRadius - 1.4);
    buildGuard(W, new THREE.Vector3(vipDoor.x, 0.02, vipDoor.z), new THREE.Vector3(0,0,0));

    // jumbotrons + music
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

    // dust motes
    buildDust(W);

    // spawn (VIP-ish side but inside lobby, stable)
    S.player.position.set(0,0.02,7.5);
    S.player.rotation.y = Math.PI;

    log("[world] built ✅ v5.2");
  }

  // ---------- admin ----------
  function teleportTo(key){
    const p = S.rooms[key]?.position;
    if(!p) return;
    S.player.position.set(p.x, 0.02, p.z + 2.5);
  }

  // ---------- public ----------
  return {
    async build(ctx){
      Object.assign(S, ctx);
      ensureRoot();
      S.ray = new S.THREE.Raycaster();
      ensureAimRing();

      // teleport smoothing state
      S.tp = {
        smooth: new S.THREE.Vector3(0, 0.01, 0),
        lastValid: new S.THREE.Vector3(0, 0.01, 0),
        cooldown: 0
      };

      buildWorld();
      updatePokerHUD();
      log("[world] build complete ✅ v5.2");
    },

    frame(ctx, dt){
      updateTeleport(ctx?.sticks, dt);
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
