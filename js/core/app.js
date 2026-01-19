/* SCARLETT VR Poker Demo v9
   - Laser pointer UI buttons under Jumbotron
   - Simple teleport (point at floor ring, trigger)
   - Diagnostics HUD
*/
(function () {
  const PLAYLIST = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/beer.mp4"
  ];

  function now() { return (performance.now() / 1000).toFixed(3); }

  function safeText(s) { return String(s ?? "").replace(/[^\x20-\x7E]/g, ""); }

  AFRAME.registerComponent("rig-locomotion", {
    init: function () {
      this.rig = this.el;
      this.scene = this.el.sceneEl;
      this.tpRing = null;
      this.lastHit = null;

      const scene = this.scene;
      const tpRing = scene.querySelector("#tpRing");
      this.tpRing = tpRing;

      // track raycaster intersections to show teleport ring
      const onIntersection = (evt) => {
        const detail = evt.detail;
        if (!detail || !detail.intersections || !detail.intersections.length) return;
        const hit = detail.intersections[0];
        if (!hit || !hit.object || !hit.point) return;

        // Only show ring when aiming at teleportable surface (the floor has class teleportable)
        const hitEl = hit.object.el;
        if (hitEl && hitEl.classList && hitEl.classList.contains("teleportable")) {
          this.lastHit = hit;
          tpRing.object3D.position.copy(hit.point);
          tpRing.setAttribute("visible", true);
        }
      };

      const onIntersectionCleared = () => {
        this.lastHit = null;
        tpRing.setAttribute("visible", false);
      };

      // Listen from both controllers (if present)
      const left = scene.querySelector("#leftHand");
      const right = scene.querySelector("#rightHand");

      [left, right].forEach(hand => {
        if (!hand) return;
        hand.addEventListener("raycaster-intersection", onIntersection);
        hand.addEventListener("raycaster-intersection-cleared", onIntersectionCleared);

        // Trigger: teleport if pointing at floor, otherwise handled by controller-ui for buttons.
        hand.addEventListener("triggerdown", () => {
          if (!this.lastHit) return;
          const hitEl = this.lastHit.object.el;
          if (!(hitEl && hitEl.classList && hitEl.classList.contains("teleportable"))) return;

          // Keep camera height consistent (standing): move rig XZ to target, keep Y at 0.
          const p = this.lastHit.point;
          this.rig.object3D.position.set(p.x, 0, p.z);
        });
      });
    }
  });

  AFRAME.registerComponent("controller-ui", {
    init: function () {
      // On trigger, if raycaster is hitting a clickable entity, emit "ui-click" to that entity.
      this.raycaster = this.el.components.raycaster;
      this.el.addEventListener("triggerdown", () => {
        if (!this.raycaster) return;
        const hits = this.raycaster.intersections;
        if (!hits || !hits.length) return;
        const hit = hits[0];
        const hitEl = hit.object && hit.object.el;
        if (hitEl && hitEl.classList && hitEl.classList.contains("clickable")) {
          hitEl.emit("ui-click");
        }
      });

      // Mobile/touch fallback: click on canvas emits cursor events; A-Frame handles click.
      // Buttons also listen for regular "click".
    }
  });

  AFRAME.registerComponent("ui-button", {
    schema: {
      label: { type: "string", default: "BUTTON" },
      action: { type: "string", default: "noop" }
    },
    init: function () {
      const el = this.el;
      el.classList.add("clickable");

      // Base
      el.setAttribute("geometry", "primitive: plane; width: 0.95; height: 0.42;");
      el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");
      el.setAttribute("text", `value: ${this.data.label}; align: center; color: #e8f1ff; width: 2.6;`);

      // Subtle border behind (shadow plate)
      const border = document.createElement("a-plane");
      border.setAttribute("width", "1.00");
      border.setAttribute("height", "0.47");
      border.setAttribute("position", "0 0 -0.01");
      border.setAttribute("material", "color:#0a0f16; opacity:0.9");
      el.appendChild(border);

      const onHover = () => el.setAttribute("material", "color:#24405a; roughness:1; metalness:0; opacity:0.98");
      const onOut = () => el.setAttribute("material", "color:#1b2a3a; roughness:1; metalness:0; opacity:0.98");

      el.addEventListener("mouseenter", onHover);
      el.addEventListener("mouseleave", onOut);

      const fire = () => {
        el.emit("scarlett-action", { action: this.data.action });
      };

      el.addEventListener("ui-click", fire);
      el.addEventListener("click", fire); // touch/mouse fallback
    }
  });

  AFRAME.registerComponent("screen-player", {
    init: function () {
      this.video = document.querySelector("#screenVideo");
      this.idx = 0;

      const scene = this.el.sceneEl;
      scene.addEventListener("loaded", () => {
        // try to prime video (autoplay policies may prevent play until user gesture)
        this.video.muted = true;
        this.video.loop = false;
        this.video.playsInline = true;
      });

      // Listen for actions from buttons
      scene.addEventListener("scarlett-action", (evt) => {
        const action = evt.detail && evt.detail.action;
        this.handle(action);
      });
    },
    handle: function (action) {
      const v = this.video;
      if (!v) return;
      if (action === "load") {
        this.idx = this.idx % PLAYLIST.length;
        v.src = PLAYLIST[this.idx];
        v.load();
      } else if (action === "play") {
        // ensure gesture: user pressed trigger/click so this should be allowed
        v.muted = false;
        v.play().catch(() => {
          // fallback: keep muted
          v.muted = true;
          v.play().catch(()=>{});
        });
      } else if (action === "pause") {
        v.pause();
      } else if (action === "next") {
        this.idx = (this.idx + 1) % PLAYLIST.length;
        v.src = PLAYLIST[this.idx];
        v.load();
        v.play().catch(()=>{});
      }
    }
  });

  AFRAME.registerComponent("diagnostics-hud", {
    init: function () {
      const el = this.el;
      el.setAttribute("visible", true);

      const plate = document.createElement("a-plane");
      plate.setAttribute("width", "1.2");
      plate.setAttribute("height", "0.55");
      plate.setAttribute("material", "color:#000; opacity:0.65");
      el.appendChild(plate);

      const txt = document.createElement("a-text");
      txt.setAttribute("id", "diagText");
      txt.setAttribute("position", "0 0 0.01");
      txt.setAttribute("align", "center");
      txt.setAttribute("color", "#b6f7ff");
      txt.setAttribute("width", "1.5");
      txt.setAttribute("value", "booting…");
      el.appendChild(txt);

      const scene = el.sceneEl;
      const update = () => {
        const ua = navigator.userAgent || "";
        const xr = !!navigator.xr;
        const secure = window.isSecureContext;
        const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
        const time = now();

        let sessionState = "none";
        const xrSys = scene && scene.renderer && scene.renderer.xr;
        const sess = xrSys && xrSys.getSession ? xrSys.getSession() : null;
        if (sess) sessionState = sess.visibilityState || "active";

        const lines = [
          `SCARLETT DIAGNOSTICS`,
          `[${time}] secure=${secure} xr=${xr} touch=${touch}`,
          `ua=${safeText(ua).slice(0, 44)}${ua.length>44?"…":""}`,
          `session=${sessionState}`
        ];
        txt.setAttribute("value", lines.join("\n"));
      };

      this._interval = setInterval(update, 350);
      update();

      el.addEventListener("removed", () => clearInterval(this._interval));
    }
  });

})();