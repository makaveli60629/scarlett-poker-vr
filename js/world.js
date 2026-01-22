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
    const t = el("a-text", {value, position:pos||"0 0 0", align:"center", width: String(width||2.5), color: color||"#eaf2ff"});
    parent.appendChild(t); return t;
  }
  function clear(){ while(world.firstChild) world.removeChild(world.firstChild); }

  function build(){
    clear();

    // Floor + circular VIP lobby
    world.appendChild(el("a-circle",{class:"teleportable", rotation:"-90 0 0", radius:"22", material:"color:#0d1219; roughness:0.98; metalness:0.02"}));
    world.appendChild(el("a-cylinder",{radius:"21.5", height:"8", position:"0 4 0", material:"color:#0a0f16; roughness:0.96; metalness:0.05; side:double; opacity:0.98"}));
    world.appendChild(el("a-circle",{rotation:"90 0 0", radius:"21.2", position:"0 8 0", material:"color:#070b10; opacity:0.98"}));
    world.appendChild(el("a-torus",{position:"0 7.55 0", radius:"12.5", radiusTubular:"0.12", rotation:"90 0 0", material:"color:#15314a; emissive:#4aa6ff; emissiveIntensity:0.5; roughness:0.6"}));

    // Welcome sign
    const sign = el("a-entity",{position:"0 2.4 12.5", rotation:"0 180 0"});
    sign.appendChild(el("a-plane",{width:"7.2", height:"2.2", material:"color:#0a1220; opacity:0.75"}));
    txt(sign,"WELCOME TO VIP • SCARLETT","0 0.35 0.01",6.6,"#d7eaff");
    txt(sign,"LEGENDS • TROPHIES • HIGH STAKES","0 -0.25 0.01",5.2,"#b8d3ff");
    world.appendChild(sign);

    // Entrances
    const doors = [
      {name:"STORE", x:-14.5, z:0, rot:90},
      {name:"MAIN EVENTS", x:0, z:-14.5, rot:0},
      {name:"SCORPION ROOM", x:14.5, z:0, rot:-90},
    ];
    doors.forEach(d=>{
      const g = el("a-entity",{position:`${d.x} 0 ${d.z}`, rotation:`0 ${d.rot} 0`});
      g.appendChild(el("a-box",{width:"5", height:"4.2", depth:"0.35", position:"0 2.1 0", material:"color:#0f1723; roughness:0.9"}));
      g.appendChild(el("a-box",{width:"4.2", height:"3.4", depth:"0.25", position:"0 2.1 0.12", material:"color:#071018; roughness:1; opacity:0.98"}));
      const lbl = el("a-entity",{position:"0 4.5 0.25"}); txt(lbl,d.name,"0 0 0",5.0,"#cfe7ff"); g.appendChild(lbl);
      world.appendChild(g);
    });

    // Spawn pad
    const spawn = el("a-entity",{id:"spawnPad", position:"0 0 6"});
    spawn.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"0.45", radiusOuter:"0.75", material:"color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.65; opacity:0.98"}));
    txt(spawn,"SPAWN","0 0.02 0",3.2,"#cfe7ff");
    world.appendChild(spawn);

    // Centerpiece table + divot/rail/halo/leather
    const table = el("a-entity",{id:"mainTable", position:"0 0 0"});
    table.appendChild(el("a-cylinder",{radius:"5.8", height:"0.35", position:"0 0.175 0", material:"color:#070b10; roughness:1"}));
    table.appendChild(el("a-torus",{radius:"5.15", radiusTubular:"0.18", position:"0 0.44 0", rotation:"90 0 0", material:"color:#101824; roughness:0.65; metalness:0.15; emissive:#183a5a; emissiveIntensity:0.25"}));
    table.appendChild(el("a-torus",{radius:"5.35", radiusTubular:"0.06", position:"0 0.08 0", rotation:"90 0 0", material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:0.85"}));
    table.appendChild(el("a-cylinder",{radius:"2.65", height:"0.58", position:"0 0.40 0", material:"color:#0f141c; roughness:0.85; metalness:0.12"}));
    table.appendChild(el("a-torus",{radius:"2.55", radiusTubular:"0.14", position:"0 0.73 0", rotation:"90 0 0", material:"color:#2a1f18; roughness:0.95; metalness:0.05"}));
    table.appendChild(el("a-cylinder",{radius:"2.42", height:"0.14", position:"0 0.82 0", material:"color:#0f7a60; roughness:1"}));
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.05", radiusOuter:"1.12", position:"0 0.83 0", material:"color:#e9f2ff; opacity:0.35"}));
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.55", radiusOuter:"1.62", position:"0 0.83 0", material:"color:#e9f2ff; opacity:0.22"}));
    table.appendChild(el("a-circle",{rotation:"-90 0 0", radius:"0.18", position:"0 0.86 -1.75", material:"color:#f7fbff; opacity:0.95"}));

    // Community board (floating, faces camera)
    const comm = el("a-entity",{id:"communityBoard", position:"0 2.15 -1.4"});
    comm.appendChild(el("a-plane",{width:"2.35", height:"0.58", material:"color:#08101a; opacity:0.65"}));
    txt(comm,"COMMUNITY","0 0.24 0.01",3.2,"#cfe7ff");
    const cards = el("a-entity",{id:"communityCards", position:"0 -0.05 0.02"});
    for(let i=0;i<5;i++){
      cards.appendChild(el("a-plane",{class:"communityCard", width:"0.42", height:"0.58", position:`${(i-2)*0.48} -0.05 0`, material:"color:#ffffff; opacity:0.12"}));
    }
    comm.appendChild(cards);
    table.appendChild(comm);

    // Pot HUD
    const pot = el("a-entity",{id:"potHud", position:"0 1.45 0.55"});
    pot.appendChild(el("a-plane",{width:"1.25", height:"0.32", material:"color:#071018; opacity:0.6"}));
    txt(pot,"POT: $0","0 0 0.01",3.0,"#d7eaff");
    table.appendChild(pot);

    // Table board (leaderboard)
    const board = el("a-entity",{id:"tableBoard", position:"0 3.1 0", rotation:"0 180 0"});
    board.appendChild(el("a-plane",{width:"7.4", height:"2.2", material:"color:#061019; opacity:0.55"}));
    board.appendChild(el("a-text",{id:"boardText", value:"TABLE STATUS", position:"0 0 0.01", align:"center", width:"10", color:"#eaf2ff"}));
    table.appendChild(board);

    // Chairs + SeatAnchors (aligned to face table)
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.55, z = Math.cos(ang)*3.55;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;
      const chair = el("a-entity",{class:"chair", position:`${x} 0 ${z}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      chair.appendChild(el("a-cylinder",{radius:"0.38", height:"0.09", position:"0 0.045 0", material:"color:#141b25; roughness:0.95"}));
      chair.appendChild(el("a-box",{width:"0.74", height:"0.62", depth:"0.13", position:"0 0.56 -0.36", material:"color:#121a24"}));
      chair.appendChild(el("a-entity",{class:"SeatAnchor", position:"0 0.52 0.40", rotation:"0 0 0"}));
      const lbl = el("a-entity",{class:"seatLabel", position:"0 1.85 0.05"}); txt(lbl,`Seat ${i+1}`,"0 0 0",2.4,"#d7e6ff"); chair.appendChild(lbl);
      table.appendChild(chair);
    }

    world.appendChild(table);

    // Bots seated (placeholder bodies)
    const botRoot = el("a-entity",{id:"bots"});
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.35, z = Math.cos(ang)*3.35;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;
      const bot = el("a-entity",{class:"bot", "data-seat": String(i+1), position:`${x} 0 ${z}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      bot.appendChild(el("a-cylinder",{radius:"0.23", height:"0.92", position:"0 0.92 0", material:"color:#1a2330; roughness:0.9"}));
      bot.appendChild(el("a-sphere",{radius:"0.20", position:"0 1.52 0", material:"color:#2a3a52; roughness:0.7"}));

      const act = el("a-entity",{class:"actionPanel", position:"0 0.02 0.85", rotation:"-90 0 0"});
      act.appendChild(el("a-plane",{width:"0.62", height:"0.22", material:"color:#071018; opacity:0.55"}));
      act.appendChild(el("a-text",{class:"actionText", value:"WAIT", position:"0 0 0.01", align:"center", width:"2.2", color:"#d7eaff"}));
      bot.appendChild(act);

      const hc = el("a-entity",{class:"holeCards", position:"0 2.08 0"});
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.30", height:"0.42", position:"-0.17 0 0", material:"color:#ffffff; opacity:0.12"}));
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.30", height:"0.42", position:"0.17 0 0", material:"color:#ffffff; opacity:0.12"}));
      bot.appendChild(hc);

      const tag = el("a-entity",{class:"nameTag", position:"0 2.55 0"});
      txt(tag,`Bot_${i+1}\n$10,000`,"0 0 0",2.6,"#eaf2ff");
      bot.appendChild(tag);

      botRoot.appendChild(bot);
    }
    world.appendChild(botRoot);

    // 4 wall jumbotrons
    const spots = [
      {x:0, y:3.0, z:-19.2, ry:0, label:"VIP CAM"},
      {x:19.2, y:3.0, z:0, ry:-90, label:"SCORPION CAM"},
      {x:0, y:3.0, z:19.2, ry:180, label:"STORE CAM"},
      {x:-19.2, y:3.0, z:0, ry:90, label:"EVENTS CAM"},
    ];
    spots.forEach((s, idx)=>{
      const j = el("a-entity",{class:"jumbotronWall", position:`${s.x} ${s.y} ${s.z}`, rotation:`0 ${s.ry} 0`});
      j.appendChild(el("a-box",{width:"7.0", height:"3.9", depth:"0.18", material:"color:#0c131d; roughness:0.9"}));
      j.appendChild(el("a-plane",{id:`jumboScreen_${idx}`, class:"jumboScreen", width:"6.5", height:"3.4", position:"0 0 0.10",
        material:"color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.35"}));
      const t = el("a-entity",{position:"0 2.25 0.13"}); txt(t,s.label,"0 0 0",6.0,"#cfe7ff"); j.appendChild(t);
      world.appendChild(j);
    });

    D.log("[world] VIP lobby + centerpiece + 4 wall jumbotrons ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
