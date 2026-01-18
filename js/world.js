import { diagWrite } from "./diagnostics.js";

export const WORLD = { pitRadius: 8.5, pitDepth: 1.2, tableY: -1.05 };

export function buildWorld(){
  diagWrite("[world] building…");
  const root = document.getElementById("worldRoot");
  root.innerHTML = "";

  const floor = document.createElement("a-ring");
  floor.setAttribute("radius-inner", "0.1");
  floor.setAttribute("radius-outer", "40");
  floor.setAttribute("rotation", "-90 0 0");
  floor.setAttribute("color", "#121922");
  floor.classList.add("teleportable");
  root.appendChild(floor);

  const pitFloor = document.createElement("a-circle");
  pitFloor.setAttribute("radius", String(WORLD.pitRadius));
  pitFloor.setAttribute("rotation", "-90 0 0");
  pitFloor.setAttribute("position", `0 ${-WORLD.pitDepth} 0`);
  pitFloor.setAttribute("color", "#0b1118");
  pitFloor.classList.add("teleportable");
  root.appendChild(pitFloor);

  const pitWall = document.createElement("a-cylinder");
  pitWall.setAttribute("radius", String(WORLD.pitRadius));
  pitWall.setAttribute("height", String(WORLD.pitDepth));
  pitWall.setAttribute("position", `0 ${-WORLD.pitDepth/2} 0`);
  pitWall.setAttribute("open-ended", "true");
  pitWall.setAttribute("color", "#1b2a3b");
  root.appendChild(pitWall);

  const room = document.createElement("a-box");
  room.setAttribute("width", "60");
  room.setAttribute("height", "16");
  room.setAttribute("depth", "60");
  room.setAttribute("position", "0 7 0");
  room.setAttribute("material", "color: #0e141d; side: back; roughness: 1; metalness: 0");
  root.appendChild(room);

  const trim1 = document.createElement("a-ring");
  trim1.setAttribute("radius-inner", "19.8");
  trim1.setAttribute("radius-outer", "20.1");
  trim1.setAttribute("rotation", "90 0 0");
  trim1.setAttribute("position", "0 4.2 0");
  trim1.setAttribute("material", "color: #2bdcff; emissive: #2bdcff; emissiveIntensity: 1.5; side: double");
  root.appendChild(trim1);

  const trim2 = document.createElement("a-ring");
  trim2.setAttribute("radius-inner", "27.8");
  trim2.setAttribute("radius-outer", "28.1");
  trim2.setAttribute("rotation", "90 0 0");
  trim2.setAttribute("position", "0 8.2 0");
  trim2.setAttribute("material", "color: #ff2bbd; emissive: #ff2bbd; emissiveIntensity: 1.2; side: double");
  root.appendChild(trim2);

  diagWrite("[world] ready ✅");
}
