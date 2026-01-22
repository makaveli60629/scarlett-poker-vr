// js/world.js
(function(){
  const D = window.SCARLETT_DIAG;
  const world = document.getElementById("world");

  function el(tag, attrs={}){
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
    return e;
  }

  function addText(parent, value, pos="0 0 0", width=2, color="#eaf2ff"){
    const t = el("a-text", { value, position: pos, align:"center", width: String(width), color });
    parent.appendChild(t);
    return t;
  }

  function buildRoom(){
    // Floor
    const floor = el("a-plane", {
      class: "teleportable",
      rotation: "-90 0 0",
      width: "40",
      height: "40",
      color: "#0f141b",
      material: "roughness: 0.95; metalness: 0.0"
    });
    world.appendChild(floor);

    // Carpet circle around table
    const carpet = el("a-circle", { rotation:"-90 0 0", radius:"7", color:"#111a22", material:"opacity: 0.98; roughness: 1" });
    world.appendChild(carpet);

    // Walls (soft)
    const walls = el("a-entity");
    const wallMat = "color:#09101a; metalness:0.0; roughness:0.95; opacity:0.95";
    const w = 40, h = 6;
    const wallN = el("a-plane", { position:`0 ${h/2} -${w/2}`, width:String(w), height:String(h), material: wallMat });
    const wallS = el("a-plane", { position:`0 ${h/2} ${w/2}`, rotation:"0 180 0", width:String(w), height:String(h), material: wallMat });
    const wallE = el("a-plane", { position:`${w/2} ${h/2} 0`, rotation:"0 -90 0", width:String(w), height:String(h), material: wallMat });
    const wallW = el("a-plane", { position:`-${w/2} ${h/2} 0`, rotation:"0 90 0", width:String(w), height:String(h), material: wallMat });
    walls.appendChild(wallN); walls.appendChild(wallS); walls.appendChild(wallE); walls.appendChild(wallW);
    world.appendChild(walls);

    // Ceiling glow ring
    const ring = el("a-torus", { position:"0 5.4 0", radius:"6", radiusTubular:"0.08", rotation:"90 0 0", color:"#1b2a3d", material:"emissive:#1b2a3d; emissiveIntensity: 0.65" });
    world.appendChild(ring);

    // Spawn pad
    const spawn = el("a-entity", { id:"spawnPad", position:"0 0 6" });
    spawn.appendChild(el("a-circle", { rotation:"-90 0 0", radius:"0.65", color:"#0a2636", material:"emissive:#0e5d88; emissiveIntensity: 0.55; opacity:0.98" }));
    addText(spawn, "SPAWN", "0 0.02 0", 2.5, "#cfe7ff");
    world.appendChild(spawn);

    // Teleport arch
    const arch = el("a-entity", { id:"teleportArch", position:"0 0 3.8" });
    arch.appendChild(el("a-torus", { radius:"1.2", radiusTubular:"0.08", rotation:"0 0 0", position:"0 1.6 0", material:"color:#1c2c3f; emissive:#3aa0ff; emissiveIntensity:0.55" }));
    arch.appendChild(el("a-cylinder", { radius:"0.09", height:"2.2", position:"-1.2 1.1 0", material:"color:#0a111a; emissive:#1c4f7c; emissiveIntensity:0.35" }));
    arch.appendChild(el("a-cylinder", { radius:"0.09", height:"2.2", position:"1.2 1.1 0", material:"color:#0a111a; emissive:#1c4f7c; emissiveIntensity:0.35" }));
    addText(arch, "PORTAL", "0 2.55 0", 3.0, "#bfe1ff");
    world.appendChild(arch);
  }

  function buildTable(){
    const tableRoot = el("a-entity", { id:"mainTable", position:"0 0 0" });

    // Table base
    const base = el("a-cylinder", { radius:"2.4", height:"0.5", position:"0 0.25 0", material:"color:#10151d; roughness: 0.9" });
    tableRoot.appendChild(base);

    // Felt top
    const top = el("a-cylinder", { radius:"2.25", height:"0.12", position:"0 0.56 0", material:"color:#0e6b55; roughness: 1.0" });
    tableRoot.appendChild(top);

    // Divot/pit (center)
    const pit = el("a-cylinder", { radius:"0.75", height:"0.12", position:"0 0.50 0", material:"color:#071018; roughness: 1.0; opacity:0.98" });
    tableRoot.appendChild(pit);

    // Community card rail
    const rail = el("a-ring", { rotation:"-90 0 0", radiusInner:"0.85", radiusOuter:"1.1", position:"0 0.61 0", material:"color:#102030; opacity:0.75" });
    tableRoot.appendChild(rail);

    // Dealer chip spot
    const dealer = el("a-circle", { rotation:"-90 0 0", radius:"0.15", position:"0 0.62 -1.55", material:"color:#eee; opacity:0.92" });
    tableRoot.appendChild(dealer);

    // Seats (6)
    const seats = [];
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.15;
      const z = Math.cos(ang)*3.15;
      const chair = el("a-entity", { class:"chair", position:`${x} 0 ${z}`, rotation:`0 ${(-ang*180/Math.PI + 180).toFixed(1)} 0` });
      chair.appendChild(el("a-cylinder", { radius:"0.35", height:"0.08", position:"0 0.04 0", material:"color:#141b25; roughness:0.95" }));
      chair.appendChild(el("a-cylinder", { radius:"0.08", height:"0.6", position:"0.22 0.3 0.22", material:"color:#0d131c" }));
      chair.appendChild(el("a-cylinder", { radius:"0.08", height:"0.6", position:"-0.22 0.3 0.22", material:"color:#0d131c" }));
      chair.appendChild(el("a-cylinder", { radius:"0.08", height:"0.6", position:"0.22 0.3 -0.22", material:"color:#0d131c" }));
      chair.appendChild(el("a-cylinder", { radius:"0.08", height:"0.6", position:"-0.22 0.3 -0.22", material:"color:#0d131c" }));
      chair.appendChild(el("a-box", { width:"0.7", height:"0.6", depth:"0.12", position:"0 0.55 -0.32", material:"color:#121a24" }));

      // Seat anchor for seating controller
      const seatAnchor = el("a-entity", { class:"SeatAnchor", position:"0 0.52 0.30", rotation:"0 0 0" });
      chair.appendChild(seatAnchor);

      // Seat label
      const label = el("a-entity", { position:"0 1.25 0.15" });
      addText(label, `Seat ${i+1}`, "0 0 0", 2.2, "#d7e6ff");
      chair.appendChild(label);

      seats.push(chair);
      tableRoot.appendChild(chair);
    }

    // Community cards (placeholders; updated by demo)
    const ccRoot = el("a-entity", { id:"communityCards", position:"0 0.66 0.15" });
    for(let i=0;i<5;i++){
      const card = el("a-plane", { class:"communityCard", width:"0.26", height:"0.36", position:`${(i-2)*0.32} 0 0`, rotation:"-90 0 0", material:"color:#ffffff; opacity:0.12" });
      ccRoot.appendChild(card);
    }
    tableRoot.appendChild(ccRoot);

    // Pot chip stack
    const pot = el("a-entity", { id:"pot", position:"0 0.62 0.35" });
    for(let i=0;i<6;i++){
      pot.appendChild(el("a-cylinder", { radius:"0.12", height:"0.02", position:`${(Math.random()-0.5)*0.12} ${(i*0.021).toFixed(3)} ${(Math.random()-0.5)*0.12}`, material:"color:#c62828; roughness:0.5" }));
    }
    tableRoot.appendChild(pot);

    world.appendChild(tableRoot);
  }

  function buildJumbotron(){
    const j = el("a-entity", { id:"jumbotron", position:"0 2.7 -10" });

    const frame = el("a-box", { width:"6.2", height:"3.5", depth:"0.15", material:"color:#0c131d; roughness:0.9" });
    j.appendChild(frame);

    const screen = el("a-plane", { id:"jumboScreen", width:"5.8", height:"3.1", position:"0 0 0.09", material:"color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.25" });
    j.appendChild(screen);

    const title = el("a-entity", { position:"0 1.92 0.12" });
    addText(title, "SCARLETT • JUMBOTRON", "0 0 0", 5.5, "#cfe7ff");
    j.appendChild(title);

    world.appendChild(j);
  }

  function buildBots(){
    const botRoot = el("a-entity", { id:"bots" });
    // 6 bots near seats
    for(let i=0;i<6;i++){
      const ang = (i/6)*Math.PI*2;
      const x = Math.sin(ang)*3.05;
      const z = Math.cos(ang)*3.05;
      const bot = el("a-entity", { class:"bot", position:`${x} 0 ${z}`, rotation:`0 ${(-ang*180/Math.PI + 180).toFixed(1)} 0` });

      // body
      bot.appendChild(el("a-cylinder", { radius:"0.22", height:"0.9", position:"0 0.9 0.0", material:"color:#1a2330; roughness:0.9" }));
      // head
      bot.appendChild(el("a-sphere", { radius:"0.20", position:"0 1.48 0", material:"color:#2a3a52; roughness:0.7" }));

      // action ring (check/bet/fold)
      const ring = el("a-ring", { class:"actionRing", rotation:"-90 0 0", radiusInner:"0.12", radiusOuter:"0.18", position:"0 0.02 0.55", material:"color:#2b3b52; opacity:0.55; emissive:#2b3b52; emissiveIntensity:0.2" });
      bot.appendChild(ring);

      // floating name tag
      const tag = el("a-entity", { position:"0 1.85 0" });
      addText(tag, `Bot_${i+1}\nCOMMUNITY`, "0 0 0", 2.2, "#eaf2ff");
      bot.appendChild(tag);

      botRoot.appendChild(bot);
    }
    world.appendChild(botRoot);
  }

  function build(){
    // clear
    while(world.firstChild) world.removeChild(world.firstChild);
    buildRoom();
    buildTable();
    buildJumbotron();
    buildBots();
    D.log("[world] lobby + table + bots ready ✅");
  }

  window.SCARLETT_WORLD = { build };
})();
