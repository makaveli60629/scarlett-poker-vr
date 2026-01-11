// /js/boot.js — Scarlett Boot v6.0 (FULL)
// ✅ This is the ONLY entry file index.html should load
// ✅ Provides diagnostics + COPY LOG + Android touch controls
// ✅ Imports and runs /js/index.js (the real game)

const BUILD = Date.now();
const LOG = [];
const LOG_MAX = 3000;

const overlay = document.getElementById("log") || null;

function pushLog(line){ LOG.push(line); if (LOG.length > LOG_MAX) LOG.shift(); }
function write(line, cls="muted"){
  const s = String(line);
  pushLog(s);
  if (!overlay) { console.log(s); return; }
  const div = document.createElement("div");
  div.className = `row ${cls}`;
  div.textContent = s;
  overlay.appendChild(div);
  overlay.scrollTop = overlay.scrollHeight;
}
const ok  = (m)=>write(`✅ ${m}`,"ok");
const warn= (m)=>write(`⚠️ ${m}`,"warnT");
const bad = (m)=>write(`❌ ${m}`,"badT");

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.copyLog = async () => {
  const text = LOG.join("\n");
  try { await navigator.clipboard.writeText(text); ok("Copied log ✅"); }
  catch { warn("Clipboard blocked — long-press select the log."); }
};

// Buttons in index.html call these (safe no-ops until game sets them)
window.SCARLETT.respawnSafe = window.SCARLETT.respawnSafe || (()=>warn("respawnSafe not ready yet"));
window.SCARLETT.snapDown    = window.SCARLETT.snapDown    || (()=>warn("snapDown not ready yet"));
window.SCARLETT.gotoTable   = window.SCARLETT.gotoTable   || (()=>warn("gotoTable not ready yet"));

window.addEventListener("error",(e)=>{
  bad(`WINDOW ERROR: ${e?.message||"error"}${e?.filename?` @ ${e.filename}:${e.lineno}:${e.colno}`:""}`);
  if (e?.error?.stack) write(e.error.stack,"badT");
});
window.addEventListener("unhandledrejection",(e)=>{
  bad("UNHANDLED PROMISE REJECTION");
  const r=e?.reason; bad(r?.message||String(r)); if (r?.stack) write(r.stack,"badT");
});

write(`BUILD_STAMP: ${BUILD}`);
write(`HREF: ${location.href}`);
write(`UA: ${navigator.userAgent}`);
write(`NAVIGATOR_XR: ${!!navigator.xr}`);

(async ()=>{
  // Load the real game runtime
  try{
    const mod = await import(`./index.js?v=6001`);
    if (!mod?.startGame) throw new Error("index.js must export startGame()");
    ok("index.js imported ✅");

    const api = await mod.startGame({
      BUILD,
      log: (...a)=>write(a.map(String).join(" "), "muted"),
      ok, warn, bad,
      getLogText: ()=>LOG.join("\n")
    });

    ok("Game started ✅");

    // Allow UI buttons to work
    if (api?.respawnSafe) window.SCARLETT.respawnSafe = api.respawnSafe;
    if (api?.snapDown)    window.SCARLETT.snapDown    = api.snapDown;
    if (api?.gotoTable)   window.SCARLETT.gotoTable   = api.gotoTable;
    if (api?.gotoStore)   window.SCARLETT.gotoStore   = api.gotoStore;
    if (api?.gotoScorpion)window.SCARLETT.gotoScorpion= api.gotoScorpion;

  }catch(e){
    bad("BOOT FAIL: " + (e?.message||e));
    if (e?.stack) write(e.stack,"badT");
  }
})();
