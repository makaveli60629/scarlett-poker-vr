<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Scarlett VR Poker</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#05060a; overflow:hidden;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#e8ecff; }
    #hud{
      position:fixed; left:12px; right:12px; top:12px;
      border-radius:22px; padding:12px; z-index:10;
      background:rgba(8,10,18,.78);
      border:1px solid rgba(127,231,255,.14);
      backdrop-filter: blur(10px);
      box-shadow: 0 14px 40px rgba(0,0,0,.55);
    }
    #row1{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .pill{ padding:8px 12px; border-radius:999px;
      border:1px solid rgba(255,255,255,.12); background:rgba(10,14,24,.55); font-weight:800; font-size:13px; }
    #log{
      margin-top:10px; white-space:pre; font-size:12px; line-height:1.25;
      max-height:240px; overflow:auto; padding:10px; border-radius:16px;
      background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.10);
    }
    #stickL,#stickR{
      position:fixed; bottom:18px; width:132px; height:132px; border-radius:50%;
      background:rgba(127,231,255,.08); border:1px solid rgba(127,231,255,.22);
      z-index:9; touch-action:none;
    }
    #stickL{ left:18px; } #stickR{ right:18px; }
    button{ border-radius:14px; border:1px solid rgba(255,255,255,.14); background:rgba(10,14,24,.55);
      color:#e8ecff; padding:10px 12px; font-weight:900; font-size:13px; }
  </style>
</head>
<body>
  <div id="hud">
    <div id="row1">
      <span class="pill">Scarlett VR Poker</span>
      <span class="pill" id="xrstat">XR</span>
      <span class="pill" id="modestat">Mode</span>
      <span class="pill" id="perf">Perf</span>
      <button id="copyBtn">📋 Copy</button>
      <button id="clearBtn">🧹 Clear</button>
      <button id="diagBtn">🩺 Run Diagnostics</button>
    </div>
    <div id="log">[HTML] loaded ✅ (waiting for boot.js…)</div>
  </div>

  <div id="stickL"></div>
  <div id="stickR"></div>

  <!-- NON-MODULE heartbeat (runs even if modules fail) -->
  <script>
    (function(){
      const logEl = document.getElementById("log");
      const now = () => new Date().toTimeString().slice(0,8);
      logEl.textContent += "\n[" + now() + "] [HTML] classic script running ✅";
      // If boot doesn't run, warn after 1.5s
      setTimeout(() => {
        if (!window.__BOOT_OK__) {
          logEl.textContent += "\n[" + now() + "] [HTML] BOOT NOT RUNNING ❌ (module script not executing)";
          logEl.textContent += "\n[" + now() + "] [HTML] Check: boot.js location + GitHub Pages base path + cache";
        }
      }, 1500);
    })();
  </script>

  <!-- MODULE boot with cache-buster -->
  <script type="module">
    const v = Date.now();
    import(`./boot.js?v=${v}`).catch(e => {
      const logEl = document.getElementById("log");
      const now = () => new Date().toTimeString().slice(0,8);
      logEl.textContent += `\n[${now()}] [HTML] boot.js import FAILED ❌ ${e?.message || e}`;
      console.error(e);
    });
  </script>
</body>
</html>
