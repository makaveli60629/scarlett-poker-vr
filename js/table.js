import { diagWrite } from "./diagnostics.js";
import { WORLD } from "./world.js";

export const TABLE = { seats: 6, seatRadius: 3.2, topRadius: 2.3 };

export function buildTable(){
  diagWrite("[table] building…");
  const root = document.getElementById("worldRoot");

  const base = document.createElement("a-cylinder");
  base.setAttribute("radius", "1.2");
  base.setAttribute("height", "0.8");
  base.setAttribute("color", "#1a1a1a");
  base.setAttribute("position", `0 ${WORLD.tableY + 0.4} 0`);
  root.appendChild(base);

  const top = document.createElement("a-cylinder");
  top.setAttribute("radius", String(TABLE.topRadius));
  top.setAttribute("height", "0.22");
  top.setAttribute("position", `0 ${WORLD.tableY + 0.82} 0`);
  top.setAttribute("material", "color: #0be4ff; emissive: #00bcd4; emissiveIntensity: 0.25; roughness: 0.8; metalness: 0.1");
  root.appendChild(top);

  const felt = document.createElement("a-cylinder");
  felt.setAttribute("radius", String(TABLE.topRadius - 0.25));
  felt.setAttribute("height", "0.05");
  felt.setAttribute("position", `0 ${WORLD.tableY + 0.93} 0`);
  felt.setAttribute("color", "#0d6b6b");
  root.appendChild(felt);

  for (let i=0;i<TABLE.seats;i++){
    const a = (i/TABLE.seats)*Math.PI*2;
    const x = Math.cos(a)*TABLE.seatRadius;
    const z = Math.sin(a)*TABLE.seatRadius;

    const chair = document.createElement("a-box");
    chair.setAttribute("width","0.7");
    chair.setAttribute("height","0.6");
    chair.setAttribute("depth","0.7");
    chair.setAttribute("position", `${x} ${WORLD.tableY + 0.3} ${z}`);
    chair.setAttribute("rotation", `0 ${(-a*180/Math.PI)+90} 0`);
    chair.setAttribute("color", "#222b35");
    root.appendChild(chair);
  }
  diagWrite("[table] ready ✅");
}
