// /js/VRButton.js — Scarlett VRButton (FULL, Quest-safe)
// Always creates a visible button with id="VRButton".
// Works on GitHub Pages + Meta Quest Browser.

export const VRButton = {

  createButton(renderer, sessionInit = {}) {
    const button = document.createElement("button");
    button.id = "VRButton";
    button.type = "button";
    button.textContent = "ENTER VR";

    // Hard visible styling (prevents hidden/offscreen issues)
    button.style.cssText = `
      position: fixed;
      right: 12px;
      bottom: 12px;
      padding: 12px 14px;
      border: 1px solid rgba(127,231,255,.45);
      border-radius: 14px;
      background: rgba(11,13,20,.88);
      color: #e8ecff;
      font: 700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
      letter-spacing: .3px;
      box-shadow: 0 14px 45px rgba(0,0,0,.55);
      z-index: 99999;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    `;

    let currentSession = null;

    async function onSessionStarted(session) {
      session.addEventListener("end", onSessionEnded);
      await renderer.xr.setSession(session);
      currentSession = session;
      button.textContent = "EXIT VR";
      console.log("[VRButton] session started ✅");
    }

    function onSessionEnded() {
      currentSession = null;
      button.textContent = "ENTER VR";
      console.log("[VRButton] session ended ✅");
    }

    async function isSupported() {
      try {
        if (!navigator.xr) return false;
        return await navigator.xr.isSessionSupported("immersive-vr");
      } catch (e) {
        console.warn("[VRButton] isSessionSupported error:", e);
        return false;
      }
    }

    button.onclick = async () => {
      try {
        if (!navigator.xr) {
          alert("WebXR not available in this browser.");
          return;
        }

        if (currentSession === null) {
          // Default safe features for Quest
          const init = {
            optionalFeatures: [
              "local-floor",
              "bounded-floor",
              "hand-tracking",
              "layers",
              "dom-overlay"
            ],
            ...sessionInit
          };

          // If domOverlay is present, ensure it points to document.body
          if (init.optionalFeatures?.includes("dom-overlay")) {
            init.domOverlay = init.domOverlay || { root: document.body };
          }

          const session = await navigator.xr.requestSession("immersive-vr", init);
          await onSessionStarted(session);
        } else {
          await currentSession.end();
        }
      } catch (e) {
        console.error("[VRButton] requestSession failed ❌", e);
        alert("VR failed to start. Open DevTools Console for the red error.");
      }
    };

    // Boot: decide visibility
    isSupported().then((supported) => {
      console.log("[VRButton] isSessionSupported(immersive-vr) =", supported);
      if (!supported) {
        button.textContent = "VR NOT SUPPORTED";
        button.style.opacity = "0.65";
        button.style.borderColor = "rgba(255,107,107,.55)";
      }
    });

    return button;
  }
};
