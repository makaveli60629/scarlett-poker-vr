// /js/world.js — Scarlett MASTER WORLD (Update 4.8 FULL, v5.1 Portal + Luxury)
// ✅ VIP Portal Teleporter (animated) + neon pad
// ✅ Dealer button chip + $100k neon chip sign
// ✅ Storefront arch stub + luxury lighting pass
// ✅ Right-hand teleport marker smoothing improved
// ✅ NO reverse text (FrontSide only)

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

    refs:{ lobby:null, rooms:{}, hallways:{}, jumbos:[], tableRoot:null },
    roomDefs: [
      { key:"vip",   name:"VIP",   yaw:0 },
      { key:"store", name:"STORE", yaw:Math.PI/2 },
      { key:"event", name:"EVENT", yaw:Math.PI },
      { key:"poker", name:"POKER", yaw:-Math.PI/2 },
    ],

    uiWrist:null,
    playerStats:{ name:"Player One", rank:"Bronze I", money:100000, eventChips:12 },

    poker:{
      bots:[], deck:[], community:[],
      phase:"preflop", pot:0, t:0, turn:0, heroSeat:0, seats:[]
    },

    audio:{ el:null, gain:1, started:false },

    _vipTimeAcc:0,
    _vipWelcomePlane:null,
    _fountainWater:null,

    // portal anim
    portal:{ mats:[], t:0 },

    // teleport destinations
    dest:{ lobby:null, vip:null, store:null, poker:null, event:null }
  };

  const log = (...a)=>{ try{ S.log?.(...a); }catch{} };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

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
      side:S.THREE.FrontSide, // no reverse ever
      depthTest:false
    });
    const plane=new S.THREE.Mesh(new S.THREE.PlaneGeometry(0.82,0.30), mat);
    plane.position.set(0,1.34,0);
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
      log("[ui] wrist menu attached ✅");
    }else{
      menu.position.set(0.12,-0.18,-0.38);
      S.camera.add(menu);
      S.uiWrist={ mode:"camera", hand:null, menu };
      log("[ui] wrist menu fallback ✅");
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

  // ---------- Audio ----------
  function initRadio(){
    const el=document.createElement("audio");
    el.crossOrigin="anonymous";
    el.loop=true;
    el.src="https://ice4.somafm.com/groovesalad-128-mp3";
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
    const c=S.controllers?.[1] || S.controllers?.[0] || null;
    if(c){
      const pos=new S.THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir=new S.THREE.Vector3(0,0,-1).applyQuaternion(c.quaternion).normalize();
      return { pos, dir };
    }
    S.camera.updateMatrixWorld(true);
    const camPos=new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const camDir=new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();
    return { pos:camPos, dir:camDir };
  }

  function ensureMarker(){
    if(S.marker) return;
    const THREE=S.THREE;
    S.markerTarget=new THREE.Vector3();
    S.markerVel=new THREE.Vector3();

    const ring=new THREE.Mesh(
      new THREE.RingGeometry(0.18,0.26,56),
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
    // softer “downward bias”
    R.dir.y = clamp(R.dir.y - 0.08, -0.65, 0.25);
    R.dir.normalize();

    S.ray.set(R.pos, R.dir);
    const hits=S.ray.intersectObjects(S.floorHits, true);

    if(hits.length){
      const p=hits[0].point;

      // better smoothing (less jitter)
      const follow = clamp(dt * 18, 0, 1);
      S.marker.position.x = S.marker.position.x + (p.x - S.marker.position.x) * follow;
      S.marker.position.z = S.marker.position.z + (p.z - S.marker.position.z) * follow;
      S.marker.position.y = p.y + 0.02;

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

  // ---------- Build Helpers ----------
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

    const p1=new S.THREE.PointLight(c, 0.38, 22);
    p1.position.set(0,3.4,0); anchor.add(p1);

    const p2=new S.THREE.PointLight(0xffffff, 0.16, 18);
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

  // ---------- Portal Teleporter (VIP) ----------
  function makePortalShaderMaterial(){
    const THREE=S.THREE;
    const mat = new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      uniforms:{
        uTime:{ value:0 },
        uA:{ value:new THREE.Color(0x7fe7ff) },
        uB:{ value:new THREE.Color(0xff2dff) }
      },
      vertexShader:`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uA;
        uniform vec3 uB;

        float hash(vec2 p){
          return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
        }
        float noise(vec2 p){
          vec2 i=floor(p);
          vec2 f=fract(p);
          float a=hash(i);
          float b=hash(i+vec2(1.0,0.0));
          float c=hash(i+vec2(0.0,1.0));
          float d=hash(i+vec2(1.0,1.0));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
        }

        void main(){
          vec2 uv = vUv * 2.0 - 1.0;

          float r = length(uv);
          float ring = smoothstep(0.92, 0.82, r);

          float swirl = atan(uv.y, uv.x) + uTime*0.9;
          float bands = sin(swirl*3.0 + r*10.0 - uTime*2.0);

          float n = noise(uv*3.5 + uTime*0.15);
          float core = smoothstep(0.78, 0.10, r) * (0.55 + 0.45*bands) * (0.65 + 0.35*n);

          vec3 col = mix(uA, uB, 0.5 + 0.5*sin(uTime + r*6.0));
          float alpha = (core*0.85 + ring*0.35);
          alpha = clamp(alpha, 0.0, 0.95);

          // bright center haze
          float haze = smoothstep(0.65, 0.05, r) * 0.25;
          vec3 outCol = col * (0.55 + core*1.2) + vec3(haze);

          gl_FragColor = vec4(outCol, alpha);
        }
      `
    });
    mat.blending = THREE.AdditiveBlending;
    mat.side = THREE.DoubleSide;
    return mat;
  }

  function buildPortalTeleporter(anchor){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="VIP_PortalGate";

    // floor pad
    const pad=new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 72),
      new THREE.MeshStandardMaterial({
        color:0x05060a, roughness:0.25, metalness:0.7,
        emissive:0x7fe7ff, emissiveIntensity:0.28
      })
    );
    pad.rotation.x=-Math.PI/2;
    pad.position.set(0,0.012,-3.7);
    g.add(pad);

    const padRing=new THREE.Mesh(
      new THREE.TorusGeometry(0.95,0.07,16,220),
      new THREE.MeshStandardMaterial({
        color:0x7fe7ff, roughness:0.35, metalness:0.2,
        emissive:0x7fe7ff, emissiveIntensity:0.55
      })
    );
    padRing.rotation.x=Math.PI/2;
    padRing.position.set(0,0.08,-3.7);
    g.add(padRing);

    // gate frame
    const frameMat = new THREE.MeshStandardMaterial({
      color:0x0b0d14, roughness:0.35, metalness:0.75,
      emissive:0xff2dff, emissiveIntensity:0.10
    });

    const arch = new THREE.Group();
    arch.position.set(0,0.0,-4.8);
    g.add(arch);

    const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.28,3.2,0.35), frameMat);
    const rightP= new THREE.Mesh(new THREE.BoxGeometry(0.28,3.2,0.35), frameMat);
    leftP.position.set(-1.15,1.6,0);
    rightP.position.set( 1.15,1.6,0);
    arch.add(leftP); arch.add(rightP);

    const topP = new THREE.Mesh(new THREE.BoxGeometry(2.7,0.28,0.35), frameMat);
    topP.position.set(0,3.1,0);
    arch.add(topP);

    // neon edge strips
    const neonMatA = new THREE.MeshStandardMaterial({
      color:0x7fe7ff, roughness:0.25, metalness:0.1,
      emissive:0x7fe7ff, emissiveIntensity:0.9
    });
    const neonMatB = new THREE.MeshStandardMaterial({
      color:0xff2dff, roughness:0.25, metalness:0.1,
      emissive:0xff2dff, emissiveIntensity:0.8
    });

    const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.06,3.05,0.06), neonMatA);
    stripL.position.set(-1.00,1.58,0.20);
    arch.add(stripL);
    const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.06,3.05,0.06), neonMatA);
    stripR.position.set( 1.00,1.58,0.20);
    arch.add(stripR);
    const stripT = new THREE.Mesh(new THREE.BoxGeometry(2.35,0.06,0.06), neonMatB);
    stripT.position.set(0,2.95,0.20);
    arch.add(stripT);

    // portal surface (animated)
    const portalMat = makePortalShaderMaterial();
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.65), portalMat);
    portal.position.set(0,1.52,0.01);
    arch.add(portal);

    // glow light
    const glow = new THREE.PointLight(0x7fe7ff, 0.65, 9);
    glow.position.set(0,1.6,0.5);
    arch.add(glow);

    const glow2 = new THREE.PointLight(0xff2dff, 0.55, 9);
    glow2.position.set(0,2.2,0.25);
    arch.add(glow2);

    // remember shader for animation
    S.portal.mats.push(portalMat);

    anchor.add(g);
    return g;
  }

  // ---------- Luxury Props (Dealer button, $100k chip sign, store arch) ----------
  function buildDealerButton(root, pos=[0,1.07,0.75]){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="DealerButton";

    // chip body
    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.12,0.03,48),
      new THREE.MeshStandardMaterial({ color:0x111115, roughness:0.25, metalness:0.85 })
    );
    chip.rotation.x=Math.PI/2;
    g.add(chip);

    // label
    const tex=makePanelTex(["DEALER","♠",""], false);
    const decal=new THREE.Mesh(
      new THREE.CircleGeometry(0.105,48),
      new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.96, side:THREE.FrontSide, depthTest:false })
    );
    decal.position.set(0,0.016,0);
    decal.rotation.x=-Math.PI/2;
    g.add(decal);

    g.position.set(pos[0],pos[1],pos[2]);
    root.add(g);
    return g;
  }

  function buildNeonChipSign(anchor){
    const THREE=S.THREE;
    const tex=makePanelTex(["$100,000","SCARLETT POKER VR","CASINO"], true);
    const plane=new THREE.Mesh(
      new THREE.PlaneGeometry(3.6,1.8),
      new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.95, side:THREE.FrontSide, depthTest:false })
    );
    plane.position.set(0,2.6,2.4);
    plane.rotation.y=Math.PI;
    anchor.add(plane);

    const glow=new THREE.PointLight(0xff2dff,0.35,10);
    glow.position.set(0,2.6,1.7);
    anchor.add(glow);
  }

  function buildStoreFront(anchor){
    const THREE=S.THREE;
    const g=new THREE.Group();
    g.name="StoreFront";

    const frameMat=new THREE.MeshStandardMaterial({
      color:0x0b0d14, roughness:0.35, metalness:0.8,
      emissive:0x7fe7ff, emissiveIntensity:0.10
    });

    // arch
    const left=new THREE.Mesh(new THREE.BoxGeometry(0.25,3.1,0.35), frameMat);
    const right=new THREE.Mesh(new THREE.BoxGeometry(0.25,3.1,0.35), frameMat);
    const top=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.25,0.35), frameMat);

    left.position.set(-1.25,1.55,-3.7);
    right.position.set( 1.25,1.55,-3.7);
    top.position.set(0,3.05,-3.7);

    g.add(left); g.add(right); g.add(top);

    // neon lines
    const neonA=new THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.25, metalness:0.1, emissive:0x7fe7ff, emissiveIntensity:1.0 });
    const neonB=new THREE.MeshStandardMaterial({ color:0xff2dff, roughness:0.25, metalness:0.1, emissive:0xff2dff, emissiveIntensity:0.9 });

    const strip1=new THREE.Mesh(new THREE.BoxGeometry(0.06,3.0,0.06), neonA);
    strip1.position.set(-1.05,1.55,-3.52);
    const strip2=new THREE.Mesh(new THREE.BoxGeometry(0.06,3.0,0.06), neonA);
    strip2.position.set( 1.05,1.55,-3.52);
    const strip3=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.06,0.06), neonB);
    strip3.position.set(0,2.86,-3.52);

    g.add(strip1); g.add(strip2); g.add(strip3);

    // title sign
    const signTex=makePanelTex(["STORE","FASHION / ITEMS",""], true);
    const sign=new THREE.Mesh(
      new THREE.PlaneGeometry(2.6,1.1),
      new THREE.MeshBasicMaterial({ map:signTex, transparent:true, opacity:0.95, side:THREE.FrontSide, depthTest:false })
    );
    sign.position.set(0,3.9,-3.7);
    g.add(sign);

    const light=new THREE.PointLight(0x7fe7ff,0.35,10);
    light.position.set(0,3.0,-3.2);
    g.add(light);

    anchor.add(g);
  }

  // ---------- Fountain ----------
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
      new S.THREE.MeshStandardMaterial({
        color:0x7fe7ff, roughness:0.15, metalness:0.1,
        transparent:true, opacity:0.22,
        emissive:0x7fe7ff, emissiveIntensity:0.25
      })
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
    ctx.font="900 170px system-ui,Segoe UI,Roboto,Arial";
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.fillText(id.r, 44, 44);

    ctx.font="900 150px system-ui,Segoe UI,Roboto,Arial";
    const suitChar = id.s==="S"?"♠":id.s==="H"?"♥":id.s==="D"?"♦":"♣";
    ctx.fillText(suitChar, 58, 250);

    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font="900 290px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(suitChar, 256, 430);

    ctx.textAlign="right";
    ctx.textBaseline="bottom";
    ctx.font="900 170px system-ui,Segoe UI,Roboto,Arial";
    ctx.fillText(id.r, 468, 724);

    ctx.font="900 150px system-ui,Segoe UI,Roboto,Arial";
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

    const pot=new S.THREE.Mesh(
      new S.THREE.CylinderGeometry(0.35,0.35,0.10,26),
      new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:0.8, emissive:0x140f04, emissiveIntensity:0.12 })
    );
    pot.position.set(0,1.02,0);
    g.add(pot);
    g.userData._potMesh = pot;

    // seats
    const seats=[];
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const seat=new S.THREE.Group();
      seat.position.set(Math.cos(a)*3.6, 0.0, Math.sin(a)*3.6);
      seat.lookAt(0,0,0);
      g.add(seat);
      seats.push(seat);

      const chair=new S.THREE.Mesh(
        new S.THREE.BoxGeometry(0.55,0.55,0.55),
        new S.THREE.MeshStandardMaterial({ color:0x141622, roughness:0.8, metalness:0.12 })
      );
      chair.position.set(0,0.45,0);
      seat.add(chair);
    }
    S.poker.seats=seats;

    // halo lights above table
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

    return g;
  }

  function spawnBots(){
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

      const bankroll = 5000 + ((Math.random()*7000)|0);
      addNameTag(bot, botNames[i], bankroll);

      bot.userData._holeCards=[];
      S.root.add(bot);
      S.poker.bots.push(bot);
    }

    S.poker.heroSeat = 0;
  }

  function spawnHoleCards(){
    for(const b of S.poker.bots){
      const id1=dealOne();
      const id2=dealOne();

      const c1=buildCardMesh(id1, 0.22, 0.30);
      const c2=buildCardMesh(id2, 0.22, 0.30);

      // right under tag
      c1.position.set(-0.13, 1.03, 0.08);
      c2.position.set(+0.13, 1.03, 0.08);

      // face inward, no mirrored
      c1.rotation.y = Math.PI;
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

      // upright readable
      m.rotation.x = -Math.PI/2;
      m.rotation.z = Math.PI;

      tableRoot.add(m);
      S.poker.community.push(m);
    }
  }

  function stepPoker(dt){
    S.poker.t += dt;
    if(S.poker.t < 3.0) return;
    S.poker.t = 0;

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
      clearHand();
      spawnHoleCards();
      setCommunity(0, S.refs.tableRoot);
    }

    const pot = S.refs.tableRoot?.userData?._potMesh;
    if(pot){
      const s = clamp(0.9 + S.poker.pot/1200, 0.9, 1.6);
      pot.scale.set(s, 1, s);
    }
  }

  // ---------- World Build ----------
  function buildWorld(){
    const root=ensureRoot();
    root.clear();
    S.portal.mats = [];
    S.portal.t = 0;

    // lights (lux pass)
    const hemi=new S.THREE.HemisphereLight(0xffffff, 0x05060a, 0.82);
    root.add(hemi);
    const sun=new S.THREE.DirectionalLight(0xffffff, 0.78);
    sun.position.set(12,18,6);
    root.add(sun);

    const softA=new S.THREE.PointLight(0x7fe7ff, 0.12, 55);
    softA.position.set(0,7,0);
    root.add(softA);

    const W=new S.THREE.Group();
    W.name="ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby=W;

    // lobby shell
    const lobbyRadius=12.0;
    const wallGeo=new S.THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, 8, 128, 1, true);
    const wall=new S.THREE.Mesh(wallGeo, getCasinoWallMaterial());
    wall.position.y=4;
    W.add(wall);

    const floorMat=new S.THREE.MeshStandardMaterial({ color:0x0a0b10, roughness:0.85, metalness:0.12 });
    const floor=new S.THREE.Mesh(new S.THREE.CircleGeometry(lobbyRadius, 96), floorMat);
    floor.rotation.x=-Math.PI/2;
    W.add(floor);
    S.floorHits=[floor];

    // pit
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

    const rail=new S.THREE.Mesh(
      new S.THREE.TorusGeometry(pitR+0.35, 0.06, 16, 220),
      new S.THREE.MeshStandardMaterial({ color:0x7fe7ff, roughness:0.25, metalness:0.2, emissive:0x7fe7ff, emissiveIntensity:0.30 })
    );
    rail.rotation.x=Math.PI/2;
    rail.position.y=0.12;
    W.add(rail);

    // hallways + rooms
    const hallLen=7.0, hallW=3.8, roomSize=10.0;

    for(const d of S.roomDefs){
      const yaw=d.yaw;

      const hall=new S.THREE.Group();
      hall.name=`Hall_${d.key}`;
      hall.rotation.y=yaw;
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

      const labelTex=makePanelTex([d.name,"ENTER",""], true);
      const label=new S.THREE.Mesh(
        new S.THREE.PlaneGeometry(2.8,1.2),
        new S.THREE.MeshBasicMaterial({ map:labelTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
      );
      label.position.set(0,2.8,-(lobbyRadius-0.2));
      label.rotation.y=yaw;
      W.add(label);

      addRoomColorLights(anchor, d.key);

      // destinations
      S.dest[d.key] = new S.THREE.Vector3(anchor.position.x, 0.02, anchor.position.z + 2.6);
    }

    // lobby dest
    S.dest.lobby = new S.THREE.Vector3(0,0.02,7.5);

    // jumbotron
    const jumboTex=makePanelTex(["SPORTS / NEWS","JUMBOTRON","LIVE"], true);
    const jumbo=new S.THREE.Mesh(
      new S.THREE.PlaneGeometry(8.5,4.2),
      new S.THREE.MeshBasicMaterial({ map:jumboTex, transparent:true, opacity:0.95, side:S.THREE.FrontSide, depthTest:false })
    );
    jumbo.position.set(0,4.2,-(lobbyRadius-0.6));
    W.add(jumbo);
    S.refs.jumbos=[jumbo];

    // table + props
    S.refs.tableRoot = buildTable(W);
    spawnBots();
    clearHand();
    spawnHoleCards();
    buildDealerButton(S.refs.tableRoot, [0,1.06,0.78]);

    // fountain
    buildFountain(W);

    // VIP upgrades
    const vip = S.refs.rooms.vip;
    if(vip){
      buildVIPWelcome(vip);
      buildPortalTeleporter(vip);
      buildNeonChipSign(vip);
      // spawn facing inward (not wall)
      const p=S.dest.vip;
      S.player.position.set(p.x, p.y, p.z);
      S.player.rotation.y = vip.rotation.y + Math.PI; // face into room
    } else {
      S.player.position.copy(S.dest.lobby);
      S.player.rotation.y=Math.PI;
    }

    // Store front upgrade
    const store = S.refs.rooms.store;
    if(store) buildStoreFront(store);

    // marker + wrist + audio
    ensureMarker();
    attachWristMenu();
    initRadio();

    log("[world] built ✅ portal + luxury + poker");
  }

  return {
    async build(ctx){
      Object.assign(S, ctx);
      S.THREE = ctx.THREE;
      S.ray = new S.THREE.Raycaster();
      ensureRoot();
      buildWorld();
      log("[world] Update 4.8 FULL v5.1 ✅");
    },

    frame(ctx, dt){
      // animate portal
      S.portal.t += dt;
      for(const m of S.portal.mats){
        if(m?.uniforms?.uTime) m.uniforms.uTime.value = S.portal.t;
      }

      updateTeleport(ctx, dt);
      updateWristMenu();
      updateVIPWelcome(dt);
      updateFountain(dt);
      stepPoker(dt);
      ensureAudioStart();
    }
  };
})();
