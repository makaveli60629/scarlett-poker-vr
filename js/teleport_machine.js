import { diagWrite } from "./diagnostics.js";
import { clamp } from "./util.js";

let teleportArmed = false;
function rig(){ return document.getElementById("playerRig"); }

export function buildTeleportMachine(){
  diagWrite("[teleport] building arch…");
  const root = document.getElementById("worldRoot");
  const arch = document.createElement("a-entity");
  arch.setAttribute("position","0 -1.2 10");
  arch.setAttribute("rotation","0 180 0");

  const lp = document.createElement("a-box");
  lp.setAttribute("width","0.4"); lp.setAttribute("height","3.2"); lp.setAttribute("depth","0.4");
  lp.setAttribute("position","-1 1.6 0");
  lp.setAttribute("material","color:#161b22; emissive:#2bdcff; emissiveIntensity:0.3");
  arch.appendChild(lp);

  const rp = document.createElement("a-box");
  rp.setAttribute("width","0.4"); rp.setAttribute("height","3.2"); rp.setAttribute("depth","0.4");
  rp.setAttribute("position","1 1.6 0");
  rp.setAttribute("material","color:#161b22; emissive:#ff2bbd; emissiveIntensity:0.25");
  arch.appendChild(rp);

  const top = document.createElement("a-torus");
  top.setAttribute("radius","1.05");
  top.setAttribute("radius-tubular","0.09");
  top.setAttribute("rotation","90 0 0");
  top.setAttribute("position","0 3 0");
  top.setAttribute("material","color:#2bdcff; emissive:#2bdcff; emissiveIntensity:1.0");
  arch.appendChild(top);

  const pad = document.createElement("a-circle");
  pad.setAttribute("radius","1.25");
  pad.setAttribute("rotation","-90 0 0");
  pad.setAttribute("position","0 0.01 0");
  pad.classList.add("teleportable");
  pad.setAttribute("material","color:#0a1f2a; emissive:#2bdcff; emissiveIntensity:0.35; side: double");
  arch.appendChild(pad);

  const txt = document.createElement("a-text");
  txt.setAttribute("value","TELEPORT");
  txt.setAttribute("align","center");
  txt.setAttribute("color","#e8f3ff");
  txt.setAttribute("position","0 2.4 0.35");
  txt.setAttribute("width","6");
  arch.appendChild(txt);

  root.appendChild(arch);
  diagWrite("[teleport] arch ready ✅");
}

export function initTeleportControls(){
  const btn = document.getElementById("btnTeleport");
  btn?.addEventListener("click", ()=>{
    teleportArmed = !teleportArmed;
    btn.textContent = teleportArmed ? "TELEPORT: ON" : "TELEPORT";
    diagWrite(`[teleport] ${teleportArmed ? "ARMED":"OFF"}`);
  });

  const scene = document.querySelector("a-scene");
  scene?.addEventListener("click", (e)=>{
    if (!teleportArmed) return;
    const inter = e?.detail?.intersection;
    if (inter?.point) teleportTo(inter.point.x, inter.point.y, inter.point.z);
  });
}

export function teleportTo(x,y,z){
  const r = rig(); if (!r) return;
  const p = r.getAttribute("position");
  const nx = clamp(x, -28, 28);
  const nz = clamp(z, -28, 28);
  r.setAttribute("position", `${nx} ${p.y} ${nz}`);
  diagWrite(`[teleport] moved (${nx.toFixed(2)}, ${nz.toFixed(2)})`);
}
