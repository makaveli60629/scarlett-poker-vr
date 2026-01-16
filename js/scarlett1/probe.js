// /js/scarlett1/probe.js — Scarlett1 Serve Test (FULL)

console.log("✅ PROBE LOADED: /js/scarlett1/probe.js");

const o = document.getElementById("overlay");
if (o) {
  o.textContent += "\n[LOG] PROBE LOADED ✅ (scarlett1 folder is being served)";
  o.textContent += "\n[LOG] Next: switch router to ./scarlett1/index.js";
}

// Make the background visibly different so you KNOW it executed
document.body.style.background = "#061018";

// Add a visible marker at the bottom of the page
const tag = document.createElement("div");
tag.textContent = "SCARLETT1 PROBE RUNNING ✅";
tag.style.cssText = `
  position:fixed;left:0;right:0;bottom:0;
  padding:10px;text-align:center;
  font:14px monospace;
  color:#33ff66;background:rgba(0,0,0,.65);
  border-top:1px solid #33ff66;
  z-index:999999;
`;
document.body.appendChild(tag);
