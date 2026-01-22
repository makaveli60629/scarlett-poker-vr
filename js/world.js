export function buildWorld(scene){
  const floor = document.createElement("a-plane");
  floor.setAttribute("rotation", "-90 0 0");
  floor.setAttribute("width", "80");
  floor.setAttribute("height", "80");
  floor.setAttribute("color", "#151a22");
  floor.setAttribute("class", "teleportable");
  floor.setAttribute("shadow", "receive: true");
  scene.appendChild(floor);

  const wallColor = "#0f1420";
  const walls = [
    { pos:"0 2 -40", rot:"0 0 0", w:80, h:4, d:0.5 },
    { pos:"0 2 40", rot:"0 180 0", w:80, h:4, d:0.5 },
    { pos:"40 2 0", rot:"0 -90 0", w:80, h:4, d:0.5 },
    { pos:"-40 2 0", rot:"0 90 0", w:80, h:4, d:0.5 },
  ];
  walls.forEach((w) => {
    const e = document.createElement("a-box");
    e.setAttribute("position", w.pos);
    e.setAttribute("rotation", w.rot);
    e.setAttribute("width", w.w);
    e.setAttribute("height", w.h);
    e.setAttribute("depth", w.d);
    e.setAttribute("color", wallColor);
    scene.appendChild(e);
  });

  const lights = [
    { p:"0 7 0", i:0.9 },
    { p:"-15 7 -12", i:0.75 },
    { p:"15 7 -12", i:0.75 },
    { p:"0 7 16", i:0.75 },
  ];
  lights.forEach((l) => {
    const e = document.createElement("a-entity");
    e.setAttribute("position", l.p);
    e.setAttribute("light", `type: point; intensity: ${l.i}; distance: 55; decay: 2; color: #ffffff`);
    scene.appendChild(e);
  });

  const tableGroup = document.createElement("a-entity");
  tableGroup.setAttribute("position", "0 0 0");
  scene.appendChild(tableGroup);

  const tableBase = document.createElement("a-cylinder");
  tableBase.setAttribute("position", "0 0.45 0");
  tableBase.setAttribute("radius", "1.35");
  tableBase.setAttribute("height", "0.9");
  tableBase.setAttribute("color", "#222a35");
  tableGroup.appendChild(tableBase);

  const tableTop = document.createElement("a-cylinder");
  tableTop.setAttribute("position", "0 0.95 0");
  tableTop.setAttribute("radius", "1.65");
  tableTop.setAttribute("height", "0.18");
  tableTop.setAttribute("material", "color:#0b6b4b; roughness:0.95; metalness:0.05");
  tableGroup.appendChild(tableTop);

  const divot = document.createElement("a-cylinder");
  divot.setAttribute("position", "0 0.92 0");
  divot.setAttribute("radius", "0.65");
  divot.setAttribute("height", "0.05");
  divot.setAttribute("material", "color:#0a4d36; roughness:1; metalness:0");
  tableGroup.appendChild(divot);

  const spawn = document.createElement("a-circle");
  spawn.setAttribute("id", "spawnPad");
  spawn.setAttribute("position", "0 0 3");
  spawn.setAttribute("rotation", "-90 0 0");
  spawn.setAttribute("radius", "0.5");
  spawn.setAttribute("material", "color:#2b7cff; opacity:0.35; side:double");
  scene.appendChild(spawn);

  const arch = document.createElement("a-entity");
  arch.setAttribute("position", "0 0 -6");
  scene.appendChild(arch);

  const mkBox = (pos,w,h,d) => {
    const b = document.createElement("a-box");
    b.setAttribute("position", pos);
    b.setAttribute("width", w);
    b.setAttribute("height", h);
    b.setAttribute("depth", d);
    b.setAttribute("color", "#2a3240");
    return b;
  };
  arch.appendChild(mkBox("-1.2 1.3 0", "0.25", "2.6", "0.25"));
  arch.appendChild(mkBox("1.2 1.3 0", "0.25", "2.6", "0.25"));
  arch.appendChild(mkBox("0 2.65 0", "2.8", "0.25", "0.25"));

  const sign = document.createElement("a-text");
  sign.setAttribute("value", "SCARLETT VR POKER\nUpdate 3.0");
  sign.setAttribute("align", "center");
  sign.setAttribute("position", "0 3.05 0.2");
  sign.setAttribute("width", "6");
  sign.setAttribute("color", "#d9e6ff");
  arch.appendChild(sign);

  const screen = document.createElement("a-plane");
  screen.setAttribute("position", "0 2.1 -12");
  screen.setAttribute("width", "7");
  screen.setAttribute("height", "3.8");
  screen.setAttribute("material", "color:#0a0f16; emissive:#101b2a; emissiveIntensity:0.35");
  scene.appendChild(screen);

  const screenText = document.createElement("a-text");
  screenText.setAttribute("id", "screenText");
  screenText.setAttribute("value", "JUMBOTRON (idle)\n\nUpdate 3.0");
  screenText.setAttribute("align", "center");
  screenText.setAttribute("position", "0 2.1 -11.98");
  screenText.setAttribute("width", "9");
  screenText.setAttribute("color", "#b7c9e8");
  scene.appendChild(screenText);
}
