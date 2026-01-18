<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="color-scheme" content="dark light" />
  <title>SCARLETT • Poker VR</title>
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    #app { position:fixed; inset:0; }
    canvas { display:block; width:100%; height:100%; }

    /* HUD */
    #hud {
      position:fixed; top:10px; left:10px;
      display:flex; flex-direction:column; gap:8px;
      z-index:9999; pointer-events:auto;
    }
    .hudRow { display:flex; gap:8px; flex-wrap:wrap; }
    .hudBtn {
      appearance:none; border:0; border-radius:10px;
      padding:10px 12px; font-weight:700;
      background:rgba(20,20,20,0.75); color:#fff;
      backdrop-filter: blur(8px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.35);
      cursor:pointer;
    }
    .hudBtn:active { transform: translateY(1px); }
    .hudBtn[data-on="1"] { outline:2px solid rgba(0,255,255,0.65); }

    #diagPanel {
      position:fixed; left:10px; bottom:10px;
      width:min(560px, calc(100% - 20px));
      max-height:40vh;
      background:rgba(0,0,0,0.72);
      border:1px solid rgba(255,255,255,0.15);
      border-radius:12px;
      padding:10px;
      overflow:auto;
      display:none;
      z-index:9999;
      pointer-events:auto;
    }
    #diagTitle { font-weight:800; margin-bottom:8px; }
    #diagText { white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; line-height:1.35; opacity:0.95; }
    #hint {
      position:fixed; right:10px; top:10px;
      background:rgba(0,0,0,0.55);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:12px;
      padding:10px 12px;
      color:#fff;
      z-index:9999;
      pointer-events:none;
      max-width: min(360px, calc(100% - 20px));
      font-weight:650;
      opacity:0.9;
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <div id="hud">
    <div class="hudRow">
      <button id="btnEnterVR" class="hudBtn">Enter VR</button>
      <button id="btnTeleport" class="hudBtn" data-on="0">Teleport: OFF</button>
      <button id="btnReset" class="hudBtn">Reset to Spawn</button>
      <button id="btnHideHUD" class="hudBtn">Hide HUD</button>
      <button id="btnDiag" class="hudBtn">Diagnostics</button>
    </div>
  </div>

  <div id="diagPanel">
    <div id="diagTitle">SCARLETT DIAGNOSTICS</div>
    <div id="diagText"></div>
  </div>

  <div id="hint">Touch-drag to look • Two-finger drag to move • WASD on desktop</div>

  <script type="module" src="./js/scarlett1/index.js"></script>
</body>
</html>
