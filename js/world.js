// /js/world.js — Scarlett MASTER WORLD v5.0 (FULL WORLD PACK)
// ✅ Head-aim teleport ring (never stuck)
// ✅ Trigger press teleports (works even when sticks fail)
// ✅ Circular lobby + pit + guard rail + stairs
// ✅ 4 halls + 4 rooms + floors
// ✅ Table + chairs + cards + chips
// ✅ Seated bots with tags + simple hands
// ✅ Walker bots wander lobby
// ✅ Simple poker loop: deal -> bet chips -> clear -> repeat
// ✅ Music (HLS) on jumbotrons + spatial-ish volume falloff

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null, lobby:null,
    floorMain:null, floorPit:null, ground:null,
    ray:null, aimRing:null, _teleLatch:false,
    refs:{ stream:null, jumbotrons:[] },
    bots:{ seated:[], walkers:[] },
    poker:{ t:0, phase:"deal", hand:0, pot:0, dealer:0 }
  };

  const log = (...a)=>{ try{ S.log?.(...a);}catch{} };

  // ---------- helpers ----------
  function ensureRoot(){
    const THREE=S.THREE;
    if(S.root && S.root.parent===S.scene) return S.root;
    S.root=new THREE.Group(); S.root.name="WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }

  function killSceneName(name){
    const o=S.scene.getObjectByName(name);
    if(o && o.parent) o.parent.remove(o);
  }

  function ensureAimRing(){
    const THREE=S.THREE;
    const existing=S.scene.getObjectByName("TeleportAimRing");
    if(existing){ S.aimRing=existing; return; }

    const geo=new THREE.RingGeometry(0.22,0.32,128);
    const mat=new THREE.MeshBasicMaterial({ color:0x00ff7f, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    const ring=new THREE.Mesh(geo, mat);
    ring.name="TeleportAimRing";
    ring.rotation.x=-Math.PI/2;
    ring.visible=false;
    S.scene.add(ring);
    S.aimRing=ring;
  }

  function dirFromYaw(yaw){
    const THREE=S.THREE;
    return new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  }

  // ---------- materials ----------
  function wallMat(){
    const THREE=S.THREE;
    const tex=new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy = 16;
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.18,
      metalness: 0.55,
      color: 0xffffff,
      side: THREE.BackSide
    });
  }

  const matFloor = ()=> new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.92, metalness:0.05 });
  const matGold  = ()=> new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matFelt  = ()=> new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });
  const matDark  = ()=> new S.THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:S.THREE.DoubleSide });

  const matHall  = ()=> new S.THREE.MeshStandardMaterial({
    color:0x090a12, roughness:0.9, metalness:0.1,
    side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55
  });
  const matRoom  = ()=> new S.THREE.MeshStandardMaterial({
    color:0x070711, roughness:0.86, metalness:0.1,
    side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55
  });

  // ---------- labels/tags ----------
  function makeTagTexture(text){
    const THREE=S.THREE;
    const canvas=document.createElement("canvas");
    canvas.width=512; canvas.height=256;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="rgba(10,12,18,0.78)";
    ctx.fillRect(0,0,512,256);
    ctx.strokeStyle="rgba(127,231,255,0.55)";
    ctx.lineWidth=8;
    ctx.strokeRect(12,12,488,232);
    ctx.fillStyle="#e8ecff";
    ctx.font="bold 68px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(text,256,128);

    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addDoorLabel(text, pos, yaw){
    const THREE=S.THREE;
    const tex=makeTagTexture(text);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7), mat);
    plane.position.copy(pos);
    plane.position.y += 2.6;
    plane.rotation.y = yaw + Math.PI;
    S.lobby.add(plane);
  }

  function addNameTag(parent, name){
    const THREE=S.THREE;
    const tex=makeTagTexture(name);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.4), mat);
    plane.position.set(0, 1.35, 0);
    plane.renderOrder = 999;
    parent.add(plane);
    plane.userData._tag = true;
    return plane;
  }

  // ---------- stream ----------
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

  // ---------- content builders ----------
  function buildStairs(root, startZ, steps, drop, width){
    const THREE=S.THREE;
    const g=new THREE.Group(); g.name="PitStairs";
    const mat=new THREE.MeshStandardMaterial({ color:0x141622, roughness:0.9, metalness:0.12 });

    // steps go down into pit
    for(let i=0;i<steps;i++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.85), mat);
      step.position.set(0, 0.07 - (drop/steps)*i, startZ - 0.85*i);
      g.add(step);
    }
    root.add(g);
    return g;
  }

  function buildGuardRail(root, radius){
    const THREE=S.THREE;
    const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.085, 16, 260), matGold());
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.95;
    root.add(rail);

    // small posts
    const postMat = new THREE.MeshStandardMaterial({ color:0x181a22, roughness:0.6, metalness:0.35 });
    for(let i=0;i<24;i++){
      const a=(i/24)*Math.PI*2;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.8,16), postMat);
      post.position.set(Math.cos(a)*(radius-0.02), 0.4, Math.sin(a)*(radius-0.02));
      root.add(post);
    }
  }

  function buildTable(root, y){
    const THREE=S.THREE;

    const table=new THREE.Group();
    table.name="CenterTable";
    table.position.set(0,y,0);

    const base=new THREE.Mesh(
      new THREE.CylinderGeometry(1.45,1.75,0.34,80),
      new THREE.MeshStandardMaterial({ color:0x0d0d14, roughness:0.65, metalness:0.18 })
    );
    base.position.y=0.16;
    table.add(base);

    const top=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.25,0.2,120), matFelt());
    top.position.y=0.42;
    table.add(top);

    const edge=new THREE.Mesh(new THREE.TorusGeometry(2.2,0.05,16,220), matGold());
    edge.rotation.x=Math.PI/2;
    edge.position.y=0.50;
    table.add(edge);

    root.add(table);
    return table;
  }

  function buildChairsAndSeatedBots(table){
    const THREE=S.THREE;

    const seatMat=new THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.84, metalness:0.12 });
    const bodyMat=new THREE.MeshStandardMaterial({ color:0x181827, roughness:0.85, metalness:0.08 });
    const headMat=new THREE.MeshStandardMaterial({ color:0x232336, roughness:0.78, metalness:0.08 });
    const handMat=new THREE.MeshStandardMaterial({ color:0x2b2b40, roughness:0.7, metalness:0.1 });

    const names=["Kabwe","Zola","Mya","Tasha","Rafi","Nina","Jett","Omar"];

    const seated=[];
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const r=3.05;

      const chair=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.8,0.58), seatMat);
      chair.position.set(Math.cos(a)*r, 0.40, Math.sin(a)*r);
      chair.lookAt(0,0.40,0);
      table.add(chair);

      const bot=new THREE.Group();
      bot.name=`SeatedBot_${names[i]}`;
      bot.position.set(Math.cos(a)*(r+0.35), 0.02, Math.sin(a)*(r+0.35));
      bot.lookAt(0,0.02,0); // face center

      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.16,0.45,6,12), bodyMat);
      body.position.y=0.60; bot.add(body);

      const head=new THREE.Mesh(new THREE.SphereGeometry(0.14,18,14), headMat);
      head.position.y=1.00; bot.add(head);

      // simple hands hovering near table edge
      const hL=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,12), handMat);
      const hR=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,12), handMat);
      hL.position.set(-0.12, 0.62, -0.18);
      hR.position.set( 0.12, 0.62, -0.18);
      bot.add(hL); bot.add(hR);

      // name tag
      const tag = addNameTag(bot, names[i]);

      table.add(bot);

      seated.push({
        name:names[i],
        group:bot,
        tag,
        seatAngle:a,
        chips:[],
        handCards:[],
        stackValue:1000
      });
    }

    S.bots.seated = seated;
    return seated;
  }

  function buildCommunityCards(table){
    const THREE=S.THREE;
    const cardMat=new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.65, metalness:0.0, side:THREE.DoubleSide });
    const cards=[];
    for(let i=0;i<5;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.34), cardMat);
      c.rotation.x=-Math.PI/2;
      c.position.set((i-2)*0.28, 0.52, 0);
      c.visible=false;
      table.add(c);
      cards.push(c);
    }
    return cards;
  }

  function buildChipSet(root){
    const THREE=S.THREE;
    const chipGeo=new THREE.CylinderGeometry(0.055,0.055,0.018,24);
    const mats=[
      new THREE.MeshStandardMaterial({ color:0xff2d7a, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.35, metalness:0.2 }),
      new THREE.MeshStandardMaterial({ color:0x00ff7f, roughness:0.35, metalness:0.2 }),
    ];
    return { chipGeo, mats };
  }

  function spawnWalkerBots(root, lobbyRadius){
    const THREE=S.THREE;
    const walkers=[];
    const bodyMat=new THREE.MeshStandardMaterial({ color:0x151528, roughness:0.85, metalness:0.08 });
    const headMat=new THREE.MeshStandardMaterial({ color:0x24243a, roughness:0.78, metalness:0.08 });

    const names=["Asha","Mako","Vee","Sol"];
    for(let i=0;i<4;i++){
      const g=new THREE.Group();
      g.name=`Walker_${names[i]}`;
      g.position.set((Math.random()-0.5)*6, 0.02, (Math.random()-0.5)*6);

      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.17,0.52,6,12), bodyMat);
      body.position.y=0.65; g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.15,18,14), headMat);
      head.position.y=1.08; g.add(head);

      addNameTag(g, names[i]);

      root.add(g);

      walkers.push({
        name:names[i],
        group:g,
        theta:Math.random()*Math.PI*2,
        speed:0.35 + Math.random()*0.25,
        radius:(lobbyRadius-2.0) - Math.random()*2.0
      });
    }

    S.bots.walkers = walkers;
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

    // Lights
    W.add(new THREE.AmbientLight(0xffffff, 0.18));
    const key=new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(7,14,5);
    W.add(key);

    const cyan=new THREE.PointLight(0x7fe7ff, 0.22, 70);
    cyan.position.set(0,6,0);
    W.add(cyan);

    const warm=new THREE.PointLight(0xffc890, 0.14, 55);
    warm.position.set(0,4.2,0);
    W.add(warm);

    // Dimensions
    const lobbyRadius=12.0, wallHeight=8.0, doorGap=THREE.MathUtils.degToRad(30);
    const pitRadius=4.2, pitDepth=0.85;

    const hallLen=10.0, hallW=4.2, hallH=4.8;
    const roomW=13.0, roomD=13.0, roomH=6.6;

    // Wall arcs with 4 openings
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

    // Lobby floor ring + pit floor
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

    // Pit wall
    const pitWall=new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 160, 1, true),
      matDark()
    );
    pitWall.position.y=-pitDepth/2;
    W.add(pitWall);

    // Guard rail + stairs
    buildGuardRail(W, pitRadius+0.25);
    buildStairs(W, 18.0, 10, pitDepth, 3.2);

    // Table
    const table = buildTable(W, -pitDepth + 0.02);

    // Community cards
    const communityCards = buildCommunityCards(table);

    // Chairs + bots
    const seated = buildChairsAndSeatedBots(table);

    // Chip assets
    const chipKit = buildChipSet(W);

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

      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      addDoorLabel(d.label, doorPos, d.yaw);

      const frame=new THREE.Mesh(
        new THREE.BoxGeometry(hallW+0.6, 3.2, 0.08),
        new THREE.MeshStandardMaterial({ color:0x0b0b16, emissive:0x7fe7ff, emissiveIntensity:0.18, roughness:0.6, metalness:0.2 })
      );
      frame.position.set(doorPos.x, 2.1, doorPos.z);
      frame.rotation.y=d.yaw;
      W.add(frame);
    }

    // Jumbotrons
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

    // Walker bots
    spawnWalkerBots(W, lobbyRadius);

    // Save poker assets into S for runtime
    S.poker.communityCards = communityCards;
    S.poker.table = table;
    S.poker.chipKit = chipKit;

    // Spawn player in lobby
    S.player.position.set(0,0.02,7.5);
    S.player.rotation.y = Math.PI;

    log("[world] built ✅ v5.0 FULL");
  }

  // ---------- teleport (head-aim + trigger press) ----------
  function pressedFromSticks(sticks){
    try{
      const a = sticks?.left?.gamepad?.buttons?.[0]?.pressed;
      const b = sticks?.right?.gamepad?.buttons?.[0]?.pressed;
      // also accept A/X (buttons[4] sometimes)
      const c = sticks?.left?.gamepad?.buttons?.[4]?.pressed;
      const d = sticks?.right?.gamepad?.buttons?.[4]?.pressed;
      return !!(a || b || c || d);
    } catch { return false; }
  }

  function updateTeleport(sticks){
    if(!S.ray) return;
    ensureAimRing();

    const targets=[S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if(!targets.length) return;

    // ✅ Aim from headset (camera) — never stuck to table
    S.camera.updateMatrixWorld(true);
    const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir = new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();

    S.ray.set(camPos, camDir);
    const hits = S.ray.intersectObjects(targets, false);

    if(!hits.length){
      S.aimRing.visible=false;
      S._teleLatch=false;
      return;
    }

    const p=hits[0].point;
    S.aimRing.visible=true;
    S.aimRing.position.set(p.x, 0.01, p.z);

    const press = pressedFromSticks(sticks);
    if(press && !S._teleLatch){
      S._teleLatch=true;
      S.player.position.set(p.x, 0.02, p.z);

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

  // ---------- Poker Loop (simple but fun) ----------
  function clearAllCardsAndChips(){
    const table=S.poker.table;
    if(!table) return;

    // hide community cards
    for(const c of (S.poker.communityCards||[])) c.visible=false;

    // remove bot chips + hand cards
    for(const b of S.bots.seated){
      for(const c of b.chips) { if(c.parent) c.parent.remove(c); }
      b.chips.length=0;
      for(const hc of b.handCards) { if(hc.parent) hc.parent.remove(hc); }
      b.handCards.length=0;
    }
  }

  function spawnCard(table, x,z, y=0.52){
    const THREE=S.THREE;
    const mat=new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.65, metalness:0.0, side:THREE.DoubleSide });
    const c=new THREE.Mesh(new THREE.PlaneGeometry(0.22,0.32), mat);
    c.rotation.x=-Math.PI/2;
    c.position.set(x,y,z);
    table.add(c);
    return c;
  }

  function dealHand(){
    const table=S.poker.table;
    if(!table) return;

    clearAllCardsAndChips();

    // show 3 community cards first (flop)
    for(let i=0;i<3;i++){
      const cc = S.poker.communityCards[i];
      cc.visible=true;
    }

    // deal two cards to each bot (in front of them)
    for(let i=0;i<S.bots.seated.length;i++){
      const b=S.bots.seated[i];
      const a=b.seatAngle;
      const px = Math.cos(a)*1.65;
      const pz = Math.sin(a)*1.65;
      const c1 = spawnCard(table, px-0.08, pz-0.08, 0.52);
      const c2 = spawnCard(table, px+0.08, pz-0.08, 0.52);
      b.handCards.push(c1,c2);
    }

    S.poker.pot = 0;
    S.poker.phase = "bet";
  }

  function betRound(dt){
    const table=S.poker.table;
    const { chipGeo, mats } = S.poker.chipKit || {};
    if(!table || !chipGeo) return;

    // each bot occasionally throws a chip into pot area
    for(const b of S.bots.seated){
      if(Math.random() < 0.06){ // subtle
        const m = mats[Math.floor(Math.random()*mats.length)];
        const chip = new S.THREE.Mesh(chipGeo, m);
        chip.rotation.x = Math.PI/2;

        // start near bot, animate toward center
        const a=b.seatAngle;
        chip.position.set(Math.cos(a)*1.85, 0.56, Math.sin(a)*1.85);

        chip.userData.vx = (0 - chip.position.x) * (0.7 + Math.random()*0.5);
        chip.userData.vz = (0 - chip.position.z) * (0.7 + Math.random()*0.5);
        chip.userData.t = 0;

        table.add(chip);
        b.chips.push(chip);

        S.poker.pot += 10;
      }
    }

    // animate chips toward center
    for(const b of S.bots.seated){
      for(const chip of b.chips){
        chip.userData.t += dt;
        const k = Math.min(1, chip.userData.t * 1.8);
        chip.position.x += chip.userData.vx * dt * 0.15;
        chip.position.z += chip.userData.vz * dt * 0.15;
        chip.position.y = 0.56 + Math.sin(k*Math.PI)*0.06;
      }
    }

    // after some time, reveal turn/river
    S.poker.t += dt;
    if(S.poker.t > 6.5){
      S.poker.t = 0;
      S.poker.phase = "reveal";
    }
  }

  function revealNext(){
    // show remaining community cards
    const cards = S.poker.communityCards || [];
    for(let i=0;i<cards.length;i++){
      cards[i].visible = true;
    }
    S.poker.phase = "showdown";
    S.poker.t = 0;
  }

  function showdown(dt){
    S.poker.t += dt;
    if(S.poker.t > 3.5){
      S.poker.hand += 1;
      S.poker.phase = "deal";
      S.poker.t = 0;
    }
  }

  // ---------- Walkers ----------
  function updateWalkers(dt){
    const THREE=S.THREE;
    const list=S.bots.walkers;
    if(!list?.length) return;

    for(const w of list){
      w.theta += dt * w.speed * 0.55;
      const x = Math.cos(w.theta) * w.radius;
      const z = Math.sin(w.theta) * w.radius;
      const g = w.group;
      g.position.x = x;
      g.position.z = z;

      // face tangent direction
      const tx = -Math.sin(w.theta);
      const tz =  Math.cos(w.theta);
      g.rotation.y = Math.atan2(tx, tz);

      // gentle bob
      g.position.y = 0.02 + Math.sin((w.theta*2.0)) * 0.01;
    }
  }

  // tags always face camera
  function faceTagsToCamera(){
    const cam=S.camera;
    cam.updateMatrixWorld(true);
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);

    S.lobby?.traverse?.((o)=>{
      if(o.userData?._tag){
        o.lookAt(camPos);
      }
    });
    // bot tags are children; traverse above catches them too
  }

  // ---------- main ----------
  return {
    async build(ctx){
      Object.assign(S, ctx);
      log("[world] build() start…");
      ensureRoot();
      S.ray = new S.THREE.Raycaster();
      killSceneName("TeleportAimRing");
      buildWorld();
      ensureAimRing();
      log("[world] build complete ✅");
    },

    frame(ctx, dt){
      // teleport
      updateTeleport(ctx?.sticks);

      // audio
      updateAudio();

      // make tags face camera
      faceTagsToCamera();

      // walkers
      updateWalkers(dt);

      // poker loop
      if(S.poker.phase === "deal"){
        S.poker.t += dt;
        if(S.poker.t > 1.2){
          S.poker.t = 0;
          dealHand();
        }
      } else if(S.poker.phase === "bet"){
        betRound(dt);
      } else if(S.poker.phase === "reveal"){
        revealNext();
      } else if(S.poker.phase === "showdown"){
        showdown(dt);
      }
    }
  };
})();
