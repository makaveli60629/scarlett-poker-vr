// /js/VRButton.js — Scarlett VRButton v1.3 (FULL)
// Logs session start/end and errors so Quest debugging is obvious.
// Always returns the actual <button>.

export const VRButton = {
  createButton(renderer, sessionInit = null) {
    const button = document.createElement("button");
    button.textContent = "ENTER VR";
    button.setAttribute("data-scarlett-vrbutton", "1");

    button.style.cssText = `
      position:relative;
      padding:10px 14px;
      border-radius:14px;
      border:1px solid rgba(127,231,255,.35);
      background:rgba(127,231,255,.14);
      color:#e8ecff;
      font-weight:800;
      letter-spacing:.3px;
      cursor:pointer;
      user-select:none;
      -webkit-user-select:none;
    `;

    let currentSession = null;

    const show = (t, enabled = true) => {
      button.textContent = t;
      button.disabled = !enabled;
      button.style.opacity = enabled ? "1" : "0.55";
      button.style.cursor = enabled ? "pointer" : "default";
    };

    async function isSupported() {
      try {
        if (!navigator.xr) return false;
        const ok = await navigator.xr.isSessionSupported("immersive-vr");
        console.log("[VRButton] isSessionSupported(immersive-vr) =", ok);
        return ok;
      } catch (e) {
        console.error("[VRButton] isSessionSupported error", e);
        return false;
      }
    }

    async function start() {
      if (!navigator.xr) {
        console.error("[VRButton] navigator.xr missing");
        return;
      }

      const init =
        sessionInit ||
        window.__XR_SESSION_INIT ||
        window.__SESSION_INIT__ || {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
          domOverlay: { root: document.body },
        };

      try {
        console.log("[VRButton] requestSession(immersive-vr) init =", init);
        show("STARTING…", false);

        const session = await navigator.xr.requestSession("immersive-vr", init);
        currentSession = session;

        console.log("[VRButton] session started ✅");
        await renderer.xr.setSession(session);
        console.log("[VRButton] renderer.xr.setSession ✅");

        session.addEventListener("end", () => {
          console.log("[VRButton] session ended");
          currentSession = null;
          show("ENTER VR", true);
        });

        show("EXIT VR", true);
      } catch (e) {
        console.error("[VRButton] requestSession failed", e);
        show("VR FAILED", true);
        setTimeout(() => show("ENTER VR", true), 1200);
      }
    }

    async function end() {
      try {
        console.log("[VRButton] ending session…");
        show("ENDING…", false);
        await currentSession.end();
      } catch (e) {
        console.error("[VRButton] end failed", e);
      } finally {
        currentSession = null;
        show("ENTER VR", true);
      }
    }

    button.addEventListener("click", async () => {
      console.log("[VRButton] clicked");
      if (currentSession) await end();
      else await start();
    });

    // mount into slot if present
    queueMicrotask(() => {
      const slot = document.getElementById("vrButtonSlot");
      if (slot && !slot.contains(button)) slot.appendChild(button);
    });

    (async () => {
      const ok = await isSupported();
      if (ok) show("ENTER VR", true);
      else show("VR NOT SUPPORTED", false);
    })();

    return button;
  },
};
