/* v12
   Adds:
   - In-world jumbotron buttons (laser-friendly) + keeps HUD buttons
   - Seat snapping: click a chair to sit; click RESET to stand back at spawn
   Notes:
   - xr=false on Android is normal if browser/device doesn't expose WebXR. Quest should show xr=true.
*/
(function () {
  const $ = (sel) => document.querySelector(sel);
  const panel = $("#panel");
  const logEl = $("#log");
  const statusEl = $("#status");
  const diag3d = $("#diagText3d");

  const scene = $("#scene");
  const rig = $("#rig");
  const tpRing = $("#tpRing");
  const screenText = $("#screenText");
  const video = $("#screenVideo");

  const PLAYLIST = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/beer.mp4"
  ];
  let idx = 0;

  let diagOpen = false;
  let teleportEnabled = true;
  let lastHit = null;

  const STAND_SPAWN = { x: 0, y: 0, z: 6 };
  const STAND_EYE = 1.65;
  const SIT_EYE = 1.15; // seated camera height

  function t() { return (performance.now()/1000).toFixed(3); }

  function log(msg) {
    const line = `[${t()}] ${msg}`;
    if (logEl) {
      logEl.textContent = (logEl.textContent ? (logEl.textContent + "\n") : "") + line;
      const lines = logEl.textContent.split("\n");
      if (lines.length > 140) logEl.textContent = lines.slice(-140).join("\n");
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

  function setEyeHeight(h) {
    const cam = $("#cam");
    if (!cam) return;
    cam.setAttribute("position", `0 ${h} 0`);
  }

  function standReset() {
    rig.object3D.position.set(STAND_SPAWN.x, STAND_SPAWN.y, STAND_SPAWN.z);
    rig.object3D.rotation.set(0, 0, 0);
    setEyeHeight(STAND_EYE);
    log("stand reset");
  }

  // Jumbotron controls
  function screenMsg(m) {
    if (screenText) screenText.setAttribute("value", m);
  }

  function loadVideo(i) {
    idx = (i ?? idx) % PLAYLIST.length;
    const url = PLAYLIST[idx];
    try { video.pause(); } catch {}
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;
    video.src = url;
    video.load();
    screenMsg(`LOADED ${idx+1}/${PLAYLIST.length}`);
    log(`video load ${url}`);
  }

  async function playVideo() {
    if (!video.src) loadVideo(idx);
    try {
      video.muted = false;
      await video.play();
      screenMsg("PLAYING ✅");
      log("video playing");
    } catch (e) {
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

  // Components
  AFRAME.registerComponent("rig-locomotion", {
    init: function () {
      const floor = $("#floor");
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      const onPointer = (clientX, clientY) => {
        if (!teleportEnabled) return;
        if (!floor) return;
        const rect = scene.canvas?.getBoundingClientRect?.();
        if (!rect) return;
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        const camera3 = scene.camera;
        if (!camera3) return;
        raycaster.setFromCamera(ndc, camera3);
        const hits = raycaster.intersectObject(floor.object3D, true);
        if (hits && hits.length) {
          const p = hits[0].point;
          rig.object3D.position.set(p.x, 0, p.z);
          log(`tap teleport -> ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
        }
      };

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
        const hitEl = hits[0].object && hits[0].object.el;
        if (hitEl && hitEl.classList && hitEl.classList.contains("clickable")) {
          hitEl.emit("ui-click");
        }
      };
      this.el.addEventListener("triggerdown", emitClick);

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

  AFRAME.registerComponent("ui-button", {
    schema: { label: {type:"string"}, action: {type:"string"} },
    init: function () {
      const el = this.el;
      el.classList.add("clickable");
      el.setAttribute("geometry", "primitive: plane; width: 1.35; height: 0.5;");
      el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");
      el.setAttribute("text", `value: ${this.data.label}; align: center; color: #e8f1ff; width: 3.0;`);

      const border = document.createElement("a-plane");
      border.setAttribute("width", "1.42");
      border.setAttribute("height", "0.58");
      border.setAttribute("position", "0 0 -0.01");
      border.setAttribute("material", "color:#0a0f16; opacity:0.9");
      el.appendChild(border);

      const hoverOn = () => el.setAttribute("material", "color:#24405a; roughness:1; metalness:0; opacity:0.98");
      const hoverOff = () => el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");
      el.addEventListener("mouseenter", hoverOn);
      el.addEventListener("mouseleave", hoverOff);

      const fire = () => el.emit("scarlett-action", { action: this.data.action });
      el.addEventListener("ui-click", noteUserGesture(fire));
      el.addEventListener("click", noteUserGesture(fire));
    }
  });

  // Chairs + bots
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

  AFRAME.registerComponent("seat-spot", {
    init: function () {
      // Clicking a chair snaps you to that seat and lowers camera height.
      this.el.addEventListener("ui-click", noteUserGesture(() => {
        const p = this.el.object3D.getWorldPosition(new THREE.Vector3());
        // Push slightly back so you're "in" the chair and facing table
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.el.object3D.getWorldQuaternion(new THREE.Quaternion()));
        const seatPos = p.clone().add(forward.multiplyScalar(0.18));
        rig.object3D.position.set(seatPos.x, 0, seatPos.z);
        setEyeHeight(SIT_EYE);
        log(`sit -> ${seatPos.x.toFixed(2)}, ${seatPos.z.toFixed(2)}`);
      }));
      this.el.addEventListener("click", noteUserGesture(() => this.el.emit("ui-click")));
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

  // Guarantee a user gesture flag for video play (mobile policies)
  let hadGesture = false;
  function noteUserGesture(fn) {
    return () => {
      hadGesture = true;
      fn();
    };
  }

  // Wire HUD buttons
  $("#btnEnter")?.addEventListener("click", noteUserGesture(enterVR));
  $("#btnDiag")?.addEventListener("click", noteUserGesture(() => openDiag()));
  $("#btnReset")?.addEventListener("click", noteUserGesture(standReset));
  $("#btnTeleport")?.addEventListener("click", noteUserGesture(() => setTeleport(!teleportEnabled)));

  $("#btnLoad")?.addEventListener("click", noteUserGesture(() => loadVideo(idx)));
  $("#btnPlay")?.addEventListener("click", noteUserGesture(() => playVideo()));
  $("#btnPause")?.addEventListener("click", noteUserGesture(() => pauseVideo()));
  $("#btnNext")?.addEventListener("click", noteUserGesture(() => nextVideo()));

  // In-world button events
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
    loadVideo(0);
    screenMsg("JUMBOTRON READY (press PLAY)");
  });

})();