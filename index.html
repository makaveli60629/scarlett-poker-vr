<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <title>Scarlett Poker VR</title>
  <style>
    html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,Segoe UI,Roboto,Arial}
    #boot{
      position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:flex-start;
      padding:16px;color:#00ff66;background:#000;white-space:pre-wrap;line-height:1.35;font-size:14px
    }
    .pill{display:inline-block;padding:6px 10px;border-radius:12px;background:#111;border:1px solid #222;margin-right:8px}
    .ok{color:#00ff66} .bad{color:#ff4d4d} .warn{color:#ffd24d}
    button{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid #333;background:#111;color:#fff}
  </style>
</head>
<body>
  <div id="boot">
<span class="pill">Scarlett Poker VR — boot</span> <span id="status" class="pill warn">loading…</span>

If something fails, the real error will show below.

<button id="reload">Reload + CacheBust</button>

<span id="log"></span>
  </div>

  <script>
    const logEl = document.getElementById('log');
    const statusEl = document.getElementById('status');
    const reloadBtn = document.getElementById('reload');

    function log(msg){ logEl.textContent += "\n" + msg; }
    function setStatus(text, cls){ statusEl.textContent = text; statusEl.className = "pill " + cls; }

    reloadBtn.onclick = () => {
      const u = new URL(location.href);
      u.searchParams.set("v", String(Date.now()));
      location.href = u.toString();
    };

    window.addEventListener("error", (e) => {
      setStatus("ERROR", "bad");
      log("❌ " + (e.message || "error"));
      if (e.filename) log("   at " + e.filename + ":" + e.lineno);
    });

    window.addEventListener("unhandledrejection", (e) => {
      setStatus("ERROR", "bad");
      log("❌ Promise rejection: " + (e.reason?.message || e.reason || "unknown"));
    });
  </script>

  <!-- ✅ Oculus-safe: NO dynamic import. Direct module load. -->
  <script type="module">
    const statusEl = document.getElementById('status');
    const logEl = document.getElementById('log');
    const log = (m)=> logEl.textContent += "\n" + m;
    const setStatus = (t,c)=>{ statusEl.textContent=t; statusEl.className="pill "+c; };

    setStatus("main.js loading…", "warn");
    log("▶ Loading ./js/main.js (static module)…");

    import "./js/main.js"
      .then(()=>{ setStatus("OK", "ok"); log("✅ main.js loaded"); })
      .catch((err)=>{ setStatus("ERROR", "bad"); log("❌ main.js failed: " + (err?.message || err)); });
  </script>
</body>
</html>
