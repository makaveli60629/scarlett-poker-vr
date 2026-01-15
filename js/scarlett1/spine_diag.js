export function makeDiag({ log }) {
  let last = "";
  let fps = 0, fc = 0, ft = 0;

  function write(text) {
    const box = document.getElementById("statusBox");
    if (box && box.textContent !== text) box.textContent = text;
  }

  function update({ dt, renderer, rig, xr, android, modules }) {
    fc++; ft += dt;
    if (ft >= 0.5) { fps = Math.round(fc / ft); fc = 0; ft = 0; }

    const inXR = !!renderer.xr.getSession();
    const p = rig.position;

    const lines = [];
    lines.push(`build=SCARLETT_1_0  fps=${fps}  dt=${dt.toFixed(3)}`);
    lines.push(`xr=${inXR}  webxr=${!!navigator.xr}  secure=${window.isSecureContext}`);
    lines.push(`rig=(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
    lines.push(`androidMove=${android.active}  xrMove=${xr.active}`);
    lines.push(`lasers: L=${xr.laserL} R=${xr.laserR}`);
    lines.push(`modules: ok=${modules.okCount} err=${modules.errCount}`);

    for (const m of modules.list.slice(0, 10)) {
      lines.push(`- ${m.name}: ${m.status}${m.error ? " (" + m.error + ")" : ""}`);
    }

    const text = lines.join("\n");
    if (text !== last) { last = text; write(text); }
  }

  return { update };
}
