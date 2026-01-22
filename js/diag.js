// js/diag.js
(function(){
  const start = performance.now();
  const panel = () => document.getElementById('diagPanel');
  const toastEl = () => document.getElementById('toast');
  const state = {
    build: "SCARLETT_FULL_1_0",
    logs: [],
    visible: false
  };

  function now() { return ((performance.now()-start)/1000).toFixed(3); }

  function log(line){
    const msg = `[${now()}] ${line}`;
    state.logs.push(msg);
    const p = panel();
    if (p) p.textContent = state.logs.join("\n");
    // also console
    try { console.log(msg); } catch(e){}
  }

  function setVisible(v){
    state.visible = v;
    const p = panel();
    if (p) p.style.display = v ? "block" : "none";
  }

  function toast(text, ms=1400){
    const t = toastEl();
    if(!t) return;
    t.textContent = text;
    t.style.display = "block";
    clearTimeout(t.__t);
    t.__t = setTimeout(()=>{ t.style.display="none"; }, ms);
  }

  function envDump(){
    const href = location.href;
    const ua = navigator.userAgent;
    const secure = window.isSecureContext;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints||0) > 0;
    const maxTP = navigator.maxTouchPoints || 0;
    const xr = !!navigator.xr;
    return {
      build: state.build,
      href, secureContext: secure,
      ua, touch, maxTouchPoints: maxTP,
      xr
    };
  }

  window.SCARLETT_DIAG = { log, setVisible, toast, envDump };

  // initial
  const e = envDump();
  log("=== SCARLETT DIAGNOSTICS ===");
  log(`BUILD=${e.build}`);
  log(`href=${e.href}`);
  log(`secureContext=${e.secureContext}`);
  log(`ua=${e.ua}`);
  log(`touch=${e.touch} maxTouchPoints=${e.maxTouchPoints}`);
  log(`xr=${e.xr}`);
})();
