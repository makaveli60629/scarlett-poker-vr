// /js/diag.js — minimal in-page diagnostics (no dependencies)
let diagTextEl = null;

export function diagInit(build){
  diagTextEl = document.getElementById("diagText");
  writeLine(`=== SCARLETT DIAGNOSTICS ===`);
  writeLine(`BUILD=${build}`);
}

function writeLine(line){
  try{
    if (!diagTextEl) return;
    const now = performance.now();
    diagTextEl.textContent += `\n[${(now/1000).toFixed(3)}] ${line}`;
    // keep last ~5000 chars
    if (diagTextEl.textContent.length > 5000){
      diagTextEl.textContent = diagTextEl.textContent.slice(-5000);
    }
  } catch (_) {}
}

export function diagWrite(msg){ writeLine(String(msg)); }

export function diagSetKV(key, val){
  writeLine(`${key}=${val}`);
}

export function diagDumpEnv(){
  const href = location.href;
  const secureContext = window.isSecureContext;
  const ua = navigator.userAgent;
  const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const xr = !!navigator.xr;

  diagWrite(`href=${href}`);
  diagWrite(`secureContext=${secureContext}`);
  diagWrite(`ua=${ua}`);
  diagWrite(`touch=${touch} maxTouchPoints=${maxTouchPoints}`);
  diagWrite(`xr=${xr}`);
}
