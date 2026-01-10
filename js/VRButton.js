// /js/VRButton.js — Scarlett VRButton v1.2 (FULL)
// Always returns the actual button element.
// If #vrButtonSlot exists, it mounts there. Otherwise caller can append it.
// Supports createButton(renderer, sessionInit?) pattern.

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
        return await navigator.xr.isSessionSupported("immersive-vr");
      } catch {
        return false;
      }
    }

    async function start() {
      if (!navigator.xr) return;

      const init =
        sessionInit ||
        window.__XR_SESSION_INIT ||
        window.__SESSION_INIT__ || {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
          domOverlay: { root: document.body },
        };

      try {
        show("STARTING…", false);

        const session = await navigator.xr.requestSession("immersive-vr", init);
        currentSession = session;

        // connect to three
        await renderer.xr.setSession(session);

        session.addEventListener("end", () => {
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
      if (currentSession) await end();
      else await start();
    });

    // mount into slot if present
    queueMicrotask(() => {
      const slot = document.getElementById("vrButtonSlot");
      if (slot && !slot.contains(button)) slot.appendChild(button);
    });

    // initial state
    (async () => {
      const ok = await isSupported();
      if (ok) show("ENTER VR", true);
      else show("VR NOT SUPPORTED", false);
    })();

    return button;
  },
};
