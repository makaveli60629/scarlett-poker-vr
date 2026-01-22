const $ = (id) => document.getElementById(id);
let t0 = performance.now();
let buildName = "SCARLETT";

export function diagInit(build){
  buildName = build || buildName;
  t0 = performance.now();
  const el = $("diagText");
  if (el) el.textContent = "booting…\n";
  diagWrite(`=== SCARLETT DIAGNOSTICS ===`);
  diagWrite(`BUILD=${buildName}`);
}

export function diagWrite(msg){
  const line = `[${((performance.now()-t0)/1000).toFixed(3)}] ${msg}`;
  const el = $("diagText");
  if (el){
    el.textContent = (el.textContent ? (el.textContent + "\n") : "") + line;
    const lines = el.textContent.split("\n");
    if (lines.length > 220) el.textContent = lines.slice(-220).join("\n");
  }
  const d3 = $("diagText3d");
  if (d3){
    d3.setAttribute("text", "value", msg);
  }
  console.log(line);
}
export function diagSection(title){ diagWrite(""); diagWrite(`--- ${title} ---`); }
export function diagSetKV(k,v){ diagWrite(`${k}=${v}`); }
export function diagDumpEnv(){
  try{
    diagWrite(`href=${location.href}`);
    diagWrite(`secureContext=${!!window.isSecureContext}`);
    diagWrite(`ua=${navigator.userAgent}`);
    diagWrite(`touch=${("ontouchstart" in window) || (navigator.maxTouchPoints||0)>0} maxTouchPoints=${navigator.maxTouchPoints||0}`);
    diagWrite(`xr=${!!navigator.xr}`);
  }catch(e){
    diagWrite(`env error: ${e?.message||e}`);
  }
}
window.__scarlettDiagWrite = diagWrite;
