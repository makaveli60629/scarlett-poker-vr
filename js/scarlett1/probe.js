console.log("✅ PROBE LOADED: /js/scarlett1/probe.js");

const o = document.getElementById("overlay");
if (o) o.textContent += "\n[LOG] PROBE LOADED ✅ (scarlett1 is being served)";

// Add a visible background so it’s obvious
document.body.style.background = "#081018";
