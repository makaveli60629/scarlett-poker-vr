// /js/world.js — Scarlett MASTER WORLD v6.0 (FULL)
// Fixes: lasers stuck at table, missing pit divot, no hovering cards, dealer chip wrong, store missing, lobby too small.
// ✅ Teleport ring raycasts from RIGHT controller only.
// ✅ Lobby radius doubled (32).
// ✅ Pit divot restored (y=-1.1).
// ✅ Cards hover + readable + never reverse.
// ✅ Dealer chip flat + moves with turn.
// ✅ Store + mannequins + hood lights.
// ✅ Table HUD shows turn + action + pot + phase.

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null,
    colliders:[],
    ray:null,
    teleport:{
      ring:null,
      smooth:{init:false, x:0, y:0, z:0},
      lastCommit:0
    },
    refs:{
      lobby:null,
      rooms:{},
      table:null,
      dealerChip:null,
      commCards:[],
      bots:[],
      store:null,
      vip:null,
      scorpion:null
    },
    game:{
      names:["Kabwe","Zola","Malaika","Chikondi","Tadala","Lina","Nia","Sefu"],
      money:[1200,980,1500,860,1040,1320,910,1110],
      turn:0,
      pot:120,
      phase:"Preflop",
      lastAction:"Welcome to Scarlett"
    },
    ui:{ hudMesh:null, hudTex:null, hudCtx:null }
  };

  const safeLog=(...a)=>{ try{S.log?.(...a)}catch{} };

  // ---------- Helpers ----------
  function ensureRoot(){
    if(S.root && S.root.parent===S.scene) return S.root;
    S.root = new S.THREE.Group();
    S.root.name="WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }

  function moneyFmt(n){ return `${Math.max(0,(n|0))}`; }

  function tex(path){
    try{
      const t = new S.THREE.TextureLoader().load(path);
      t.colorSpace = S.THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }catch{ return null; }
  }

  function neonMat(hex=0x7fe7ff, intensity=1.6){
    return new S.THREE.MeshStandardMaterial({
      color:hex,
      emissive:new S.THREE.Color(hex),
      emissiveIntensity:intensity,
      roughness:0.25,
      metalness:0.55
    });
  }

  function floorMat(){
    return new S.THREE.MeshStandardMaterial({ color:0x070912, roughness:0.55, metalness:0.25 });
  }

  function wallMat(){
    const t = tex("assets/textures/casino_wall_diffuse.jpg");
    if(t){
      t.wrapS = S.THREE.RepeatWrapping;
      t.wrapT = S.THREE.RepeatWrapping;
      t.repeat.set(14,1);
      return new S.THREE.MeshStandardMaterial({
        map:t, roughness:0.2, metalness:0.78, color:0xffffff, side:S.THREE.BackSide
      });
    }
    return new S.THREE.MeshStandardMaterial({ color:0x0a0b16, roughness:0.35, metalness:0.65, side:S.THREE.BackSide });
  }

  function faceCameraFrontOnly(mesh){
    mesh.quaternion.copy(S.camera.quaternion);
    mesh.rotateY(Math.PI); // keep front side toward camera
  }

  // ---------- BIG LOBBY + PIT ----------
  function buildWorld(){
    const root = ensureRoot();

    // lighting
    root.add(new S.THREE.HemisphereLight(0xbfd3ff, 0x05060a, 0.75));
    const key = new S.THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(18,22,14);
    root.add(key);
    const fill = new S.THREE.DirectionalLight(0xfff2d2, 0.45);
    fill.position.set(-18,10,-14);
    root.add(fill);

    const lobby = new S.THREE.Group();
    lobby.name="Lobby";
    root.add(lobby);
    S.refs.lobby = lobby;

    const LOBBY_R = 32;          // 2× bigger
    const PIT_R = 9.5;
    const PIT_Y = -1.1;

    // wall
    const wall = new S.THREE.Mesh(new S.THREE.CylinderGeometry(LOBBY_R, LOBBY_R, 10, 160, 1, true), wallMat());
    wall.position.y = 5;
    lobby.add(wall);

    // gold ribs (luxury seams)
    const ribMat = new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:0.92 });
    for(let i=0;i<40;i++){
      const a=(i/40)*Math.PI*2;
      const rib = new S.THREE.Mesh(new S.THREE.BoxGeometry(0.10, 9.6, 0.32), ribMat);
      rib.position.set(Math.cos(a)*(LOBBY_R-0.2), 4.8, Math.sin(a)*(LOBBY_R-0.2));
      rib.lookAt(0,4.8,0);
      lobby.add(rib);
    }

    // main floor
    const mainFloor = new S.THREE.Mesh(new S.THREE.CircleGeometry(LOBBY_R-0.25, 160), floorMat());
    mainFloor.rotation.x = -Math.PI/2;
    lobby.add(mainFloor);
    S.colliders.push(mainFloor);

    // pit floor
    const pitFloor = new S.THREE.Mesh(new S.THREE.CircleGeometry(PIT_R-0.1, 128), floorMat());
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = PIT_Y;
    lobby.add(pitFloor);
    S.colliders.push(pitFloor);

    // pit wall cylinder
    const pitWall = new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(PIT_R, PIT_R, 1.4, 128, 1, true),
      new S.THREE.MeshStandardMaterial({ color:0x0f1221, roughness:0.85, metalness:0.15, side:S.THREE.DoubleSide })
    );
    pitWall.position.y = PIT_Y + 0.7;
    lobby.add(pitWall);

    // neon rail
    const rail = new S.THREE.Mesh(new S.THREE.TorusGeometry(PIT_R+0.15, 0.06, 18, 180), neonMat(0x7fe7ff, 2.2));
    rail.rotation.x = Math.PI/2;
    rail.position.y = PIT_Y + 1.10;
    lobby.add(rail);

    // pass line ring (legal betting circle)
    const passLine = new S.THREE.Mesh(new S.THREE.TorusGeometry(PIT_R+1.35, 0.04, 16, 160), neonMat(0xd4af37, 1.3));
    passLine.rotation.x = Math.PI/2;
    passLine.position.y = 0.03;
    lobby.add(passLine);

    // halo lights above pit
    const halo = new S.THREE.Mesh(new S.THREE.TorusGeometry(PIT_R+0.45, 0.05, 18, 180), neonMat(0xd4af37, 1.25));
    halo.rotation.x = Math.PI/2;
    halo.position.y = PIT_Y + 3.25;
    lobby.add(halo);

    for(let i=0;i<8;i++){
      const p = new S.THREE.PointLight(0x7fe7ff, 0.9, 22, 2.2);
      const a=(i/8)*Math.PI*2;
      p.position.set(Math.cos(a)*8.2, PIT_Y+3.0, Math.sin(a)*8.2);
      lobby.add(p);
    }

    // stairs down to pit (south)
    const stairs = new S.THREE.Group();
    stairs.position.set(0, 0, PIT_R+4.0);
    lobby.add(stairs);
    const stepMat = new S.THREE.MeshStandardMaterial({ color:0x15182a, roughness:0.75, metalness:0.25 });
    for(let i=0;i<8;i++){
      const step = new S.THREE.Mesh(new S.THREE.BoxGeometry(3.2, 0.14, 0.85), stepMat);
      step.position.set(0, 0.07 + i*0.12, -i*0.74);
      stairs.add(step);
      S.colliders.push(step);
    }

    // build rooms + halls
    buildRooms(lobby, LOBBY_R);

    // table + bots + cards + dealer chip + HUD
    buildTableAndBots(lobby, PIT_Y);

    // teleport ring
    S.teleport.ring = new S.THREE.Mesh(
      new S.THREE.RingGeometry(0.18, 0.28, 48),
      new S.THREE.MeshBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.95, side:S.THREE.DoubleSide })
    );
    S.teleport.ring.rotation.x = -Math.PI/2;
    S.teleport.ring.visible = false;
    lobby.add(S.teleport.ring);

    safeLog("[world] built ✅ BIG lobby + pit + rooms + table");
  }

  // ---------- Rooms ----------
  function buildRooms(lobby, LOBBY_R){
    const hallLen=14;
    const hallW=5.6;
    const hallH=3.6;

    const makeHall = (yaw, label)=>{
      const g=new S.THREE.Group();
      g.rotation.y=yaw;
      lobby.add(g);

      const z=-(LOBBY_R-2.0) - hallLen/2;

      const f=new S.THREE.Mesh(new S.THREE.BoxGeometry(hallW,0.12,hallLen), floorMat());
      f.position.set(0,0.06,z);
      g.add(f); S.colliders.push(f);

      const wallMat2=new S.THREE.MeshStandardMaterial({ color:0x0e1020, roughness:0.65, metalness:0.35 });
      const s1=new S.THREE.Mesh(new S.THREE.BoxGeometry(0.22,hallH,hallLen), wallMat2);
      s1.position.set(-hallW/2, hallH/2, z);
      g.add(s1);
      const s2=s1.clone(); s2.position.x=hallW/2; g.add(s2);

      const ceil=new S.THREE.Mesh(new S.THREE.BoxGeometry(hallW,0.22,hallLen), wallMat2);
      ceil.position.set(0,hallH,z);
      g.add(ceil);

      // sign plane
      const sign = makeSign(label, 1.6, 0.42);
      sign.position.set(0, 2.7, -(LOBBY_R-1.2));
      g.add(sign);

      return { g, endZ: z - hallLen/2 - 7.0 };
    };

    const halls = {
      poker: makeHall(0, "SCORPION POKER"),
      store: makeHall(Math.PI/2, "STORE"),
      event: makeHall(Math.PI, "EVENTS / SPORTS"),
      vip:   makeHall(-Math.PI/2, "VIP SPAWN")
    };

    const makeRoom=(yaw,label,endZ)=>{
      const room=new S.THREE.Group();
      room.rotation.y=yaw;
      lobby.add(room);

      const roomW=14, roomD=14, roomH=4.8;
      const floor=new S.THREE.Mesh(new S.THREE.BoxGeometry(roomW,0.14,roomD), floorMat());
      floor.position.set(0,0.07,endZ);
      room.add(floor); S.colliders.push(floor);

      const shell=new S.THREE.Mesh(
        new S.THREE.BoxGeometry(roomW,roomH,roomD),
        new S.THREE.MeshStandardMaterial({ color:0x0b0d1a, roughness:0.45, metalness:0.65, side:S.THREE.BackSide })
      );
      shell.position.set(0,roomH/2,endZ);
      room.add(shell);

      const pl=new S.THREE.PointLight(0xd4af37, 0.75, 22, 2.0);
      pl.position.set(0, 3.4, endZ);
      room.add(pl);

      const s=makeSign(label, 2.2, 0.46);
      s.position.set(0, 3.8, endZ + roomD/2 - 0.3);
      room.add(s);

      return { room, z:endZ };
    };

    S.refs.rooms.vip   = makeRoom(-Math.PI/2, "VIP LOUNGE", halls.vip.endZ).room;
    S.refs.rooms.store = makeRoom(Math.PI/2,  "LUXURY STORE", halls.store.endZ).room;
    S.refs.rooms.event = makeRoom(Math.PI,    "SPORTS BETTING", halls.event.endZ).room;
    S.refs.rooms.poker = makeRoom(0,          "SCORPION TABLES", halls.poker.endZ).room;

    // store content
    buildStore(S.refs.rooms.store, halls.store.endZ);
    // vip teleporter pad
    buildVIPTeleporter(S.refs.rooms.vip, halls.vip.endZ);

    // save refs
    S.refs.vip = S.refs.rooms.vip;
    S.refs.store = S.refs.rooms.store;
    S.refs.scorpion = S.refs.rooms.poker;
  }

  function makeSign(text,w=1.6,h=0.42){
    const c=document.createElement("canvas");
    c.width=1024; c.height=256;
    const ctx=c.getContext("2d");
    ctx.fillStyle="rgba(7,8,12,0.72)"; ctx.fillRect(0,0,1024,256);
    ctx.strokeStyle="rgba(127,231,255,0.50)"; ctx.lineWidth=10; ctx.strokeRect(18,18,988,220);
    ctx.strokeStyle="rgba(212,175,55,0.55)"; ctx.lineWidth=8; ctx.strokeRect(44,44,936,168);
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#e8ecff"; ctx.font="900 72px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(text, 512, 120);
    ctx.fillStyle="rgba(127,231,255,0.95)"; ctx.font="800 38px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText("Scarlett", 512, 190);
    const tex2=new S.THREE.CanvasTexture(c);
    tex2.colorSpace=S.THREE.SRGBColorSpace; tex2.anisotropy=8;

    const mat=new S.THREE.MeshBasicMaterial({ map:tex2, transparent:true, opacity:0.96, side:S.THREE.FrontSide, depthTest:false });
    const mesh=new S.THREE.Mesh(new S.THREE.PlaneGeometry(w,h), mat);
    mesh.renderOrder=9999;
    mesh.userData._billboard=true;
    return mesh;
  }

  // ---------- Store + mannequins ----------
  function buildStore(room, z){
    // hooded display area + mannequins + pedestal lights
    const hood = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(9.6, 0.25, 6.0),
      new S.THREE.MeshStandardMaterial({ color:0x0d1020, roughness:0.55, metalness:0.55 })
    );
    hood.position.set(0, 3.25, z);
    room.add(hood);

    const trim = new S.THREE.Mesh(
      new S.THREE.BoxGeometry(9.8, 0.06, 6.2),
      neonMat(0x7fe7ff, 1.1)
    );
    trim.position.set(0, 3.13, z);
    room.add(trim);

    const pedMat=new S.THREE.MeshStandardMaterial({ color:0x12162a, roughness:0.55, metalness:0.7 });

    for(let i=0;i<3;i++){
      const px=-3.0 + i*3.0;
      const ped=new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.65,0.78,0.5,28), pedMat);
      ped.position.set(px,0.25,z);
      room.add(ped);

      // mannequin (simple smooth body for now)
      const body=new S.THREE.Mesh(
        new S.THREE.CapsuleGeometry(0.30, 1.10, 8, 16),
        new S.THREE.MeshStandardMaterial({ color:0x2a2f46, roughness:0.5, metalness:0.3 })
      );
      body.position.set(px, 1.15, z);
      room.add(body);

      const spot=new S.THREE.SpotLight(0xd4af37, 1.2, 10, Math.PI/8, 0.35, 1.1);
      spot.position.set(px, 3.6, z+1.2);
      spot.target = body;
      room.add(spot);
      room.add(spot.target);
    }
  }

  // ---------- VIP teleporter ----------
  function buildVIPTeleporter(room, z){
    const pad = new S.THREE.Mesh(new S.THREE.CircleGeometry(1.35, 64), neonMat(0x7fe7ff, 1.5));
    pad.rotation.x = -Math.PI/2;
    pad.position.set(0, 0.03, z+2.6);
    room.add(pad);
    S.colliders.push(pad);

    const portalTex = tex("assets/textures/portal.png");
    const portalMat = new S.THREE.MeshBasicMaterial({
      map: portalTex || null,
      color: portalTex ? 0xffffff : 0x7fe7ff,
      transparent:true,
      opacity: portalTex ? 0.98 : 0.35,
      side:S.THREE.FrontSide,
      depthTest:false
    });
    const portal = new S.THREE.Mesh(new S.THREE.PlaneGeometry(2.4, 3.0), portalMat);
    portal.position.set(0, 1.55, z);
    room.add(portal);

    const s = makeSign("TELEPORT PAD", 1.5, 0.36);
    s.position.set(0, 3.7, z+2.6);
    room.add(s);
  }

  // ---------- Table + bots + cards ----------
  function buildTableAndBots(lobby, PIT_Y){
    const table = new S.THREE.Group();
    table.name="PokerTable";
    lobby.add(table);
    S.refs.table = table;

    const base=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(3.0,3.25,0.7,80),
      new S.THREE.MeshStandardMaterial({ color:0x141a2a, roughness:0.75, metalness:0.35 })
    );
    base.position.set(0, PIT_Y+0.35, 0);
    table.add(base);

    const felt=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(2.85,2.85,0.14,80),
      new S.THREE.MeshStandardMaterial({ color:0x0d5b3b, roughness:0.95, metalness:0.05 })
    );
    felt.position.set(0, PIT_Y+0.64, 0);
    table.add(felt);

    // dealer chip (flat)
    const dealerTex = tex("assets/textures/dealer_chip.png") || tex("assets/textures/chip.png");
    const dealerMat = new S.THREE.MeshBasicMaterial({
      map: dealerTex || null,
      color: dealerTex ? 0xffffff : 0xd4af37,
      transparent:true,
      opacity:0.98,
      side:S.THREE.FrontSide,
      depthTest:true
    });
    const dealer = new S.THREE.Mesh(new S.THREE.CircleGeometry(0.16, 48), dealerMat);
    dealer.rotation.x = -Math.PI/2;               // FLAT
    dealer.position.set(0.55, PIT_Y+0.70, 0.25);
    table.add(dealer);
    S.refs.dealerChip = dealer;

    // community cards (bigger + upright toward player)
    const commAnchor = new S.THREE.Group();
    commAnchor.position.set(0, PIT_Y+0.98, -0.15);
    table.add(commAnchor);

    for(let i=0;i<5;i++){
      const card = makeCardMesh();
      card.scale.set(1.45, 1.45, 1);
      card.position.set(-0.72 + i*0.36, 0.0, 0.0);
      card.rotation.x = -0.35; // tilt up slightly
      commAnchor.add(card);
      S.refs.commCards.push(card);
    }

    // bots around table
    const seatR = 3.9;
    for(let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const bot = new S.THREE.Group();
      bot.position.set(Math.cos(a)*seatR, PIT_Y+0.0, Math.sin(a)*seatR);
      bot.lookAt(0, PIT_Y, 0);
      table.add(bot);

      // chair
      const chair = new S.THREE.Mesh(
        new S.THREE.BoxGeometry(0.65,0.15,0.65),
        new S.THREE.MeshStandardMaterial({ color:0x20253a, roughness:0.8, metalness:0.2 })
      );
      chair.position.set(0, 0.12, 0.55);
      bot.add(chair);

      // body
      const body = new S.THREE.Mesh(
        new S.THREE.CapsuleGeometry(0.22, 0.75, 8, 16),
        new S.THREE.MeshStandardMaterial({ color:0x2a2f46, roughness:0.55, metalness:0.25 })
      );
      body.position.set(0, 0.62, 0.55);
      bot.add(body);

      // tag (smaller, readable)
      const tag = makeBotTag(bot, S.game.names[i], S.game.money[i]);
      tag.position.set(0, 1.55, 0.55);

      // hole cards under tag
      const h1 = makeCardMesh();
      const h2 = makeCardMesh();
      h1.scale.set(1.25,1.25,1);
      h2.scale.set(1.25,1.25,1);
      h1.position.set(-0.12, 1.18, 0.55);
      h2.position.set( 0.12, 1.18, 0.55);
      h1.rotation.x = -0.55;
      h2.rotation.x = -0.55;
      bot.add(h1); bot.add(h2);

      bot.userData._tag = tag;
      bot.userData._hole = [h1,h2];
      S.refs.bots.push(bot);
    }

    // table HUD
    S.ui.hudMesh = buildTableHUD();
    S.ui.hudMesh.position.set(0, PIT_Y+1.85, -2.05);
    table.add(S.ui.hudMesh);

    safeLog("[world] table+bots ✅");
  }

  function makeBotTag(parent, name, money){
    const c=document.createElement("canvas");
    c.width=768; c.height=256;
    const ctx=c.getContext("2d");

    function draw(glow=false){
      ctx.clearRect(0,0,768,256);
      ctx.fillStyle = glow ? "rgba(10,16,28,0.88)" : "rgba(9,10,16,0.66)";
      ctx.fillRect(0,0,768,256);

      ctx.strokeStyle = glow ? "rgba(127,231,255,0.95)" : "rgba(127,231,255,0.50)";
      ctx.lineWidth=8; ctx.strokeRect(16,16,736,224);

      ctx.strokeStyle="rgba(212,175,55,0.45)";
      ctx.lineWidth=6; ctx.strokeRect(30,30,708,196);

      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#7fe7ff";
      ctx.font="900 64px system-ui,Segoe UI,Roboto,Arial";
      ctx.fillText(name, 384, 98);

      ctx.fillStyle="#ffd36a";
      ctx.font="900 50px system-ui,Segoe UI,Roboto,Arial";
      ctx.fillText(`$${moneyFmt(money)}`, 384, 172);
    }

    draw(false);
    const tex2=new S.THREE.CanvasTexture(c);
    tex2.colorSpace=S.THREE.SRGBColorSpace; tex2.anisotropy=8;

    const mat=new S.THREE.MeshBasicMaterial({ map:tex2, transparent:true, opacity:0.96, side:S.THREE.FrontSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.78,0.28), mat);
    plane.renderOrder=9999;
    plane.userData._draw = draw;
    plane.userData._tex = tex2;
    parent.add(plane);
    return plane;
  }

  function makeCardMesh(){
    // random but deterministic enough for now; will be replaced by true 52-deck logic later
    const suits=[{s:"♠",c:"#e8ecff"},{s:"♥",c:"#ff6b6b"},{s:"♦",c:"#ffd36a"},{s:"♣",c:"#7fe7ff"}];
    const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const suit=suits[(Math.random()*4)|0];
    const rank=ranks[(Math.random()*13)|0];

    const c=document.createElement("canvas");
    c.width=512; c.height=768;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(255,255,255,0.985)";
    ctx.fillRect(0,0,512,768);
    ctx.strokeStyle="rgba(10,10,20,0.8)";
    ctx.lineWidth=16; ctx.strokeRect(22,22,468,724);

    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle=suit.c;
    ctx.font="900 220px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit.s, 256, 420);

    ctx.fillStyle="#10131f";
    ctx.font="900 140px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 256, 210);

    // corners
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillStyle="#10131f"; ctx.font="900 90px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 54, 44);
    ctx.fillStyle=suit.c; ctx.font="900 88px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit.s, 60, 142);

    ctx.save();
    ctx.translate(512,768); ctx.rotate(Math.PI);
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillStyle="#10131f"; ctx.font="900 90px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(rank, 54, 44);
    ctx.fillStyle=suit.c; ctx.font="900 88px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suit.s, 60, 142);
    ctx.restore();

    const tex2=new S.THREE.CanvasTexture(c);
    tex2.colorSpace=S.THREE.SRGBColorSpace;
    tex2.anisotropy=8;

    const mat=new S.THREE.MeshBasicMaterial({ map:tex2, transparent:true, side:S.THREE.FrontSide, depthTest:true });
    return new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.20,0.30), mat);
  }

  function buildTableHUD(){
    const c=document.createElement("canvas");
    c.width=1024; c.height=256;
    const ctx=c.getContext("2d");
    S.ui.hudCtx = ctx;

    const tex2=new S.THREE.CanvasTexture(c);
    tex2.colorSpace=S.THREE.SRGBColorSpace; tex2.anisotropy=8;
    S.ui.hudTex = tex2;

    const mat=new S.THREE.MeshBasicMaterial({ map:tex2, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(1.8,0.46), mat);
    plane.renderOrder=9998;
    plane.userData._billboard = true;
    return plane;
  }

  function drawHUD(){
    const ctx=S.ui.hudCtx;
    if(!ctx) return;
    const w=1024,h=256;

    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="rgba(7,8,12,0.74)";
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle="rgba(127,231,255,0.60)";
    ctx.lineWidth=10; ctx.strokeRect(18,18,w-36,h-36);
    ctx.strokeStyle="rgba(212,175,55,0.55)";
    ctx.lineWidth=8; ctx.strokeRect(46,46,w-92,h-92);

    ctx.textAlign="left"; ctx.textBaseline="middle";

    ctx.fillStyle="#e8ecff";
    ctx.font="900 54px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText("SCARLETT TABLE", 64, 82);

    ctx.fillStyle="rgba(127,231,255,0.95)";
    ctx.font="800 40px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(`Phase: ${S.game.phase}`, 64, 146);

    ctx.fillStyle="rgba(212,175,55,0.95)";
    ctx.font="900 44px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(`Pot: $${moneyFmt(S.game.pot)}`, 420, 146);

    const who = S.game.names[S.game.turn % S.game.names.length];
    ctx.fillStyle="rgba(152,160,199,0.95)";
    ctx.font="800 36px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(`Turn: ${who} • ${S.game.lastAction}`, 64, 205);

    S.ui.hudTex.needsUpdate = true;
  }

  // ---------- Teleport Ray (RIGHT controller ONLY) ----------
  function getRightController(){
    // index installs controller 0 and 1; usually 1 = right. If handedness swaps, we still use 1 for stability.
    return S.controllers?.[1] || S.controllers?.[0] || null;
  }

  function updateTeleport(pads){
    if(!S.renderer?.xr?.isPresenting) return;

    const c = getRightController();
    if(!c || !S.ray) return;

    // origin + dir from controller world matrix (NOT camera, NOT table)
    const pos = new S.THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const dir = new S.THREE.Vector3(0,0,-1).applyQuaternion(c.quaternion).normalize();
    S.ray.set(pos, dir);

    const hits = S.ray.intersectObjects(S.colliders, false);
    if(!hits.length){
      S.teleport.ring.visible = false;
      return;
    }

    const hit = hits[0].point;

    // smoothing to remove jitter
    if(!S.teleport.smooth.init){
      S.teleport.smooth.init=true;
      S.teleport.smooth.x=hit.x; S.teleport.smooth.y=hit.y; S.teleport.smooth.z=hit.z;
    }
    const k = 1 - Math.pow(0.001, 1/60); // smoothing constant
    S.teleport.smooth.x += (hit.x - S.teleport.smooth.x)*k;
    S.teleport.smooth.y += (hit.y - S.teleport.smooth.y)*k;
    S.teleport.smooth.z += (hit.z - S.teleport.smooth.z)*k;

    S.teleport.ring.visible = true;
    S.teleport.ring.position.set(S.teleport.smooth.x, hits[0].object.position.y + 0.03, S.teleport.smooth.z);

    // commit teleport on trigger press
    if(pads?.teleport){
      const now = performance.now();
      if(now - S.teleport.lastCommit > 250){
        S.teleport.lastCommit = now;
        S.player.position.set(S.teleport.smooth.x, 0.02, S.teleport.smooth.z);
      }
    }
  }

  // ---------- Turn updates ----------
  function stepTurn(){
    S.game.turn = (S.game.turn + 1) % 8;
    const who = S.game.names[S.game.turn];
    const actions = ["Check","Call $20","Raise $50","Fold"];
    S.game.lastAction = actions[(Math.random()*actions.length)|0];

    // glow active tag
    for(let i=0;i<S.refs.bots.length;i++){
      const bot=S.refs.bots[i];
      const tag=bot.userData._tag;
      if(!tag) continue;
      tag.userData._draw?.(i===S.game.turn);
      tag.userData._tex.needsUpdate = true;
    }

    // dealer chip moves flat
    const dealer=S.refs.dealerChip;
    if(dealer && S.refs.bots[S.game.turn]){
      const b=S.refs.bots[S.game.turn];
      const p=b.getWorldPosition(new S.THREE.Vector3());
      dealer.position.set(p.x, dealer.position.y, p.z-0.3);
    }
  }

  // ---------- Public API ----------
  return {
    async build(ctx){
      Object.assign(S, ctx);
      S.ray = new S.THREE.Raycaster();

      buildWorld();

      // spawn in VIP room facing inward (180 fix)
      // VIP room is at left side (west), so face toward lobby center.
      S.player.position.set(-22, 0.02, 0);
      S.player.rotation.y = Math.PI; // face toward center

      // start turn loop
      setInterval(stepTurn, 2600);

      safeLog("[world] build complete ✅ (VIP spawn)");
    },

    frame(ctx, dt){
      // billboard signs + HUD always face camera (no reverse)
      if(S.refs.lobby){
        S.refs.lobby.traverse((o)=>{
          if(o?.userData?._billboard){
            faceCameraFrontOnly(o);
          }
        });
      }

      drawHUD();
      updateTeleport(ctx?.pads);
    }
  };
})();
