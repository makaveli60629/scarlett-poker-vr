// /js/world.js — Scarlett MASTER WORLD (Update 4.8 FULL, v5.0 polish)
// ✅ Single-scene, modular factories, no reverse text, VIP spawn + pad
// ✅ Right-hand teleport ring (stable + smoothed), 52-card deck (no dupes)
// ✅ Luxury lighting: pillars, halo lights, fountain, colored rooms
// ✅ VIP Legends display, welcome panel, bot tags w/ money, wrist OS

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null,
    log:console.log,
    root:null,
    ray:null,
    floorHits:[],
    marker:null,
    markerTarget:null,
    markerVel:null,

    refs:{ lobby:null, rooms:{}, hallways:{}, jumbos:[] },
    roomDefs: [
      { key:"vip",   name:"VIP",   yaw:0 },
      { key:"store", name:"STORE", yaw:Math.PI/2 },
      { key:"event", name:"EVENT", yaw:Math.PI },
      { key:"poker", name:"POKER", yaw:-Math.PI/2 },
    ],

    // systems
    uiWrist:null,
    playerStats:{ name:"Player One", rank:"Bronze I", money:100000, eventChips:12 },

    // poker
    poker:{
      bots:[],
      deck:[],
      community:[],
      phase:"preflop",
      pot:0,
      t:0,
      turn:0,
      heroSeat:0,
      seats:[]
    },

    // audio
    audio:{ el:null, gain:1, started:false },

    // visuals
    _vipTimeAcc:0,
    _vipWelcomePlane:null,
    _fountainWater:null
  };

  const log = (...a)=>{ try{ S.log?.(...a); }catch{} };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  // ---------- Materials ----------
  function matGold(){
    return new S.THREE.MeshStandardMaterial({
      color:0xd4af37, roughness:0.22, metalness:0.92,
      emissive:0x140f04, emissiveIntensity:0.15
    });
  }
  function matMidnight(){
    return new S.THREE.MeshStandardMaterial({
      color:0x070812, roughness:0.65, metalness:0.25,
      emissive:0x05060a, emissiveIntensity:0.10
    });
  }

  function getCasinoWallMaterial(){
    const THREE=S.THREE;
    const tl=new THREE.TextureLoader();
    const tex=tl.load("assets/textures/casino_wall_diffuse.jpg", ()=>{}, ()=>{}, ()=>{});
    tex.wrapS=THREE.RepeatWrapping;
    tex.wrapT=THREE.ClampToEdgeWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy=16;
    return new THREE.MeshStandardMaterial({
      map:tex,
      roughness:0.18,
      metalness:0.75,
      color:0xffffff,
      side:THREE.BackSide
    });
  }

  // ---------- UI Canvas Tex ----------
  function moneyFmt(n){ return `${Math.max(0, (n|0))}`; }

  function makeMiniHUDTex(lines){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=1024; c.height=384;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(8,10,16,0.58)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle="rgba(212,175,55,0.55)";
    ctx.lineWidth=8;
    ctx.strokeRect(18,18,c.width-36,c.height-36);

    ctx.strokeStyle="rgba(127,231,255,0.38)";
    ctx.lineWidth=6;
    ctx.strokeRect(34,34,c.width-68,c.height-68);

    ctx.textAlign="left";
    ctx.textBaseline="middle";

    ctx.fillStyle="#e8ecff";
    ctx.font="900 58px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[0]||"", 58, 92);

    ctx.fillStyle="rgba(127,231,255,0.95)";
    ctx.font="800 44px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[1]||"", 58, 166);

    ctx.fillStyle="rgba(212,175,55,0.95)";
    ctx.font="800 44px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[2]||"", 58, 232);

    ctx.fillStyle="rgba(152,160,199,0.95)";
    ctx.font="700 40px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(lines[3]||"", 58, 302);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    return tex;
  }

  function makeBotTagTex(name, money){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=768; c.height=256;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(9,10,16,0.62)";
    ctx.fillRect(0,0,768,256);

    ctx.strokeStyle="rgba(127,231,255,0.45)";
    ctx.lineWidth=8;
    ctx.strokeRect(16,16,736,224);

    ctx.strokeStyle="rgba(212,175,55,0.35)";
    ctx.lineWidth=6;
    ctx.strokeRect(30,30,708,196);

    ctx.textAlign="center";
    ctx.textBaseline="middle";

    ctx.fillStyle="#7fe7ff";
    ctx.font="900 70px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(name, 384, 104);

    ctx.fillStyle="#ffd36a";
    ctx.font="900 52px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(`$${moneyFmt(money)}`, 384, 176);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    return tex;
  }

  function addNameTag(parent, name, money=1000){
    const tex=makeBotTagTex(name, money);
    const mat=new S.THREE.MeshBasicMaterial({
      map:tex, transparent:true, opacity:0.95,
      side:S.THREE.FrontSide, // NO REVERSE EVER
      depthTest:false
    });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.95,0.36), mat);
    plane.position.set(0,1.36,0);
    plane.userData._tag=true;
    plane.renderOrder=9999;
    parent.add(plane);
    parent.userData._money=money;
    parent.userData._name=name;
    parent.userData._tagPlane=plane;
    return plane;
  }

  function updateBotTag(parent, money){
    const plane=parent.userData?._tagPlane;
    if(!plane) return;
    plane.material.map?.dispose?.();
    plane.material.map = makeBotTagTex(parent.userData._name||"BOT", money);
    plane.material.needsUpdate=true;
    parent.userData._money=money;
  }

  function makePanelTex(lines, big=false){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=1024; c.height=512;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(8,10,16,0.55)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle="rgba(127,231,255,0.40)";
    ctx.lineWidth=10;
    ctx.strokeRect(26,26,c.width-52,c.height-52);

    ctx.strokeStyle="rgba(212,175,55,0.45)";
    ctx.lineWidth=8;
    ctx.strokeRect(48,48,c.width-96,c.height-96);

    ctx.textAlign="center";
    ctx.textBaseline="middle";

    ctx.fillStyle="#e8ecff";
    ctx.font=`900 ${big?84:72}px system-ui,Segoe UI,Roboto,Arial`;
    ctx.fillText(lines[0]||"", c.width/2, 165);

    ctx.fillStyle="rgba(127,231,255,0.95)";
    ctx.font=`900 ${big?68:56}px system-ui,Segoe UI,Roboto,Arial`;
    ctx.fillText(lines[1]||"", c.width/2, 275);

    ctx.fillStyle="rgba(212,175,55,0.95)";
    ctx.font=`800 ${big?56:46}px system-ui,Segoe UI,Roboto,Arial`;
    ctx.fillText(lines[2]||"", c.width/2, 375);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    return tex;
  }

  // ---------- Wrist OS ----------
  function makeWristMenuTex(){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=1024; c.height=1024;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(7,8,12,0.74)";
    ctx.fillRect(0,0,1024,1024);

    ctx.strokeStyle="rgba(127,231,255,0.55)";
    ctx.lineWidth=10;
    ctx.strokeRect(40,40,944,944);

    ctx.strokeStyle="rgba(212,175,55,0.55)";
    ctx.lineWidth=8;
    ctx.strokeRect(70,70,884,884);

    ctx.textAlign="left";
    ctx.textBaseline="top";

    ctx.fillStyle="#e8ecff";
    ctx.font="900 68px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText("WATCH MENU", 110, 120);

    ctx.fillStyle="rgba(127,231,255,0.95)";
    ctx.font="800 54px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText("• Mute Music", 110, 260);
    ctx.fillText("• Teleport: VIP / Store / Poker", 110, 340);
    ctx.fillText("• Leaderboards", 110, 420);

    ctx.fillStyle="rgba(212,175,55,0.95)";
    ctx.font="800 50px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText("Hint: Look at palm to show", 110, 560);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    return tex;
  }

  function attachWristMenu(){
    const THREE=S.THREE;
    const hand=S.renderer?.xr?.getHand?.(0); // left
    const menu=new THREE.Group();
    menu.name="WristMenu";

    const plane=new THREE.Mesh(
      new THREE.PlaneGeometry(0.18,0.18),
      new THREE.MeshBasicMaterial({
        map:makeWristMenuTex(),
        transparent:true, opacity:0.95,
        side:THREE.FrontSide,
        depthTest:false
      })
    );
    plane.rotation.x=-Math.PI/2;
    plane.position.set(0,0.02,0);
    menu.add(plane);
    menu.visible=false;

    if(hand){
      hand.add(menu);
      S.scene.add(hand);
      S.uiWrist={ mode:"hand", hand, menu };
      log("[ui] wrist menu attached to XR hand ✅");
    }else{
      menu.position.set(0.12,-0.18,-0.38);
      S.camera.add(menu);
      S.uiWrist={ mode:"camera", hand:null, menu };
      log("[ui] wrist menu fallback attached to camera ✅");
    }
  }

  function updateWristMenu(){
    if(!S.uiWrist?.menu) return;
    const menu=S.uiWrist.menu;

    if(S.uiWrist.mode==="hand" && S.uiWrist.hand){
      const palmUp=new S.THREE.Vector3(0,1,0).applyQuaternion(S.uiWrist.hand.quaternion).normalize();
      const viewDir=new S.THREE.Vector3().subVectors(
        new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld),
        new S.THREE.Vector3().setFromMatrixPosition(S.uiWrist.hand.matrixWorld)
      ).normalize();
      menu.visible = palmUp.dot(viewDir) > 0.35;
    }else{
      menu.visible=true;
    }
  }

  // ---------- Audio (lobby radio) ----------
  function initRadio(){
    const el=document.createElement("audio");
    el.crossOrigin="anonymous";
    el.loop=true;
    el.src="https://ice4.somafm.com/groovesalad-128-mp3"; // stable MP3 stream
    el.volume=0.65;
    el.preload="auto";
    document.body.appendChild(el);
    S.audio.el=el;
    log("[audio] radio ready ✅");
  }

  function ensureAudioStart(){
    if(S.audio.started) return;
    const el=S.audio.el;
    if(!el) return;
    el.play().then(()=>{ S.audio.started=true; log("[audio] playing ✅"); }).catch(()=>{});
  }

  // ---------- Teleport (RIGHT HAND) ----------
  function getRightHandRay(){
    const c=S.controllers?.[1] || S.controllers?.[0] || null; // usually right is 1
    if(c){
      const pos=new S.THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir=new S.THREE.Vector3(0,0,-1).applyQuaternion(c.quaternion).normalize();
      return { pos, dir, src:"controller" };
    }
    S.camera.updateMatrixWorld(true);
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir=new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();
    return { pos:camPos, dir:camDir, src:"camera" };
  }

  function ensureMarker(){
    if(S.marker) return;
    const THREE=S.THREE;
    S.markerTarget=new THREE.Vector3();
    S.markerVel=new THREE.Vector3();

    const ring=new THREE.Mesh(
      new THREE.RingGeometry(0.18,0.26,48),
      new THREE.MeshBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.95, side:THREE.DoubleSide })
    );
    ring.rotation.x=-Math.PI/2;
    ring.visible=false;
    ring.renderOrder=9998;
    S.scene.add(ring);
    S.marker=ring;
  }

  function updateTeleport(ctx, dt){
    if(!S.ray || !S.marker) return;

    const R=getRightHandRay();
    R.dir.y = clamp(R.dir.y - 0.10, -0.65, 0.20);
    R.dir.normalize();

    S.ray.set(R.pos, R.dir);
    const hits=S.ray.intersectObjects(S.floorHits, true);

    if(hits.length){
      const p=hits[0].point;

      // smooth marker (reduces jitter)
      S.markerTarget.copy(p);
      S.markerVel.lerp(new S.THREE.Vector3(
        (S.markerTarget.x - S.marker.position.x),
        (S.markerTarget.y - S.marker.position.y),
        (S.markerTarget.z - S.marker.position.z)
      ), clamp(dt*10, 0, 1));
      S.marker.position.x += S.markerVel.x * clamp(dt*8, 0, 1);
      S.marker.position.y = p.y + 0.02;
      S.marker.position.z += S.markerVel.z * clamp(dt*8, 0, 1);

      S.marker.visible=true;

      const pads=ctx?.pads;
      const teleportPressed = !!pads?.btnA || !!pads?.btnX;
      if(teleportPressed){
        ensureAudioStart();
        S.player.position.set(p.x, 0.02, p.z);
      }
    }else{
      S.marker.visible=false;
    }
  }

  // ---------- Rooms & Beautification ----------
  function ensureRoot(){
    if(S.root && S.root.parent===S.scene) return S.root;
    const g=new S.THREE.Group();
    g.name="WorldRoot";
    S.scene.add(g);
    S.root=g;
    return g;
  }

  function addRoomColorLights(anchor, key){
    const colors={ vip:0xffd36a, store:0x7fe7ff, event:0xff2d7a, poker:0x00ff7f };
    const c=colors[key]||0x7fe7ff;

    const p1=new S.THREE.PointLight(c, 0.35, 22);
    p1.position.set(0,3.4,0); anchor.add(p1);

    const p2=new S.THREE.PointLight(0xffffff, 0.15, 18);
    p2.position.set(3,2.4,-3); anchor.add(p2);

    const glow=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(8,8),
      new S.THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:0.06, side:S.THREE.DoubleSide })
    );
    glow.rotation.x=-Math.PI/2;
    glow.position.y=0.02;
    anchor.add(glow);
  }

  function buildVIPWelcome(anchor){
    const group=new S.THREE.Group();
    group.name="VIP_Welcome";

    const st=S.playerStats;
    const tex=makeMiniHUDTex([
      `WELCOME ${st.name.toUpperCase()}`,
      `RANK: ${st.rank}   EVENT: ${st.eventChips}`,
      `BANK: $${moneyFmt(st.money)}`,
      `TIME: ${new Date().toLocaleTimeString()}`
    ]);

    const plane=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(3.1,1.15),
      new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
    );
    plane.position.set(0,3.9,-5.9);
    group.add(plane);

    const headerTex=makePanelTex(["VIP LOUNGE","WELCOME HOME",""], true);
    const header=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(4.8,2.1),
      new S.THREE.MeshBasicMaterial({ map:headerTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
    );
    header.position.set(0,5.2,-5.9);
    group.add(header);

    anchor.add(group);
    S._vipTimeAcc=0;
    S._vipWelcomePlane=plane;
  }

  function updateVIPWelcome(dt){
    if(!S._vipWelcomePlane) return;
    S._vipTimeAcc += dt;
    if(S._vipTimeAcc < 1.0) return;
    S._vipTimeAcc = 0;

    const st=S.playerStats;
    const tex=makeMiniHUDTex([
      `WELCOME ${st.name.toUpperCase()}`,
      `RANK: ${st.rank}   EVENT: ${st.eventChips}`,
      `BANK: $${moneyFmt(st.money)}`,
      `TIME: ${new Date().toLocaleTimeString()}`
    ]);
    S._vipWelcomePlane.material.map?.dispose?.();
    S._vipWelcomePlane.material.map = tex;
    S._vipWelcomePlane.material.needsUpdate=true;
  }

  function buildTeleportPad(anchor){
    const pad=new S.THREE.Group();
    pad.name="TeleportPad";

    const base=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(0.75,0.75,0.10,64),
      new S.THREE.MeshStandardMaterial({ color:0x0c0d14, roughness:0.35, metalness:0.6, emissive:0x00ff7f, emissiveIntensity:0.18 })
    );
    base.position.y=0.05;
    pad.add(base);

    const ring=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(0.75,0.06,16,180),
      new S.THREE.MeshStandardMaterial({ color:0x00ff7f, roughness:0.35, metalness:0.2, emissive:0x00ff7f, emissiveIntensity:0.35 })
    );
    ring.rotation.x=Math.PI/2;
    ring.position.y=0.11;
    pad.add(ring);

    const light=new S.THREE.PointLight(0x00ff7f, 0.35, 6);
    light.position.set(0,1.0,0);
    pad.add(light);

    pad.position.set(0,0.0,-3.8);
    anchor.add(pad);
    pad.userData._telePad=true;
    return pad;
  }

  function buildVIPLegends(anchor){
    const g=new S.THREE.Group();
    g.name="VIP_Legends";

    const rail=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.2,0.07,14,220),
      new S.THREE.MeshStandardMaterial({ color:0xff2d2d, roughness:0.35, metalness:0.3, emissive:0xff2d2d, emissiveIntensity:0.12 })
    );
    rail.rotation.x=Math.PI/2;
    rail.position.set(0,0.22,0.2);
    g.add(rail);

    const names=["LEGEND I","LEGEND II","LEGEND III","LEGEND IV"];
    for(let i=0;i<4;i++){
      const a=(i/4)*Math.PI*2;
      const r=2.5;

      const ped=new S.THREE.Mesh(
        new S.THREE.CylinderGeometry(0.55,0.65,0.35,48),
        new S.THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.55, metalness:0.6, emissive:0x7fe7ff, emissiveIntensity:0.08 })
      );
      ped.position.set(Math.cos(a)*r,0.18,Math.sin(a)*r);
      g.add(ped);

      const bot=new S.THREE.Group();
      bot.position.set(ped.position.x,0.0,ped.position.z);
      bot.lookAt(0,0,0);

      const body=new S.THREE.Mesh(new S.THREE.CapsuleGeometry(0.20,0.70,6,12), new S.THREE.MeshStandardMaterial({ color:0x1c1c28, roughness:0.7, metalness:0.12 }));
      body.position.y=0.95; bot.add(body);
      const head=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.18,18,14), new S.THREE.MeshStandardMaterial({ color:0x262636, roughness:0.65, metalness:0.12 }));
      head.position.y=1.58; bot.add(head);

      addNameTag(bot, names[i], 999999);
      g.add(bot);

      const spot=new S.THREE.SpotLight(0xffd36a,0.65,10,Math.PI/5,0.35,1.1);
      spot.position.set(bot.position.x,3.9,bot.position.z);
      spot.target=bot;
      g.add(spot);
    }

    g.position.set(0,0.0,0.5);
    anchor.add(g);
  }

  function buildTableHaloLights(root){
    const halo=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(3.2,0.08,18,260),
      new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:0.85, emissive:0xffd36a, emissiveIntensity:0.18 })
    );
    halo.rotation.x=Math.PI/2;
    halo.position.set(0,4.8,0);
    root.add(halo);

    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const p=new S.THREE.PointLight(0xffd36a,0.18,9);
      p.position.set(Math.cos(a)*2.6,4.6,Math.sin(a)*2.6);
      root.add(p);
    }
  }

  function buildLobbyPillars(root, radius){
    const m=new S.THREE.MeshStandardMaterial({ color:0x0f1018, roughness:0.55, metalness:0.55, emissive:0x05060a, emissiveIntensity:0.25 });
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const p=new S.THREE.Mesh(new S.THREE.CylinderGeometry(0.22,0.28,6.6,22), m);
      p.position.set(Math.cos(a)*radius,3.3,Math.sin(a)*radius);
      root.add(p);

      const cap=new S.THREE.PointLight(0x7fe7ff,0.10,6);
      cap.position.set(p.position.x,6.2,p.position.z);
      root.add(cap);
    }
  }

  function buildFountain(root){
    const g=new S.THREE.Group();
    g.name="Fountain";

    const bowl=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(1.6,1.9,0.55,64),
      new S.THREE.MeshStandardMaterial({ color:0x0f1018, roughness:0.3, metalness:0.75 })
    );
    bowl.position.y=0.28;
    g.add(bowl);

    const water=new S.THREE.Mesh(
      new S.THREE.CircleGeometry(1.45,64),
      new S.THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.15, metalness:0.1, transparent:true, opacity:0.22, emissive:0x7fe7ff, emissiveIntensity:0.25 })
    );
    water.rotation.x=-Math.PI/2;
    water.position.y=0.56;
    g.add(water);

    const glow=new S.THREE.PointLight(0x7fe7ff,0.25,10);
    glow.position.set(0,1.4,0);
    g.add(glow);

    g.position.set(0,0,7.8);
    root.add(g);

    S._fountainWater=water;
  }

  function updateFountain(dt){
    if(!S._fountainWater) return;
    S._fountainWater.material.opacity = 0.18 + 0.06*Math.sin((performance.now()*0.001)*1.3);
  }

  function buildSportsBettingZone(anchor){
    const counter=new S.THREE.Mesh(
      new S.THREE.BoxGeometry(7.8,1.1,1.2),
      new S.THREE.MeshStandardMaterial({ color:0x0c0d14, roughness:0.4, metalness:0.7, emissive:0x7fe7ff, emissiveIntensity:0.08 })
    );
    counter.position.set(0,0.55,3.2);
    anchor.add(counter);

    const boardTex=makePanelTex(["SPORTS BETTING","LEADERBOARD","1) Kabwe  2) Zola  3) Nina"], true);
    const board=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(6.2,2.7),
      new S.THREE.MeshBasicMaterial({ map:boardTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
    );
    board.position.set(0,3.8,-5.9);
    anchor.add(board);

    const glow=new S.THREE.PointLight(0x7fe7ff,0.35,16);
    glow.position.set(0,3.4,0);
    anchor.add(glow);
  }

  // ---------- Poker (52-card) ----------
  const SUITS=["S","H","D","C"];
  const RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  function buildDeck52(){
    const deck=[];
    for(const s of SUITS) for(const r of RANKS) deck.push({ r,s });
    for(let i=deck.length-1;i>0;i--){
      const j=(Math.random()*(i+1))|0;
      const t=deck[i]; deck[i]=deck[j]; deck[j]=t;
    }
    return deck;
  }
  function dealOne(){
    if(!S.poker.deck || S.poker.deck.length===0) S.poker.deck=buildDeck52();
    return S.poker.deck.pop();
  }

  function cardLabel(id){ return `${id.r}${id.s}`; }

  function makeCardTex(id){
    const THREE=S.THREE;
    const c=document.createElement("canvas");
    c.width=512; c.height=768;
    const ctx=c.getContext("2d");

    ctx.fillStyle="rgba(255,255,255,0.98)";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle="rgba(0,0,0,0.25)";
    ctx.lineWidth=10;
    ctx.strokeRect(14,14,c.width-28,c.height-28);

    const suitColor = (id.s==="H"||id.s==="D") ? "#ff2d2d" : "#12121a";

    ctx.fillStyle=suitColor;
    ctx.font="900 140px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.fillText(id.r, 44, 44);

    ctx.font="900 120px system-ui,Segoe UI,Roboto,Arial";
    const suitChar = id.s==="S"?"♠":id.s==="H"?"♥":id.s==="D"?"♦":"♣";
    ctx.fillText(suitChar, 58, 210);

    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font="900 240px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suitChar, 256, 420);

    ctx.textAlign="right";
    ctx.textBaseline="bottom";
    ctx.font="900 140px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(id.r, 468, 724);

    ctx.font="900 120px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suitChar, 454, 556);

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=8;
    return tex;
  }

  function buildCardMesh(id, w=0.38, h=0.54){
    const tex=makeCardTex(id);
    const mat=new S.THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.98, side:S.THREE.FrontSide, depthTest:true });
    const geo=new S.THREE.PlaneGeometry(w,h);
    const m=new S.THREE.Mesh(geo, mat);
    m.userData._cardId = id;
    return m;
  }

  function clearHand(){
    for(const b of S.poker.bots){
      const hc=b.userData._holeCards||[];
      hc.forEach(x=>x.parent&&x.parent.remove(x));
      b.userData._holeCards=[];
    }
    for(const c of S.poker.community){
      c.parent && c.parent.remove(c);
    }
    S.poker.community=[];
    S.poker.pot=0;
    S.poker.phase="preflop";
    S.poker.turn=0;
    S.poker.deck=buildDeck52();
  }

  function buildTable(root){
    const g=new S.THREE.Group();
    g.name="PokerTableRoot";
    g.position.set(0,-0.55,0);
    root.add(g);

    const felt=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(2.8,2.8,0.20,64),
      new S.THREE.MeshStandardMaterial({ color:0x0b4a2a, roughness:0.95, metalness:0.05 })
    );
    felt.position.y=0.90;
    g.add(felt);

    const rim=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(2.8,0.18,18,260),
      new S.THREE.MeshStandardMaterial({ color:0x1a1210, roughness:0.65, metalness:0.35 })
    );
    rim.rotation.x=Math.PI/2;
    rim.position.y=1.02;
    g.add(rim);

    // simple pot chip pile placeholder
    const pot=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(0.35,0.35,0.10,26),
      new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:0.8, emissive:0x140f04, emissiveIntensity:0.12 })
    );
    pot.position.set(0,1.02,0);
    g.add(pot);
    g.userData._potMesh = pot;

    // seats in a ring
    const seats=[];
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const seat=new S.THREE.Group();
      seat.position.set(Math.cos(a)*3.6, 0.0, Math.sin(a)*3.6);
      seat.lookAt(0,0,0);
      g.add(seat);
      seats.push(seat);

      // chair
      const chair=new S.THREE.Mesh(
        new S.THREE.BoxGeometry(0.55,0.55,0.55),
        new S.THREE.MeshStandardMaterial({ color:0x141622, roughness:0.8, metalness:0.12 })
      );
      chair.position.set(0,0.45,0);
      seat.add(chair);
    }
    S.poker.seats=seats;

    return g;
  }

  function spawnBots(tableRoot){
    S.poker.bots=[];
    const botNames=["Kabwe","Zola","Nina","Tariq","Mila","Owen","Sage","Rhea"];

    for(let i=0;i<8;i++){
      const seat=S.poker.seats[i];
      const bot=new S.THREE.Group();
      bot.position.copy(seat.position);
      bot.rotation.copy(seat.rotation);

      const body=new S.THREE.Mesh(new S.THREE.CapsuleGeometry(0.22,0.72,6,12), new S.THREE.MeshStandardMaterial({ color:0x1c1c28, roughness:0.7, metalness:0.12 }));
      body.position.y=0.95; bot.add(body);
      const head=new S.THREE.Mesh(new S.THREE.SphereGeometry(0.19,18,14), new S.THREE.MeshStandardMaterial({ color:0x262636, roughness:0.65, metalness:0.12 }));
      head.position.y=1.60; bot.add(head);

      // money
      const bankroll = 5000 + ((Math.random()*7000)|0);
      addNameTag(bot, botNames[i], bankroll);

      // hole cards under tag (as you requested)
      bot.userData._holeCards=[];
      S.root.add(bot);
      S.poker.bots.push(bot);
    }

    // hero seat reference
    S.poker.heroSeat = 0;
  }

  function spawnHoleCards(){
    // each bot gets 2 unique cards
    for(const b of S.poker.bots){
      const id1=dealOne();
      const id2=dealOne();

      const c1=buildCardMesh(id1, 0.22, 0.30);
      const c2=buildCardMesh(id2, 0.22, 0.30);

      // place right under the tag and facing player center
      c1.position.set(-0.13, 1.05, 0.08);
      c2.position.set(+0.13, 1.05, 0.08);

      c1.rotation.y = Math.PI; // face inward
      c2.rotation.y = Math.PI;

      b.add(c1); b.add(c2);
      b.userData._holeCards=[c1,c2];
    }
  }

  function setCommunity(n, tableRoot){
    while(S.poker.community.length < n){
      const id=dealOne();
      const m=buildCardMesh(id, 0.32, 0.46);
      m.position.set(-0.72 + S.poker.community.length*0.36, 1.18, 0.0);
      m.rotation.x = -Math.PI/2;
      m.rotation.z = Math.PI; // ensure upright facing VIP side
      tableRoot.add(m);
      S.poker.community.push(m);
    }
  }

  function stepPoker(dt){
    S.poker.t += dt;
    if(S.poker.t < 3.0) return;
    S.poker.t = 0;

    // quick demo loop
    if(S.poker.phase==="preflop"){
      setCommunity(3, S.refs.tableRoot);
      S.poker.phase="flop";
      S.poker.pot += 120;
    } else if(S.poker.phase==="flop"){
      setCommunity(4, S.refs.tableRoot);
      S.poker.phase="turn";
      S.poker.pot += 80;
    } else if(S.poker.phase==="turn"){
      setCommunity(5, S.refs.tableRoot);
      S.poker.phase="river";
      S.poker.pot += 110;
    } else {
      // reset
      clearHand();
      spawnHoleCards();
      setCommunity(0, S.refs.tableRoot);
    }

    // update pot mesh scale (visual)
    const pot = S.refs.tableRoot?.userData?._potMesh;
    if(pot){
      const s = clamp(0.9 + S.poker.pot/1200, 0.9, 1.6);
      pot.scale.set(s, 1, s);
    }
  }

  // ---------- Build World ----------
  function buildWorld(){
    const root=ensureRoot();
    root.clear();

    // lights
    const hemi=new S.THREE.HemisphereLight(0xffffff, 0x05060a, 0.85);
    root.add(hemi);
    const sun=new S.THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(12,18,6);
    root.add(sun);

    // lobby group
    const W=new S.THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby=W;

    // lobby walls
    const lobbyRadius=12.0;
    const wallGeo=new S.THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, 8, 128, 1, true);
    const wall=new S.THREE.Mesh(wallGeo, getCasinoWallMaterial());
    wall.position.y=4;
    W.add(wall);

    // floor
    const floorMat=new S.THREE.MeshStandardMaterial({ color:0x0a0b10, roughness:0.85, metalness:0.12 });
    const floor=new S.THREE.Mesh(new S.THREE.CircleGeometry(lobbyRadius, 96), floorMat);
    floor.rotation.x=-Math.PI/2;
    W.add(floor);
    S.floorHits=[floor];

    // pit divot
    const pitR=4.4;
    const pitWall=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(pitR, pitR, 1.2, 96, 1, true),
      matMidnight()
    );
    pitWall.position.y=-0.55;
    W.add(pitWall);

    const pitFloor=new S.THREE.Mesh(new S.THREE.CircleGeometry(pitR-0.05, 72), floorMat);
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-1.15;
    W.add(pitFloor);
    S.floorHits.push(pitFloor);

    // neon rail around pit
    const rail=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(pitR+0.35, 0.06, 16, 220),
      new S.THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.25, metalness:0.2, emissive:0x7fe7ff, emissiveIntensity:0.30 })
    );
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.12;
    W.add(rail);

    // hall mouths + rooms
    const hallLen=7.0, hallW=3.8, roomSize=10.0;

    for(const d of S.roomDefs){
      const yaw=d.yaw;

      // hallway
      const hall=new S.THREE.Group();
      hall.name=`Hall_${d.key}`;
      hall.rotation.y=yaw;
      hall.position.set(0,0,0);
      W.add(hall);
      S.refs.hallways[d.key]=hall;

      const hallFloor=new S.THREE.Mesh(new S.THREE.PlaneGeometry(hallW, hallLen), floorMat);
      hallFloor.rotation.x=-Math.PI/2;
      hallFloor.position.set(0,0.01,-(lobbyRadius + hallLen/2));
      hall.add(hallFloor);
      S.floorHits.push(hallFloor);

      const hallWalls=new S.THREE.Mesh(
        new S.THREE.BoxGeometry(hallW, 3.2, hallLen),
        new S.THREE.MeshStandardMaterial({ color:0x0f1018, roughness:0.7, metalness:0.2 })
      );
      hallWalls.position.set(0,1.6,-(lobbyRadius + hallLen/2));
      hall.add(hallWalls);

      // room
      const anchor=new S.THREE.Group();
      anchor.name=`Room_${d.key}`;
      anchor.rotation.y=yaw;
      anchor.position.set(0,0,-(lobbyRadius + hallLen + roomSize/2));
      W.add(anchor);
      S.refs.rooms[d.key]=anchor;

      const roomBox=new S.THREE.Mesh(
        new S.THREE.BoxGeometry(roomSize, 4.6, roomSize),
        new S.THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.85, metalness:0.18, side:S.THREE.BackSide })
      );
      roomBox.position.y=2.3;
      anchor.add(roomBox);

      const roomFloor=new S.THREE.Mesh(new S.THREE.PlaneGeometry(roomSize, roomSize), floorMat);
      roomFloor.rotation.x=-Math.PI/2;
      roomFloor.position.y=0.01;
      anchor.add(roomFloor);
      S.floorHits.push(roomFloor);

      // label above doorway (frontside only)
      const labelTex=makePanelTex([d.name,"ENTER",""], true);
      const label=new S.THREE.Mesh(
        new S.THREE.PlaneGeometry(2.8,1.2),
        new S.THREE.MeshBasicMaterial({ map:labelTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
      );
      label.position.set(0,2.8,-(lobbyRadius-0.2));
      label.rotation.y=yaw;
      W.add(label);

      addRoomColorLights(anchor, d.key);

      if(d.key==="vip"){
        buildVIPWelcome(anchor);
        buildTeleportPad(anchor);
        buildVIPLegends(anchor);
      }
      if(d.key==="event"){
        buildSportsBettingZone(anchor);
      }
    }

    // jumbotron(s)
    const jumboTex=makePanelTex(["SPORTS / NEWS","JUMBOTRON","LIVE"], true);
    const jumbo=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(8.5,4.2),
      new S.THREE.MeshBasicMaterial({ map:jumboTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
    );
    jumbo.position.set(0,4.2,-(lobbyRadius-0.6));
    W.add(jumbo);
    S.refs.jumbos=[jumbo];

    // table
    const tableRoot=buildTable(W);
    S.refs.tableRoot=tableRoot;
    spawnBots(tableRoot);
    clearHand();
    spawnHoleCards();

    // beautification
    buildTableHaloLights(W);
    buildLobbyPillars(W, lobbyRadius-1.1);
    buildFountain(W);

    // marker + wrist + audio
    ensureMarker();
    attachWristMenu();
    initRadio();

    // spawn in VIP
    if(S.refs.rooms.vip){
      const p=S.refs.rooms.vip.position;
      S.player.position.set(p.x, 0.02, p.z + 2.6);
      S.player.rotation.y = S.refs.rooms.vip.rotation.y;
    } else {
      S.player.position.set(0,0.02,7.5);
      S.player.rotation.y=Math.PI;
    }

    log("[world] built ✅ VIP spawn + rooms + poker + wrist + luxury");
  }

  return {
    async build(ctx){
      Object.assign(S, ctx);
      S.THREE = ctx.THREE;
      S.ray = new S.THREE.Raycaster();
      ensureRoot();
      buildWorld();
      log("[world] Update 4.8 FULL ready ✅");
    },

    frame(ctx, dt){
      updateTeleport(ctx, dt);
      updateWristMenu();
      updateVIPWelcome(dt);
      updateFountain(dt);
      stepPoker(dt);
      ensureAudioStart(); // safe; browser may ignore until gesture
    }
  };
})();
