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

    // Floor + pattern rings
    world.appendChild(el("a-circle",{class:"teleportable", rotation:"-90 0 0", radius:"24",
      material:"color:#101823; roughness:0.98; metalness:0.02"}));
    for(let i=0;i<10;i++){
      const r0 = 4 + i*2.0;
      world.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:String(r0), radiusOuter:String(r0+0.08),
        material:`color:${i%2===0?"#162233":"#0d1724"}; opacity:0.42; roughness:1`}));
    }

    // Taller walls + ceiling
    world.appendChild(el("a-cylinder",{radius:"23.4", height:"12", position:"0 6 0",
      material:"color:#0a0f16; roughness:0.96; metalness:0.06; side:double; opacity:0.98"}));
    world.appendChild(el("a-circle",{rotation:"90 0 0", radius:"23.2", position:"0 12 0", material:"color:#070b10; opacity:0.98"}));

    // Top trim light
    world.appendChild(el("a-torus",{position:"0 11.85 0", radius:"18.0", radiusTubular:"0.10", rotation:"90 0 0",
      material:"color:#10283d; emissive:#4aa6ff; emissiveIntensity:0.55; roughness:0.6"}));

    // Pillars
    for(let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const x = Math.sin(a)*19.5;
      const z = Math.cos(a)*19.5;
      const p = el("a-entity",{position:`${x} 0 ${z}`});
      p.appendChild(el("a-cylinder",{radius:"0.35", height:"12", position:"0 6 0",
        material:"color:#0f1723; roughness:0.9; metalness:0.1"}));
      p.appendChild(el("a-torus",{radius:"0.55", radiusTubular:"0.06", rotation:"90 0 0", position:"0 11.6 0",
        material:"color:#10283d; emissive:#4aa6ff; emissiveIntensity:0.45"}));
      world.appendChild(p);
    }

    // Welcome sign
    const sign = el("a-entity",{position:"0 3.0 13.5", rotation:"0 180 0"});
    sign.appendChild(el("a-plane",{width:"8.2", height:"2.6", material:"color:#0a1220; opacity:0.78"}));
    txt(sign,"WELCOME TO VIP • SCARLETT","0 0.5 0.01",7.0,"#d7eaff");
    txt(sign,"LEGENDS • TROPHIES • HIGH STAKES","0 -0.35 0.01",5.6,"#b8d3ff");
    world.appendChild(sign);

    // Entrances
    const doors = [
      {name:"STORE", x:-15.8, z:0, rot:90},
      {name:"MAIN EVENTS", x:0, z:-15.8, rot:0},
      {name:"SCORPION ROOM", x:15.8, z:0, rot:-90},
    ];
    doors.forEach(d=>{
      const g = el("a-entity",{position:`${d.x} 0 ${d.z}`, rotation:`0 ${d.rot} 0`});
      g.appendChild(el("a-box",{width:"6.0", height:"5.2", depth:"0.35", position:"0 2.6 0", material:"color:#0f1723; roughness:0.9"}));
      g.appendChild(el("a-box",{width:"5.0", height:"4.2", depth:"0.25", position:"0 2.6 0.12", material:"color:#071018; roughness:1; opacity:0.98"}));
      const lbl = el("a-entity",{position:"0 5.7 0.25"}); txt(lbl,d.name,"0 0 0",5.8,"#cfe7ff"); g.appendChild(lbl);
      world.appendChild(g);
    });

    // Spawn pad
    const spawn = el("a-entity",{id:"spawnPad", position:"0 0 8"});
    spawn.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"0.55", radiusOuter:"0.95",
      material:"color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.65; opacity:0.98"}));
    txt(spawn,"SPAWN","0 0.02 0",3.4,"#cfe7ff");
    world.appendChild(spawn);

    // Divot + rail
    const divot = el("a-entity",{id:"tableDivot", position:"0 0 0"});
    divot.appendChild(el("a-cylinder",{radius:"7.0", height:"0.50", position:"0 0.25 0", material:"color:#070b10; roughness:1"}));
    divot.appendChild(el("a-cylinder",{radius:"6.2", height:"0.62", position:"0 0.31 0", material:"color:#0f141c; roughness:0.95"}));
    divot.appendChild(el("a-torus",{radius:"6.35", radiusTubular:"0.16", rotation:"90 0 0", position:"0 0.55 0",
      material:"color:#2a1f18; roughness:0.95; metalness:0.05"}));
    divot.appendChild(el("a-torus",{radius:"6.55", radiusTubular:"0.06", rotation:"90 0 0", position:"0 0.08 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:0.85"}));
    world.appendChild(divot);

    // Main table
    const table = el("a-entity",{id:"mainTable", position:"0 0.10 0"});
    table.appendChild(el("a-cylinder",{radius:"3.15", height:"0.62", position:"0 0.40 0", material:"color:#0f141c; roughness:0.85; metalness:0.12"}));
    table.appendChild(el("a-torus",{radius:"3.02", radiusTubular:"0.16", position:"0 0.76 0", rotation:"90 0 0",
      material:"color:#2a1f18; roughness:0.95; metalness:0.05"}));
    table.appendChild(el("a-cylinder",{radius:"2.88", height:"0.14", position:"0 0.86 0", material:"color:#0f7a60; roughness:1"}));

    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.05", radiusOuter:"1.12", position:"0 0.87 0",
      material:"color:#e9f2ff; opacity:0.30"}));
    table.appendChild(el("a-ring",{rotation:"-90 0 0", radiusInner:"1.55", radiusOuter:"1.62", position:"0 0.87 0",
      material:"color:#e9f2ff; opacity:0.20"}));

    const pass = el("a-entity",{position:"0 0.88 1.4", rotation:"-90 0 0"});
    pass.appendChild(el("a-plane",{width:"1.8", height:"0.35", material:"color:#e9f2ff; opacity:0.12"}));
    table.appendChild(pass);

    table.appendChild(el("a-circle",{rotation:"-90 0 0", radius:"0.18", position:"0 0.90 -1.95", material:"color:#f7fbff; opacity:0.75"}));

    // Community board
    const comm = el("a-entity",{id:"communityBoard", position:"0 2.25 -1.6"});
    comm.appendChild(el("a-plane",{width:"2.55", height:"0.64", material:"color:#08101a; opacity:0.65"}));
    txt(comm,"COMMUNITY","0 0.27 0.01",3.6,"#cfe7ff");
    const cards = el("a-entity",{id:"communityCards", position:"0 -0.06 0.02"});
    for(let i=0;i<5;i++){
      cards.appendChild(el("a-plane",{class:"communityCard", width:"0.44", height:"0.62",
        position:`${(i-2)*0.50} -0.06 0`, material:"color:#ffffff; opacity:0.12"}));
    }
    comm.appendChild(cards);
    table.appendChild(comm);

    // Small table HUD strip (3 lines)
    const hud = el("a-entity",{id:"tableHud", position:"0 1.55 -0.55"});
    hud.appendChild(el("a-plane",{width:"2.9", height:"0.40", material:"color:#061019; opacity:0.55"}));
    hud.appendChild(el("a-box",{width:"2.95", height:"0.43", depth:"0.02", position:"0 0 0.01", material:"color:#0b2b44; opacity:0.25"}));
    hud.appendChild(el("a-text",{id:"hudText", value:"Table HUD Ready", position:"0 0 0.02", align:"center", width:"6.5", color:"#eaf2ff"}));
    table.appendChild(hud);

    // Pot HUD
    const pot = el("a-entity",{id:"potHud", position:"0 1.35 0.75"});
    pot.appendChild(el("a-plane",{width:"1.2", height:"0.30", material:"color:#071018; opacity:0.6"}));
    txt(pot,"POT: $0","0 0 0.01",3.0,"#d7eaff");
    table.appendChild(pot);

    // Chairs
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*4.55, z = Math.cos(ang)*4.55;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;
      const chair = el("a-entity",{class:"chair", position:`${x} 0 ${z}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      chair.appendChild(el("a-cylinder",{radius:"0.40", height:"0.10", position:"0 0.05 0", material:"color:#141b25; roughness:0.95"}));
      chair.appendChild(el("a-box",{width:"0.78", height:"0.66", depth:"0.14", position:"0 0.60 -0.38", material:"color:#121a24"}));
      chair.appendChild(el("a-entity",{class:"SeatAnchor", position:"0 0.52 0.45"}));
      table.appendChild(chair);
    }

    world.appendChild(table);

    // Bots (on seats) — name tags hidden until looked at
    const botRoot = el("a-entity",{id:"bots"});
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*4.55, z = Math.cos(ang)*4.55;
      const yaw = (Math.atan2(x, z) * 180/Math.PI) + 180;

      const bot = el("a-entity",{class:"bot", "data-seat": String(i+1), position:`${x} 0 ${z}`, rotation:`0 ${yaw.toFixed(1)} 0`});
      bot.appendChild(el("a-cylinder",{radius:"0.23", height:"0.92", position:"0 0.92 0", material:"color:#1a2330; roughness:0.9"}));
      bot.appendChild(el("a-sphere",{radius:"0.20", position:"0 1.52 0", material:"color:#2a3a52; roughness:0.7"}));

      const act = el("a-entity",{class:"actionPanel", position:"0 0.02 0.85", rotation:"-90 0 0"});
      act.appendChild(el("a-plane",{width:"0.62", height:"0.22", material:"color:#071018; opacity:0.55"}));
      act.appendChild(el("a-text",{class:"actionText", value:"WAIT", position:"0 0 0.01", align:"center", width:"2.2", color:"#d7eaff"}));
      bot.appendChild(act);

      const hc = el("a-entity",{class:"holeCards", position:"0 2.10 0"});
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.32", height:"0.46", position:"-0.18 0 0", material:"color:#ffffff; opacity:0.12"}));
      hc.appendChild(el("a-plane",{class:"holeCard", width:"0.32", height:"0.46", position:"0.18 0 0", material:"color:#ffffff; opacity:0.12"}));
      bot.appendChild(hc);

      const tag = el("a-entity",{class:"nameTag", position:"0 2.62 0", visible:"false"});
      txt(tag,`Bot_${i+1}\n$10,000`,"0 0 0",2.8,"#eaf2ff");
      bot.appendChild(tag);

      botRoot.appendChild(bot);
    }
    world.appendChild(botRoot);

    // Jumbotrons ABOVE doors
    const jumbo = [
      {x:0, y:7.8, z:-22.7, ry:0, label:"MAIN EVENTS"},
      {x:22.7, y:7.8, z:0, ry:-90, label:"SCORPION ROOM"},
      {x:0, y:7.8, z:22.7, ry:180, label:"VIP FEED"},
      {x:-22.7, y:7.8, z:0, ry:90, label:"STORE"},
    ];
    jumbo.forEach((s, idx)=>{
      const j = el("a-entity",{class:"jumbotronWall", position:`${s.x} ${s.y} ${s.z}`, rotation:`0 ${s.ry} 0`});
      j.appendChild(el("a-box",{width:"8.2", height:"4.6", depth:"0.18", material:"color:#0c131d; roughness:0.9"}));
      j.appendChild(el("a-plane",{id:`jumboScreen_${idx}`, class:"jumboScreen", width:"7.6", height:"4.1", position:"0 0 0.10",
        material:"color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.40"}));
      const t = el("a-entity",{position:"0 2.65 0.13"}); txt(t,s.label,"0 0 0",7.2,"#cfe7ff"); j.appendChild(t);
      world.appendChild(j);
    });

    D.log("[world] VIP lobby v1.2 built ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
