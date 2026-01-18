const BUILD = "ORCHESTRA_RECOVERY_FULL_v1";

function earlyWrite(msg){
  try { window.__SCARLETT_EARLY_DIAG__?.write?.(msg); } catch(_) {}
}

function diagEl(){ return document.getElementById("diag"); }

function append(line){
  earlyWrite(line);
  const el = diagEl();
  if (!el) return;
  el.textContent += line + "\n";
  el.scrollTop = el.scrollHeight;
}

export function initDiagnostics(){
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;
  window.__scarlettDiagWrite = (m)=>append(String(m));

  append("=== SCARLETT DIAG ===");
  append("build=" + BUILD);
  append("href=" + location.href);
  append("secureContext=" + (window.isSecureContext ? "true":"false"));
  append("ua=" + navigator.userAgent);
  append("touch=" + (("ontouchstart" in window) ? "true":"false") + " maxTouchPoints=" + (navigator.maxTouchPoints||0));
  append("navigator.xr=" + (!!navigator.xr));
  append("");
  return { append };
}

export function diagWrite(msg){
  try { window.__scarlettDiagWrite?.(msg); } catch(_) { earlyWrite(String(msg)); }
}
