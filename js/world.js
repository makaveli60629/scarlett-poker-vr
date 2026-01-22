// js/world.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };
  const world = document.getElementById("world");

  function el(tag, attrs){
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clear(){ while(world.firstChild) world.removeChild(world.firstChild); }
  function txt(parent, value, pos, width, color){
    const t = el("a-text", {value, position:pos||"0 0 0", align:"center", width:String(width||2.5), color:color||"#eaf2ff", baseline:"center"});
    parent.appendChild(t); return t;
  }

  function buildLobby(){
    world.appendChild(el("a-circle",{class:"teleportable", rotation:"-90 0 0", radius:"40", material:"color:#0a111b; roughness:1; metalness:0"}));
    world.appendChild(el("a-cylinder",{radius:"39.6", height:"14", position:"0 7 0", material:"color:#050a12; side:double; roughness:0.95; metalness:0.06; opacity:0.995"}));
    world.appendChild(el("a-circle",{rotation:"90 0 0", radius:"39.2", position:"0 14 0", material:"color:#03060b; opacity:0.985"}));
    world.appendChild(el("a-torus",{position:"0 13.0 0", radius:"39.15", radiusTubular:"0.09", rotation:"90 0 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.0; opacity:0.85"}));
    const sign = el("a-entity",{position:"0 4.2 24", rotation:"0 180 0"});
    sign.appendChild(el("a-plane",{width:"10.2", height:"2.9", material:"color:#091425; opacity:0.74"}));
    txt(sign,"WELCOME TO VIP • SCARLETT","0 0.55 0.01",8.4,"#d7eaff");
    txt(sign,"LEGENDS • TROPHIES • HIGH STAKES","0 -0.35 0.01",6.6,"#b8d3ff");
    world.appendChild(sign);
  }

  function buildDoorsAndJumbos(){
    const spots = [
      {x:0, z:-36, ry:0, door:"MAIN EVENTS"},
      {x:36, z:0, ry:-90, door:"SCORPION ROOM"},
      {x:0, z:36, ry:180, door:"VIP WELCOME"},
      {x:-36, z:0, ry:90, door:"STORE"},
    ];
    spots.forEach((s, idx)=>{
      const d = el("a-entity",{position:`${s.x} 0 ${s.z}`, rotation:`0 ${s.ry} 0`});
      d.appendChild(el("a-box",{width:"7", height:"5.6", depth:"0.45", position:"0 2.8 0", material:"color:#0f1723; roughness:0.9"}));
      d.appendChild(el("a-box",{width:"5.8", height:"4.6", depth:"0.25", position:"0 2.7 0.13", material:"color:#071018; roughness:1; opacity:0.98"}));
      const lbl = el("a-entity",{position:"0 5.75 0.30"});
      txt(lbl, s.door, "0 0 0", 7.0, "#cfe7ff");
      d.appendChild(lbl);
      world.appendChild(d);

      const j = el("a-entity",{position:`${s.x} 10.6 ${s.z}`, rotation:`0 ${s.ry} 0`});
      j.appendChild(el("a-box",{width:"9.6", height:"5.2", depth:"0.24", material:"color:#0c131d; roughness:0.9"}));
      j.appendChild(el("a-plane",{id:`jumboScreen_${idx}`, class:"jumboScreen uiTarget", width:"9.0", height:"4.6", position:"0 0 0.13",
        material:"color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.45"}));
      world.appendChild(j);

      const rank = el("a-entity",{position:`${s.x} 8.05 ${s.z}`, rotation:`0 ${s.ry} 0`});
      rank.appendChild(el("a-plane",{width:"7.8", height:"0.65", material:"color:#091425; opacity:0.82"}));
      txt(rank, "RANKED • VIP", "0 0 0.01", 7.0, "#bfe1ff");
      world.appendChild(rank);
    });
  }

  function buildSpawn(){
    const spawn = el("a-entity",{id:"spawnPad", position:"0 0 26"});
    spawn.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"0.65", radiusOuter:"1.10",
      material:"color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.85; opacity:0.98"}));
    txt(spawn,"SPAWN","0 0.02 0",3.6,"#cfe7ff");
    world.appendChild(spawn);
  }

  function buildPitAndTable(){
    const pit = el("a-entity",{id:"pit"});
    pit.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"5.2", radiusOuter:"10.4", material:"color:#070c12; roughness:1"}));
    // Deepen divot (pit) so chair legs + pedestal are fully visible.
    // Target pit floor Y = -3.75 (lobby floor/rim at Y=0).
    pit.appendChild(el("a-cylinder",{radius:"5.2", height:"3.75", position:"0 -1.875 0", material:"color:#03060b; side:double; roughness:0.95"}));
    pit.appendChild(el("a-circle",{rotation:"-90 0 0", radius:"5.12", position:"0 -3.75 0", material:"color:#060b12; roughness:0.98"}));
    pit.appendChild(el("a-torus",{radius:"10.0", radiusTubular:"0.18", rotation:"90 0 0", position:"0 1.05 0", material:"color:#2a1f18; roughness:0.9"}));
    pit.appendChild(el("a-torus",{radius:"10.2", radiusTubular:"0.08", rotation:"90 0 0", position:"0 0.25 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.25; opacity:0.92"}));
    world.appendChild(pit);

    const table = el("a-entity",{id:"mainTable", position:"0 -1.55 0"});
    // Central pedestal down to pit floor (pit floor is -3.75; tabletop is ~-0.65)
    table.appendChild(el("a-cylinder",{radius:"0.55", height:"3.10", position:"0 -0.65 0", material:"color:#0b1018; roughness:0.75; metalness:0.15"}));
    table.appendChild(el("a-cylinder",{radius:"4.2", height:"0.58", position:"0 0.29 0", material:"color:#0f141c; roughness:0.85; metalness:0.12"}));
    table.appendChild(el("a-torus",{radius:"3.95", radiusTubular:"0.18", position:"0 0.72 0", rotation:"90 0 0", material:"color:#2a1f18; roughness:0.95"}));
    table.appendChild(el("a-cylinder",{radius:"3.80", height:"0.16", position:"0 0.90 0", material:"color:#0f7a60; roughness:1"}));

    const comm = el("a-entity",{id:"communityFrame", position:"0 2.35 -1.35"});
    comm.appendChild(el("a-plane",{width:"3.00", height:"1.00", material:"color:#061019; opacity:0.62"}));
    txt(comm,"COMMUNITY","0 0.38 0.02",3.8,"#cfe7ff");

    const cards = el("a-entity",{id:"communityCards", position:"0 -0.05 0.05"});
    for(let i=0;i<5;i++){
      cards.appendChild(el("a-plane",{class:"communityCard", width:"1.04", height:"1.44", position:`${(i-2)*1.15} 0.00 0`, material:"color:#ffffff; opacity:0.95; side:double; roughness:0.8; metalness:0.0"}));
      cards.appendChild(el("a-text",{class:"cardLabel", value:"", position:`${(i-2)*1.15} 0.00 0.02`, align:"center", width:"5.0", color:"#0b0f14"}));
    }
    comm.appendChild(cards);

    const actionHud = el("a-entity",{id:"actionHud", position:"0 0.98 0.03"});
    actionHud.appendChild(el("a-plane",{width:"2.75", height:"0.36", material:"color:#091425; opacity:0.76"}));
    actionHud.appendChild(el("a-text",{id:"actionHudText", value:"Waiting…", position:"-1.28 0 0.02", align:"left", width:"5.0", color:"#d7eaff"}));
    comm.appendChild(actionHud);

    table.appendChild(comm);

    const pot = el("a-entity",{id:"potHud", position:"0 1.65 0.70"});
    pot.appendChild(el("a-plane",{width:"1.35", height:"0.30", material:"color:#071018; opacity:0.66"}));
    pot.appendChild(el("a-text",{id:"potText", value:"POT $0", position:"0 0 0.01", align:"center", width:"3.8", color:"#d7eaff"}));
    table.appendChild(pot);

    for(let i=0;i<6;i++){
      const ang=(i/6)*Math.PI*2;
      const x=Math.sin(ang)*4.95, z=Math.cos(ang)*4.95;
      const yaw=(Math.atan2(x,z)*180/Math.PI)+180;
      const chair=el("a-entity",{class:"chair", position:`${x.toFixed(2)} 0 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      chair.appendChild(el("a-cylinder",{radius:"0.52", height:"0.10", position:"0 0.05 0", material:"color:#141b25"}));
      // chair legs down to pit floor (visible) — deeper divot needs longer legs
      const legH = 2.35; // visual leg length
      const legY = -1.05;
      const legPos = [
        {x:0.34,z:0.34},{x:-0.34,z:0.34},{x:0.34,z:-0.34},{x:-0.34,z:-0.34}
      ];
      legPos.forEach(p=>{
        chair.appendChild(el("a-cylinder",{radius:"0.04", height:String(legH), position:`${p.x} ${legY} ${p.z}`, material:"color:#0b1018; roughness:0.9"}));
      });
      chair.appendChild(el("a-box",{width:"0.96", height:"0.78", depth:"0.16", position:"0 0.70 -0.48", material:"color:#121a24"}));
      chair.appendChild(el("a-entity",{class:"SeatAnchor", position:"0 0.62 0.62"}));
      table.appendChild(chair);
    }

    
    // Chips on table (visual stacks + pot)
    const chips = el("a-entity",{id:"tableChips", position:"0 1.02 0.35"});
    function stack(x,z,color){
      const g = el("a-entity",{position:`${x} 0 ${z}`});
      for(let i=0;i<10;i++){
        g.appendChild(el("a-cylinder",{radius:"0.07", height:"0.012", position:`0 ${i*0.013} 0`,
          material:`color:${color}; roughness:0.6; metalness:0.1`}));
      }
      chips.appendChild(g);
    }
    stack(-0.45,0.05,"#d12d2d");
    stack(-0.25,0.10,"#2d6bd1");
    stack(-0.05,0.12,"#2dd16b");
    stack(0.15,0.10,"#d1c22d");
    stack(0.35,0.05,"#c12dd1");
    // Pot stack
    const potStack = el("a-entity",{id:"potStack", position:"0 0 -0.28"});
    for(let i=0;i<18;i++){
      potStack.appendChild(el("a-cylinder",{radius:"0.085", height:"0.012", position:`0 ${i*0.013} 0`,
        material:`color:#e6e6e6; roughness:0.5; metalness:0.2`}));
    }
    chips.appendChild(potStack);
    table.appendChild(chips);

    world.appendChild(table);
  }

  function buildBots(){
    const bots = el("a-entity",{id:"bots"});
    for(let i=0;i<6;i++){
      const ang=(i/6)*Math.PI*2;
      const x=Math.sin(ang)*4.55, z=Math.cos(ang)*4.55;
      const yaw=(Math.atan2(x,z)*180/Math.PI)+180;
      const bot = el("a-entity",{class:"bot", "data-seat": String(i+1), position:`${x.toFixed(2)} -1.55 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      bot.appendChild(el("a-cylinder",{radius:"0.28", height:"1.08", position:"0 1.02 0", material:"color:#1a2330"}));
      bot.appendChild(el("a-sphere",{radius:"0.23", position:"0 1.74 0", material:"color:#2a3a52"}));
      const act=el("a-entity",{class:"actionPanel", position:"0 0.10 1.10", rotation:"-90 0 0"});
      act.appendChild(el("a-plane",{width:"0.82", height:"0.28", material:"color:#071018; opacity:0.58"}));
      act.appendChild(el("a-text",{class:"actionText", value:"WAIT", position:"0 0 0.01", align:"center", width:"2.8", color:"#d7eaff"}));
      bot.appendChild(act);
      const hc=el("a-entity",{class:"holeCards", position:"0 2.65 0"});
      for(let c=0;c<2;c++){
        hc.appendChild(el("a-plane",{class:"holeCard", width:"0.44", height:"0.62", position:`${c==0?-0.25:0.25} 0 0`, material:"color:#ffffff; opacity:0.95; side:double"}));
        hc.appendChild(el("a-text",{class:"cardLabel", value:"", position:`${c==0?-0.25:0.25} 0 0.01`, align:"center", width:"1.6", color:"#0b0f14"}));
      }
      bot.appendChild(hc);
      const tag=el("a-entity",{class:"nameTag", position:"0 2.90 0", visible:"false"});
      txt(tag, `Bot_${i+1}\n$10,000`, "0 0 0", 3.0, "#eaf2ff");
      bot.appendChild(tag);
      bots.appendChild(bot);
    }
    world.appendChild(bots);
  }

  function build(){
    clear();
    buildLobby();
    buildDoorsAndJumbos();
    buildSpawn();
    buildPitAndTable();
    buildBots();
    D.log("[world] lobby + divot + doors + store display ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
