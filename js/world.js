// js/world.js  (BIG LOBBY + SAFE SPAWN ZONE)
(function(){
  const D = window.SCARLETT_DIAG || { log: console.log };
  const world = document.getElementById("world");

  // ====== CONFIG ======
  // Bigger lobby so you never spawn outside
  const LOBBY_RADIUS = 40;        // was ~24
  const WALL_RADIUS  = 39.5;
  const CEIL_RADIUS  = 39.0;
  const LOBBY_HEIGHT = 14.0;

  // Safe spawn inside the room with nothing around it
  const SPAWN_POS = { x: 0, y: 0, z: 18 };
  const SAFE_SPAWN_CLEAR_RADIUS = 10; // nothing within 10m of spawn

  // Table area is far away from spawn so spawn is always clean
  const TABLE_CENTER = { x: 0, y: 0, z: 0 };

  function el(tag, attrs){
    const e = document.createElement(tag);
    if(attrs){
      for(const k in attrs) e.setAttribute(k, attrs[k]);
    }
    return e;
  }

  function clear(){
    while(world.firstChild) world.removeChild(world.firstChild);
  }

  function buildLobby(){
    // Floor (teleportable)
    world.appendChild(el("a-circle",{
      class:"teleportable",
      rotation:"-90 0 0",
      radius:String(LOBBY_RADIUS),
      material:"color:#0c1118; roughness:1; metalness:0"
    }));

    // Walls
    world.appendChild(el("a-cylinder",{
      radius:String(WALL_RADIUS),
      height:String(LOBBY_HEIGHT),
      position:`0 ${(LOBBY_HEIGHT/2).toFixed(2)} 0`,
      material:"color:#070c12; roughness:0.96; metalness:0.06; side:double; opacity:0.99"
    }));

    // Ceiling
    world.appendChild(el("a-circle",{
      rotation:"90 0 0",
      radius:String(CEIL_RADIUS),
      position:`0 ${LOBBY_HEIGHT.toFixed(2)} 0`,
      material:"color:#05080d; opacity:0.98"
    }));

    // Neon rings high up (luxury vibe)
    world.appendChild(el("a-torus",{
      position:`0 ${(LOBBY_HEIGHT-0.3).toFixed(2)} 0`,
      radius:String(CEIL_RADIUS-10),
      radiusTubular:"0.18",
      rotation:"90 0 0",
      material:"color:#10314a; emissive:#4aa6ff; emissiveIntensity:1.2; roughness:0.6"
    }));

    world.appendChild(el("a-torus",{
      position:`0 ${(LOBBY_HEIGHT-0.7).toFixed(2)} 0`,
      radius:String(CEIL_RADIUS-0.5),
      radiusTubular:"0.10",
      rotation:"90 0 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.1; opacity:0.92"
    }));
  }

  function buildSafeSpawnPad(){
    // Visible spawn ring + text, but NO geometry near it
    const s = el("a-entity",{ id:"spawnPad", position:`${SPAWN_POS.x} ${SPAWN_POS.y} ${SPAWN_POS.z}` });

    s.appendChild(el("a-ring",{
      rotation:"-90 0 0",
      radiusInner:"0.75",
      radiusOuter:"1.25",
      material:"color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.9; opacity:0.98"
    }));

    s.appendChild(el("a-text",{
      value:"SAFE SPAWN",
      align:"center",
      color:"#cfe7ff",
      width:"6",
      position:"0 0.05 0"
    }));

    // Safety “bubble” visual (faint)
    s.appendChild(el("a-circle",{
      rotation:"-90 0 0",
      radius:String(SAFE_SPAWN_CLEAR_RADIUS),
      material:"color:#4aa6ff; opacity:0.03"
    }));

    world.appendChild(s);
  }

  function buildTableFarFromSpawn(){
    // Put table at center, spawn is at z=18, safe bubble radius=10 => clean
    // Divot + rail at center
    const pit = el("a-entity",{ id:"pit", position:`${TABLE_CENTER.x} 0 ${TABLE_CENTER.z}` });

    // Outer ring (walkable around)
    pit.appendChild(el("a-ring",{
      rotation:"-90 0 0",
      radiusInner:"6.8",
      radiusOuter:"12.5",
      material:"color:#0c1118; roughness:1; metalness:0"
    }));

    // Pit "hole" (sunken)
    pit.appendChild(el("a-cylinder",{
      radius:"6.8",
      height:"1.4",
      position:"0 -0.7 0",
      material:"color:#05080d; roughness:0.95; metalness:0.08; side:double"
    }));

    // Bottom floor of pit
    pit.appendChild(el("a-circle",{
      rotation:"-90 0 0",
      radius:"6.6",
      position:"0 -1.4 0",
      material:"color:#0a0f18; roughness:0.98; metalness:0.02"
    }));

    // Top rail (lux)
    pit.appendChild(el("a-torus",{
      radius:"12.2",
      radiusTubular:"0.22",
      rotation:"90 0 0",
      position:"0 0.95 0",
      material:"color:#2a1f18; roughness:0.9; metalness:0.05"
    }));

    // Neon halo
    pit.appendChild(el("a-torus",{
      radius:"12.45",
      radiusTubular:"0.08",
      rotation:"90 0 0",
      position:"0 0.12 0",
      material:"color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.25; opacity:0.95"
    }));

    world.appendChild(pit);

    // Table (inside pit, low)
    const table = el("a-entity",{ id:"mainTable", position:"0 -1.15 0" });

    table.appendChild(el("a-cylinder",{
      radius:"3.6",
      height:"0.55",
      position:"0 0.28 0",
      material:"color:#0f141c; roughness:0.85; metalness:0.12"
    }));

    table.appendChild(el("a-torus",{
      radius:"3.25",
      radiusTubular:"0.18",
      position:"0 0.72 0",
      rotation:"90 0 0",
      material:"color:#2a1f18; roughness:0.95; metalness:0.05"
    }));

    table.appendChild(el("a-cylinder",{
      radius:"3.10",
      height:"0.18",
      position:"0 0.88 0",
      material:"color:#0f7a60; roughness:1; metalness:0"
    }));

    world.appendChild(table);
  }

  function build(){
    clear();
    buildLobby();
    buildSafeSpawnPad();
    buildTableFarFromSpawn();
    D.log("[world] BIG lobby + SAFE spawn bubble + table far ✅");
  }

  // Export + auto build
  window.SCARLETT_WORLD = { build };
  build();
})();
