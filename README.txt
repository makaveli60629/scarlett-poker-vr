SCARLETT VR — MASTER v7 (Android Controls + Apparel Store + Demo Bots)

WHAT THIS ZIP IS:
- A complete, working starter project you can upload to GitHub Pages.
- Android touch controls (joystick + look + ACT/MENU buttons).
- Your Update 4.0 Apparel module integrated (Store UI + emissive pulse).
- A lightweight demo "bots playing" loop at the poker pad (no gambling; just a visual demo loop).

FOLDER LAYOUT:
- index.html
- boot.js
- /js/*.js
- /assets/textures/*.png  (placeholder textures included)

HOW TO INSTALL (GitHub Pages):
1) Unzip.
2) Upload EVERYTHING to your repo root (same level as index.html).
3) Your repo name is scarlett-poker-vr, so your URL is:
   https://<user>.github.io/scarlett-poker-vr/
4) Hard refresh (Quest: menu -> reload; Android: refresh).

CONTROLS:
- QUEST: Enter VR -> use controller rays; press trigger on teleport pads to jump rooms.
- ANDROID: 
  - Left joystick = move
  - Right side drag = look
  - ACT = toggles store UI (and fires scarlett_action event)
  - MENU = toggles store UI (fires scarlett_menu event)
- Desktop:
  - M toggles store UI
  - 1/2/3 quick-jump rooms (lobby/poker/store)

NEXT:
If you want REAL poker logic (hands, betting, turns) we’ll replace js/bots.js with a real poker state machine.
