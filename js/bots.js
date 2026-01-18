import { diagWrite } from "./diagnostics.js";
import { TABLE } from "./table.js";
import { WORLD } from "./world.js";

export const BOTS = [];
const N = 5;

export function spawnBots(){
  diagWrite("[bots] spawning…");
  const root = document.getElementById("worldRoot");
  for (const b of BOTS) b.remove();
  BOTS.length = 0;

  for (let i=0;i<N;i++){
    const a = (i/6)*Math.PI*2;
    const x = Math.cos(a)*(TABLE.seatRadius + 0.1);
    const z = Math.sin(a)*(TABLE.seatRadius + 0.1);

    const bot = document.createElement("a-entity");
    bot.setAttribute("position", `${x} ${WORLD.tableY + 0.55} ${z}`);
    bot.setAttribute("rotation", `0 ${(-a*180/Math.PI)+90} 0`);

    const head = document.createElement("a-sphere");
    head.setAttribute("radius","0.18");
    head.setAttribute("position","0 0.35 0");
    head.setAttribute("color","#ff4b4b");
    bot.appendChild(head);

    const body = document.createElement("a-cylinder");
    body.setAttribute("radius","0.18");
    body.setAttribute("height","0.55");
    body.setAttribute("position","0 0.05 0");
    body.setAttribute("color","#273346");
    bot.appendChild(body);

    const tag = document.createElement("a-text");
    tag.setAttribute("value", `BOT ${i+1}`);
    tag.setAttribute("align","center");
    tag.setAttribute("color","#e8f3ff");
    tag.setAttribute("width","4");
    tag.setAttribute("position","0 0.72 0");
    tag.setAttribute("side","double");
    bot.appendChild(tag);

    root.appendChild(bot);
    BOTS.push(bot);
  }
  diagWrite("[bots] ready ✅");
}
