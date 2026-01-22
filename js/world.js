// js/world.js
(function(){
  const D = window.SCARLETT_DIAG;
  const world = document.getElementById("world");

  function el(tag, attrs){
    const e = document.createElement(tag);
    if(attrs){ for(const k in attrs) e.setAttribute(k, attrs[k]); }
    return e;
  }
  function txt(parent, value, pos, width, color){
    const t = el("a-text", {value, position:pos||"0 0 0", align:"center", width: String(width||2.5), color: color||"#eaf2ff", baseline:"center"});
    parent.appendChild(t); return t;
  }
  function clear(){ while(world.firstChild) world.removeChild(world.firstChild); }

  function buildLobby(){
    world.appendChild(el("a-circle",{class:"teleportable", rotation:"-90 0 0", radius:"24",
      material:"color:#0c1118; roughness:1; metalness:0.0"}));

    world.appendChild(el("a-cylinder",{radius:"23.6", height:"10.5", position:"0 5.25 0",
      material:"color:#070c12; roughness:0.96; metalness:0.06; side:double; opacity:0.99"}));

    world.appendChild(el("a-circle",{rotation:"90 0 0", radius:"23.2", position:"0 10.5 0", material:"color:#05080d; opacity:0.98"}));

    world.appendChild(el("a-torus",{position:"0 10.2 0", radius:"14.5", radiusTubular:"0.14", rotation:"90 0 0",
      material:"color:#10314a; emissive:#4aa6ff; emissiveIntensity:1.15; roughness:0.6"}));

    world.appendChild(el("a-torus",{position:"0 9.9 0", radius:"23.15", radiusTubular:"0.08", rotation:"90 0 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.15; opacity:0.92"}));

    const sign = el("a-entity",{position:"0 3.1 14.2", rotation:"0 180 0"});
    sign.appendChild(el("a-plane",{width:"8.2", height:"2.4", material:"color:#091425; opacity:0.7"}));
    txt(sign,"WELCOME TO VIP • SCARLETT","0 0.45 0.01",7.2,"#d7eaff");
    txt(sign,"LEGENDS • TROPHIES • HIGH STAKES","0 -0.25 0.01",5.8,"#b8d3ff");
    world.appendChild(sign);

    for(let i=0;i<6;i++){
      const a = (i/6)*Math.PI*2 + 0.3;
      const x = Math.sin(a)*17.2, z = Math.cos(a)*17.2;
      const ped = el("a-entity",{position:`${x.toFixed(2)} 0 ${z.toFixed(2)}`});
      ped.appendChild(el("a-cylinder",{radius:"0.7", height:"0.9", position:"0 0.45 0", material:"color:#0f1a26; roughness:0.75; metalness:0.25"}));
      ped.appendChild(el("a-cone",{radiusBottom:"0.3", radiusTop:"0.06", height:"0.9", position:"0 1.35 0", material:"color:#d5b45b; metalness:0.7; roughness:0.35"}));
      world.appendChild(ped);
    }
  }

  function buildJumbosAndDoors(){
    const spots = [
      {x:0,   z:-20.5, ry:0,   door:"MAIN EVENTS"},
      {x:20.5,z:0,     ry:-90, door:"SCORPION ROOM"},
      {x:0,   z:20.5,  ry:180, door:"VIP WELCOME"},
      {x:-20.5,z:0,    ry:90,  door:"STORE"},
    ];

    spots.forEach((s, idx)=>{
      const j = el("a-entity",{class:"jumbotronWall", position:`${s.x} 6.8 ${s.z}`, rotation:`0 ${s.ry} 0`});
      j.appendChild(el("a-box",{width:"8.2", height:"4.6", depth:"0.22", material:"color:#0c131d; roughness:0.9"}));
      j.appendChild(el("a-plane",{id:`jumboScreen_${idx}`, class:"jumboScreen", width:"7.6", height:"4.0", position:"0 0 0.12",
        material:"color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.35"}));
      world.appendChild(j);

      const d = el("a-entity",{position:`${s.x} 0 ${s.z}`, rotation:`0 ${s.ry} 0`});
      d.appendChild(el("a-box",{width:"6.2", height:"4.8", depth:"0.35", position:"0 2.4 0", material:"color:#0f1723; roughness:0.9"}));
      d.appendChild(el("a-box",{width:"5.2", height:"3.9", depth:"0.25", position:"0 2.35 0.12", material:"color:#071018; roughness:1; opacity:0.98"}));
      const lbl = el("a-entity",{position:"0 4.95 0.28"});
      txt(lbl, s.door, "0 0 0", 6.0, "#cfe7ff");
      d.appendChild(lbl);
      world.appendChild(d);

      const rank = el("a-entity",{position:`${s.x} 5.05 ${s.z}`, rotation:`0 ${s.ry} 0`});
      rank.appendChild(el("a-plane",{width:"6.8", height:"0.55", material:"color:#091425; opacity:0.78"}));
      txt(rank, "RANKED • VIP", "0 0 0.01", 6.0, "#bfe1ff");
      world.appendChild(rank);
    });

    // Store display near STORE door (no pillars in front)
    const storeX = -20.5, storeZ = 0;
    for(let i=0;i<4;i++){
      const dz = -2.4 + i*1.6;
      const disp = el("a-entity",{class:"storePedestal", position:`${storeX + 2.2} 0 ${storeZ + dz}`, rotation:"0 90 0"});
      disp.appendChild(el("a-cylinder",{radius:"0.55", height:"0.22", position:"0 0.11 0", material:"color:#0f1a26; roughness:0.7; metalness:0.25"}));
      const frame = el("a-entity",{position:"0 1.65 0"});
      frame.appendChild(el("a-plane",{width:"0.95", height:"1.55", material:"color:#061019; opacity:0.55"}));
      txt(frame, "AVATAR\nDISPLAY", "0 0 0.01", 2.2, "#d7eaff");\n      txt(frame, "TAP TO\nCYCLE", "0 -0.65 0.01", 2.0, "#bfe1ff");
      disp.appendChild(frame);
      world.appendChild(disp);
    }
  }

  function buildSpawn(){
    const spawn = el("a-entity",{id:"spawnPad", position:"0 0 12"});
    spawn.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"0.55", radiusOuter:"0.95",
      material:"color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.7; opacity:0.98"}));
    txt(spawn,"SPAWN","0 0.02 0",3.4,"#cfe7ff");
    world.appendChild(spawn);
  }

  function buildDivotAndTable(){
    const pit = el("a-entity",{id:"pit"});
    pit.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"3.5", radiusOuter:"7.6", material:"color:#0c1118; roughness:1; metalness:0"}));
    pit.appendChild(el("a-cylinder",{radius:"3.5", height:"1.0", position:"0 -0.5 0", material:"color:#05080d; roughness:0.95; metalness:0.08; side:double"}));
    pit.appendChild(el("a-circle",{rotation:"-90 0 0", radius:"3.45", position:"0 -1.0 0", material:"color:#0a0f18; roughness:0.98; metalness:0.02"}));
    pit.appendChild(el("a-torus",{radius:"7.25", radiusTubular:"0.14", rotation:"90 0 0", position:"0 0.95 0", material:"color:#2a1f18; roughness:0.9; metalness:0.05"}));
    pit.appendChild(el("a-torus",{radius:"7.45", radiusTubular:"0.06", rotation:"90 0 0", position:"0 0.12 0", material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.2; opacity:0.95"}));
    world.appendChild(pit);

    const table = el("a-entity",{id:"mainTable", position:"0 -0.85 0"});
    table.appendChild(el("a-cylinder",{radius:"3.2", height:"0.52", position:"0 0.26 0", material:"color:#0f141c; roughness:0.85; metalness:0.12"}));
    table.appendChild(el("a-torus",{radius:"2.95", radiusTubular:"0.16", position:"0 0.66 0", rotation:"90 0 0", material:"color:#2a1f18; roughness:0.95; metalness:0.05"}));
    table.appendChild(el("a-cylinder",{radius:"2.82", height:"0.16", position:"0 0.82 0", material:"color:#0f7a60; roughness:1; metalness:0"}));
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.05", radiusOuter:"1.12", position:"0 0.90 0", material:"color:#e9f2ff; opacity:0.30"}));
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.55", radiusOuter:"1.62", position:"0 0.90 0", material:"color:#e9f2ff; opacity:0.18"}));
    table.appendChild(el("a-plane",{width:"0.04", height:"2.7", position:"0 0.91 0", rotation:"-90 0 0", material:"color:#e9f2ff; opacity:0.18"}));
    table.appendChild(el("a-circle",{rotation:"-90 0 0", radius:"0.18", position:"0 0.94 -1.75", material:"color:#f7fbff; opacity:0.95"}));

    const comm = el("a-entity",{id:"communityFrame", position:"0 1.75 -1.30"});
    comm.appendChild(el("a-plane",{width:"2.55", height:"0.86", material:"color:#061019; opacity:0.62"}));
    comm.appendChild(el("a-plane",{width:"2.62", height:"0.92", position:"0 0 0.01", material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:0.35; opacity:0.22"}));
    txt(comm,"COMMUNITY","0 0.32 0.02",3.4,"#cfe7ff");

    const cards = el("a-entity",{id:"communityCards", position:"0 -0.10 0.03"});
    for(let i=0;i<5;i++){
      cards.appendChild(el("a-plane",{class:"communityCard", width:"0.46", height:"0.64", position:`${(i-2)*0.52} -0.08 0`, material:"color:#ffffff; opacity:0.12"}));
    }
    comm.appendChild(cards);

    const actionHud = el("a-entity",{id:"actionHud", position:"0 0.58 0.03"});
    actionHud.appendChild(el("a-plane",{width:"2.35", height:"0.32", material:"color:#091425; opacity:0.72"}));
    actionHud.appendChild(el("a-plane",{width:"2.38", height:"0.35", position:"0 0 0.01", material:"color:#4aa6ff; opacity:0.08; emissive:#4aa6ff; emissiveIntensity:0.35"}));
    actionHud.appendChild(el("a-text",{id:"actionHudText", value:"Waiting…", position:"-1.08 0 0.02", align:"left", width:"4.2", color:"#d7eaff"}));
    comm.appendChild(actionHud);

    table.appendChild(comm);

    const pot = el("a-entity",{id:"potHud", position:"0 1.25 0.55"});
    pot.appendChild(el("a-plane",{width:"1.15", height:"0.28", material:"color:#071018; opacity:0.6"}));
    pot.appendChild(el("a-text",{id:"potText", value:"POT $0", position:"0 0 0.01", align:"center", width:"3.4", color:"#d7eaff"}));
    table.appendChild(pot);

    const chipPile = el("a-entity",{id:"potChips", position:"0 0.92 0.15"});
    for(let i=0;i<10;i++){
      chipPile.appendChild(el("a-cylinder",{radius:"0.06", height:"0.02", position:`${(Math.random()*0.30-0.15).toFixed(2)} ${(i*0.02).toFixed(2)} ${(Math.random()*0.30-0.15).toFixed(2)}`, material:"color:#e9f2ff; roughness:0.6; metalness:0.1"}));
    }
    table.appendChild(chipPile);

    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.85, z = Math.cos(ang)*3.85;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;
      const chair = el("a-entity",{class:"chair", position:`${x.toFixed(2)} 0 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      chair.appendChild(el("a-cylinder",{radius:"0.42", height:"0.10", position:"0 0.05 0", material:"color:#141b25; roughness:0.95"}));
      chair.appendChild(el("a-box",{width:"0.84", height:"0.70", depth:"0.14", position:"0 0.62 -0.40", material:"color:#121a24"}));
      chair.appendChild(el("a-box",{width:"0.84", height:"0.08", depth:"0.62", position:"0 0.10 0.10", material:"color:#1a2330"}));
      chair.appendChild(el("a-entity",{class:"SeatAnchor", position:"0 0.58 0.55"}));
      table.appendChild(chair);
    }

    world.appendChild(table);

    const stairs = el("a-entity",{id:"pitStairs", position:"0 0.0 7.0"});
    for(let i=0;i<4;i++){
      stairs.appendChild(el("a-box",{width:"2.2", height:"0.18", depth:"0.65", position:`0 ${(0.18*i).toFixed(2)} ${(-i*0.65).toFixed(2)}`, material:"color:#0b1119; roughness:1"}));
    }
    world.appendChild(stairs);
  }

  function buildBots(){
    const bots = el("a-entity",{id:"bots"});
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.55, z = Math.cos(ang)*3.55;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;
      const bot = el("a-entity",{class:"bot", "data-seat": String(i+1), position:`${x.toFixed(2)} -0.85 ${z.toFixed(2)}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      bot.appendChild(el("a-cylinder",{radius:"0.24", height:"0.98", position:"0 0.98 0", material:"color:#1a2330; roughness:0.9"}));
      bot.appendChild(el("a-sphere",{radius:"0.21", position:"0 1.62 0", material:"color:#2a3a52; roughness:0.7"}));

      const act = el("a-entity",{class:"actionPanel", position:"0 0.02 0.98", rotation:"-90 0 0"});
      act.appendChild(el("a-plane",{width:"0.70", height:"0.24", material:"color:#071018; opacity:0.55"}));
      act.appendChild(el("a-text",{class:"actionText", value:"WAIT", position:"0 0 0.01", align:"center", width:"2.4", color:"#d7eaff"}));
      bot.appendChild(act);

      const hc = el("a-entity",{class:"holeCards", position:"0 2.15 0"});
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.34", height:"0.48", position:"-0.19 0 0", material:"color:#ffffff; opacity:0.12"}));
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.34", height:"0.48", position:"0.19 0 0", material:"color:#ffffff; opacity:0.12"}));
      bot.appendChild(hc);

      const tag = el("a-entity",{class:"nameTag", position:"0 2.65 0", visible:"false"});
      txt(tag, `Bot_${i+1}\n$10,000`, "0 0 0", 2.6, "#eaf2ff");
      bot.appendChild(tag);

      const chips = el("a-entity",{class:"chipStack", position:"0.55 0.95 0.35"});
      for(let c=0;c<12;c++){
        chips.appendChild(el("a-cylinder",{radius:"0.05", height:"0.02", position:`0 ${(c*0.02).toFixed(2)} 0`, material:"color:#4aa6ff; opacity:0.75"}));
      }
      bot.appendChild(chips);

      bots.appendChild(bot);
    }
    world.appendChild(bots);
  }

  function build(){
    clear();
    buildLobby();
    buildJumbosAndDoors();
    buildSpawn();
    buildDivotAndTable();
    buildBots();
    D.log("[world] lobby + divot + doors + store display ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
