// /js/boot.js — MASTER Diagnostics Boot + ImportMap + Loader
// ✅ Fixes ANY `import "three"` across your repo by injecting an importmap BEFORE loading index.js
// ✅ Buttons + log capture always work even if game fails

const $ = (id) => document.getElementById(id);
const logPanel = $("logPanel");
const pillXR = $("pillXR");
const pillMode = $("pillMode");
const btnCopy = $("btnCopy");
const btnDownload = $("btnDownload");
const btnClear = $("btnClear");
const btnHide = $("btnHide");
const hud = $("hud");

const LOG_MAX = 2200;
const buf = [];
let hudVisible = true;

function stamp(){
  const d=new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}
function safe(v){
  try{
    if (typeof v==="string") return v;
    if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack||""}`;
    if (typeof v==="object") return JSON.stringify(v);
    return String(v);
  }catch{ return String(v); }
}
function push(line, cls=""){
  const msg = `[${stamp()}] ${line}`;
  buf.push(msg);
  if (buf.length>LOG_MAX) buf.shift();
  if (logPanel){
    const div=document.createElement("div");
    if (cls) div.className=cls;
    div.textContent=msg;
    logPanel.appendChild(div);
    while (logPanel.childNodes.length>LOG_MAX) logPanel.removeChild(logPanel.firstChild);
    logPanel.scrollTop=logPanel.scrollHeight;
  }
}

window.ScarlettLog = {
  push,
  buffer: buf,
  setMode(t){ pillMode && (pillMode.innerHTML = `Mode: <span class="muted">${t}</span>`); },
  setXR(html){ pillXR && (pillXR.innerHTML = html); }
};

push("[BOOT] boot.js loaded ✅","ok");

// ✅ Inject importmap FIRST so any repo file can do: import "three"
(function injectImportMap(){
  const s = document.createElement("script");
  s.type = "importmap";
  s.textContent = JSON.stringify({
    imports: {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/examples/jsm/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  });
  document.head.appendChild(s);
  push("[BOOT] importmap injected ✅ (three + examples)", "ok");
})();

// Capture runtime failures
window.addEventListener("error",(e)=>{
  push(`WINDOW ERROR: ${e.message||e.type}`,"bad");
  if (e.error?.stack) push(e.error.stack,"muted");
});
window.addEventListener("unhandledrejection",(e)=>{
  push(`PROMISE REJECT: ${safe(e.reason)}`,"bad");
});

// Mirror console into panel
const _log=console.log.bind(console);
const _warn=console.warn.bind(console);
const _err=console.error.bind(console);
console.log=(...a)=>{_log(...a); push(a.map(safe).join(" "), "");};
console.warn=(...a)=>{_warn(...a); push(a.map(safe).join(" "), "warn");};
console.error=(...a)=>{_err(...a); push(a.map(safe).join(" "), "bad");};

// Buttons ALWAYS work here
btnClear?.addEventListener("click", ()=>{
  buf.length=0;
  if (logPanel) logPanel.innerHTML="";
  push("Log cleared ✅","ok");
});
btnHide?.addEventListener("click", ()=>{
  hudVisible=!hudVisible;
  if (hud) hud.style.display = hudVisible ? "" : "none";
});
btnCopy?.addEventListener("click", async ()=>{
  const text = buf.join("\n");
  try{
    await navigator.clipboard.writeText(text);
    const old = btnCopy.textContent;
    btnCopy.textContent="✅ Copied!";
    setTimeout(()=>btnCopy.textContent=old, 1200);
  }catch{
    try{
      const ta=document.createElement("textarea");
      ta.value=text;
      ta.style.position="fixed";
      ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      const old = btnCopy.textContent;
      btnCopy.textContent="✅ Copied!";
      setTimeout(()=>btnCopy.textContent=old, 1200);
    }catch{
      alert("Copy failed. Long-press log box → Select All → Copy.");
    }
  }
});
btnDownload?.addEventListener("click", ()=>{
  const blob=new Blob([buf.join("\n")],{type:"text/plain"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`scarlett_log_${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// XR support label
(async ()=>{
  let supported=false;
  try{
    if (navigator.xr?.isSessionSupported) supported = await navigator.xr.isSessionSupported("immersive-vr");
  }catch{}
  window.ScarlettLog.setXR(`XR: <span class="${supported?"ok":"warn"}">${supported?"supported":"not supported"}</span>`);
})();

window.ScarlettLog.setMode("boot");

// Load runtime index.js after a tick so importmap registers
(async ()=>{
  try{
    window.ScarlettLog.setMode("loading index.js");
    push("[BOOT] importing ./js/index.js …");
    await new Promise(r => setTimeout(r, 0));
    await import(`./index.js?v=${Date.now()}`);
    push("[BOOT] index.js imported ✅","ok");
    window.ScarlettLog.setMode("running");
  }catch(e){
    push("[BOOT] index.js FAILED ❌","bad");
    push(String(e?.stack||e),"muted");
    window.ScarlettLog.setMode("failed");
  }
})();
