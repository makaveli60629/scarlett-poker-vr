/* SCARLETTVR Demo v10 FIX
   Goal: Never black-screen even if controllers/video fail.
   - Always-visible lights + world primitives in HTML (no dependency on JS build).
   - Safe VR enter button (fallback to A-Frame enterVR).
   - Robust diagnostics logger (DOM + 3D text).
   - Teleport works with controllers; on mobile it won't break anything.
*/
(function () {
  const $ = (sel) => document.querySelector(sel);
  const hudLog = $("#log");
  const hudStatus = $("#status");
  const diag3d = $("#diagText3d");
  const scene = $("#scene");
  const rig = $("#rig");
  const tpRing = $("#tpRing");
  const screenText = $("#screenText");

  let diagVisible = true;
  let lastHit = null;

  function log(msg) {
    const line = `[${(performance.now()/1000).toFixed(3)}] ${msg}`;
    if (hudLog) hudLog.textContent = (hudLog.textContent ? (hudLog.textContent + "\n") : "") + line;
    if (diag3d) diag3d.setAttribute("value", line);
    // keep last 80 lines
    if (hudLog) {
      const lines = hudLog.textContent.split("\n");
      if (lines.length > 80) hudLog.textContent = lines.slice(-80).join("\n");
      hudLog.scrollTop = hudLog.scrollHeight;
    }
  }

  function setStatus(s) {
    if (hudStatus) hudStatus.textContent = s;
  }

  function safe(fn) {
    try { fn(); } catch (e) {
      log(`ERROR: ${e && e.message ? e.message : e}`);
      console.error(e);
    }
  }

  // Global error hooks
  window.addEventListener("error", (e) => {
    log(`window.error: ${e.message || e}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    log(`promise: ${e.reason && e.reason.message ? e.reason.message : e.reason}`);
  });

  function updateDiag() {
    const ua = navigator.userAgent || "";
    const xr = !!navigator.xr;
    const secure = window.isSecureContext;
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
    setStatus(`secure=${secure} xr=${xr} touch=${touch}`);
  }

  function enterVR() {
    safe(() => {
      if (!scene) return;
      // If A-Frame supports enterVR, use it.
      if (scene.enterVR) {
        scene.enterVR();
        log("enterVR() called");
        return;
      }
      // Fallback: enable xr-mode-ui and let user tap native button if present.
      scene.setAttribute("xr-mode-ui", "enabled: true");
      log("enterVR() not available; enabled xr-mode-ui");
    });
  }

  function reset() {
    safe(() => {
      rig.object3D.position.set(0, 0, 4);
      rig.object3D.rotation.set(0, 0, 0);
      log("reset rig");
    });
  }

  // UI wiring
  $("#btnEnter")?.addEventListener("click", enterVR);
  $("#btnReset")?.addEventListener("click", reset);
  $("#btnDiag")?.addEventListener("click", () => {
    diagVisible = !diagVisible;
    const hud = $("#hud");
    if (hud) hud.style.display = diagVisible ? "block" : "none";
  });

  // A-Frame components
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
        }
      };
      this.el.addEventListener("triggerdown", emitClick);

      // Teleport aiming (show ring)
      const onIntersection = (evt) => {
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
      el.setAttribute("geometry", "primitive: plane; width: 0.95; height: 0.42;");
      el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");
      el.setAttribute("text", `value: ${this.data.label}; align: center; color: #e8f1ff; width: 2.6;`);

      const border = document.createElement("a-plane");
      border.setAttribute("width", "1.00");
      border.setAttribute("height", "0.47");
      border.setAttribute("position", "0 0 -0.01");
      border.setAttribute("material", "color:#0a0f16; opacity:0.9");
      el.appendChild(border);

      const hoverOn = () => el.setAttribute("material", "color:#24405a; roughness:1; metalness:0; opacity:0.98");
      const hoverOff = () => el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");

      el.addEventListener("mouseenter", hoverOn);
      el.addEventListener("mouseleave", hoverOff);

      const fire = () => {
        el.emit("scarlett-action", { action: this.data.action });
      };
      el.addEventListener("ui-click", fire);
      el.addEventListener("click", fire); // mobile/mouse
    }
  });

  // Scene-level actions (no video yet; this updates the screen text so you know it's working)
  function handleAction(action) {
    const map = {
      load: "LOAD pressed ✅",
      play: "PLAY pressed ✅",
      pause: "PAUSE pressed ✅",
      next: "NEXT pressed ✅"
    };
    const msg = map[action] || `action=${action}`;
    if (screenText) screenText.setAttribute("value", msg);
    log(msg);
  }

  safe(() => {
    scene.addEventListener("loaded", () => {
      log("scene loaded ✅");
      updateDiag();
    });

    // Listen for actions from any button
    scene.addEventListener("scarlett-action", (evt) => {
      const action = evt.detail && evt.detail.action;
      handleAction(action);
    });

    // Kick a first log line so you can tell JS executed
    log("boot.js running ✅");
    updateDiag();
    setInterval(updateDiag, 800);
  });
})();