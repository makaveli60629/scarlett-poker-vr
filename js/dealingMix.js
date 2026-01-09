// /js/dealingMix.js — Scarlett DealingMix v1.2
// - chips + dealer button flat on table top
// - HUD moved higher
// - Pot HUD appears ONLY when you look at pot center
// - Bigger corner ranks for readability

export const DealingMix = (() => {
  let THREE, scene, world, log;
  let root, commGroup, tableHud, turnHud, potHud, dealerChip, deckMesh, potChips;
  let playerRig=null, cameraRef=null;

  const state = { t:0, running:false, deck:[], street:"PREFLOP", pot:150, turn:"LUNA" };
  const SUITS=["♠","♥","♦","♣"];
  const RANKS=["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

  const L=(...a)=>{ try{log?.(...a);}catch{console.log(...a);} };

  function tablePos(){
    const tf = world?.tableFocus || new THREE.Vector3(0,0,-6.5);
    const y  = world?.tableTopY ?? (world?.metrics?.tableY ?? 0.92);
    return { x:tf.x, y, z:tf.z };
  }

  function buildDeck(){
    const d=[];
    for(const s of SUITS) for(const r of RANKS) d.push({r,s});
    for(let i=d.length-1;i>0;i--){
      const j=(Math.random()*(i+1))|0;
      [d[i],d[j]]=[d[j],d[i]];
    }
    return d;
  }

  function drawCard(){ if(!state.deck.length) state.deck=buildDeck(); return state.deck.pop(); }

  function cardTex(cs){
    const c=document.createElement("canvas");
    c.width=256;c.height=356;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle="rgba(0,0,0,0.25)"; ctx.lineWidth=6; ctx.strokeRect(6,6,c.width-12,c.height-12);

    const red=(cs.s==="♥"||cs.s==="♦");
    ctx.fillStyle=red?"#b6001b":"#111";

    // ✅ BIGGER corner ranks
    ctx.font="bold 68px Arial";
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText(cs.r, 18, 12);
    ctx.font="bold 72px Arial";
    ctx.fillText(cs.s, 18, 78);

    ctx.textAlign="right"; ctx.textBaseline="bottom";
    ctx.font="bold 68px Arial";
    ctx.fillText(cs.r, c.width-18, c.height-86);
    ctx.font="bold 72px Arial";
    ctx.fillText(cs.s, c.width-18, c.height-14);

    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="bold 150px Arial";
    ctx.fillText(cs.s, c.width/2, c.height/2 + 12);

    const t=new THREE.CanvasTexture(c); t.needsUpdate=true; return t;
  }

  function makeCard(cs){
    const geo=new THREE.PlaneGeometry(0.30, 0.42);
    const face=new THREE.MeshStandardMaterial({ map:cardTex(cs), roughness:0.55, emissive:0x111111, emissiveIntensity:0.18, side:THREE.DoubleSide });
    const back=new THREE.MeshStandardMaterial({ color:0xff2d7a, roughness:0.6, emissive:0x220010, emissiveIntensity:0.35, side:THREE.DoubleSide });
    const g=new THREE.Group();
    const f=new THREE.Mesh(geo, face); f.position.z=0.002;
    const b=new THREE.Mesh(geo, back); b.position.z=-0.002; b.rotation.y=Math.PI;
    g.add(f,b);
    return g;
  }

  function makeChip(color){
    const geo=new THREE.CylinderGeometry(0.06,0.06,0.014,28);
    const mat=new THREE.MeshStandardMaterial({ color, roughness:0.35, emissive:color, emissiveIntensity:0.06 });
    const m=new THREE.Mesh(geo,mat);
    m.rotation.x=Math.PI/2; // ✅ flat
    return m;
  }

  function makePot(){
    const g=new THREE.Group();
    for(let i=0;i<18;i++){
      const col = i%3===0?0xff2d7a:(i%3===1?0x7fe7ff:0xffffff);
      const c=makeChip(col);
      c.position.set((Math.random()-0.5)*0.25, 0.008 + i*0.004, (Math.random()-0.5)*0.22);
      g.add(c);
    }
    return g;
  }

  function makeDealerChip(){
    const geo=new THREE.CylinderGeometry(0.10,0.10,0.012,34);
    const mat=new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.35, emissive:0x222222, emissiveIntensity:0.18 });
    const m=new THREE.Mesh(geo,mat);
    m.rotation.x=Math.PI/2;
    return m;
  }

  function makeDeck(){
    const geo=new THREE.BoxGeometry(0.14,0.05,0.20);
    const mat=new THREE.MeshStandardMaterial({ color:0x12131a, roughness:0.55, emissive:0x120014, emissiveIntensity:0.16 });
    return new THREE.Mesh(geo,mat);
  }

  function makeHud(text, w=2.0, h=0.48){
    const c=document.createElement("canvas");
    c.width=1024; c.height=256;
    const ctx=c.getContext("2d");
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle="#7fe7ff";
    ctx.font="bold 52px Arial";
    ctx.fillText(text, 44, 96);
    const t=new THREE.CanvasTexture(c); t.needsUpdate=true;
    const m=new THREE.MeshBasicMaterial({ map:t, transparent:true, depthTest:false });
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h), m);
    mesh.renderOrder=120;
    mesh.userData.setText=(txt)=>{
      const ctx2=c.getContext("2d");
      ctx2.clearRect(0,0,c.width,c.height);
      ctx2.fillStyle="rgba(0,0,0,0.55)";
      ctx2.fillRect(0,0,c.width,c.height);
      ctx2.fillStyle="#7fe7ff";
      ctx2.font="bold 52px Arial";
      ctx2.fillText(txt, 44, 96);
      t.needsUpdate=true;
    };
    return mesh;
  }

  function facePlayer(obj){
    const ref=cameraRef||playerRig;
    if(!ref||!obj) return;
    const p=ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function lookingAtPoint(pt, maxAngleDeg=12){
    if(!cameraRef) return false;
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    cameraRef.getWorldPosition(camPos);
    cameraRef.getWorldDirection(camDir);
    const to = pt.clone().sub(camPos).normalize();
    const dot = camDir.dot(to);
    const ang = Math.acos(Math.min(1,Math.max(-1,dot))) * (180/Math.PI);
    return ang < maxAngleDeg;
  }

  function layout(){
    const {x,y,z}=tablePos();

    // community hover (faces player)
    commGroup.position.set(x, y+0.62, z+0.10);

    // ✅ Higher table ID HUD
    tableHud.position.set(x, y+1.40, z-0.08);

    // ✅ Turn HUD directly above community cards
    turnHud.position.set(x, y+1.05, z+0.10);

    // pot chips center
    potChips.position.set(x, y+0.010, z+0.02);

    // dealer chip + deck (face down area)
    dealerChip.position.set(x+0.55, y+0.010, z-0.40);
    deckMesh.position.set(x+0.33, y+0.035, z-0.40);

    // pot HUD appears near pot
    potHud.position.set(x, y+0.45, z+0.02);
  }

  function setCommunity(n){
    while(commGroup.children.length) commGroup.remove(commGroup.children[0]);
    for(let i=0;i<n;i++){
      const cs=drawCard();
      const m=makeCard(cs);
      m.position.x=(i-(n-1)/2)*0.36;
      commGroup.add(m);
    }
  }

  function nextStreet(){
    if(state.street==="PREFLOP"){ state.street="FLOP"; setCommunity(3); }
    else if(state.street==="FLOP"){ state.street="TURN"; setCommunity(4); }
    else if(state.street==="TURN"){ state.street="RIVER"; setCommunity(5); }
    else { state.street="PREFLOP"; setCommunity(0); }
  }

  return {
    init({ THREE:_T, scene:_S, log:_L, world:_W }={}){
      THREE=_T; scene=_S; log=_L; world=_W;
      if(root){ try{scene.remove(root);}catch{} }
      root=new THREE.Group(); root.name="DealingMixRoot"; scene.add(root);

      commGroup=new THREE.Group(); commGroup.name="Community";
      potChips=makePot();
      dealerChip=makeDealerChip();
      deckMesh=makeDeck();

      tableHud=makeHud("Scarlett VR Poker • 6-Max • Table: $10,000", 2.35, 0.52);
      turnHud =makeHud("Pot: $150 • PREFLOP • Turn: LUNA", 2.20, 0.48);
      potHud  =makeHud("Pot: $150", 1.10, 0.34);
      potHud.visible=false;

      root.add(commGroup, potChips, dealerChip, deckMesh, tableHud, turnHud, potHud);

      state.deck=buildDeck();
      state.street="PREFLOP";
      state.pot=150;
      state.turn="LUNA";
      setCommunity(0);
      layout();

      L("[DealingMix] init ✅");
      return {
        setPlayerRig(rig, cam){ playerRig=rig||null; cameraRef=cam||null; },
        startHand(){
          state.running=true;
          state.deck=buildDeck();
          state.street="PREFLOP";
          state.pot=150;
          state.turn="LUNA";
          setCommunity(0);
          turnHud.userData.setText(`Pot: $${state.pot} • ${state.street} • Turn: ${state.turn}`);
          potHud.userData.setText(`Pot: $${state.pot}`);
        },
        update(dt){
          state.t+=dt;

          // gentle hover
          const {y}=tablePos();
          commGroup.position.y = (y+0.62) + Math.sin(state.t*1.6)*0.02;

          // face player
          facePlayer(commGroup);
          facePlayer(tableHud);
          facePlayer(turnHud);
          facePlayer(potHud);

          // ✅ Pot HUD only when looking at pot center
          const {x,z}=tablePos();
          const potPoint = new THREE.Vector3(x, y+0.02, z+0.02);
          potHud.visible = lookingAtPoint(potPoint, 12);

          // auto demo
          state._acc=(state._acc||0)+dt;
          if(state.running && state._acc>4.0){
            state._acc=0;
            nextStreet();
            turnHud.userData.setText(`Pot: $${state.pot} • ${state.street} • Turn: ${state.turn}`);
          }
        }
      };
    }
  };
})();
