/* SCARLETTVR Demo v11
   - Full lobby shell (floor, walls, neon, table, chairs, bot placeholders)
   - Working Diagnostics button (opens panel)
   - Working Jumbotron playback with a safe playlist (and text fallback)
   - Teleport: Quest controllers trigger; Android tap floor to teleport
*/
(function () {
  const $ = (sel) => document.querySelector(sel);
  const hud = $("#hud");
  const panel = $("#panel");
  const logEl = $("#log");
  const statusEl = $("#status");
  const diag3d = $("#diagText3d");

  const scene = $("#scene");
  const rig = $("#rig");
  const tpRing = $("#tpRing");
  const screenText = $("#screenText");
  const video = $("#screenVideo");

  // Playlist: keep it simple, public, and CORS-friendly (may still be blocked by some browsers)
  const PLAYLIST = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/beer.mp4"
  ];
  let idx = 0;

  let diagOpen = false;
  let teleportEnabled = true;
  let lastHit = null;

  function t() { return (performance.now()/1000).toFixed(3); }

  function log(msg) {
    const line = `[${t()}] ${msg}`;
    if (logEl) {
      logEl.textContent = (logEl.textContent ? (logEl.textContent + "\n") : "") + line;
      const lines = logEl.textContent.split("\n");
      if (lines.length > 120) logEl.textContent = lines.slice(-120).join("\n");
      logEl.scrollTop = logEl.scrollHeight;
    }
    if (diag3d) diag3d.setAttribute("value", msg);
    console.log(line);
  }

  function setStatus(s) { if (statusEl) statusEl.textContent = s; }

  function updateStatus() {
    const xr = !!navigator.xr;
    const secure = window.isSecureContext;
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
    const sess = scene && scene.renderer && scene.renderer.xr && scene.renderer.xr.getSession
      ? scene.renderer.xr.getSession() : null;
    const sessionState = sess ? (sess.visibilityState || "active") : "none";
    setStatus(`secure=${secure} xr=${xr} touch=${touch} session=${sessionState}`);
  }

  // Global error hooks
  window.addEventListener("error", (e) => log(`window.error: ${e.message || e}`));
  window.addEventListener("unhandledrejection", (e) => log(`promise: ${e.reason?.message || e.reason}`));

  function openDiag(open) {
    diagOpen = open ?? !diagOpen;
    if (panel) panel.style.display = diagOpen ? "block" : "none";
    log(`diag ${diagOpen ? "OPEN" : "CLOSED"}`);
  }

  function enterVR() {
    if (!scene) return;
    if (scene.enterVR) {
      scene.enterVR();
      log("enterVR() called");
    } else {
      scene.setAttribute("xr-mode-ui", "enabled: true");
      log("enterVR() not available; enabled xr-mode-ui");
    }
  }

  function resetRig() {
    rig.object3D.position.set(0, 0, 6);
    rig.object3D.rotation.set(0, 0, 0);
    log("reset rig");
  }

  function setTeleport(on) {
    teleportEnabled = !!on;
    const btn = $("#btnTeleport");
    if (btn) btn.textContent = `TELEPORT: ${teleportEnabled ? "ON" : "OFF"}`;
    log(`teleport ${teleportEnabled ? "ON" : "OFF"}`);
    if (!teleportEnabled) {
      lastHit = null;
      tpRing?.setAttribute("visible", false);
    }
  }

  // Jumbotron controls (video)
  function screenMsg(m) {
    if (screenText) screenText.setAttribute("value", m);
  }

  function loadVideo(i) {
    idx = (i ?? idx) % PLAYLIST.length;
    const url = PLAYLIST[idx];
    try {
      video.pause();
    } catch {}
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true; // start muted to satisfy autoplay policies
    video.src = url;
    video.load();
    screenMsg(`LOADED ${idx+1}/${PLAYLIST.length}`);
    log(`video load ${url}`);
  }

  async function playVideo() {
    if (!video.src) loadVideo(idx);
    try {
      video.muted = false; // user gesture should allow audio, but fallback if blocked
      await video.play();
      screenMsg("PLAYING ✅");
      log("video playing");
    } catch (e) {
      // fallback: muted play
      log(`video play blocked: ${e?.message || e}`);
      try {
        video.muted = true;
        await video.play();
        screenMsg("PLAYING (muted) ✅");
        log("video playing muted");
      } catch (e2) {
        screenMsg("VIDEO BLOCKED ❌");
        log(`video failed: ${e2?.message || e2}`);
      }
    }
  }

  function pauseVideo() {
    try { video.pause(); } catch {}
    screenMsg("PAUSED ⏸");
    log("video paused");
  }

  function nextVideo() {
    idx = (idx + 1) % PLAYLIST.length;
    loadVideo(idx);
    playVideo();
  }

  // A-Frame components
  AFRAME.registerComponent("rig-locomotion", {
    init: function () {
      // Tap-to-teleport on mobile: use scene click, raycast from camera
      const cam = $("#cam");
      const floor = $("#floor");

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      const onPointer = (clientX, clientY) => {
        if (!teleportEnabled) return;
        if (!cam || !floor) return;
        // ignore clicks on HUD
        // (HUD is in DOM; if pointer is on HUD, event won't reach canvas in most browsers)
        const rect = scene.canvas?.getBoundingClientRect?.();
        if (!rect) return;
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        const camera3 = scene.camera;
        raycaster.setFromCamera(ndc, camera3);
        const floorObj = floor.object3D;
        const hits = raycaster.intersectObject(floorObj, true);
        if (hits && hits.length) {
          const p = hits[0].point;
          rig.object3D.position.set(p.x, 0, p.z);
          log(`tap teleport -> ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
        }
      };

      // canvas events
      scene.addEventListener("renderstart", () => {
        if (!scene.canvas) return;
        scene.canvas.addEventListener("pointerup", (e) => onPointer(e.clientX, e.clientY), { passive: true });
      });
    }
  });

  AFRAME.registerComponent("controller-ui", {
    init: function () {
      const ray = this.el.components.raycaster;
      const emitClick = () => {
        const hits = ray && ray.intersections;
        if (!hits || !hits.length) return;
        const hit = hits[0];
        const hitEl = hit.object && hit.object.el;
        if (hitEl && hitEl.classList && hitEl.classList.contains("clickable")) {
          hitEl.emit("ui-click");
          return;
        }
      };
      this.el.addEventListener("triggerdown", emitClick);

      // Teleport aim
      const onIntersection = (evt) => {
        if (!teleportEnabled) return;
        const isects = evt.detail && evt.detail.intersections;
        if (!isects || !isects.length) return;
        const hit = isects[0];
        const hitEl = hit.object && hit.object.el;
        if (hitEl && hitEl.classList && hitEl.classList.contains("teleportable")) {
          lastHit = hit;
          tpRing.object3D.position.copy(hit.point);
          tpRing.setAttribute("visible", true);
        }
      };
      const onCleared = () => {
        lastHit = null;
        tpRing.setAttribute("visible", false);
      };
      this.el.addEventListener("raycaster-intersection", onIntersection);
      this.el.addEventListener("raycaster-intersection-cleared", onCleared);

      // Teleport action
      this.el.addEventListener("triggerup", () => {
        if (!teleportEnabled) return;
        if (!lastHit) return;
        const hitEl = lastHit.object && lastHit.object.el;
        if (!(hitEl && hitEl.classList && hitEl.classList.contains("teleportable"))) return;
        const p = lastHit.point;
        rig.object3D.position.set(p.x, 0, p.z);
        log(`teleport -> ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
      });
    }
  });

  AFRAME.registerComponent("chair", {
    init: function () {
      const root = this.el;
      const seat = document.createElement("a-box");
      seat.setAttribute("width", "0.55");
      seat.setAttribute("height", "0.08");
      seat.setAttribute("depth", "0.55");
      seat.setAttribute("position", "0 0.42 0");
      seat.setAttribute("material", "color:#1a1a1a; roughness:1");
      root.appendChild(seat);

      const back = document.createElement("a-box");
      back.setAttribute("width", "0.55");
      back.setAttribute("height", "0.5");
      back.setAttribute("depth", "0.08");
      back.setAttribute("position", "0 0.67 -0.235");
      back.setAttribute("material", "color:#141414; roughness:1");
      root.appendChild(back);

      const leg = document.createElement("a-cylinder");
      leg.setAttribute("radius", "0.04");
      leg.setAttribute("height", "0.42");
      leg.setAttribute("position", "0 0.21 0");
      leg.setAttribute("material", "color:#2b2b2b; roughness:1");
      root.appendChild(leg);
    }
  });

  AFRAME.registerComponent("bot", {
    schema: { name: { type: "string", default: "BOT" } },
    init: function () {
      const root = this.el;

      const body = document.createElement("a-cylinder");
      body.setAttribute("radius", "0.16");
      body.setAttribute("height", "1.35");
      body.setAttribute("position", "0 0.68 0");
      body.setAttribute("material", "color:#223245; roughness:1; metalness:0");
      root.appendChild(body);

      const head = document.createElement("a-sphere");
      head.setAttribute("radius", "0.18");
      head.setAttribute("position", "0 1.46 0");
      head.setAttribute("material", "color:#101820; roughness:1; metalness:0");
      root.appendChild(head);

      const tag = document.createElement("a-text");
      tag.setAttribute("value", this.data.name);
      tag.setAttribute("position", "0 1.75 0");
      tag.setAttribute("align", "center");
      tag.setAttribute("width", "3");
      tag.setAttribute("color", "#dfefff");
      root.appendChild(tag);
    }
  });

  // Wire DOM buttons (reliable on Android)
  $("#btnEnter")?.addEventListener("click", () => { enterVR(); });
  $("#btnDiag")?.addEventListener("click", () => { openDiag(); });
  $("#btnReset")?.addEventListener("click", () => { resetRig(); });
  $("#btnTeleport")?.addEventListener("click", () => { setTeleport(!teleportEnabled); });

  $("#btnLoad")?.addEventListener("click", () => { loadVideo(idx); });
  $("#btnPlay")?.addEventListener("click", () => { playVideo(); });
  $("#btnPause")?.addEventListener("click", () => { pauseVideo(); });
  $("#btnNext")?.addEventListener("click", () => { nextVideo(); });

  // Also allow in-world laser buttons later (events)
  scene.addEventListener("scarlett-action", (evt) => {
    const action = evt.detail && evt.detail.action;
    if (action === "load") loadVideo(idx);
    if (action === "play") playVideo();
    if (action === "pause") pauseVideo();
    if (action === "next") nextVideo();
  });

  // Boot
  log("app.js running ✅");
  scene.addEventListener("loaded", () => {
    log("scene loaded ✅");
    updateStatus();
    setInterval(updateStatus, 900);
    // Prime video with first load (no play yet)
    loadVideo(0);
    screenMsg("JUMBOTRON READY (press PLAY)");
  });

})();