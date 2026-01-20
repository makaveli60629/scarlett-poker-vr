// /js/world.js — builds a safe, bright, walkable lobby with spawn-safe placement
export function buildWorld(scene){
  // Basic room + floor
  const floor = document.createElement("a-plane");
  floor.setAttribute("rotation", "-90 0 0");
  floor.setAttribute("width", "60");
  floor.setAttribute("height", "60");
  floor.setAttribute("color", "#151a22");
  floor.setAttribute("class", "teleportable");
  floor.setAttribute("shadow", "receive: true");
  scene.appendChild(floor);

  // Soft perimeter walls (so you don't feel lost)
  const wallColor = "#0f1420";
  const walls = [
    { pos:"0 2 -30", rot:"0 0 0", w:60, h:4, d:0.5 },
    { pos:"0 2 30", rot:"0 180 0", w:60, h:4, d:0.5 },
    { pos:"30 2 0", rot:"0 -90 0", w:60, h:4, d:0.5 },
    { pos:"-30 2 0", rot:"0 90 0", w:60, h:4, d:0.5 },
  ];
  walls.forEach((w) => {
    const e = document.createElement("a-box");
    e.setAttribute("position", w.pos);
    e.setAttribute("rotation", w.rot);
    e.setAttribute("width", w.w);
    e.setAttribute("height", w.h);
    e.setAttribute("depth", w.d);
    e.setAttribute("color", wallColor);
    e.setAttribute("shadow", "receive: true");
    scene.appendChild(e);
  });

  // Brighter ceiling light points to fix "dark room" reports
  const lights = [
    { p:"0 6 0", i:0.9 },
    { p:"-10 6 -8", i:0.7 },
    { p:"10 6 -8", i:0.7 },
    { p:"0 6 12", i:0.7 },
  ];
  lights.forEach((l) => {
    const e = document.createElement("a-entity");
    e.setAttribute("position", l.p);
    e.setAttribute("light", `type: point; intensity: ${l.i}; distance: 40; decay: 2; color: #ffffff`);
    scene.appendChild(e);

    const bulb = document.createElement("a-sphere");
    bulb.setAttribute("position", l.p);
    bulb.setAttribute("radius", "0.12");
    bulb.setAttribute("material", "color: #ffffff; emissive: #ffffff; emissiveIntensity: 1");
    scene.appendChild(bulb);
  });

  // Main poker table (simple but solid)
  const tableGroup = document.createElement("a-entity");
  tableGroup.setAttribute("position", "0 0 0");
  scene.appendChild(tableGroup);

  const tableBase = document.createElement("a-cylinder");
  tableBase.setAttribute("position", "0 0.45 0");
  tableBase.setAttribute("radius", "1.35");
  tableBase.setAttribute("height", "0.9");
  tableBase.setAttribute("color", "#222a35");
  tableBase.setAttribute("shadow", "cast: true; receive: true");
  tableGroup.appendChild(tableBase);

  const tableTop = document.createElement("a-cylinder");
  tableTop.setAttribute("position", "0 0.95 0");
  tableTop.setAttribute("radius", "1.65");
  tableTop.setAttribute("height", "0.18");
  tableTop.setAttribute("material", "color:#0b6b4b; roughness:0.95; metalness:0.05");
  tableTop.setAttribute("shadow", "cast: true; receive: true");
  tableGroup.appendChild(tableTop);

  // Divot (a recessed pit) so it reads like a poker table center
  const divot = document.createElement("a-cylinder");
  divot.setAttribute("position", "0 0.92 0");
  divot.setAttribute("radius", "0.65");
  divot.setAttribute("height", "0.05");
  divot.setAttribute("material", "color:#0a4d36; roughness:1; metalness:0");
  tableGroup.appendChild(divot);

  // Dealer chip tray marker
  const marker = document.createElement("a-ring");
  marker.setAttribute("position", "0 0.98 -1.15");
  marker.setAttribute("rotation", "-90 0 0");
  marker.setAttribute("radius-inner", "0.14");
  marker.setAttribute("radius-outer", "0.22");
  marker.setAttribute("material", "color:#ffd37a; emissive:#ffd37a; emissiveIntensity:0.55; side:double");
  tableGroup.appendChild(marker);

  // Spawn pad (safe area)
  const spawn = document.createElement("a-circle");
  spawn.setAttribute("id", "spawnPad");
  spawn.setAttribute("position", "0 0 3");
  spawn.setAttribute("rotation", "-90 0 0");
  spawn.setAttribute("radius", "0.5");
  spawn.setAttribute("material", "color:#2b7cff; opacity:0.35; side:double");
  scene.appendChild(spawn);

  // Simple archway landmark
  const arch = document.createElement("a-entity");
  arch.setAttribute("position", "0 0 -6");
  scene.appendChild(arch);

  const postL = document.createElement("a-box");
  postL.setAttribute("position", "-1.2 1.3 0");
  postL.setAttribute("width", "0.25");
  postL.setAttribute("height", "2.6");
  postL.setAttribute("depth", "0.25");
  postL.setAttribute("color", "#2a3240");
  arch.appendChild(postL);

  const postR = document.createElement("a-box");
  postR.setAttribute("position", "1.2 1.3 0");
  postR.setAttribute("width", "0.25");
  postR.setAttribute("height", "2.6");
  postR.setAttribute("depth", "0.25");
  postR.setAttribute("color", "#2a3240");
  arch.appendChild(postR);

  const beam = document.createElement("a-box");
  beam.setAttribute("position", "0 2.65 0");
  beam.setAttribute("width", "2.8");
  beam.setAttribute("height", "0.25");
  beam.setAttribute("depth", "0.25");
  beam.setAttribute("color", "#2a3240");
  arch.appendChild(beam);

  const sign = document.createElement("a-text");
  sign.setAttribute("value", "SCARLETT VR POKER");
  sign.setAttribute("align", "center");
  sign.setAttribute("position", "0 2.95 0.2");
  sign.setAttribute("width", "6");
  sign.setAttribute("color", "#d9e6ff");
  arch.appendChild(sign);

  // A simple “jumbotron” placeholder screen
  const screen = document.createElement("a-plane");
  screen.setAttribute("position", "0 2.1 -10");
  screen.setAttribute("width", "6");
  screen.setAttribute("height", "3.2");
  screen.setAttribute("material", "color:#0a0f16; emissive:#101b2a; emissiveIntensity:0.35");
  scene.appendChild(screen);

  const screenText = document.createElement("a-text");
  screenText.setAttribute("value", "JUMBOTRON (idle)\n\nV26 Safe Boot");
  screenText.setAttribute("align", "center");
  screenText.setAttribute("position", "0 2.1 -9.98");
  screenText.setAttribute("width", "8");
  screenText.setAttribute("color", "#b7c9e8");
  scene.appendChild(screenText);
}
