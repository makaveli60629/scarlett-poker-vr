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
    // Pit rim at lobby floor (Y=0), pit floor at Y=-3.0 (PERMANENT LOCK)
    pit.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"5.2", radiusOuter:"10.6",
      material:"color:#070c12; roughness:1"}));
    // Pit walls (visible), height = 3.0
    pit.appendChild(el("a-cylinder",{radius:"5.25", height:"3.00", position:"0 -1.50 0",
      material:"color:#04070d; side:double; roughness:0.95; metalness:0.05"}));
    // Pit floor collider/visual
    pit.appendChild(el("a-circle",{class:"teleportable", rotation:"-90 0 0", radius:"5.18", position:"0 -3.00 0",
      material:"color:#060b12; roughness:0.98; metalness:0.05"}));

    // Rail ring + neon strip
    pit.appendChild(el("a-torus",{radius:"10.0", radiusTubular:"0.16", rotation:"90 0 0", position:"0 0.10 0",
      material:"color:#2a1f18; roughness:0.9"}));
    pit.appendChild(el("a-torus",{radius:"10.2", radiusTubular:"0.06", rotation:"90 0 0", position:"0 0.22 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.65; opacity:0.95"}));

    // Octagonal pedestal silhouette (visual), anchored to pit floor
    const pedestal = el("a-cylinder",{radius:"4.9", height:"0.14", position:"0 -2.92 0",
      material:"color:#0b1018; roughness:0.85; metalness:0.12"});
    pit.appendChild(pedestal);

    world.appendChild(pit);

    // Main table anchored to pit floor (y=-3.0)
    const table = el("a-entity",{id:"mainTable", position:"0 -3.00 0"});
    // Pedestal from pit floor up to table top
    table.appendChild(el("a-cylinder",{radius:"0.60", height:"1.85", position:"0 0.93 0",
      material:"color:#0b1018; roughness:0.75; metalness:0.15"}));
    // Table body + rail + felt
    table.appendChild(el("a-cylinder",{radius:"4.25", height:"0.60", position:"0 1.55 0",
      material:"color:#101722; roughness:0.85; metalness:0.10"}));
    table.appendChild(el("a-torus",{radius:"3.98", radiusTubular:"0.18", position:"0 1.92 0", rotation:"90 0 0",
      material:"color:#2a1f18; roughness:0.95"}));
    table.appendChild(el("a-cylinder",{radius:"3.82", height:"0.16", position:"0 2.10 0",
      material:"color:#0f7a60; roughness:1; metalness:0"}));

    // Betting line (pass line) per packet: radius 1.8m
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.78", radiusOuter:"1.82", position:"0 2.19 0",
      material:"color:#eaf2ff; opacity:0.28; shader:standard; roughness:1"}));

    // Community frame + HUD above felt (readable)
    const comm = el("a-entity",{id:"communityFrame", position:"0 2.75 -1.25"});
    comm.appendChild(el("a-plane",{width:"1.70", height:"0.62", material:"color:#061019; opacity:0.72"}));
    txt(comm,"COMMUNITY","0 0.23 0.02",3.2,"#cfe7ff");

    // Community cards: 2x normal size, facing player
    const cards = el("a-entity",{id:"communityCards", position:"0 -0.05 0.05"});
    for(let i=0;i<5;i++) {
      cards.appendChild(el("a-plane",{class:"communityCard", width:"0.30", height:"0.44", position:`${(i-2)*0.34} 0.00 0`,
        material:"color:#ffffff; opacity:0.98; side:double; roughness:0.9; metalness:0.0"}));
      cards.appendChild(el("a-text",{class:"cardLabel", value:"", position:`${(i-2)*0.34} 0.00 0.01`, align:"center",
        width:"1.6", color:"#0b0f14"}));
    }
    comm.appendChild(cards);
    table.appendChild(comm);

    // Table HUD (framed, above community)
    const hud = el("a-entity",{id:"tableHud", position:"0 3.50 -1.25"});
    hud.appendChild(el("a-plane",{width:"2.10", height:"0.60", material:"color:#061019; opacity:0.70"}));
    hud.appendChild(el("a-plane",{width:"2.14", height:"0.64", position:"0 0 -0.01", material:"color:#0b2b44; opacity:0.30"}));
    txt(hud,"TURN: —\nPOT: $0\nTO CALL: $0\nLAST: —","0 0 0.02",3.2,"#eaf2ff").setAttribute("id","actionHudText");
    table.appendChild(hud);

    // Chips (visible stacks + pot)
    const chips = el("a-entity",{id:"chips", position:"0 2.20 0"});
    function stack(x,z,color){
      const g = el("a-entity",{position:`${x} 0 ${z}`});
      for(let i=0;i<10;i++) g.appendChild(el("a-cylinder",{radius:"0.045", height:"0.010", position:`0 ${i*0.011} 0`,
        material:`color:${color}; roughness:0.55; metalness:0.15`}));
      chips.appendChild(g);
    }
    stack(-0.30,0.35,"#d12d2d");
    stack(-0.12,0.40,"#2d6bd1");
    stack(0.06,0.42,"#2dd16b");
    stack(0.24,0.38,"#d1c22d");
    const potStack = el("a-entity",{id:"potStack", position:"0 0 -0.30"});
    for(let i=0;i<18;i++) potStack.appendChild(el("a-cylinder",{radius:"0.050", height:"0.010", position:`0 ${i*0.011} 0`,
      material:"color:#e6e6e6; roughness:0.5; metalness:0.2"}));
    chips.appendChild(potStack);
    table.appendChild(chips);

    world.appendChild(table);
  }
    comm.appendChild(cards);

    const actionHud = el("a-entity",{id:"actionHud", position:"0 1.35 0.03"});
    actionHud.appendChild(el("a-plane",{width:"2.75", height:"0.36", material:"color:#091425; opacity:0.76"}));
    actionHud.appendChild(el("a-text",{id:"actionHudText", value:"Waiting…", position:"-1.28 0 0.02", align:"left", width:"9.0", color:"#d7eaff"}));
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
      const chair=el("a-entity",{class:"chair", position:`${x.toFixed(2)} -1.15 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      chair.appendChild(el("a-cylinder",{radius:"0.52", height:"0.10", position:"0 0.05 0", material:"color:#141b25"}));
      // chair legs down to pit floor (visible) — deeper divot needs longer legs
      const legH = 1.20; // visual leg length
      const legY = -0.65;
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
    const chips = el("a-entity",{id:"tableChips", position:"0 1.15 0.35"});
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
    const table = document.getElementById("mainTable");
    const root = el("a-entity",{id:"bots"});
    // 8 seats around the table
    const names = ["Mike","Jason","Alex","Chris","Daniel","Brian","Kevin","Nick"];
    for(let i=0;i<8;i++){
      const ang=(i/8)*Math.PI*2;
      const x=Math.sin(ang)*4.35, z=Math.cos(ang)*4.35;
      const yaw=(Math.atan2(x,z)*180/Math.PI)+180;

      const bot = el("a-entity",{class:"bot","data-seat":String(i+1), position:`${x.toFixed(2)} 0 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});

      // Seat height: bots live in table-space (table is already at pit floor). Use local Y to sit on chairs.
      // Placeholder body kept hidden once GLB loads.
      bot.appendChild(el("a-cylinder",{radius:"0.26", height:"0.85", position:"0 0.55 0", material:"color:#1a2330"}));
      bot.appendChild(el("a-sphere",{radius:"0.21", position:"0 1.10 0", material:"color:#2a3a52"}));

      // Action panel near felt edge facing inward
      const act=el("a-entity",{class:"actionPanel", position:"0 1.70 0.95", rotation:"-20 0 0"});
      act.appendChild(el("a-plane",{width:"0.78", height:"0.26", material:"color:#071018; opacity:0.58"}));
      act.appendChild(el("a-text",{class:"actionText", value:"WAIT", position:"0 0 0.01", align:"center", width:"2.6", color:"#d7eaff"}));
      bot.appendChild(act);

      // Hole cards hover above nameplate (raised)
      const hc=el("a-entity",{class:"holeCards", position:"0 2.10 0"});
      for(let c=0;c<2;c++){
        hc.appendChild(el("a-plane",{class:"holeCard", width:"0.15", height:"0.22", position:`${c==0?-0.08:0.08} 0 0`, material:"color:#ffffff; opacity:0.98; side:double"}));
        hc.appendChild(el("a-text",{class:"cardLabel", value:"", position:`${c==0?-0.08:0.08} 0 0.01`, align:"center", width:"0.8", color:"#0b0f14"}));
      }
      bot.appendChild(hc);

      // Name tag (always on by default)
      const tag=el("a-entity",{class:"nameTag", position:"0 1.85 0", visible:"true"});
      txt(tag, `${names[i]}\n$10,000`, "0 0 0", 2.6, "#eaf2ff");
      bot.appendChild(tag);

      root.appendChild(bot);
    }
    // Attach bots under table so seat positions track pit/table permanently.
    if (table) table.appendChild(root);
    else world.appendChild(root);
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
    try{ const scene=document.getElementById("scene"); if(scene){ scene.emit && scene.emit("scarlett-world-built"); scene.dispatchEvent && scene.dispatchEvent(new Event("scarlett-world-built")); } }catch(_){ }
    D.log("[world] lobby + pit + table + bots ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
