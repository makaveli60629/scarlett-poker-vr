// js/world.js
(function () {
  const D = window.SCARLETT_DIAG || { log: () => {} };

  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function txt(parent, value, pos, width, color) {
    const t = el("a-text", {
      value,
      position: pos || "0 0 0",
      align: "center",
      width: String(width || 2.5),
      color: color || "#eaf2ff",
      baseline: "center",
      "wrap-count": "28",
    });
    parent.appendChild(t);
    return t;
  }

  function getWorld() {
    return document.getElementById("world");
  }

  function clear(world) {
    while (world.firstChild) world.removeChild(world.firstChild);
  }

  function buildLobby(world) {
    world.appendChild(el("a-circle", {
      class: "teleportable",
      rotation: "-90 0 0",
      radius: "24",
      material: "color:#0c1118; roughness:1; metalness:0.0"
    }));

    world.appendChild(el("a-cylinder", {
      radius: "23.6",
      height: "10.5",
      position: "0 5.25 0",
      material: "color:#070c12; roughness:0.96; metalness:0.06; side:double; opacity:0.99"
    }));

    world.appendChild(el("a-circle", {
      rotation: "90 0 0",
      radius: "23.2",
      position: "0 10.5 0",
      material: "color:#05080d; opacity:0.98"
    }));

    world.appendChild(el("a-torus", {
      position: "0 10.2 0",
      radius: "14.5",
      radiusTubular: "0.14",
      rotation: "90 0 0",
      material: "color:#10314a; emissive:#4aa6ff; emissiveIntensity:1.15; roughness:0.6"
    }));

    world.appendChild(el("a-torus", {
      position: "0 9.9 0",
      radius: "23.15",
      radiusTubular: "0.08",
      rotation: "90 0 0",
      material: "color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.15; opacity:0.92"
    }));

    const sign = el("a-entity", { position: "0 3.1 14.2", rotation: "0 180 0" });
    sign.appendChild(el("a-plane", { width: "8.2", height: "2.4", material: "color:#091425; opacity:0.7" }));
    txt(sign, "WELCOME TO VIP • SCARLETT", "0 0.45 0.01", 7.2, "#d7eaff");
    txt(sign, "LEGENDS • TROPHIES • HIGH STAKES", "0 -0.25 0.01", 5.8, "#b8d3ff");
    world.appendChild(sign);
  }

  function buildJumbosAndDoors(world) {
    const spots = [
      { x: 0, z: -20.5, ry: 0, door: "MAIN EVENTS" },
      { x: 20.5, z: 0, ry: -90, door: "SCORPION ROOM" },
      { x: 0, z: 20.5, ry: 180, door: "VIP WELCOME" },
      { x: -20.5, z: 0, ry: 90, door: "STORE" },
    ];

    spots.forEach((s, idx) => {
      const j = el("a-entity", { class: "jumbotronWall", position: `${s.x} 6.8 ${s.z}`, rotation: `0 ${s.ry} 0` });
      j.appendChild(el("a-box", { width: "8.2", height: "4.6", depth: "0.22", material: "color:#0c131d; roughness:0.9" }));
      j.appendChild(el("a-plane", {
        id: `jumboScreen_${idx}`,
        class: "jumboScreen",
        width: "7.6",
        height: "4.0",
        position: "0 0 0.12",
        material: "color:#0a0f18; emissive:#0a0f18; emissiveIntensity:0.35"
      }));
      world.appendChild(j);

      const d = el("a-entity", { position: `${s.x} 0 ${s.z}`, rotation: `0 ${s.ry} 0` });
      d.appendChild(el("a-box", { width: "6.2", height: "4.8", depth: "0.35", position: "0 2.4 0", material: "color:#0f1723; roughness:0.9" }));
      d.appendChild(el("a-box", { width: "5.2", height: "3.9", depth: "0.25", position: "0 2.35 0.12", material: "color:#071018; roughness:1; opacity:0.98" }));

      const lbl = el("a-entity", { position: "0 4.95 0.28" });
      txt(lbl, s.door, "0 0 0", 6.0, "#cfe7ff");
      d.appendChild(lbl);
      world.appendChild(d);

      // Rank UNDER jumbotron
      const rank = el("a-entity", { position: `${s.x} 5.05 ${s.z}`, rotation: `0 ${s.ry} 0` });
      rank.appendChild(el("a-plane", { width: "6.8", height: "0.55", material: "color:#091425; opacity:0.78" }));
      txt(rank, "RANKED • VIP", "0 0 0.01", 6.0, "#bfe1ff");
      world.appendChild(rank);
    });

    // Store avatar displays beside STORE door
    const storeX = -20.5, storeZ = 0;
    for (let i = 0; i < 4; i++) {
      const dz = -2.4 + i * 1.6;
      const disp = el("a-entity", { class: "storePedestal", position: `${storeX + 2.2} 0 ${storeZ + dz}`, rotation: "0 90 0" });
      disp.appendChild(el("a-cylinder", { radius: "0.55", height: "0.22", position: "0 0.11 0", material: "color:#0f1a26; roughness:0.7; metalness:0.25" }));

      const frame = el("a-entity", { position: "0 1.65 0" });
      frame.appendChild(el("a-plane", { width: "0.95", height: "1.55", material: "color:#061019; opacity:0.55" }));
      txt(frame, "AVATAR\nDISPLAY", "0 0 0.01", 2.2, "#d7eaff");
      txt(frame, "TAP TO\nCYCLE", "0 -0.65 0.01", 2.0, "#bfe1ff");

      disp.appendChild(frame);
      world.appendChild(disp);
    }
  }

  function buildSpawn(world) {
    const spawn = el("a-entity", { id: "spawnPad", position: "0 0 12" });
    spawn.appendChild(el("a-cone",{id:"spawnArrow", radiusBottom:"0.22", radiusTop:"0.02", height:"0.45", position:"0 0.25 -0.85", material:"color:#4aa6ff; emissive:#4aa6ff; emissiveIntensity:0.8"}));
    spawn.appendChild(el("a-ring", {
      rotation: "-90 0 0",
      radiusInner: "0.55",
      radiusOuter: "0.95",
      material: "color:#0a2636; emissive:#4aa6ff; emissiveIntensity:0.7; opacity:0.98"
    }));
    txt(spawn, "SPAWN", "0 0.02 0", 3.4, "#cfe7ff");
    world.appendChild(spawn);
  }

  function buildDivotAndTable(world) {
    const pit = el("a-entity", { id: "pit" });
    pit.appendChild(el("a-ring",{class:"teleportable", , { rotation: "-90 0 0", radiusInner: "3.5", radiusOuter: "7.6", material: "color:#0c1118; roughness:1; metalness:0" }));
    pit.appendChild(el("a-cylinder", { radius: "3.5", height: "1.0", position: "0 -0.5 0", material: "color:#05080d; roughness:0.95; metalness:0.08; side:double" }));
    pit.appendChild(el("a-circle", { rotation: "-90 0 0", radius: "3.45", position: "0 -1.0 0", material: "color:#0a0f18; roughness:0.98; metalness:0.02" }));
    pit.appendChild(el("a-torus", { radius: "7.25", radiusTubular: "0.14", rotation: "90 0 0", position: "0 0.95 0", material: "color:#2a1f18; roughness:0.9; metalness:0.05" }));
    pit.appendChild(el("a-torus", { radius: "7.45", radiusTubular: "0.06", rotation: "90 0 0", position: "0 0.12 0", material: "color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:1.2; opacity:0.95" }));
    pit.appendChild(el("a-torus",{id:"pitRailLip", radius:"7.55", radiusTubular:"0.10", rotation:"90 0 0", position:"0 0.95 0", material:"color:#2a1f18; roughness:0.9; metalness:0.08"}));
    world.appendChild(pit);

    const table = el("a-entity", { id: "mainTable", position: "0 -0.85 0" });
    table.appendChild(el("a-cylinder", { radius: "3.2", height: "0.52", position: "0 0.26 0", material: "color:#0f141c; roughness:0.85; metalness:0.12" }));
    table.appendChild(el("a-torus", { radius: "2.95", radiusTubular: "0.16", position: "0 0.66 0", rotation: "90 0 0", material: "color:#2a1f18; roughness:0.95; metalness:0.05" }));
    table.appendChild(el("a-cylinder", { radius: "2.82", height: "0.16", position: "0 0.82 0", material: "color:#0f7a60; roughness:1; metalness:0" }));

    // community frame placeholder (poker_demo will populate)
    const comm = el("a-entity", { id: "communityFrame", position: "0 1.75 -1.30" });
    comm.appendChild(el("a-plane", { width: "2.55", height: "0.86", material: "color:#061019; opacity:0.62" }));
    comm.appendChild(el("a-plane", { width: "2.62", height: "0.92", position: "0 0 0.01", material: "color:#0b2b44; emissive:#4aa6ff; emissiveIntensity:0.35; opacity:0.22" }));
    txt(comm, "COMMUNITY", "0 0.32 0.02", 3.4, "#cfe7ff");

    const cards = el("a-entity", { id: "communityCards", position: "0 -0.10 0.03" });
    for (let i = 0; i < 5; i++) {
      cards.appendChild(el("a-plane", { class: "communityCard", width: "0.46", height: "0.64", position: `${(i - 2) * 0.52} -0.08 0`, material: "color:#ffffff; opacity:0.12" }));
    }
    comm.appendChild(cards);

    const actionHud = el("a-entity", { id: "actionHud", position: "0 0.58 0.03" });
    actionHud.appendChild(el("a-plane", { width: "2.35", height: "0.32", material: "color:#091425; opacity:0.72" }));
    actionHud.appendChild(el("a-plane", { width: "2.38", height: "0.35", position: "0 0 0.01", material: "color:#4aa6ff; opacity:0.08; emissive:#4aa6ff; emissiveIntensity:0.35" }));
    actionHud.appendChild(el("a-text", { id: "actionHudText", value: "Waiting…", position: "-1.08 0 0.02", align: "left", width: "4.2", color: "#d7eaff" }));
    comm.appendChild(actionHud);

    table.appendChild(comm);
    world.appendChild(table);

    D.log("[world] lobby + divot + doors + store display ✅");
  }

  function build() {
    const world = getWorld();
    if (!world) {
      D.log("[world] ERROR: #world missing");
      return;
    }
    clear(world);
    buildLobby(world);
    buildJumbosAndDoors(world);
    buildSpawn(world);
    buildDivotAndTable(world);
  }

  window.SCARLETT_WORLD = { build };
})();
